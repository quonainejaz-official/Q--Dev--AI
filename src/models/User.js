const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    // Only present for email/password accounts.
    passwordHash: { type: String, default: null },
    // Only present for Google accounts.
    googleId: { type: String, default: null, index: true },
    name: { type: String, default: "" },
    avatar: { type: String, default: "" },
    // User preferences for PWA
    preferences: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      language: { type: String, default: 'en' },
      notifications: { type: Boolean, default: true },
      fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' }
    },
    // Account status
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

// Index for soft delete
userSchema.index({ deletedAt: 1 });

// Never leak the password hash to the client.
userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    email: this.email,
    name: this.name,
    avatar: this.avatar,
    preferences: this.preferences
  };
};

// Soft delete method
userSchema.methods.softDelete = function softDelete() {
  this.isActive = false;
  this.deletedAt = new Date();
  return this.save();
};

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
