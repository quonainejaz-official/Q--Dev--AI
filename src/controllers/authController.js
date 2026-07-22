const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const validator = require("validator");
const { connectDB, isDbConfigured } = require("../services/db");
const User = require("../models/User");
const {
  signToken,
  setAuthCookie,
  clearAuthCookie
} = require("../middlewares/auth");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const ensureDb = async (res) => {
  if (!isDbConfigured()) {
    res
      .status(503)
      .json({ error: "Login is not available (database not configured)." });
    return false;
  }
  try {
    await connectDB();
    return true;
  } catch (error) {
    console.error("[db] connection failed:", error.message);
    res.status(503).json({
      error:
        "Could not reach the database. Check MONGODB_URI and that your IP is allowed in MongoDB Atlas Network Access."
    });
    return false;
  }
};

const issueSession = (res, user) => {
  const token = signToken(user._id.toString());
  setAuthCookie(res, token);
  return res.json({ user: user.toPublicJSON() });
};

const register = async (req, res, next) => {
  try {
    if (!(await ensureDb(res))) return;

    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || "");
    const name = String(req.body?.name || "").trim();

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "A valid email is required." });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters." });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "This email is already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      passwordHash,
      name: name || email.split("@")[0]
    });

    return issueSession(res, user);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    if (!(await ensureDb(res))) return;

    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || "");

    const user = await User.findOne({ email });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    return issueSession(res, user);
  } catch (error) {
    next(error);
  }
};

const googleAuth = async (req, res, next) => {
  try {
    if (!(await ensureDb(res))) return;
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res
        .status(503)
        .json({ error: "Google sign-in is not configured." });
    }

    const credential = String(req.body?.credential || "");
    if (!credential) {
      return res.status(400).json({ error: "Missing Google credential." });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = (payload.email || "").toLowerCase();

    let user = await User.findOne({ $or: [{ googleId }, { email }] });
    if (!user) {
      user = await User.create({
        email,
        googleId,
        name: payload.name || email.split("@")[0],
        avatar: payload.picture || ""
      });
    } else if (!user.googleId) {
      // Link Google to an existing email account.
      user.googleId = googleId;
      if (!user.avatar && payload.picture) user.avatar = payload.picture;
      await user.save();
    }

    return issueSession(res, user);
  } catch (error) {
    next(error);
  }
};

const logout = (_req, res) => {
  clearAuthCookie(res);
  res.json({ status: "success" });
};

const me = async (req, res, next) => {
  try {
    if (!req.userId || !isDbConfigured()) {
      return res.json({ user: null });
    }
    await connectDB();
    const user = await User.findById(req.userId);
    return res.json({ user: user ? user.toPublicJSON() : null });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, googleAuth, logout, me };
