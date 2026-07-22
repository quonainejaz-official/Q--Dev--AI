const { connectDB } = require("../services/db");
const Chat = require("../models/Chat");
const {
  uploadMany,
  isCloudinaryConfigured
} = require("../services/cloudinaryService");
const { MAX_HISTORY_LENGTH } = require("../utils/messageUtils");

// Upload any base64 media in a message to Cloudinary and replace with URLs.
// When Cloudinary isn't configured, data-URL media is dropped (to avoid
// bloating MongoDB); already-hosted URLs are kept.
const processMedia = async (message) => {
  const out = {
    role: message?.role === "bot" ? "bot" : "user",
    content: String(message?.content ?? ""),
    timestamp:
      typeof message?.timestamp === "number" ? message.timestamp : Date.now()
  };

  const kinds = [
    ["images", "image"],
    ["videos", "video"],
    ["audios", "raw"],
    ["pdfs", "raw"]
  ];

  for (const [key, resourceType] of kinds) {
    const arr = message?.[key];
    if (!Array.isArray(arr) || !arr.length) continue;

    if (isCloudinaryConfigured()) {
      out[key] = await uploadMany(arr, { resourceType });
    } else {
      // Keep only already-hosted URLs.
      out[key] = arr.filter((s) => typeof s === "string" && /^https?:\/\//i.test(s));
    }
    if (!out[key].length) delete out[key];
  }

  return out;
};

const processMessages = async (messages) => {
  if (!Array.isArray(messages)) return [];
  const sliced = messages.slice(-MAX_HISTORY_LENGTH);
  return Promise.all(sliced.map(processMedia));
};

const listChats = async (req, res, next) => {
  try {
    await connectDB();
    const chats = await Chat.find({ userId: req.userId })
      .sort({ updatedAt: -1 })
      .limit(200);
    res.json({ chats: chats.map((c) => c.toClientJSON()) });
  } catch (error) {
    next(error);
  }
};

const getChat = async (req, res, next) => {
  try {
    await connectDB();
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.userId });
    if (!chat) return res.status(404).json({ error: "Chat not found." });
    res.json({ chat: chat.toClientJSON() });
  } catch (error) {
    next(error);
  }
};

// Create or upsert by clientId (used for guest-chat migration + normal saves).
const createChat = async (req, res, next) => {
  try {
    await connectDB();
    const body = req.body || {};
    const messages = await processMessages(body.messages);

    let chat = null;
    if (body.clientId) {
      chat = await Chat.findOne({ userId: req.userId, clientId: body.clientId });
    }

    if (chat) {
      chat.title = body.title || chat.title;
      chat.titleIsCustom = Boolean(body.titleIsCustom);
      chat.messages = messages;
      await chat.save();
    } else {
      chat = await Chat.create({
        userId: req.userId,
        clientId: body.clientId || null,
        title: body.title || "New Chat",
        titleIsCustom: Boolean(body.titleIsCustom),
        messages
      });
    }

    res.json({ chat: chat.toClientJSON() });
  } catch (error) {
    next(error);
  }
};

const updateChat = async (req, res, next) => {
  try {
    await connectDB();
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.userId });
    if (!chat) return res.status(404).json({ error: "Chat not found." });

    const body = req.body || {};
    if (typeof body.title === "string") chat.title = body.title;
    if (typeof body.titleIsCustom === "boolean")
      chat.titleIsCustom = body.titleIsCustom;
    if (Array.isArray(body.messages))
      chat.messages = await processMessages(body.messages);

    await chat.save();
    res.json({ chat: chat.toClientJSON() });
  } catch (error) {
    next(error);
  }
};

const deleteChat = async (req, res, next) => {
  try {
    await connectDB();
    const result = await Chat.deleteOne({
      _id: req.params.id,
      userId: req.userId
    });
    if (!result.deletedCount)
      return res.status(404).json({ error: "Chat not found." });
    res.json({ status: "success" });
  } catch (error) {
    next(error);
  }
};

// Bulk migration of guest chats on first login.
const migrateChats = async (req, res, next) => {
  try {
    await connectDB();
    const incoming = Array.isArray(req.body?.chats) ? req.body.chats : [];
    const saved = [];
    for (const c of incoming) {
      if (!Array.isArray(c?.messages) || !c.messages.length) continue;
      const messages = await processMessages(c.messages);
      let chat = c.clientId
        ? await Chat.findOne({ userId: req.userId, clientId: c.clientId })
        : null;
      if (chat) {
        chat.title = c.title || chat.title;
        chat.titleIsCustom = Boolean(c.titleIsCustom);
        chat.messages = messages;
        await chat.save();
      } else {
        chat = await Chat.create({
          userId: req.userId,
          clientId: c.clientId || c.id || null,
          title: c.title || "New Chat",
          titleIsCustom: Boolean(c.titleIsCustom),
          messages
        });
      }
      saved.push(chat.toClientJSON());
    }
    res.json({ chats: saved });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listChats,
  getChat,
  createChat,
  updateChat,
  deleteChat,
  migrateChats
};
