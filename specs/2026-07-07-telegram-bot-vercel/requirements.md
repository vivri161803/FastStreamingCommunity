# Requirements — Telegram Bot Channel Redirect (Vercel Serverless)

## 1. Context & Objectives
We are refactoring the architecture to run completely serverless on Vercel.
Instead of a personal Telegram user account running a persistent TCP connection (MTProto), the service will use a **Telegram Bot**.
Telegram will send push updates to a Vercel serverless webhook endpoint (`POST /api/webhook`) whenever a message is posted in the channel.
A Vercel edge/serverless redirect function (`GET /`) will read the latest URL from Upstash Redis and redirect visitors (HTTP 302).

## 2. Scope & Target Features
- **Serverless Webhook Endpoint (`api/webhook.js`)**:
  - Receives `POST` updates from the Telegram Bot API.
  - Verifies the message originates from the configured target Telegram channel.
  - Parses the message text using the regex to extract the first valid URL.
  - Updates the key `latest_url` in Upstash Redis.
- **Serverless Redirect Endpoint (`api/redirect.js`)**:
  - Handles `GET /` requests (mapped in `vercel.json` as the root route).
  - Reads the `latest_url` value from Upstash Redis.
  - Performs an `HTTP 302 Found` redirect.
  - Fallbacks to `DEFAULT_FALLBACK_URL` or displays an HTML error page.
- **Vercel Project Setup (`vercel.json`)**:
  - Configures the routing to map the root path `/` to the redirect serverless function.
  - Excludes unwanted source files from the deployment bundle.
- **Bot Setup Workflow**:
  - Bot registration with `@BotFather`.
  - Channel administrator configuration.
  - Webhook URL registration script (`scripts/set-webhook.js`).

## 3. Technology Stack
- **Hosting Platform**: Vercel
- **Database**: Upstash Redis (serverless key-value store, standard on Vercel Marketplace)
- **Database Client**: `@upstash/redis` npm package
- **HTTP client**: Native Node.js `fetch` (for Telegram API calls)
- **Configuration**: `.env` loaded via Vercel env variables

## 4. Key Design Decisions

### 4.1 Bot Authentication & Security
- Telegram Bot API uses a secret token (e.g. `123456:ABC-def1234ghIkl-zyx57W2v1u1`).
- To prevent malicious POST requests to our webhook endpoint, we will check that the request contains the custom header `X-Telegram-Bot-Api-Secret-Token` (configured when setting the webhook) or compare the bot token.
- In our implementation, we'll configure a secret token `TELEGRAM_WEBHOOK_SECRET` in `.env` and verify it on incoming requests to `api/webhook.js`.

### 4.2 Data Storage
We'll use Upstash Redis since Vercel's filesystem is read-only.
- **Key**: `latest_url` (holds the redirect URL string).
- **TTL**: Indefinite (URLs don't expire unless overwritten).

### 4.3 Regex URL Extraction
We will use the same robust regex:
```js
const urlRegex = /https?:\/\/[^\s)]+/i;
```
