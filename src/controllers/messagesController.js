const mongoose = require("mongoose");
const { connectDB } = require("../services/db");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const { requireAuth } = require("../middlewares/auth");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Get single message
const getMessage = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid message ID." });
    }
    await connectDB();
    const message = await Message.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });
    if (!message) return res.status(404).json({ error: "Message not found." });

    res.json({
      message: {
        _id: message._id.toString(),
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        images: message.images,
        audios: message.audios,
        videos: message.videos,
        pdfs: message.pdfs,
        model: message.model,
        tokensIn: message.tokensIn,
        tokensOut: message.tokensOut,
        finishReason: message.finishReason
      }
    });
  } catch (error) {
    next(error);
  }
};

// Edit message content
const editMessage = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid message ID." });
    }
    await connectDB();
    const message = await Message.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });
    if (!message) return res.status(404).json({ error: "Message not found." });

    const { content } = req.body;
    if (content !== undefined) {
      message.content = String(content);
    }

    await message.save();

    // Update chat's updatedAt timestamp
    await Chat.findByIdAndUpdate(message.chatId, { 
      updatedAt: new Date() 
    });

    res.json({
      message: {
        _id: message._id.toString(),
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        images: message.images,
        audios: message.audios,
        videos: message.videos,
        pdfs: message.pdfs,
        model: message.model,
        tokensIn: message.tokensIn,
        tokensOut: message.tokensOut,
        finishReason: message.finishReason
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete message
const deleteMessage = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid message ID." });
    }
    await connectDB();
    const message = await Message.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });
    if (!message) return res.status(404).json({ error: "Message not found." });

    const chatId = message.chatId;
    await Message.deleteOne({ _id: req.params.id, userId: req.userId });

    // Update chat message count
    const chat = await Chat.findById(chatId);
    if (chat) {
      chat.messageCount = Math.max(0, chat.messageCount - 1);
      await chat.save();
    }

    res.json({ status: "success", message: "Message deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// Bulk delete messages
const bulkDeleteMessages = async (req, res, next) => {
  try {
    const { messageIds } = req.body;
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: "messageIds array is required" });
    }

    // Validate all IDs
    const validIds = messageIds.filter(isValidObjectId);
    if (validIds.length === 0) {
      return res.status(400).json({ error: "No valid message IDs provided" });
    }

    await connectDB();
    
    // Find messages to get chat info
    const messages = await Message.find({
      _id: { $in: validIds },
      userId: req.userId
    });

    if (messages.length === 0) {
      return res.status(404).json({ error: "No messages found" });
    }

    // Group by chatId to update counts
    const chatUpdates = {};
    messages.forEach(msg => {
      const chatId = msg.chatId.toString();
      chatUpdates[chatId] = (chatUpdates[chatId] || 0) + 1;
    });

    // Delete messages
    await Message.deleteMany({
      _id: { $in: validIds },
      userId: req.userId
    });

    // Update chat message counts
    for (const [chatId, count] of Object.entries(chatUpdates)) {
      await Chat.findByIdAndUpdate(chatId, {
        $inc: { messageCount: -count },
        updatedAt: new Date()
      });
    }

    res.json({ 
      status: "success", 
      message: `Deleted ${messages.length} messages successfully` 
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMessage,
  editMessage,
  deleteMessage,
  bulkDeleteMessages
};
