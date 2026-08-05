const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    clientId: { type: String, default: null },
    title: { type: String, default: "New Chat" },
    titleIsCustom: { type: Boolean, default: false },
    messageCount: { type: Number, default: 0 },
    // Soft delete (2.16) — null means not deleted.
    deletedAt: { type: Date, default: null },
    // Shareable link (15) — null means not shared.
    shareId: { type: String, default: null },
    sharedAt: { type: Date, default: null },
    shareViews: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// --- Indexes (2.13) ---

// Primary query: list chats for a user, sorted by most recent.
chatSchema.index({ userId: 1, updatedAt: -1 });

// Soft-delete filter: exclude deleted chats from all queries by default.
chatSchema.index({ userId: 1, deletedAt: 1, updatedAt: -1 });

// Guest chat migration lookup.
chatSchema.index({ userId: 1, clientId: 1 }, { unique: true, sparse: true });

// Shareable link lookup (15).
chatSchema.index({ shareId: 1 }, { unique: true, sparse: true });

// TTL: auto-delete soft-deleted chats after 30 days (2.17).
chatSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 2592000, partialFilterExpression: { deletedAt: { $type: "date" } } });

// --- Soft-delete helpers (2.16) ---

// Auto-filter deleted docs on find/findOne/findOneAndUpdate.
const autoFilter = function () {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
};

chatSchema.pre("find", autoFilter);
chatSchema.pre("findOne", autoFilter);
chatSchema.pre("findOneAndUpdate", autoFilter);
chatSchema.pre("countDocuments", autoFilter);
chatSchema.pre("aggregate", function () {
  // Add soft-delete filter to aggregation pipelines unless already present.
  const hasDeletedAt = this.pipeline().some((stage) => {
    const match = stage.$match;
    return match && "deletedAt" in match;
  });
  if (!hasDeletedAt) {
    this.pipeline().unshift({ $match: { deletedAt: null } });
  }
});

// --- Methods ---

chatSchema.methods.softDelete = function softDelete() {
  this.deletedAt = new Date();
  return this.save();
};

chatSchema.methods.restore = function restore() {
  this.deletedAt = null;
  return this.save();
};

chatSchema.methods.toClientJSON = function toClientJSON() {
  return {
    id: this.clientId || this._id.toString(),
    _id: this._id.toString(),
    title: this.title,
    titleIsCustom: this.titleIsCustom,
    messageCount: this.messageCount,
    shareId: this.shareId || null,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.models.Chat || mongoose.model("Chat", chatSchema);
