const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { Redis } = require("@upstash/redis");
const url = require("url");

const apiId = parseInt(process.env.TG_API_ID, 10);
const apiHash = process.env.TG_API_HASH;
const channelStr = process.env.TG_CHANNEL;
const fallbackUrl = process.env.DEFAULT_FALLBACK_URL;

const domainOrUrlRegex = /(?:https?:\/\/)?(?:[a-z0-9\-]+\.)+[a-z]{2,10}(?:\/[^\s)]*)?/i;

function extractUrl(text) {
  if (!text) return null;
  const nuovoIndex = text.toLowerCase().indexOf("nuovo:");
  if (nuovoIndex === -1) return null;

  const textToSearch = text.substring(nuovoIndex + 6);
  const match = textToSearch.match(domainOrUrlRegex);
  if (match) {
    let matchedStr = match[0].replace(/[\.\,\)\s]+$/, "");
    if (matchedStr.includes("t.me") || matchedStr.includes("telegram.me")) return null;
    if (!/^https?:\/\//i.test(matchedStr)) matchedStr = "https://" + matchedStr;
    return matchedStr;
  }
  return null;
}

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", ["GET", "HEAD"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const parsedUrl = url.parse(req.url, true);
  const host = req.headers.host || "your-app.vercel.app";
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const currentDomain = `${protocol}://${host}`;

  if (parsedUrl.query && parsedUrl.query.mock === "1") {
    res.writeHead(302, { Location: "https://google.com" });
    return res.end();
  }

  let sessionStr = process.env.TG_SESSION;
  
  // Attempt to fetch session from Redis if configured
  if (!sessionStr && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      sessionStr = await redis.get("TG_SESSION");
    } catch (e) {
      console.error("[REDIS ERROR]", e.message);
    }
  }

  const envs = {
    TG_API_ID: !isNaN(apiId),
    TG_API_HASH: !!apiHash,
    TG_SESSION: !!sessionStr,
    TG_CHANNEL: !!channelStr,
  };

  const isConfigured = envs.TG_API_ID && envs.TG_API_HASH && envs.TG_SESSION && envs.TG_CHANNEL;

  if (!isConfigured) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.write(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Setup Telegram Redirect</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Plus+Jakarta+Sans:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #09090b; --card-bg: rgba(15, 15, 23, 0.6); --border: rgba(255, 255, 255, 0.08);
      --primary: #8b5cf6; --primary-glow: rgba(139, 92, 246, 0.35); --success: #10b981;
      --warning: #f59e0b; --text: #f4f4f5; --text-muted: #a1a1aa;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      background-image: radial-gradient(circle at 50% 0%, #1e1b4b 0%, transparent 50%), radial-gradient(circle at 0% 100%, #0f172a 0%, transparent 50%);
      background-attachment: fixed; font-family: 'Plus Jakarta Sans', sans-serif;
      color: var(--text); display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 2rem 1rem;
    }
    .container { max-width: 480px; width: 100%; text-align: center; }
    .card {
      background: var(--card-bg); border: 1px solid var(--border); border-radius: 24px; padding: 2.5rem 2rem;
      backdrop-filter: blur(20px); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;
    }
    .card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #8b5cf6, #ec4899);
    }
    h1 { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 2rem; margin-bottom: 0.5rem; }
    p { color: var(--text-muted); font-size: 0.95rem; margin-bottom: 2rem; line-height: 1.5; }
    
    .form-group { text-align: left; margin-bottom: 1.25rem; }
    label { display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
    input {
      width: 100%; background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 12px;
      padding: 0.85rem 1rem; color: #fff; font-size: 1rem; outline: none; transition: border-color 0.2s;
    }
    input:focus { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-glow); }
    
    .btn {
      display: inline-flex; align-items: center; justify-content: center; width: 100%;
      padding: 0.85rem 1rem; border-radius: 12px; font-weight: 600; font-size: 1rem; cursor: pointer;
      background: var(--primary); color: white; border: none; transition: all 0.2s;
      box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4); margin-top: 1rem;
    }
    .btn:hover { background: #7c3aed; transform: translateY(-2px); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    
    #step2 { display: none; }
    .error { color: #f43f5e; font-size: 0.85rem; margin-top: 1rem; display: none; font-weight: 600; }
    .success { color: var(--success); font-size: 0.85rem; margin-top: 1rem; display: none; font-weight: 600; }
    
    .missing-info { background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.2); color: #f43f5e; padding: 1rem; border-radius: 12px; font-size: 0.9rem; text-align: left; margin-bottom: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>Telegram Login</h1>
      <p>Securely connect your Telegram account to activate the redirect engine.</p>
      
      ${(!envs.TG_API_ID || !envs.TG_API_HASH || !envs.TG_CHANNEL) ? \`
        <div class="missing-info">
          <strong>Missing Environment Variables:</strong><br><br>
          \${!envs.TG_API_ID ? '• TG_API_ID<br>' : ''}
          \${!envs.TG_API_HASH ? '• TG_API_HASH<br>' : ''}
          \${!envs.TG_CHANNEL ? '• TG_CHANNEL<br>' : ''}
          <br>Please configure these in Vercel before logging in.
        </div>
      \` : \`
        <div id="step1">
          <div class="form-group">
            <label>Phone Number (with +)</label>
            <input type="text" id="phone" placeholder="+1234567890" />
          </div>
          <button class="btn" id="sendCodeBtn" onclick="sendCode()">Send Code via Telegram</button>
        </div>

        <div id="step2">
          <div class="form-group">
            <label>Login Code</label>
            <input type="text" id="code" placeholder="12345" />
          </div>
          <button class="btn" id="signInBtn" onclick="signIn()">Verify & Complete</button>
        </div>
      \`}

      <div id="errorMsg" class="error"></div>
      <div id="successMsg" class="success"></div>
    </div>
  </div>

  <script>
    let phoneCodeHash = "";
    let tempSession = "";
    let phoneNumber = "";

    async function sendCode() {
      phoneNumber = document.getElementById("phone").value.trim();
      if (!phoneNumber) return showError("Please enter a phone number.");
      
      const btn = document.getElementById("sendCodeBtn");
      btn.disabled = true;
      btn.innerText = "Sending...";
      hideError();

      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "sendCode", phoneNumber })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || "Failed to send code");
        
        phoneCodeHash = data.phoneCodeHash;
        tempSession = data.tempSession;
        
        document.getElementById("step1").style.display = "none";
        document.getElementById("step2").style.display = "block";
      } catch (err) {
        showError(err.message);
        btn.disabled = false;
        btn.innerText = "Send Code via Telegram";
      }
    }

    async function signIn() {
      const code = document.getElementById("code").value.trim();
      if (!code) return showError("Please enter the login code.");

      const btn = document.getElementById("signInBtn");
      btn.disabled = true;
      btn.innerText = "Verifying...";
      hideError();

      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "signIn", phoneNumber, phoneCodeHash, phoneCode: code, tempSession })
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to verify code");

        document.getElementById("step2").style.display = "none";
        document.getElementById("successMsg").innerHTML = "🎉 Login Successful! Session saved to Upstash Redis.<br><br>You can now refresh this page to use the redirector.";
        document.getElementById("successMsg").style.display = "block";
      } catch (err) {
        showError(err.message);
        btn.disabled = false;
        btn.innerText = "Verify & Complete";
      }
    }

    function showError(msg) {
      const el = document.getElementById("errorMsg");
      el.innerText = msg;
      el.style.display = "block";
    }
    function hideError() {
      document.getElementById("errorMsg").style.display = "none";
    }
  </script>
</body>
</html>
    \`);
    return res.end();
  }

  // Active production flow: Connect to Telegram on-demand
  const client = new TelegramClient(new StringSession(sessionStr), apiId, apiHash, {
    connectionRetries: 3,
  });

  try {
    await client.connect();

    let target = channelStr;
    const isNumeric = /^-?\d+$/.test(channelStr);
    if (isNumeric) target = BigInt(channelStr);

    let channelEntity = null;
    try {
      channelEntity = await client.getEntity(target);
    } catch (e) {
      const dialogs = await client.getDialogs({});
      const cleanChannelStr = channelStr.replace("-100", "").replace("-", "");
      const matchesId = (dialogId) => {
        const dStr = dialogId.toString();
        return dStr === channelStr || dStr === \`-\${channelStr}\` || dStr === cleanChannelStr || dStr === \`-\${cleanChannelStr}\` || dStr === \`-100\${cleanChannelStr}\`;
      };
      if (isNumeric) {
        const found = dialogs.find(d => matchesId(d.id));
        if (found) channelEntity = found.entity;
      } else {
        const cleanUsername = channelStr.replace("@", "");
        const found = dialogs.find(d => d.title === channelStr || (d.entity && d.entity.username === cleanUsername));
        if (found) channelEntity = found.entity;
      }
    }

    if (!channelEntity) throw new Error(\`Could not find channel entity for "\${channelStr}" in user dialogs.\`);

    let foundUrl = null;
    for await (const message of client.iterMessages(channelEntity, { limit: 10 })) {
      if (message.text) {
        const urlMatch = extractUrl(message.text);
        if (urlMatch) {
          foundUrl = urlMatch;
          break;
        }
      }
    }

    await client.disconnect();

    if (foundUrl) {
      res.writeHead(302, { Location: foundUrl });
      return res.end();
    } else if (fallbackUrl) {
      res.writeHead(302, { Location: fallbackUrl });
      return res.end();
    } else {
      res.writeHead(503, { "Content-Type": "text/html; charset=utf-8" });
      res.write(\`<!DOCTYPE html><html><body><h1>No Link Found</h1></body></html>\`);
      return res.end();
    }

  } catch (err) {
    try { await client.disconnect(); } catch (e) {}
    if (fallbackUrl) {
      res.writeHead(302, { Location: fallbackUrl });
      return res.end();
    } else {
      res.writeHead(500, { "Content-Type": "text/plain" });
      return res.end(\`Failed: \${err.message}\`);
    }
  }
};
