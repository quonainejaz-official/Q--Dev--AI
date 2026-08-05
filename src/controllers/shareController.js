/**
 * Share Controller (15) — generate and access shareable read-only chat links.
 */

const crypto = require("crypto");
const mongoose = require("mongoose");
const Chat = require("../models/Chat");
const Message = require("../models/Message");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const SharedChat = require("../models/SharedChat");

/**
 * Toggle share link for a chat.
 * POST /api/chats/:id/share
 *
 * If not shared, generates a shareId. If already shared, toggles off.
 * Returns { shareId, shareUrl }.
 */
const toggleShare = async (req, res, next) => {
  try {
    const userId = req.userId;
    const chatId = req.params.id;

    if (!isValidObjectId(chatId)) {
      return res.status(400).json({ error: "Invalid chat ID." });
    }

    const chat = await Chat.findOne({ _id: chatId, userId, deletedAt: null });
    if (!chat) return res.status(404).json({ error: "Chat not found." });

    if (chat.shareId) {
      // Already shared — toggle off.
      chat.shareId = null;
      chat.sharedAt = null;
      await chat.save();
      return res.json({ shared: false, shareId: null });
    }

    // Generate unique shareId.
    const shareId = crypto.randomBytes(8).toString("hex");
    chat.shareId = shareId;
    chat.sharedAt = new Date();
    await chat.save();

    const shareUrl = `${req.protocol}://${req.get("host")}/shared/${shareId}`;
    res.json({ shared: true, shareId, shareUrl });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a public shared chat from a guest (no auth required).
 * POST /api/public/share
 * Body: { title, messages }
 */
const shareGuest = async (req, res, next) => {
  try {
    const { title, messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const normalizedMessages = messages
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : m.role === "bot" ? "assistant" : "user",
        content: String(m.content || ""),
        timestamp: m.timestamp || Date.now()
      }))
      .filter((m) => m.content.trim().length > 0);

    const shareId = crypto.randomBytes(8).toString("hex");

    const shared = new SharedChat({ shareId, title: title || "Shared Chat", messages: normalizedMessages });
    await shared.save();

    const shareUrl = `${req.protocol}://${req.get("host")}/shared/${shareId}`;
    res.json({ shareId, shareUrl });
  } catch (err) {
    next(err);
  }
};

/**
 * Get share status for a chat.
 * GET /api/chats/:id/share
 */
const getShareStatus = async (req, res, next) => {
  try {
    const userId = req.userId;
    const chatId = req.params.id;

    if (!isValidObjectId(chatId)) {
      return res.status(400).json({ error: "Invalid chat ID." });
    }

    const chat = await Chat.findOne({ _id: chatId, userId, deletedAt: null }).select("shareId sharedAt");
    if (!chat) return res.status(404).json({ error: "Chat not found." });

    const shared = !!chat.shareId;
    const shareUrl = shared ? `${req.protocol}://${req.get("host")}/shared/${chat.shareId}` : null;
    res.json({ shared, shareId: chat.shareId, shareUrl });
  } catch (err) {
    next(err);
  }
};

/**
 * View a shared chat (public, no auth).
 * GET /shared/:shareId
 *
 * Returns read-only view of the chat.
 */
const viewShared = async (req, res, next) => {
  try {
    const { shareId } = req.params;

    const chat = await Chat.findOne({ shareId, deletedAt: null });
    if (chat) {
      const messages = await Message.find({ chatId: chat._id })
        .sort({ timestamp: 1 })
        .select("role content timestamp")
        .lean();

      const normalizedMessages = messages.map((m) => ({
        ...m,
        role: m.role === "bot" ? "assistant" : m.role
      }));

      return res.render("shared", {
        chat: { title: chat.title, createdAt: chat.createdAt },
        messages: normalizedMessages,
        shareId
      });
    }

    const shared = await SharedChat.findOne({ shareId });
    if (shared) {
      shared.views = (shared.views || 0) + 1;
      await shared.save().catch(() => {});

      const normalizedMessages = (shared.messages || []).map((m) => ({
        role: m.role === "bot" ? "assistant" : m.role,
        content: m.content,
        timestamp: m.timestamp
      }));

      return res.render("shared", {
        chat: { title: shared.title, createdAt: shared.createdAt },
        messages: normalizedMessages,
        shareId
      });
    }

    return res.status(404).render("error", { message: "Chat not found or no longer shared." });
  } catch (err) {
    next(err);
  }
};

/**
 * API endpoint for shared chat data (for client rendering).
 * GET /api/shared/:shareId
 */
const getSharedChat = async (req, res, next) => {
  try {
    const { shareId } = req.params;
    // Try Chat first (registered users)
    let chat = await Chat.findOne({ shareId, deletedAt: null });
    if (chat) {
      const messages = await Message.find({ chatId: chat._id })
        .sort({ timestamp: 1 })
        .select("role content timestamp")
        .lean();
      return res.json({ title: chat.title, createdAt: chat.createdAt, messages });
    }

    // Fallback: shared guest chats
    const shared = await SharedChat.findOne({ shareId });
    if (!shared) return res.status(404).json({ error: "Chat not found or no longer shared." });
    return res.json({ title: shared.title, createdAt: shared.createdAt, messages: shared.messages || [] });
  } catch (err) {
    next(err);
  }
};

module.exports = { toggleShare, getShareStatus, viewShared, getSharedChat, shareGuest };
