const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      const allSessions = await redis.hgetall("TG_SESSIONS");
      if (!allSessions) return res.status(200).json({ sessions: [] });
      
      const sessions = Object.keys(allSessions).map(key => {
        let hasPassword = false;
        try {
          const val = allSessions[key];
          const parsed = typeof val === 'string' ? JSON.parse(val) : val;
          if (parsed && parsed.customPassword) hasPassword = true;
        } catch(e) {}
        return { name: key, hasPassword };
      });
      return res.status(200).json({ sessions });
    }

    if (req.method === "DELETE") {
      const sessionName = req.body ? req.body.sessionName : req.query.sessionName;
      const password = req.body ? req.body.password : req.query.password;
      
      if (!sessionName) {
        return res.status(400).json({ error: "Missing session name" });
      }

      const sessionData = await redis.hget("TG_SESSIONS", sessionName);
      if (sessionData) {
        let sessionObj = null;
        try {
          sessionObj = typeof sessionData === "string" ? JSON.parse(sessionData) : sessionData;
        } catch (e) {
          sessionObj = null;
        }

        if (sessionObj && sessionObj.customPassword) {
          if (password !== sessionObj.customPassword) {
            return res.status(401).json({ error: "Invalid password to delete this key." });
          }
        }
      }

      await redis.hdel("TG_SESSIONS", sessionName);
      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", ["GET", "DELETE"]);
    return res.status(405).json({ error: "Method Not Allowed" });

  } catch (err) {
    console.error("[SESSIONS ERROR]", err);
    return res.status(500).json({ error: err.message });
  }
};
