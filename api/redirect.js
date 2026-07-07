const url = require("url");

// Initialize Upstash Redis client safely
let redis = null;
let redisInitError = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    const { Redis } = require("@upstash/redis");
    redis = Redis.fromEnv();
  } catch (err) {
    redisInitError = err.message;
  }
}

module.exports = async (req, res) => {
  // Only accept GET requests (or HEAD)
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", ["GET", "HEAD"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const parsedUrl = url.parse(req.url, true);
  const host = req.headers.host || "your-app.vercel.app";
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const currentDomain = `${protocol}://${host}`;

  // If query parameter mock=1 is present, perform a mock redirect to Google for testing
  if (parsedUrl.query && parsedUrl.query.mock === "1") {
    console.log("[REDIRECT] Mock redirect triggered. Redirecting to Google.");
    res.writeHead(302, { Location: "https://google.com" });
    return res.end();
  }

  const envs = {
    TELEGRAM_BOT_TOKEN: !!process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHANNEL_ID: !!process.env.TELEGRAM_CHANNEL_ID,
    TELEGRAM_WEBHOOK_SECRET: !!process.env.TELEGRAM_WEBHOOK_SECRET,
    UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
  };

  const isConfigured = envs.TELEGRAM_BOT_TOKEN && envs.TELEGRAM_CHANNEL_ID && envs.UPSTASH_REDIS_REST_URL && envs.UPSTASH_REDIS_REST_TOKEN;

  // Serve a beautiful, premium setup landing page if not fully configured
  if (!isConfigured || redisInitError) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.write(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redirector Server — Spinning Up</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Plus+Jakarta+Sans:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #09090b;
      --card-bg: rgba(15, 15, 23, 0.6);
      --border: rgba(255, 255, 255, 0.08);
      --primary: #8b5cf6;
      --primary-glow: rgba(139, 92, 246, 0.35);
      --success: #10b981;
      --warning: #f59e0b;
      --text: #f4f4f5;
      --text-muted: #a1a1aa;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg);
      background-image: 
        radial-gradient(circle at 50% 0%, #1e1b4b 0%, transparent 50%),
        radial-gradient(circle at 0% 100%, #0f172a 0%, transparent 50%);
      background-attachment: fixed;
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: var(--text);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      overflow-x: hidden;
      padding: 2rem 1rem;
    }

    .container {
      max-width: 580px;
      width: 100%;
      text-align: center;
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 3rem 2.5rem;
      backdrop-filter: blur(20px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);
      position: relative;
      overflow: hidden;
      animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #8b5cf6, #ec4899);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .logo-container {
      margin-bottom: 1.5rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 70px;
      height: 70px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      box-shadow: 0 8px 16px rgba(0,0,0,0.2);
    }

    .logo-container svg {
      width: 32px;
      height: 32px;
      fill: none;
      stroke: var(--primary);
      stroke-width: 2;
      filter: drop-shadow(0 0 8px var(--primary-glow));
    }

    h1 {
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 2.25rem;
      letter-spacing: -0.03em;
      margin-bottom: 0.5rem;
      background: linear-gradient(to right, #ffffff, #d4d4d8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.2);
      color: var(--warning);
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      margin-bottom: 2rem;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      background-color: var(--warning);
      border-radius: 50%;
      box-shadow: 0 0 8px var(--warning);
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0% { opacity: 0.3; }
      50% { opacity: 1; }
      100% { opacity: 0.3; }
    }

    .desc {
      color: var(--text-muted);
      font-size: 1rem;
      line-height: 1.6;
      margin-bottom: 2.5rem;
    }

    .domain-box {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 0.75rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2.5rem;
      font-family: monospace;
      font-size: 0.9rem;
    }

    .domain-label {
      color: var(--text-muted);
    }

    .domain-value {
      color: #38bdf8;
      font-weight: 600;
    }

    .checklist-title {
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      text-align: left;
      margin-bottom: 1rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.5rem;
    }

    .checklist {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 2.5rem;
    }

    .check-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.85rem 1rem;
      background: rgba(255, 255, 255, 0.01);
      border: 1px solid var(--border);
      border-radius: 12px;
      text-align: left;
    }

    .item-label {
      font-size: 0.9rem;
      font-weight: 600;
    }

    .item-status {
      font-size: 0.8rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .status-ok { color: var(--success); }
    .status-missing { color: #f43f5e; }

    .btn-group {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.85rem 1.75rem;
      border-radius: 12px;
      font-weight: 600;
      font-size: 0.95rem;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-primary {
      background: var(--primary);
      color: white;
      border: none;
      box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);
    }

    .btn-primary:hover {
      background: #7c3aed;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(139, 92, 246, 0.6);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.04);
      color: var(--text);
      border: 1px solid var(--border);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.08);
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo-container">
        <svg viewBox="0 0 24 24">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </div>

      <h1>Telegram Link Redirector</h1>
      
      <div class="status-badge">
        <div class="status-dot"></div>
        Waiting for Configuration
      </div>

      <p class="desc">
        Your Vercel deployment is successfully spinning! To activate the redirect engine, please configure your Environment Variables in the Vercel Dashboard.
      </p>

      <div class="domain-box">
        <span class="domain-label">Vercel URL:</span>
        <span class="domain-value">${currentDomain}</span>
      </div>

      <div class="checklist-title">Configuration Checklist</div>
      <div class="checklist">
        <div class="check-item">
          <span class="item-label">Upstash Redis Connection</span>
          <span class="item-status ${envs.UPSTASH_REDIS_REST_URL && envs.UPSTASH_REDIS_REST_TOKEN ? "status-ok" : "status-missing"}">
            ${envs.UPSTASH_REDIS_REST_URL && envs.UPSTASH_REDIS_REST_TOKEN ? "✓ Configured" : "✗ Missing"}
          </span>
        </div>
        <div class="check-item">
          <span class="item-label">Telegram Bot Token</span>
          <span class="item-status ${envs.TELEGRAM_BOT_TOKEN ? "status-ok" : "status-missing"}">
            ${envs.TELEGRAM_BOT_TOKEN ? "✓ Configured" : "✗ Missing"}
          </span>
        </div>
        <div class="check-item">
          <span class="item-label">Telegram Target Channel ID</span>
          <span class="item-status ${envs.TELEGRAM_CHANNEL_ID ? "status-ok" : "status-missing"}">
            ${envs.TELEGRAM_CHANNEL_ID ? "✓ Configured" : "✗ Missing"}
          </span>
        </div>
        <div class="check-item">
          <span class="item-label">Webhook Secret Protection</span>
          <span class="item-status ${envs.TELEGRAM_WEBHOOK_SECRET ? "status-ok" : "status-missing"}">
            ${envs.TELEGRAM_WEBHOOK_SECRET ? "✓ Configured" : "✗ Missing (Recommended)"}
          </span>
        </div>
      </div>

      <div class="btn-group">
        <a href="${currentDomain}/?mock=1" class="btn btn-primary">Test Mock Redirect</a>
        <a href="https://github.com/vivri161803/Telegram_SC" target="_blank" class="btn btn-secondary">View Repository</a>
      </div>
    </div>
  </div>
</body>
</html>
    `);
    return res.end();
  }

  // Active production flow
  try {
    const targetUrl = await redis.get("latest_url");

    if (targetUrl) {
      console.log(`[REDIRECT] Redirecting to: ${targetUrl}`);
      res.writeHead(302, { Location: targetUrl });
      return res.end();
    } else if (fallbackUrl) {
      console.log(`[REDIRECT] No URL stored. Redirecting to default fallback: ${fallbackUrl}`);
      res.writeHead(302, { Location: fallbackUrl });
      return res.end();
    } else {
      console.log("[REDIRECT] No URL or fallback available. Serving 503.");
      res.writeHead(503, { "Content-Type": "text/html; charset=utf-8" });
      res.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>No Redirect Available</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #09090b; color: #f4f4f5; }
            .container { text-align: center; padding: 2.5rem; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); background: #0f0f17; max-width: 400px; }
            h1 { font-size: 1.5rem; margin-bottom: 1rem; color: #f43f5e; }
            p { font-size: 0.95rem; color: #a1a1aa; line-height: 1.5; margin: 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>No Redirect Link Available</h1>
            <p>The redirect database is empty and no default fallback URL has been configured.</p>
          </div>
        </body>
        </html>
      `);
      return res.end();
    }
  } catch (error) {
    console.error("[REDIRECT] Error retrieving URL from Upstash Redis:", error.message);
    res.writeHead(500, { "Content-Type": "text/plain" });
    return res.end("Internal Server Error");
  }
};
