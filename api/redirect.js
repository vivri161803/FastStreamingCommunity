const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const url = require("url");

const apiId = parseInt(process.env.TG_API_ID, 10);
const apiHash = process.env.TG_API_HASH;
const sessionStr = process.env.TG_SESSION;
const channelStr = process.env.TG_CHANNEL;
const fallbackUrl = process.env.DEFAULT_FALLBACK_URL;

// Regex to extract the first URL or bare domain (e.g. domain.com, domain.pizza, https://domain.com)
// It matches typical domain patterns and optional protocol
const domainOrUrlRegex = /(?:https?:\/\/)?(?:[a-z0-9\-]+\.)+[a-z]{2,10}(?:\/[^\s)]*)?/i;

function extractUrl(text) {
  if (!text) return null;

  let textToSearch = text;
  
  // Look for the "Nuovo:" header (case-insensitive)
  const nuovoIndex = text.toLowerCase().indexOf("nuovo:");
  if (nuovoIndex !== -1) {
    // Only search in the text following "Nuovo:"
    textToSearch = text.substring(nuovoIndex + 6);
  }

  const match = textToSearch.match(domainOrUrlRegex);
  if (match) {
    let matchedStr = match[0];
    
    // Clean trailing punctuation that might get captured (like dots, commas, parenthesis)
    matchedStr = matchedStr.replace(/[\.\,\)\s]+$/, "");
    
    // Prepend https:// if it doesn't have schema
    if (!/^https?:\/\//i.test(matchedStr)) {
      matchedStr = "https://" + matchedStr;
    }
    
    return matchedStr;
  }
  
  return null;
}

module.exports = async (req, res) => {
  // Only accept GET and HEAD requests
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
    TG_API_ID: !isNaN(apiId),
    TG_API_HASH: !!apiHash,
    TG_SESSION: !!sessionStr,
    TG_CHANNEL: !!channelStr,
  };

  const isConfigured = envs.TG_API_ID && envs.TG_API_HASH && envs.TG_SESSION && envs.TG_CHANNEL;

  // Serve a beautiful, premium setup landing page if not fully configured
  if (!isConfigured) {
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

      <h1>Telegram On-Demand Redirector</h1>
      
      <div class="status-badge">
        <div class="status-dot"></div>
        Waiting for Configuration
      </div>

      <p class="desc">
        Your Vercel deployment is successfully spinning! To activate the on-demand redirect engine, please configure your Telegram User credentials in the Vercel Dashboard.
      </p>

      <div class="domain-box">
        <span class="domain-label">Vercel URL:</span>
        <span class="domain-value">${currentDomain}</span>
      </div>

      <div class="checklist-title">Configuration Checklist</div>
      <div class="checklist">
        <div class="check-item">
          <span class="item-label">TG_API_ID</span>
          <span class="item-status ${envs.TG_API_ID ? "status-ok" : "status-missing"}">
            ${envs.TG_API_ID ? "✓ Configured" : "✗ Missing"}
          </span>
        </div>
        <div class="check-item">
          <span class="item-label">TG_API_HASH</span>
          <span class="item-status ${envs.TG_API_HASH ? "status-ok" : "status-missing"}">
            ${envs.TG_API_HASH ? "✓ Configured" : "✗ Missing"}
          </span>
        </div>
        <div class="check-item">
          <span class="item-label">TG_SESSION (Login Session)</span>
          <span class="item-status ${envs.TG_SESSION ? "status-ok" : "status-missing"}">
            ${envs.TG_SESSION ? "✓ Configured" : "✗ Missing"}
          </span>
        </div>
        <div class="check-item">
          <span class="item-label">TG_CHANNEL (Target ID or Title)</span>
          <span class="item-status ${envs.TG_CHANNEL ? "status-ok" : "status-missing"}">
            ${envs.TG_CHANNEL ? "✓ Configured" : "✗ Missing"}
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

  // Active production flow: Connect to Telegram on-demand
  console.log(`[ON-DEMAND] Fetch request started. Connecting to Telegram account...`);
  const client = new TelegramClient(new StringSession(sessionStr), apiId, apiHash, {
    connectionRetries: 3,
  });

  try {
    await client.connect();
    console.log("[ON-DEMAND] Connected to Telegram successfully.");

    // Resolve channel target
    let target = channelStr;
    const isNumeric = /^-?\d+$/.test(channelStr);
    if (isNumeric) {
      target = BigInt(channelStr);
    }

    let channelEntity = null;
    try {
      channelEntity = await client.getEntity(target);
    } catch (e) {
      console.warn(`[ON-DEMAND] Direct resolve failed, fetching dialogs to populate cache...`);
      const dialogs = await client.getDialogs({});
      
      const cleanChannelStr = channelStr.replace("-100", "").replace("-", "");

      const matchesId = (dialogId) => {
        const dStr = dialogId.toString();
        return dStr === channelStr || 
               dStr === `-${channelStr}` || 
               dStr === cleanChannelStr || 
               dStr === `-${cleanChannelStr}` || 
               dStr === `-100${cleanChannelStr}`;
      };

      if (isNumeric) {
        const found = dialogs.find(d => matchesId(d.id));
        if (found) channelEntity = found.entity;
      } else {
        const cleanUsername = channelStr.replace("@", "");
        const found = dialogs.find(d => 
          d.title === channelStr || 
          (d.entity && d.entity.username === cleanUsername)
        );
        if (found) channelEntity = found.entity;
      }
    }

    if (!channelEntity) {
      throw new Error(`Could not find channel entity for "${channelStr}" in user dialogs.`);
    }

    let foundUrl = null;

    // Scan the last 10 messages for a URL
    for await (const message of client.iterMessages(channelEntity, { limit: 10 })) {
      if (message.text) {
        const urlMatch = extractUrl(message.text);
        if (urlMatch) {
          foundUrl = urlMatch;
          break;
        }
      }
    }

    // Always disconnect the client when done to avoid socket leaks
    await client.disconnect();
    console.log("[ON-DEMAND] Disconnected client.");

    if (foundUrl) {
      console.log(`[ON-DEMAND] Redirecting to extracted URL: ${foundUrl}`);
      res.writeHead(302, { Location: foundUrl });
      return res.end();
    } else if (fallbackUrl) {
      console.log(`[ON-DEMAND] No URL found. Redirecting to default fallback: ${fallbackUrl}`);
      res.writeHead(302, { Location: fallbackUrl });
      return res.end();
    } else {
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
            <h1>No Link Found</h1>
            <p>No valid URL was found in the recent messages of target channel.</p>
          </div>
        </body>
        </html>
      `);
      return res.end();
    }

  } catch (err) {
    console.error("[ON-DEMAND ERROR] Failed to fetch redirect URL:", err.message);
    try {
      await client.disconnect();
    } catch (disconnectErr) {}

    if (fallbackUrl) {
      console.log(`[ON-DEMAND ERROR] Falling back to default: ${fallbackUrl}`);
      res.writeHead(302, { Location: fallbackUrl });
      return res.end();
    } else {
      res.writeHead(500, { "Content-Type": "text/plain" });
      return res.end(`Failed to retrieve redirect URL from Telegram: ${err.message}`);
    }
  }
};
