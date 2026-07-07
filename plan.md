# Piano di progetto — Telegram Channel Redirect

## 1. Obiettivo
Un servizio sempre attivo che:
1. Si collega a un canale Telegram tramite il tuo account personale (non un bot).
2. Legge i messaggi in tempo reale.
3. Estrae l'ultimo URL pubblicato nel canale.
4. Reindirizza automaticamente (HTTP 302) chiunque visiti l'indirizzo del servizio verso quell'URL.
5. È raggiungibile solo dai dispositivi della tua Tailnet (nessuna esposizione pubblica).

---

## 2. Architettura

```
┌─────────────────────┐
│  Canale Telegram     │
└──────────┬───────────┘
           │ evento NewMessage (push, non polling)
           ▼
┌─────────────────────────────────────┐
│  Client Telegram (GramJS)            │
│  - sessione utente persistente       │
│  - listener sugli eventi del canale  │
│  - passa il testo del messaggio      │
│    al modulo di estrazione URL       │
└──────────┬───────────────────────────┘
           │ testo del messaggio
           ▼
┌─────────────────────────────────────┐
│  Modulo di estrazione (regex)        │
│  - trova il primo URL valido         │
│  - scarta falsi positivi             │
└──────────┬───────────────────────────┘
           │ URL estratto
           ▼
┌─────────────────────────────────────┐
│  Stato persistente                   │
│  - variabile in memoria (fast path)  │
│  - latest_url.txt su disco (durevole)│
└──────────┬───────────────────────────┘
           │ letto ad ogni richiesta
           ▼
┌─────────────────────────────────────┐
│  Server HTTP (porta 3000)            │
│  - GET / → 302 Location: <URL>       │
└──────────┬───────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Tailscale Serve (HTTPS)             │
│  - accesso limitato alla Tailnet     │
└──────────┬───────────────────────────┘
           │
           ▼
     Tuoi dispositivi (Tailnet)
```

Un solo processo Node, sempre in esecuzione, gestito da `systemd`. Nessun componente esterno (niente Vercel, niente Redis): tutto vive nell'LXC.

---

## 3. Componenti del progetto

| File | Ruolo |
|---|---|
| `server.js` | Processo principale: connessione Telegram, listener eventi, server HTTP |
| `scripts/generate-session.js` | Script one-shot per generare la session string (login interattivo) |
| `.env` | Credenziali e configurazione (api_id, api_hash, session, canale, porta) |
| `latest_url.txt` | Stato persistito su disco, generato automaticamente a runtime |
| `telegram-redirect.service` | Unit systemd per tenere il processo sempre attivo |

---

## 4. Logica di estrazione dell'URL (regex)

### 4.1 Perché serve una regex
Il messaggio del canale è testo libero: può contenere solo il link, oppure link + descrizione, emoji, hashtag, righe multiple. Serve isolare **solo** l'URL dal resto del testo.

### 4.2 La regex usata
```js
const urlRegex = /https?:\/\/[^\s)]+/i;
```

Scomposizione:
- `https?:\/\/` → richiede lo schema `http://` o `https://` (la `s` è opzionale grazie a `?`). Questo esclude di proposito link senza schema (es. `t.me/canale` scritto senza `https://`), per evitare falsi positivi su testo che assomiglia a un dominio ma non lo è.
- `[^\s)]+` → tutto ciò che segue, purché **non** sia uno spazio (`\s`, quindi il link finisce dove finisce la parola) o una parentesi chiusa `)` (comune quando il link è scritto tra parentesi nel testo, es. `(vedi https://esempio.com)` — senza questa esclusione la `)` finale verrebbe inclusa nell'URL).
- `/i` → case-insensitive (anche se lo schema è quasi sempre minuscolo, è una protezione in più).

### 4.3 Comportamento attuale
- Prende **il primo URL trovato** nel messaggio, leggendo gli ultimi messaggi in ordine dal più recente.
- Se un messaggio contiene più link, viene usato solo il primo — se nel tuo caso serve sempre l'*ultimo* link del messaggio invece che il primo, è una modifica di una riga (uso di `match(/.../g)` + si prende l'ultimo elemento dell'array).

### 4.4 Limiti noti e possibili estensioni
| Limite | Soluzione se necessario |
|---|---|
| Non riconosce link senza schema (`t.me/xxx`, `www.esempio.com`) | Estendere la regex con un pattern opzionale per `www\.` o domini noti |
| Non convalida che l'URL sia realmente raggiungibile | Aggiungere una richiesta HTTP HEAD di verifica prima di salvarlo (aggiunge latenza) |
| Un link "spezzato" su più righe non viene rilevato | Normalizzare il testo (`replace(/\n/g, " ")`) prima di applicare la regex |
| Link Telegram abbreviati (redirect di Telegram stesso, `t.me/...`) trattati come link normali | Nessuna modifica necessaria salvo se vuoi escluderli esplicitamente |

Per il tuo caso d'uso (canale con un link "principale" per messaggio), la regex attuale è sufficiente e volutamente semplice — si può irrobustire in seguito senza toccare il resto dell'architettura.

### 4.5 Dove vive nel codice
In `server.js`, la regex è usata in due punti identici:
1. Al boot, per recuperare l'ultimo link valido tra gli ultimi 10 messaggi (nel caso `latest_url.txt` non esista ancora).
2. Nel listener `NewMessage`, ad ogni nuovo messaggio in arrivo.

---

## 5. Piano di implementazione

1. **Setup credenziali** — ottenere `api_id` / `api_hash` da my.telegram.org.
2. **Generazione sessione** — login interattivo una tantum, salvataggio `TG_SESSION`.
3. **Configurazione `.env`** — credenziali, canale target, porta.
4. **Connessione e listener** — `TelegramClient` + `addEventHandler(NewMessage)`.
5. **Estrazione URL** — regex descritta sopra, applicata al testo del messaggio.
6. **Persistenza stato** — scrittura su `latest_url.txt` ad ogni nuovo link valido.
7. **Server di redirect** — server HTTP minimale, legge lo stato e risponde con `302`.
8. **Esecuzione persistente** — `systemd` per riavvio automatico e avvio al boot.
9. **Esposizione controllata** — `tailscale serve` per accesso limitato alla Tailnet.

---

## 6. Piano di deploy (LXC Proxmox + Tailscale)

### 6.1 Progetto da copiare
Cartella **`telegram-redirect-lxc`** (contiene `server.js`, `package.json`, `.env.example`, `scripts/generate-session.js`, `telegram-redirect.service`).

### 6.2 Passi

**Preparazione LXC**
```bash
apt update && apt install -y nodejs npm git curl
node -v   # >= 18
```

**Copia progetto**
```bash
scp -r telegram-redirect-lxc root@<ip-lxc>:/opt/telegram-redirect-lxc
cd /opt/telegram-redirect-lxc && npm install
```

**Generazione sessione**
```bash
export TG_API_ID=xxxxx
export TG_API_HASH=xxxxx
npm run generate-session
```

**Configurazione**
```bash
cp .env.example .env
nano .env
# TG_API_ID, TG_API_HASH, TG_SESSION, TG_CHANNEL, PORT
```

**Tailscale**
```bash
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up
tailscale serve https / http://localhost:3000
```

**Servizio persistente**
```bash
useradd -r -s /usr/sbin/nologin telegram-redirect
chown -R telegram-redirect:telegram-redirect /opt/telegram-redirect-lxc
chmod 600 /opt/telegram-redirect-lxc/.env

cp telegram-redirect.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now telegram-redirect
```

**Verifica**
```bash
journalctl -u telegram-redirect -f
```
Da un dispositivo sulla Tailnet: `https://telegram-redirect.tuo-tailnet.ts.net` → deve reindirizzare all'ultimo link.

---

## 7. Checklist finale
- [ ] `api_id` / `api_hash` ottenuti
- [ ] LXC pronto, Node.js ≥ 18
- [ ] Progetto copiato in `/opt/telegram-redirect-lxc`
- [ ] Session string generata e in `.env`
- [ ] `TG_CHANNEL` corretto
- [ ] Tailscale autenticato, `tailscale serve` attivo
- [ ] Systemd attivo e `enable`d al boot
- [ ] Redirect testato da un device sulla Tailnet
- [ ] (Opzionale) regex estesa se il canale usa link senza schema `https://`

---

## 8. Troubleshooting
| Problema | Verifica |
|---|---|
| Servizio non parte | `journalctl -u telegram-redirect -f`, `.env` completo? |
| "Nessun link disponibile" | C'è un URL con schema `http(s)://` negli ultimi 10 messaggi? |
| Sessione non valida | Rigenerarla (passo 4) — magari revocata da Impostazioni → Dispositivi |
| Non raggiungibile dalla Tailnet | `tailscale status` su LXC e client, stessa Tailnet, `tailscale serve` attivo |
| Link nel messaggio non riconosciuto | Controllare se manca lo schema `https://` o è su più righe (vedi §4.4) |
