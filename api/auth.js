const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const apiId = parseInt(process.env.TG_API_ID, 10);
const apiHash = process.env.TG_API_HASH;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const data = req.body;

  try {
    if (data.action === "sendCode") {
      const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 3 });
      await client.connect();
      const result = await client.sendCode({ apiId, apiHash }, data.phoneNumber);
      const tempSession = client.session.save();
      await client.disconnect();
      return res.status(200).json({ phoneCodeHash: result.phoneCodeHash, tempSession });
    }

    if (data.action === "signIn") {
      if (!data.sessionName) return res.status(400).json({ error: "Missing session name" });

      const client = new TelegramClient(new StringSession(data.tempSession), apiId, apiHash, { connectionRetries: 3 });
      await client.connect();
      try {
        await client.invoke(new Api.auth.SignIn({
          phoneNumber: data.phoneNumber,
          phoneCodeHash: data.phoneCodeHash,
          phoneCode: data.phoneCode
        }));
      } catch (err) {
        if (err.message && err.message.includes("SESSION_PASSWORD_NEEDED")) {
          if (!data.password) {
            await client.disconnect();
            return res.status(400).json({ error: "2FA Password required", passwordRequired: true });
          }
          await client.signInWithPassword({ apiId, apiHash }, {
            password: () => data.password,
            onError: (e) => { throw e; }
          });
        } else {
          throw err;
        }
      }
      const finalSession = client.session.save();
      
      // Save session to Upstash Redis Hash "TG_SESSIONS"
      await redis.hset("TG_SESSIONS", { [data.sessionName]: finalSession });
      await client.disconnect();
      return res.status(200).json({ success: true, sessionName: data.sessionName });
    }

    return res.status(400).json({ error: "Invalid action" });

  } catch (err) {
    console.error("[AUTH ERROR]", err);
    return res.status(500).json({ error: err.message });
  }
};
