# Requirements — Telegram Channel Redirect

## 1. Context & Objectives
The goal of this project is to build a lightweight Node.js service that connects to a target Telegram channel (specifically supporting private channels) using a personal user account.
The service must listen for new messages in real-time, extract the first URL found, and persist it to a local text file.
An HTTP server will run on a configurable port to redirect all incoming GET requests (via HTTP 302) to the latest extracted URL. This service is intended to run behind a Tailscale Tailnet (using Tailscale Serve) for secure private access.

## 2. Scope & Target Features
- **Interactive Session Generator (`scripts/generate-session.js`)**: An interactive command-line tool to authenticate with Telegram once, generate a `StringSession` string, and print it for use in the configuration.
- **Telegram Listener (`server.js`)**:
  - Connects to Telegram using the saved session string.
  - On startup, if no saved URL is found, fetches the last 10 messages from the target channel to resolve the initial redirect URL.
  - Listens for `NewMessage` events on the target channel.
  - Extracts the first valid URL with a schema (`http://` or `https://`).
- **State Persistence**: Saves the extracted URL to `latest_url.txt` immediately upon discovery, ensuring that restarts don't lose the state.
- **Web Redirect Server (`server.js`)**:
  - A lightweight HTTP server using Node's native `http` module (no heavy framework like Express).
  - Handles `GET /` requests by sending an `HTTP 302 Found` redirect to the current URL.
  - If no URL is loaded or available, redirects to a configurable `DEFAULT_FALLBACK_URL` or returns an HTTP 503 error if none is specified.
- **LXC Deployment Config**: Systemd unit configuration (`telegram-redirect.service`) to ensure the service runs continuously and restarts automatically.

## 3. Technology Stack
- **Runtime**: Node.js (version 18 or higher)
- **Telegram Client**: GramJS (`telegram` npm package)
- **Configuration**: Environment variables loaded via `dotenv`
- **Session Helper**: Native readline or `input` library for console prompt
- **Web Server**: Native Node.js `http` module

## 4. Key Design Decisions

### 4.1 Private Channel Identification
Private channels do not have public usernames (like `@channelname`). They can be matched via:
1. **Channel ID**: A numeric string starting with `-100` (e.g. `-100123456789`).
2. **Channel Title**: A string matching the exact display name of the channel. The client can search the user's active dialogs on boot to resolve the numeric ID.

We will support both formats in `TG_CHANNEL` within `.env`. At boot:
- If `TG_CHANNEL` is numeric, we use it directly (parsed as a BigInt/integer).
- If it's a string, we call `client.getDialogs()` to find a matching chat by title.

### 4.2 Web Server Fallbacks
If the service starts and there is no URL in `latest_url.txt`, and no URL could be found in the last 10 messages of the channel:
- If `DEFAULT_FALLBACK_URL` is set in `.env`, redirect to it.
- Otherwise, return an HTML page showing a friendly message stating that no redirect link is available yet.

### 4.3 Regex URL Extraction
We will use the regex baseline from `plan.md`:
```js
const urlRegex = /https?:\/\/[^\s)]+/i;
```
This is simple, robust, and correctly avoids matching trailing parenthesis in markdown/text links.
