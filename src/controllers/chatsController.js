const mongoose = require("mongoose");
const { connectDB } = require("../services/db");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const {
  uploadMany,
  isCloudinaryConfigured
} = require("../services/cloudinaryService");
const { MAX_HISTORY_LENGTH } = require("../utils/messageUtils");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

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

// Cursor-based pagination (2.15). Pass ?cursor=<updatedAt ISO>&limit=<n>.
const listChats = async (req, res, next) => {
  try {
    await connectDB();
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const cursor = req.query.cursor;

    const query = { userId: req.userId };
    if (cursor) {
      const cursorDate = new Date(cursor);
      if (isNaN(cursorDate.getTime())) {
        return res.status(400).json({ error: "Invalid cursor." });
      }
      query.updatedAt = { $lt: cursorDate };
    }

    const chats = await Chat.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit + 1); // fetch one extra to detect "has more"

    const hasMore = chats.length > limit;
    const items = hasMore ? chats.slice(0, limit) : chats;
    const nextCursor = hasMore ? items[items.length - 1].updatedAt.toISOString() : null;

    res.json({
      chats: items.map((c) => c.toClientJSON()),
      nextCursor
    });
  } catch (error) {
    next(error);
  }
};

const getChat = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid chat ID." });
    }
    await connectDB();
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.userId });
    if (!chat) return res.status(404).json({ error: "Chat not found." });

    // Fetch messages from the Message collection.
    const messages = await Message.find({ chatId: chat._id, userId: req.userId })
      .sort({ timestamp: 1 });

    res.json({
      chat: {
        ...chat.toClientJSON(),
        messages: messages.map((m) => ({
          _id: m._id.toString(),
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
          images: m.images,
          audios: m.audios,
          videos: m.videos,
          pdfs: m.pdfs,
          model: m.model,
          tokensIn: m.tokensIn,
          tokensOut: m.tokensOut,
          finishReason: m.finishReason
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

const createChat = async (req, res, next) => {
  try {
    await connectDB();
    const body = req.body || {};
    const processedMsgs = await processMessages(body.messages);

    let chat = null;
    if (body.clientId) {
      chat = await Chat.findOne({ userId: req.userId, clientId: body.clientId });
    }

    if (chat) {
      chat.title = body.title || chat.title;
      chat.titleIsCustom = Boolean(body.titleIsCustom);
      await chat.save();

      // Replace messages: delete old, insert new.
      if (Array.isArray(body.messages)) {
        await Message.deleteMany({ chatId: chat._id, userId: req.userId });
        if (processedMsgs.length) {
          const docs = processedMsgs.map((m) => ({ ...m, chatId: chat._id, userId: req.userId }));
          await Message.insertMany(docs);
        }
        chat.messageCount = processedMsgs.length;
        await chat.save();
      }
    } else {
      chat = await Chat.create({
        userId: req.userId,
        clientId: body.clientId || null,
        title: body.title || "New Chat",
        titleIsCustom: Boolean(body.titleIsCustom),
        messageCount: processedMsgs.length
      });

      if (processedMsgs.length) {
        const docs = processedMsgs.map((m) => ({ ...m, chatId: chat._id, userId: req.userId }));
        await Message.insertMany(docs);
      }
    }

    res.json({ chat: chat.toClientJSON() });
  } catch (error) {
    next(error);
  }
};

const updateChat = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid chat ID." });
    }
    await connectDB();
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.userId });
    if (!chat) return res.status(404).json({ error: "Chat not found." });

    const body = req.body || {};
    if (typeof body.title === "string") chat.title = body.title;
    if (typeof body.titleIsCustom === "boolean")
      chat.titleIsCustom = body.titleIsCustom;

    if (Array.isArray(body.messages)) {
      const processedMsgs = await processMessages(body.messages);
      await Message.deleteMany({ chatId: chat._id, userId: req.userId });
      if (processedMsgs.length) {
        const docs = processedMsgs.map((m) => ({ ...m, chatId: chat._id, userId: req.userId }));
        await Message.insertMany(docs);
      }
      chat.messageCount = processedMsgs.length;
    }

    await chat.save();
    res.json({ chat: chat.toClientJSON() });
  } catch (error) {
    next(error);
  }
};

// Soft delete (2.16) instead of hard delete.
const deleteChat = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid chat ID." });
    }
    await connectDB();
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.userId });
    if (!chat) return res.status(404).json({ error: "Chat not found." });

    await chat.softDelete();
    // Messages are left in place — TTL on Chat + orphan cleanup handles them.
    res.json({ status: "success" });
  } catch (error) {
    next(error);
  }
};

// Bulk migration of guest chats on first login.
// Uses includeDeleted option to bypass soft-delete filter.
const migrateChats = async (req, res, next) => {
  try {
    await connectDB();
    const incoming = Array.isArray(req.body?.chats) ? req.body.chats : [];
    const saved = [];
    for (const c of incoming) {
      if (!Array.isArray(c?.messages) || !c.messages.length) continue;
      const processedMsgs = await processMessages(c.messages);
      let chat = c.clientId
        ? await Chat.findOne(
            { userId: req.userId, clientId: c.clientId },
            null,
            { includeDeleted: true }
          )
        : null;

      if (chat) {
        chat.title = c.title || chat.title;
        chat.titleIsCustom = Boolean(c.titleIsCustom);
        chat.deletedAt = null; // restore if previously soft-deleted
        chat.messageCount = processedMsgs.length;
        await chat.save();

        // Replace messages.
        await Message.deleteMany({ chatId: chat._id, userId: req.userId });
        if (processedMsgs.length) {
          const docs = processedMsgs.map((m) => ({ ...m, chatId: chat._id, userId: req.userId }));
          await Message.insertMany(docs);
        }
      } else {
        chat = await Chat.create({
          userId: req.userId,
          clientId: c.clientId || c.id || null,
          title: c.title || "New Chat",
          titleIsCustom: Boolean(c.titleIsCustom),
          messageCount: processedMsgs.length
        });

        if (processedMsgs.length) {
          const docs = processedMsgs.map((m) => ({ ...m, chatId: chat._id, userId: req.userId }));
          await Message.insertMany(docs);
        }
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
