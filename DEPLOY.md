# Deployment Guide — Telegram Channel Redirect

This guide outlines how to transfer, configure, run, and persist the service on a Proxmox LXC container using Tailscale for secure internal access.

---

## Prerequisites
1. **LXC Container** with:
   - Node.js (version 18 or higher)
   - npm
   - Tailscale installed and authenticated (see [Tailscale LXC setup](https://tailscale.com/kb/1039/lxc-containers))
2. **Local Machine** where you generated the `TG_SESSION` string using `npm run generate-session`.

---

## 1. Copying Files to Proxmox LXC

To transfer the project files from your local machine to the LXC container:

1. Package and copy the project directory (excluding `node_modules` and local state files) using `scp`:
   ```bash
   scp -r /path/to/Telegram_SC root@<LXC-IP-ADDRESS>:/opt/telegram-redirect-lxc
   ```
   *Alternative (from within the LXC if git is configured):* Clone the repo directly.

2. Access the container shell (via Proxmox UI or SSH) and step into the directory:
   ```bash
   cd /opt/telegram-redirect-lxc
   ```

3. Install production dependencies:
   ```bash
   npm install --omit=dev
   ```

---

## 2. Configuration (`.env`)

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file using your preferred editor (e.g., `nano` or `vi`):
   ```bash
   nano .env
   ```

3. Fill in the required variables:
   - `TG_API_ID`: Your Telegram API ID.
   - `TG_API_HASH`: Your Telegram API Hash.
   - `TG_SESSION`: The long session string you generated locally.
   - `TG_CHANNEL`: The channel ID (e.g. `-100123456789`) or channel username.
   - `PORT`: `3000` (or another port of your choice).
   - `DEFAULT_FALLBACK_URL`: Optional fallback URL.

4. Secure the env file permissions so other users on the container cannot read it:
   ```bash
   chmod 600 .env
   ```

---

## 3. Running as a Persistent Systemd Service

To keep the script running 24/7, auto-start on boot, and auto-restart in case of crashes, configure systemd:

1. Create a dedicated system user (without shell or home directory) for security:
   ```bash
   useradd -r -s /usr/sbin/nologin telegram-redirect
   ```

2. Make sure the user has read/write permissions for the application folder:
   ```bash
   chown -R telegram-redirect:telegram-redirect /opt/telegram-redirect-lxc
   ```

3. Copy the systemd service template to the system directory:
   ```bash
   cp telegram-redirect.service /etc/systemd/system/
   ```

4. Reload systemd, enable, and start the service:
   ```bash
   systemctl daemon-reload
   systemctl enable telegram-redirect
   systemctl start telegram-redirect
   ```

5. Monitor the logs to verify it started and connected successfully:
   ```bash
   journalctl -u telegram-redirect -f
   ```

---

## 4. Securing and Exposing via Tailscale Serve

Tailscale Serve allows you to securely expose the local HTTP server to other devices on your Tailnet over HTTPS, with automatic certificate provisioning and zero public ports.

1. Ensure the Tailscale daemon is running and logged in:
   ```bash
   tailscale status
   ```

2. Configure Tailscale to route traffic from your Tailnet HTTPS address to the local redirect port (e.g. `3000`):
   ```bash
   tailscale serve https / http://localhost:3000
   ```

3. To check status and verify the URL Tailscale has provisioned:
   ```bash
   tailscale serve status
   ```
   It will output a URL similar to:
   `https://<lxc-hostname>.<your-tailnet>.ts.net`

4. Test redirecting by visiting the Tailscale HTTPS address from any device on your Tailnet (e.g. your phone or laptop).
