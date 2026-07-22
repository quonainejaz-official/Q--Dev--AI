const jwt = require("jsonwebtoken");

const COOKIE_NAME = "qai_token";

const getJwtSecret = () => process.env.JWT_SECRET || "local-dev-jwt-secret";

const signToken = (userId) =>
  jwt.sign({ uid: userId }, getJwtSecret(), { expiresIn: "30d" });

const setAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });
};

const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME);
};

// Attaches req.userId if a valid token is present; never rejects.
const attachUser = (req, _res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    try {
      const payload = jwt.verify(token, getJwtSecret());
      req.userId = payload.uid;
    } catch (error) {
      req.userId = null;
    }
  }
  next();
};

// Rejects the request when no valid user is present.
const requireAuth = (req, res, next) => {
  if (!req.userId) {
    return res.status(401).json({ error: "Authentication required." });
  }
  next();
};

module.exports = {
  COOKIE_NAME,
  signToken,
  setAuthCookie,
  clearAuthCookie,
  attachUser,
  requireAuth
};
