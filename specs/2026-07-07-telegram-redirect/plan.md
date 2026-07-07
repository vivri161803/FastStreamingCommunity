# Implementation Plan — Telegram Channel Redirect

This plan is structured into sequential task groups. We will develop and test locally on macOS before packaging and deploying to the target Proxmox LXC container.

## Task Group 1: Initialization & Package Setup
- [x] 1.1 Create `package.json` with dependencies: `telegram` (GramJS) and `dotenv`.
- [x] 1.2 Create `.env.example` with template keys:
  - `TG_API_ID`
  - `TG_API_HASH`
  - `TG_SESSION`
  - `TG_CHANNEL`
  - `PORT` (default `3000`)
  - `DEFAULT_FALLBACK_URL`
- [x] 1.3 Create `.gitignore` to exclude `node_modules`, `.env`, and `latest_url.txt`.
- [x] 1.4 Install dependencies using `npm install`.

## Task Group 2: Interactive Session Generator
- [x] 2.1 Create `scripts/generate-session.js` using GramJS.
- [x] 2.2 Implement command line prompt using `input` or native Node `readline` to ask for phone number, 2FA password (if any), and login code.
- [x] 2.3 On successful login, save and print the `StringSession` to the console.
- [ ] 2.4 Test session generation locally.

## Task Group 3: Telegram Listener & URL Extraction
- [x] 3.1 Create `server.js` boilerplate loading `dotenv` and initializing the `TelegramClient` using the string session from the environment.
- [x] 3.2 Implement regex-based URL extraction helper function matching the first `http://` or `https://` link.
- [x] 3.3 Implement startup backfill: fetch the last 10 messages from the target channel, extract the first URL found, and write it to `latest_url.txt`.
- [x] 3.4 Implement live `NewMessage` listener:
  - Filter by target channel (either by ID or title).
  - Extract the first URL from any new message and update `latest_url.txt` (and the in-memory cache).

## Task Group 4: Native HTTP Redirect Server
- [x] 4.1 In `server.js`, implement a native Node.js HTTP server listening on the configured `PORT`.
- [x] 4.2 On incoming request (`GET /`):
  - Read current URL from memory (or fallback to `latest_url.txt` read).
  - If a URL exists, issue a `302 Found` redirect.
  - If no URL exists, check if `DEFAULT_FALLBACK_URL` is set, and redirect there.
  - If no fallback is set, return a user-friendly HTML error page.
- [x] 4.3 Add graceful shutdown handling for both the HTTP server and Telegram client.

## Task Group 5: Local Integration Testing
- [ ] 5.1 Create `.env` locally using the generated session token and a test channel.
- [ ] 5.2 Start the server locally and verify startup backfill.
- [ ] 5.3 Post a new message with a URL in the test channel and verify the server detects it and writes to `latest_url.txt`.
- [ ] 5.4 Visit `http://localhost:3000/` and verify the redirect to the expected URL.

## Task Group 6: Deployment & Persistence
- [x] 6.1 Create `telegram-redirect.service` systemd unit template.
- [x] 6.2 Write instructions for copying files to Proxmox LXC container.
- [x] 6.3 Verify Tailscale setup and `tailscale serve` command syntax.
