/**
 * Share Controller (15) — generate and access shareable read-only chat links.
 */

const crypto = require("crypto");
const mongoose = require("mongoose");
const Chat = require("../models/Chat");
const Message = require("../models/Message");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

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
    if (!chat) return res.status(404).render("error", { message: "Chat not found or no longer shared." });

    const messages = await Message.find({ chatId: chat._id })
      .sort({ timestamp: 1 })
      .select("role content timestamp")
      .lean();

    res.render("shared", {
      chat: { title: chat.title, createdAt: chat.createdAt },
      messages,
      shareId
    });
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

    const chat = await Chat.findOne({ shareId, deletedAt: null });
    if (!chat) return res.status(404).json({ error: "Chat not found or no longer shared." });

    const messages = await Message.find({ chatId: chat._id })
      .sort({ timestamp: 1 })
      .select("role content timestamp")
      .lean();

    res.json({
      title: chat.title,
      createdAt: chat.createdAt,
      messages
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { toggleShare, getShareStatus, viewShared, getSharedChat };
