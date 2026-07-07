# Implementation Plan — Telegram Bot Channel Redirect (Vercel Serverless)

This plan details the steps to build, configure, and validate the Telegram Bot Redirect service hosted entirely on Vercel with Upstash Redis.

## Task Group 1: Workspace Reconfiguration
- [x] 1.1 Update `package.json` to include `@upstash/redis` and remove unused dependencies.
- [x] 1.2 Update `.env.example` with the new variables:
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_CHANNEL_ID` (numeric ID of the channel, e.g., `-100123456789`)
  - `TELEGRAM_WEBHOOK_SECRET` (custom secret token for securing webhook requests)
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
  - `DEFAULT_FALLBACK_URL`
- [x] 1.3 Install the new packages locally (`npm install`).

## Task Group 2: Vercel Configuration & Routing
- [x] 2.1 Create `vercel.json` in the root folder.
- [x] 2.2 Configure routes in `vercel.json` to:
  - Route requests at `/` to `api/redirect.js`.
  - Route requests at `/api/webhook` to `api/webhook.js`.

## Task Group 3: Serverless Webhook Handler
- [x] 3.1 Create `api/webhook.js`.
- [x] 3.2 Implement POST method handler to process incoming Telegram updates.
- [x] 3.3 Validate the request source using the `X-Telegram-Bot-Api-Secret-Token` header.
- [x] 3.4 Parse channel posts (`channel_post` field in the Telegram update):
  - Verify `chat.id` matches `TELEGRAM_CHANNEL_ID`.
  - Apply regex to extract the first URL.
  - Save the extracted URL to Upstash Redis.

## Task Group 4: Serverless Redirect Handler
- [x] 4.1 Create `api/redirect.js`.
- [x] 4.2 Read the latest URL from Upstash Redis.
- [x] 4.3 Implement redirect logic (HTTP 302) to the latest URL.
- [x] 4.4 Implement fallback redirect or HTML error page if no URL is present.

## Task Group 5: Webhook Setup Script
- [x] 5.1 Create `scripts/set-webhook.js`.
- [x] 5.2 Implement script using `fetch` to register the webhook URL with Telegram Bot API, passing the Vercel domain and secret token.

## Task Group 6: Deploy & Validation
- [ ] 6.1 Create the bot on `@BotFather` and add it to the channel.
- [ ] 6.2 Deploy the codebase to Vercel and attach Upstash Redis.
- [ ] 6.3 Run `node scripts/set-webhook.js` to register the webhook.
- [ ] 6.4 Post a message with a link in the channel and verify redirection.
