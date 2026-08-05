const mongoose = require("mongoose");

const sharedChatSchema = new mongoose.Schema(
  {
    shareId: { type: String, required: true, unique: true },
    title: { type: String, default: "Shared Chat" },
    messages: { type: Array, default: [] },
    views: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.models.SharedChat || mongoose.model("SharedChat", sharedChatSchema);
