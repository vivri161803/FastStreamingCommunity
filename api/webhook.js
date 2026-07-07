// Regex to extract the first URL (excluding trailing parenthesis)
const urlRegex = /https?:\/\/[^\s)]+/i;

function extractUrl(text) {
  if (!text) return null;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}

module.exports = async (req, res) => {
  // Only accept POST requests
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Validate the secret token to verify the sender is Telegram
  const secretHeader = req.headers["x-telegram-bot-api-secret-token"];
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (expectedSecret && secretHeader !== expectedSecret) {
    console.error("[WEBHOOK] Unauthorized request: secret token mismatch.");
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Check if Upstash Redis credentials are set
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    console.warn("[WEBHOOK] Webhook received but Upstash Redis is not configured.");
    return res.status(200).json({ ok: true, status: "pending_redis_config" });
  }

  try {
    const { Redis } = require("@upstash/redis");
    const redis = Redis.fromEnv();
    const update = req.body;

    // Check if the update contains a channel post
    if (update && update.channel_post) {
      const post = update.channel_post;
      const chatId = post.chat ? post.chat.id : null;
      const configuredChatId = process.env.TELEGRAM_CHANNEL_ID;

      // Verify that the post comes from our targeted channel
      if (chatId && configuredChatId && String(chatId) === String(configuredChatId)) {
        // Extract from text or caption (for media posts)
        const textToSearch = post.text || post.caption || "";
        const foundUrl = extractUrl(textToSearch);

        if (foundUrl) {
          console.log(`[WEBHOOK] Extracted URL: ${foundUrl} from post ID ${post.message_id}`);
          await redis.set("latest_url", foundUrl);
          console.log("[WEBHOOK] Persisted URL to Upstash Redis.");
        } else {
          console.log(`[WEBHOOK] No URL found in channel post ID ${post.message_id}`);
        }
      } else {
        console.log(`[WEBHOOK] Ignored channel post from untargeted chat ID: ${chatId}`);
      }
    }

    // Always respond with 200 OK to Telegram
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[WEBHOOK] Error processing webhook update:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
