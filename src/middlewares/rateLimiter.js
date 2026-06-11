const rateLimit = require("express-rate-limit");

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." }
});

module.exports = { apiLimiter };
