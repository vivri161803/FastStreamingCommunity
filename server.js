const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const http = require("http");

// Load configuration
dotenv.config();

const apiId = parseInt(process.env.TG_API_ID, 10);
const apiHash = process.env.TG_API_HASH;
const sessionStr = process.env.TG_SESSION;
const channelStr = process.env.TG_CHANNEL;
const port = parseInt(process.env.PORT || "3000", 10);
const fallbackUrl = process.env.DEFAULT_FALLBACK_URL;

// Path to persist state
const filePath = path.join(__dirname, "latest_url.txt");
let currentUrl = null;

// 1. Regex for extracting the first URL (excluding trailing parenthesis)
const urlRegex = /https?:\/\/[^\s)]+/i;

function extractUrl(text) {
  if (!text) return null;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}

// 2. State management
function loadPersistedUrl() {
  try {
    if (fs.existsSync(filePath)) {
      currentUrl = fs.readFileSync(filePath, "utf8").trim();
      console.log(`[STATE] Loaded URL from persistence: ${currentUrl}`);
    }
  } catch (err) {
    console.error("[STATE] Error reading persistence file:", err.message);
  }
}

function updateUrl(newUrl) {
  if (currentUrl === newUrl) return;
  currentUrl = newUrl;
  console.log(`[STATE] Updating latest URL: ${newUrl}`);
  try {
    fs.writeFileSync(filePath, newUrl, "utf8");
    console.log("[STATE] Persisted URL successfully.");
  } catch (err) {
    console.error("[STATE] Error writing persistence file:", err.message);
  }
}

// 3. HTTP Server
const server = http.createServer((req, res) => {
  if (req.url === "/") {
    if (currentUrl) {
      console.log(`[HTTP] Redirecting request to: ${currentUrl}`);
      res.writeHead(302, { "Location": currentUrl });
      res.end();
    } else if (fallbackUrl) {
      console.log(`[HTTP] No URL loaded. Redirecting to default fallback: ${fallbackUrl}`);
      res.writeHead(302, { "Location": fallbackUrl });
      res.end();
    } else {
      console.log("[HTTP] No URL or fallback available. Serving 503.");
      res.writeHead(503, { "Content-Type": "text/html; charset=utf-8" });
      res.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>No Redirect Available</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #fafafa; color: #333; }
            .container { text-align: center; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); background: white; max-width: 400px; border: 1px solid #eaeaea; }
            h1 { font-size: 1.5rem; margin-bottom: 1rem; color: #ff3b30; }
            p { font-size: 1rem; color: #666; line-height: 1.5; margin: 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>No Redirect Link Available</h1>
            <p>The system hasn't captured any redirect URLs from the target Telegram channel yet, and no default fallback URL is configured.</p>
          </div>
        </body>
        </html>
      `);
      res.end();
    }
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

// 4. Backfill and Telegram Client initialization
async function backfill(client, channelEntity) {
  console.log("[TELEGRAM] Starting backfill scan of the last 10 messages...");
  try {
    for await (const message of client.iterMessages(channelEntity, { limit: 10 })) {
      if (message.text) {
        const foundUrl = extractUrl(message.text);
        if (foundUrl) {
          console.log(`[TELEGRAM] Backfill: Found initial URL: ${foundUrl}`);
          updateUrl(foundUrl);
          return;
        }
      }
    }
    console.log("[TELEGRAM] Backfill: No URL found in recent messages.");
  } catch (err) {
    console.error("[TELEGRAM] Error during backfill:", err.message);
  }
}

async function main() {
  // Validate basic configurations
  if (isNaN(apiId) || !apiHash) {
    console.error("Error: TG_API_ID and TG_API_HASH must be configured in your .env file.");
    process.exit(1);
  }
  if (!sessionStr) {
    console.error("Error: TG_SESSION must be configured in your .env file. Run 'npm run generate-session' first.");
    process.exit(1);
  }
  if (!channelStr) {
    console.error("Error: TG_CHANNEL must be configured in your .env file.");
    process.exit(1);
  }

  // Load persisted state first (fast startup path)
  loadPersistedUrl();

  // Start HTTP Server
  server.listen(port, () => {
    console.log(`[HTTP] Redirect server is running on http://localhost:${port}`);
  });

  // Initialize Telegram Client
  console.log("[TELEGRAM] Connecting to Telegram...");
  const stringSession = new StringSession(sessionStr);
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  try {
    await client.connect();
    console.log("[TELEGRAM] Connected to Telegram!");

    // Fetch dialogs to populate cache
    console.log("[TELEGRAM] Fetching dialogs to resolve target channel...");
    const dialogs = await client.getDialogs({});
    
    let channelEntity = null;
    const isNumeric = /^-?\d+$/.test(channelStr);

    if (isNumeric) {
      const targetId = BigInt(channelStr);
      // Search dialogs first (faster, avoids network call if cached)
      const found = dialogs.find(d => d.id.toString() === targetId.toString() || d.id === targetId);
      if (found) {
        channelEntity = found.entity;
      } else {
        try {
          channelEntity = await client.getEntity(targetId);
        } catch (err) {
          console.error(`[TELEGRAM] Failed to resolve channel by ID: ${channelStr}`, err.message);
        }
      }
    } else {
      // Find in dialogs by title or username first
      const cleanUsername = channelStr.replace("@", "");
      const found = dialogs.find(d => 
        d.title === channelStr || 
        (d.entity && d.entity.username === cleanUsername)
      );
      if (found) {
        channelEntity = found.entity;
      } else {
        try {
          channelEntity = await client.getEntity(channelStr);
        } catch (err) {
          console.error(`[TELEGRAM] Failed to resolve channel by username/title: ${channelStr}`, err.message);
        }
      }
    }

    if (!channelEntity) {
      console.error(`Error: Could not resolve channel entity for "${channelStr}". Please verify that your account has joined/subscribed to this channel.`);
      process.exit(1);
    }

    const resolvedChannelName = channelEntity.title || channelEntity.username || channelEntity.id.toString();
    console.log(`[TELEGRAM] Successfully targeted channel: "${resolvedChannelName}" (ID: ${channelEntity.id.toString()})`);

    // Perform initial backfill if we don't have a persisted URL yet
    if (!currentUrl) {
      await backfill(client, channelEntity);
    } else {
      console.log("[TELEGRAM] Skipping backfill as we already have a loaded URL.");
    }

    // Set up live event listener
    console.log("[TELEGRAM] Registering live message event handler...");
    client.addEventHandler(async (event) => {
      if (event.message && event.message.text) {
        const text = event.message.text;
        console.log(`[TELEGRAM] New message received: "${text.substring(0, 80).replace(/\n/g, " ")}..."`);
        const foundUrl = extractUrl(text);
        if (foundUrl) {
          console.log(`[TELEGRAM] Extracted URL: ${foundUrl}`);
          updateUrl(foundUrl);
        }
      }
    }, new NewMessage({ chats: [channelEntity.id] }));

    console.log("[TELEGRAM] Listener is active and running.");

  } catch (err) {
    console.error("[TELEGRAM] Failed to initialize Telegram integration:", err.message);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n[SYSTEM] Received ${signal}. Shutting down...`);
    
    server.close(() => {
      console.log("[HTTP] Server closed.");
    });

    try {
      await client.disconnect();
      console.log("[TELEGRAM] Client disconnected.");
    } catch (err) {
      console.error("[TELEGRAM] Error during client disconnect:", err.message);
    }

    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch(err => {
  console.error("[SYSTEM] Unhandled exception in main execution loop:", err);
  process.exit(1);
});
