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
    avatar: { type: String, default: "" }
  },
  { timestamps: true }
);

// Never leak the password hash to the client.
userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    email: this.email,
    name: this.name,
    avatar: this.avatar
  };
};

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
