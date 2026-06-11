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

const postMessage = async (req, res, next) => {
  const validation = validateMessage(req.body?.message);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const cleanMessage = sanitizeMessage(validation.value);

  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (obj) => { res.write(JSON.stringify(obj) + "\n"); };

  send({ type: "typing", active: true });

  try {
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
    const words = cleanReply.match(/\S+\s*/g) || [];

    send({ type: "start" });

    for (let wi = 0; wi < words.length; wi++) {
      send({ type: "chunk", text: words[wi] });
      await new Promise((r) => setTimeout(r, 35));
    }

    send({ type: "typing", active: false });
    send({ type: "done" });
    res.end();
  } catch (error) {
    send({ type: "typing", active: false });
    send({ type: "error", message: "Unable to generate a response. Please try again." });
    res.end();
    next(error);
  }
};

module.exports = {
  getHistory: getHistoryHandler,
  clearHistory: clearHistoryHandler,
  setHistory: setHistoryHandler,
  postMessage
};
