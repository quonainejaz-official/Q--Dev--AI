const { addClient, removeClient, sendEvent } = require("../services/sseManager");
const { generateReply } = require("../services/huggingFaceService");
const {
  MAX_HISTORY_LENGTH,
  validateMessage,
  sanitizeMessage
} = require("../utils/messageUtils");

const getHistoryHandler = (req, res) => {
  res.json({ messages: [] });
};

const clearHistoryHandler = (req, res) => {
  res.json({ status: "success", message: "Chat history cleared." });
};

const setHistoryHandler = (req, res) => {
  res.json({ status: "success", messages: [] });
};

const normalizeIncomingHistory = (history) => {
  if (!Array.isArray(history)) {
    return [];
  }
  return history
    .map((item) => ({
      role: item?.role === "bot" ? "bot" : "user",
      content: sanitizeMessage(String(item?.content ?? "")),
      timestamp: typeof item?.timestamp === "number" ? item.timestamp : Date.now()
    }))
    .filter((item) => item.content.trim().length > 0)
    .slice(-MAX_HISTORY_LENGTH);
};

const postMessage = (req, res, next) => {
  const validation = validateMessage(req.body?.message);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const cleanMessage = sanitizeMessage(validation.value);
  res.json({ status: "queued" });

  const sessionId = req.sessionID;
  sendEvent(sessionId, "typing", { active: true });

  Promise.resolve()
    .then(async () => {
      const incomingHistory = normalizeIncomingHistory(req.body?.history);
      const lastMessage = incomingHistory[incomingHistory.length - 1];
      const historyForModel =
        lastMessage?.role === "user" && lastMessage.content === cleanMessage
          ? incomingHistory.slice(0, -1)
          : incomingHistory;
      const reply = await generateReply({
        message: cleanMessage,
        history: historyForModel
      });
      const cleanReply = sanitizeMessage(reply);
      sendEvent(sessionId, "typing", { active: false });
      sendEvent(sessionId, "bot", { message: cleanReply });
    })
    .catch((error) => {
      sendEvent(sessionId, "typing", { active: false });
      sendEvent(sessionId, "botError", {
        message: "Unable to generate a response. Please try again."
      });
      next(error);
    });
};

const streamEvents = (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sessionId = req.sessionID;
  addClient(sessionId, res);

  const pingInterval = setInterval(() => {
    res.write("event: ping\n");
    res.write("data: {}\n\n");
  }, 20000);

  req.on("close", () => {
    clearInterval(pingInterval);
    removeClient(sessionId, res);
  });
};

module.exports = {
  getHistory: getHistoryHandler,
  clearHistory: clearHistoryHandler,
  setHistory: setHistoryHandler,
  postMessage,
  streamEvents
};
