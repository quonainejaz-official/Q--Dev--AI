const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    role: { type: String, enum: ["user", "bot"], required: true },
    content: { type: String, default: "" },
    timestamp: { type: Number, default: () => Date.now() },
    images: { type: [String], default: undefined },
    audios: { type: [String], default: undefined },
    videos: { type: [String], default: undefined },
    pdfs: { type: [String], default: undefined },
    // Token accounting (2.12)
    model: { type: String, default: null },
    tokensIn: { type: Number, default: null },
    tokensOut: { type: Number, default: null },
    finishReason: { type: String, default: null }
  },
  { timestamps: true }
);

// Primary query: get messages for a chat, sorted by timestamp.
messageSchema.index({ chatId: 1, timestamp: 1 });

// User-level query: all messages for a user (for memory/RAG).
messageSchema.index({ userId: 1, timestamp: -1 });

// TTL: auto-delete messages from soft-deleted chats after 30 days.
// This is handled by the Chat TTL + cascade delete, not a message-level TTL.

messageSchema.set("toJSON", {
  transform(_doc, ret) {
    ret._id = ret._id.toString();
    ret.chatId = ret.chatId.toString();
    ret.userId = ret.userId.toString();
    return ret;
  }
});

module.exports = mongoose.models.Message || mongoose.model("Message", messageSchema);
