const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

async function run() {
  console.log("=== Telegram Webhook Registration Script ===");

  // Read Vercel deployment URL from CLI arguments
  const vercelUrlArg = process.argv[2];

  if (!vercelUrlArg) {
    console.error("Error: Please provide your Vercel deployment URL as an argument.");
    console.error("Usage: node scripts/set-webhook.js <https://your-app.vercel.app>");
    process.exit(1);
  }

  if (!botToken) {
    console.error("Error: TELEGRAM_BOT_TOKEN is not defined in your .env file.");
    process.exit(1);
  }

  // Clean and format Vercel URL
  let targetDomain = vercelUrlArg.trim();
  if (!targetDomain.startsWith("http://") && !targetDomain.startsWith("https://")) {
    targetDomain = "https://" + targetDomain;
  }
  // Strip trailing slash if present
  if (targetDomain.endsWith("/")) {
    targetDomain = targetDomain.slice(0, -1);
  }

  const webhookUrl = `${targetDomain}/api/webhook`;

  console.log(`\nConfiguring Webhook:`);
  console.log(`- Webhook URL:  ${webhookUrl}`);
  console.log(`- Secret Token: ${webhookSecret ? "[CONFIGURED]" : "[NOT CONFIGURED - Highly Recommended]"}`);

  // Construct API call parameters
  const telegramApiUrl = `https://api.telegram.org/bot${botToken}/setWebhook`;
  
  const payload = {
    url: webhookUrl,
    allowed_updates: ["channel_post"],
  };

  if (webhookSecret) {
    payload.secret_token = webhookSecret;
  }

  console.log("\nSending request to Telegram Bot API...");

  try {
    const response = await fetch(telegramApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok && result.ok) {
      console.log("\nSuccess: Webhook was set successfully!");
      console.log("Telegram API Response:", JSON.stringify(result, null, 2));
    } else {
      console.error("\nFailure: Telegram API rejected the request.");
      console.error("Response code:", response.status);
      console.error("Telegram API Response:", JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error("\nError making API request:", error.message);
  }
}

run();
