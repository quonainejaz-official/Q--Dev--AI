const { connectDB, isDbConfigured } = require("../services/db");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const validator = require("validator");

// Get user profile
const getProfile = async (req, res, next) => {
  try {
    if (!req.userId || !isDbConfigured()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    await connectDB();
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({ user: user.toPublicJSON() });
  } catch (error) {
    next(error);
  }
};

// Update user profile
const updateProfile = async (req, res, next) => {
  try {
    if (!req.userId || !isDbConfigured()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    await connectDB();
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { name, avatar } = req.body;

    if (name !== undefined) {
      user.name = String(name).trim();
    }
    if (avatar !== undefined) {
      user.avatar = String(avatar).trim();
    }

    await user.save();
    return res.json({ user: user.toPublicJSON() });
  } catch (error) {
    next(error);
  }
};

// Update user preferences
const updatePreferences = async (req, res, next) => {
  try {
    if (!req.userId || !isDbConfigured()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    await connectDB();
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { theme, language, notifications, fontSize } = req.body;

    if (theme !== undefined) {
      if (!['light', 'dark', 'system'].includes(theme)) {
        return res.status(400).json({ error: "Invalid theme value" });
      }
      user.preferences.theme = theme;
    }
    if (language !== undefined) {
      user.preferences.language = String(language).trim();
    }
    if (notifications !== undefined) {
      user.preferences.notifications = Boolean(notifications);
    }
    if (fontSize !== undefined) {
      if (!['small', 'medium', 'large'].includes(fontSize)) {
        return res.status(400).json({ error: "Invalid fontSize value" });
      }
      user.preferences.fontSize = fontSize;
    }

    await user.save();
    return res.json({ user: user.toPublicJSON() });
  } catch (error) {
    next(error);
  }
};

// Change password
const changePassword = async (req, res, next) => {
  try {
    if (!req.userId || !isDbConfigured()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    await connectDB();
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { currentPassword, newPassword } = req.body;

    if (!user.passwordHash) {
      return res.status(400).json({ error: "Account uses Google auth, cannot change password" });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ status: "success", message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
};

// Delete account
const deleteAccount = async (req, res, next) => {
  try {
    if (!req.userId || !isDbConfigured()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    await connectDB();
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { password } = req.body;

    // For email/password accounts, verify password
    if (user.passwordHash) {
      if (!password) {
        return res.status(400).json({ error: "Password is required to delete account" });
      }
      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        return res.status(401).json({ error: "Incorrect password" });
      }
    }

    // Soft delete the user
    await user.softDelete();

    return res.json({ status: "success", message: "Account deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updatePreferences,
  changePassword,
  deleteAccount
};
