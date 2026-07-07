# Vercel Serverless Deployment Guide — Telegram Bot Redirect

This guide details how to configure your Telegram Bot, set up Upstash Redis, and deploy this project to Vercel.

---

## 1. Create a Telegram Bot & Configure Channel

1. Open Telegram and search for `@BotFather`.
2. Send `/newbot` and follow the instructions to create your bot.
3. **Copy the API Token** (e.g. `123456:ABC-def1234ghIkl-zyx57W2v1u1`). This is your `TELEGRAM_BOT_TOKEN`.
4. Go to your Telegram channel:
   - Add your newly created bot to the channel.
   - Give the bot **Administrator** privileges (specifically, it needs permission to read/view messages).
5. Obtain your numeric **Channel ID**:
   - Private channel IDs start with `-100` (e.g., `-100123456789`).
   - You can get this ID by forwarding a message from the channel to a bot like `@ShowJsonBot` or `@ForwardInfoBot`.

---

## 2. Set Up Upstash Redis

1. Go to [Upstash Console](https://console.upstash.com/) and sign up for a free account.
2. Create a new Redis Database (choose the region closest to your Vercel deployment, e.g., `us-east-1` or `eu-west-1`).
3. Under the **REST API** section of your Upstash database page, copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

---

## 3. Local Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in the values:
   ```ini
   TELEGRAM_BOT_TOKEN=your_token_from_botfather
   TELEGRAM_CHANNEL_ID=-100xxxxxxxxxx
   TELEGRAM_WEBHOOK_SECRET=choose_a_secure_random_string_here
   UPSTASH_REDIS_REST_URL=your_upstash_url
   UPSTASH_REDIS_REST_TOKEN=your_upstash_token
   DEFAULT_FALLBACK_URL=https://google.com
   ```

---

## 4. Deploy to Vercel

### Option A: Using the Vercel CLI (Recommended for terminal)
1. Install Vercel CLI globally if you haven't already:
   ```bash
   npm install -g vercel
   ```
2. Log in and link the project:
   ```bash
   vercel login
   vercel link
   ```
3. Deploy the project to Vercel, adding the environment variables. You can pull them directly from your local `.env`:
   ```bash
   vercel env pull
   vercel deploy --prod
   ```
4. Copy the deployment URL (e.g. `https://your-app.vercel.app`).

### Option B: Deploying via GitHub Git Integration
1. Push your repository to GitHub/GitLab/Bitbucket.
2. Go to the [Vercel Dashboard](https://vercel.com) and click **Add New > Project**.
3. Import your repository.
4. Expand the **Environment Variables** section and add the keys:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHANNEL_ID`
   - `TELEGRAM_WEBHOOK_SECRET`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `DEFAULT_FALLBACK_URL`
5. Click **Deploy**. Copy your production domain.

---

## 5. Register the Webhook with Telegram

To instruct Telegram to push new channel messages to your Vercel function:

1. Run the helper script on your local machine, passing your production Vercel domain as an argument:
   ```bash
   node scripts/set-webhook.js https://your-app.vercel.app
   ```
2. If successful, you will see:
   `Success: Webhook was set successfully!`

---

## 6. Verification
1. Post a new message containing a link (e.g. `https://example.com/test-link`) in your Telegram channel.
2. Visit your Vercel domain: `https://your-app.vercel.app/`.
3. You should be instantly redirected (HTTP 302) to `https://example.com/test-link`.
