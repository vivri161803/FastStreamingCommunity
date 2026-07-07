const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { Redis } = require("@upstash/redis");
const url = require("url");

const apiId = parseInt(process.env.TG_API_ID, 10);
const apiHash = process.env.TG_API_HASH;
const channelStr = process.env.TG_CHANNEL;
const fallbackUrl = process.env.DEFAULT_FALLBACK_URL;

const domainOrUrlRegex = /(?:https?:\/\/)?(?:[a-z0-9\-]+\.)+[a-z]{2,10}(?:\/[^\s)]*)?/i;

function extractUrl(text) {
  if (!text) return null;
  const nuovoIndex = text.toLowerCase().indexOf("nuovo:");
  if (nuovoIndex === -1) return null;

  const textToSearch = text.substring(nuovoIndex + 6);
  const match = textToSearch.match(domainOrUrlRegex);
  if (match) {
    let matchedStr = match[0].replace(/[\.\,\)\s]+$/, "");
    if (matchedStr.includes("t.me") || matchedStr.includes("telegram.me")) return null;
    if (!/^https?:\/\//i.test(matchedStr)) matchedStr = "https://" + matchedStr;
    return matchedStr;
  }
  return null;
}

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", ["GET", "HEAD"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const parsedUrl = url.parse(req.url, true);
  
  if (parsedUrl.query && parsedUrl.query.mock === "1") {
    res.writeHead(302, { Location: "https://google.com" });
    return res.end();
  }

  // Determine session name from query or cookie
  let sessionName = parsedUrl.query.session;
  if (!sessionName && req.headers.cookie) {
    const match = req.headers.cookie.match(new RegExp('(^| )TG_ACTIVE_SESSION=([^;]+)'));
    if (match) sessionName = decodeURIComponent(match[2]);
  }

  let sessionStr = null;

  if (sessionName && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      let sessionData = await redis.hget("TG_SESSIONS", sessionName);
      let sessionObj = null;
      try {
        sessionObj = typeof sessionData === "string" ? JSON.parse(sessionData) : sessionData;
      } catch (e) {
        sessionObj = { sessionStr: sessionData, customPassword: "" };
      }

      if (sessionObj && sessionObj.customPassword) {
        let providedPassword = parsedUrl.query.pwd;
        if (!providedPassword && req.headers.cookie) {
          const matchPwd = req.headers.cookie.match(new RegExp('(^| )TG_SESSION_PASSWORD=([^;]+)'));
          if (matchPwd) providedPassword = decodeURIComponent(matchPwd[2]);
        }
        
        if (providedPassword !== sessionObj.customPassword) {
           res.writeHead(401, { "Content-Type": "text/html; charset=utf-8" });
           res.write(`<!DOCTYPE html><html><body><h1>Unauthorized</h1><p>Invalid custom session password.</p><a href='/'>Go Back</a></body></html>`);
           return res.end();
        }
      }
      sessionStr = sessionObj ? sessionObj.sessionStr : sessionData;
    } catch (e) {
      console.error("[REDIS ERROR]", e.message);
    }
  }

  // Fallback to legacy single session if available and no named session selected
  if (!sessionStr && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    sessionStr = await redis.get("TG_SESSION");
  }
  if (!sessionStr) {
    sessionStr = process.env.TG_SESSION;
  }

  if (!sessionStr) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.write(`<!DOCTYPE html><html><body><h1>No active session. Please select one on the home page.</h1><a href="/">Go Back</a></body></html>`);
    return res.end();
  }

  const client = new TelegramClient(new StringSession(sessionStr), apiId, apiHash, {
    connectionRetries: 3,
  });

  try {
    await client.connect();

    let target = channelStr;
    const isNumeric = /^-?\d+$/.test(channelStr);
    if (isNumeric) target = BigInt(channelStr);

    let channelEntity = null;
    try {
      channelEntity = await client.getEntity(target);
    } catch (e) {
      const dialogs = await client.getDialogs({});
      const cleanChannelStr = channelStr.replace("-100", "").replace("-", "");
      const matchesId = (dialogId) => {
        const dStr = dialogId.toString();
        return dStr === channelStr || dStr === `-${channelStr}` || dStr === cleanChannelStr || dStr === `-${cleanChannelStr}` || dStr === `-100${cleanChannelStr}`;
      };
      if (isNumeric) {
        const found = dialogs.find(d => matchesId(d.id));
        if (found) channelEntity = found.entity;
      } else {
        const cleanUsername = channelStr.replace("@", "");
        const found = dialogs.find(d => d.title === channelStr || (d.entity && d.entity.username === cleanUsername));
        if (found) channelEntity = found.entity;
      }
    }

    if (!channelEntity) throw new Error(`Could not find channel entity for "${channelStr}" in user dialogs.`);

    let foundUrl = null;
    for await (const message of client.iterMessages(channelEntity, { limit: 10 })) {
      if (message.text) {
        const urlMatch = extractUrl(message.text);
        if (urlMatch) {
          foundUrl = urlMatch;
          break;
        }
      }
    }

    await client.disconnect();

    if (foundUrl) {
      res.writeHead(302, { Location: foundUrl });
      return res.end();
    } else if (fallbackUrl) {
      res.writeHead(302, { Location: fallbackUrl });
      return res.end();
    } else {
      res.writeHead(503, { "Content-Type": "text/html; charset=utf-8" });
      res.write(`<!DOCTYPE html><html><body><h1>No Link Found</h1><a href="/">Go Back</a></body></html>`);
      return res.end();
    }

  } catch (err) {
    try { await client.disconnect(); } catch (e) {}
    if (fallbackUrl) {
      res.writeHead(302, { Location: fallbackUrl });
      return res.end();
    } else {
      res.writeHead(500, { "Content-Type": "text/plain" });
      return res.end(`Failed: ${err.message}`);
    }
  }
};
