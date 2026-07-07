# Validation Plan — Telegram Bot Channel Redirect (Vercel Serverless)

This document contains testing procedures to verify the correctness of the serverless Vercel-hosted Telegram Bot Redirect service.

## 1. Webhook Validation

### 1.1 Secret Token Header Check
- **Test Request**: `POST /api/webhook` without the header `X-Telegram-Bot-Api-Secret-Token`.
  - **Expected Result**: HTTP `401 Unauthorized` or `403 Forbidden`.
- **Test Request**: `POST /api/webhook` with an invalid header value.
  - **Expected Result**: HTTP `401 Unauthorized` or `403 Forbidden`.
- **Test Request**: `POST /api/webhook` with the correct header value.
  - **Expected Result**: HTTP `200 OK` (provided payload structure is valid).

### 1.2 Channel ID Filter Verification
- **Test Payload**: A `channel_post` update from a chat ID that does NOT match `TELEGRAM_CHANNEL_ID`.
  - **Expected Result**: HTTP `200 OK` (to prevent Telegram from retrying), but the console should log that the update was ignored and no update to Redis should occur.

### 1.3 Regex URL Extraction
- **Test Payload**: A `channel_post` from the correct channel containing `https://example.com/redirect-test`.
  - **Expected Result**:
    - The key `latest_url` in Upstash Redis is updated to `https://example.com/redirect-test`.
    - Returns HTTP `200 OK`.
- **Test Payload**: A `channel_post` from the correct channel with no URL (only text).
  - **Expected Result**: Redis key is NOT updated. Returns HTTP `200 OK`.

## 2. Redirect Serverless Function Validation

### 2.1 Standard Redirect
- Prerequisite: Set `latest_url` to `https://target-url.com` in Redis.
- **Request**: `GET /`
- **Expected Result**:
  - HTTP status: `302 Found`
  - Header `Location`: `https://target-url.com`

### 2.2 Fallback Redirect
- Prerequisite: Delete `latest_url` from Redis, and configure `DEFAULT_FALLBACK_URL=https://fallback.org` in env.
- **Request**: `GET /`
- **Expected Result**:
  - HTTP status: `302 Found`
  - Header `Location`: `https://fallback.org`

### 2.3 Error State (No URL & No Fallback)
- Prerequisite: Delete `latest_url` from Redis, and remove `DEFAULT_FALLBACK_URL`.
- **Request**: `GET /`
- **Expected Result**:
  - HTTP status: `503 Service Unavailable`
  - Body: Friendly HTML error message explaining no link is available.

## 3. Deployment & Webhook Setup Verification

### 3.1 Webhook Setup Script
- Execute `node scripts/set-webhook.js`.
- It should read variables from `.env` and call the Telegram API.
- **Expected Result**:
  - The script prints `Webhook set successfully!` or outputs the raw response `{"ok":true,"result":true,"description":"Webhook was set"}`.

### 3.2 Live End-to-End Verification
1. Add the bot as an Admin to the private Telegram channel (permissions to post messages is not required, but permission to view messages is).
2. Deploy the project to Vercel and check that the deployment is successful.
3. Configure environment variables in the Vercel dashboard:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHANNEL_ID`
   - `TELEGRAM_WEBHOOK_SECRET`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `DEFAULT_FALLBACK_URL`
4. Run `scripts/set-webhook.js` pointing to your Vercel deployment URL (e.g. `https://your-app.vercel.app/api/webhook`).
5. Send a new message containing a link inside the target Telegram channel.
6. Verify by visiting `https://your-app.vercel.app/`. It should immediately redirect you to the link.
