const { generateReply } = require("../services/huggingFaceService");
const { generateVisionReply } = require("../services/opencodeService");
const { generateImage } = require("../services/imageGenService");
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

const postGenerateImage = async (req, res, next) => {
  const prompt = req.body?.prompt;
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "Prompt is required." });
  }

  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (obj) => { res.write(JSON.stringify(obj) + "\n"); };

  send({ type: "typing", active: true });

  try {
    const imageDataUrl = await generateImage(prompt.trim());
    send({ type: "typing", active: false });
    send({ type: "image", dataUrl: imageDataUrl, prompt: prompt.trim() });
    send({ type: "done" });
    res.end();
  } catch (error) {
    send({ type: "typing", active: false });
    send({ type: "error", message: `Image generation failed: ${error.message}` });
    res.end();
    next(error);
  }
};

const postMessage = async (req, res, next) => {
  const images = req.body?.images;
  const audios = req.body?.audios;
  const videos = req.body?.videos;
  const pdfs = req.body?.pdfs;
  const hasImages = Array.isArray(images) && images.length > 0;
  const hasAudios = Array.isArray(audios) && audios.length > 0;
  const hasVideos = Array.isArray(videos) && videos.length > 0;
  const hasPdfs = Array.isArray(pdfs) && pdfs.length > 0;
  const hasMedia = hasImages || hasAudios || hasVideos || hasPdfs;
  const validation = validateMessage(req.body?.message || "");
  if (!validation.valid && !hasMedia) {
    return res.status(400).json({ error: validation.error });
  }

  const cleanMessage = hasMedia ? sanitizeMessage(validation.value || "") : sanitizeMessage(validation.value);

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

    let reply;
    if (hasMedia) {
      reply = await generateVisionReply({
        message: cleanMessage,
        history: historyForModel,
        images,
        audios,
        videos,
        pdfs
      });
    } else {
      reply = await generateReply({
        message: cleanMessage,
        history: historyForModel
      });
    }

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
  postMessage,
  postGenerateImage
};
