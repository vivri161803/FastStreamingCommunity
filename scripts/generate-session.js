const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

// Load existing environment variables
dotenv.config();

async function run() {
  console.log("=== Telegram Session Generator ===");
  console.log("This script will help you log in to Telegram and generate a persistent session string.");
  console.log("Make sure you have your API ID and API Hash from https://my.telegram.org\n");

  let apiId = process.env.TG_API_ID;
  let apiHash = process.env.TG_API_HASH;

  if (!apiId) {
    const enteredId = await input.text("Enter your Telegram API ID: ");
    apiId = enteredId.trim();
  } else {
    console.log(`Using API ID from environment: ${apiId}`);
  }

  if (!apiHash) {
    const enteredHash = await input.text("Enter your Telegram API Hash: ");
    apiHash = enteredHash.trim();
  } else {
    console.log(`Using API Hash from environment: ${apiHash}`);
  }

  if (!apiId || !apiHash) {
    console.error("Error: Both API ID and API Hash are required.");
    process.exit(1);
  }

  // Convert apiId to number for GramJS
  const apiIdNum = parseInt(apiId, 10);
  if (isNaN(apiIdNum)) {
    console.error("Error: API ID must be a number.");
    process.exit(1);
  }

  console.log("\nConnecting to Telegram...");
  const stringSession = new StringSession("");
  const client = new TelegramClient(stringSession, apiIdNum, apiHash, {
    connectionRetries: 5,
  });

  try {
    await client.start({
      phoneNumber: async () => {
        const phone = await input.text("Enter your phone number (including country code, e.g. +393456789012): ");
        return phone.trim();
      },
      password: async () => {
        const pwd = await input.text("Enter your 2FA password (leave empty if not enabled): ");
        return pwd.trim();
      },
      phoneCode: async () => {
        const code = await input.text("Enter the login code you received: ");
        return code.trim();
      },
      onError: (err) => {
        console.error("Login Step Error:", err.message);
      },
    });

    console.log("\nSuccessfully authenticated with Telegram!");
    const sessionString = client.session.save();

    console.log("\n=================== YOUR TG_SESSION STRING ===================");
    console.log(sessionString);
    console.log("==============================================================\n");

    const writeEnv = await input.confirm("Would you like to save these credentials to your local .env file?", true);

    if (writeEnv) {
      const envPath = path.join(__dirname, "..", ".env");
      let envContent = "";

      // Read current .env if it exists
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, "utf8");
      }

      // Helper to update or append env var
      const setEnvVar = (content, key, val) => {
        const regex = new RegExp(`^${key}=.*$`, "m");
        if (regex.test(content)) {
          return content.replace(regex, `${key}=${val}`);
        } else {
          return content + (content.endsWith("\n") || content === "" ? "" : "\n") + `${key}=${val}\n`;
        }
      };

      envContent = setEnvVar(envContent, "TG_API_ID", apiId);
      envContent = setEnvVar(envContent, "TG_API_HASH", apiHash);
      envContent = setEnvVar(envContent, "TG_SESSION", sessionString);
      
      // Keep other variables if they don't exist
      if (!envContent.includes("TG_CHANNEL=")) {
        envContent = setEnvVar(envContent, "TG_CHANNEL", "your_channel_id_or_title");
      }
      if (!envContent.includes("PORT=")) {
        envContent = setEnvVar(envContent, "PORT", "3000");
      }
      if (!envContent.includes("DEFAULT_FALLBACK_URL=")) {
        envContent = setEnvVar(envContent, "DEFAULT_FALLBACK_URL", "https://google.com");
      }

      fs.writeFileSync(envPath, envContent, "utf8");
      console.log(`Saved credentials to ${envPath}`);
    } else {
      console.log("Please copy the TG_SESSION string above and paste it manually into your .env file.");
    }
  } catch (error) {
    console.error("An error occurred during authentication:", error);
  } finally {
    await client.disconnect();
    console.log("Disconnected client. Exiting.");
  }
}

run();
