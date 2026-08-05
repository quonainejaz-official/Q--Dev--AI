const express = require("express");
const { authLimiter } = require("../middlewares/rateLimiter");
const {
  register,
  login,
  googleAuth,
  logout,
  me
} = require("../controllers/authController");

const router = express.Router();

// Brute-force protection belongs on the endpoints that accept credentials.
// GET /me is a session read that runs on every page load, and /logout must
// always be reachable — counting those against the limit locks legitimate
// users out (and silently signs them back out on the next refresh).
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/google", authLimiter, googleAuth);
router.post("/logout", logout);
router.get("/me", me);

module.exports = router;
