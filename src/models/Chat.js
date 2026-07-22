const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "bot"], required: true },
    content: { type: String, default: "" },
    timestamp: { type: Number, default: () => Date.now() },
    // Cloudinary URLs (not base64) once uploaded.
    images: { type: [String], default: undefined },
    audios: { type: [String], default: undefined },
    videos: { type: [String], default: undefined },
    pdfs: { type: [String], default: undefined }
  },
  { _id: false }
);

const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    // Client-generated id so guest chats can migrate without collisions.
    clientId: { type: String, default: null, index: true },
    title: { type: String, default: "New Chat" },
    titleIsCustom: { type: Boolean, default: false },
    messages: { type: [messageSchema], default: [] }
  },
  { timestamps: true }
);

chatSchema.methods.toClientJSON = function toClientJSON() {
  return {
    id: this.clientId || this._id.toString(),
    _id: this._id.toString(),
    title: this.title,
    titleIsCustom: this.titleIsCustom,
    messages: this.messages,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.models.Chat || mongoose.model("Chat", chatSchema);
