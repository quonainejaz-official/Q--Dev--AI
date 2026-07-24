/**
 * Chat Search Controller (14) — search messages across user's chats.
 */

const mongoose = require("mongoose");
const Chat = require("../models/Chat");
const Message = require("../models/Message");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Search messages by text query.
 * GET /api/chats/search?q=<query>&limit=<n>
 *
 * Returns matching messages with chat context.
 */
const searchMessages = async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const query = (req.query.q || "").trim();
    if (!query) return res.status(400).json({ error: "Query is required." });

    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    // Find all user's chat IDs.
    const chatIds = await Chat.find({ userId, deletedAt: null })
      .select("_id")
      .lean()
      .then((chats) => chats.map((c) => c._id));

    if (!chatIds.length) return res.json({ results: [], total: 0 });

    // Search messages with text index (or regex fallback).
    let messages;
    try {
      // Try text search first (requires text index on content).
      messages = await Message.find({
        chatId: { $in: chatIds },
        content: { $regex: query, $options: "i" }
      })
        .select("chatId role content timestamp")
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
    } catch {
      // Fallback: regex search.
      messages = await Message.find({
        chatId: { $in: chatIds },
        content: { $regex: query, $options: "i" }
      })
        .select("chatId role content timestamp")
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
    }

    // Enrich with chat titles.
    const chatIdsUnique = [...new Set(messages.map((m) => m.chatId.toString()))];
    const chats = await Chat.find({ _id: { $in: chatIdsUnique } })
      .select("_id title")
      .lean();
    const chatMap = {};
    for (const c of chats) chatMap[c._id.toString()] = c.title;

    const results = messages.map((m) => ({
      chatId: m.chatId,
      chatTitle: chatMap[m.chatId.toString()] || "Untitled",
      role: m.role,
      content: m.content.slice(0, 300),
      timestamp: m.timestamp,
      matchPreview: getMatchPreview(m.content, query)
    }));

    res.json({ results, total: results.length, query });
  } catch (err) {
    next(err);
  }
};

/**
 * Extract a short preview around the first match.
 */
const getMatchPreview = (content, query) => {
  const lower = content.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return content.slice(0, 100);

  const start = Math.max(0, idx - 40);
  const end = Math.min(content.length, idx + query.length + 40);
  let preview = content.slice(start, end);
  if (start > 0) preview = "..." + preview;
  if (end < content.length) preview = preview + "...";
  return preview;
};

module.exports = { searchMessages };
