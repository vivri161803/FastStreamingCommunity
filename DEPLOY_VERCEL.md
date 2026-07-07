# Vercel On-Demand Deployment Guide — Telegram Redirector

This guide details how to deploy your on-demand Telegram user client redirector to Vercel.

---

## How It Works
When you visit the root Vercel URL, Vercel initiates a temporary GramJS user client session using your pre-generated login token (`TG_SESSION`). The client fetches the latest message from your channel, parses the first URL, disconnects, and redirects you.

*Note: Since it logs in dynamically on every request, there is a **2-4 second delay** when loading the redirect. This setup is intended for private personal use.*

---

## 1. Local Configuration & Session Generation

To avoid having to type your Telegram login code on Vercel (which is impossible), you must generate a persistent session string locally:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Visit [my.telegram.org](https://my.telegram.org) (API development tools) to obtain your `api_id` and `api_hash`.
3. Paste `TG_API_ID` and `TG_API_HASH` into your local `.env`.
4. Run the interactive session generator locally:
   ```bash
   npm run generate-session
   ```
5. Enter your phone number, password (if 2FA is active), and the login code you receive in Telegram.
6. Approve the prompt to write the generated `TG_SESSION` string to your `.env` file.

---

## 2. Deploying to Vercel

1. Push your updated code to your GitHub/GitLab/Bitbucket repository.
2. In the [Vercel Dashboard](https://vercel.com), import your repository.
3. Configure the following **Environment Variables** in Vercel:
   - `TG_API_ID`: Your Telegram API ID.
   - `TG_API_HASH`: Your Telegram API Hash.
   - `TG_SESSION`: The persistent `StringSession` key generated in step 1.
   - `TG_CHANNEL`: The numeric ID of the channel (e.g. `-100123456789`) or username (e.g. `@channel`).
   - `DEFAULT_FALLBACK_URL`: Optional fallback URL.
4. Deploy the project.

---

## 3. Testing
1. Visit your Vercel URL: `https://your-app.vercel.app/`.
2. The page will connect, load, and redirect you to the latest link from the channel!
