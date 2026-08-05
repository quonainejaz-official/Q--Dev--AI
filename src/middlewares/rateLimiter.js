const rateLimit = require("express-rate-limit");

// In-memory store for local dev; Mongo store for serverless (see configureForDB).
let store = undefined;

/**
 * Call once after DB is connected to enable Mongo-backed rate limiting.
 * Falls back to in-memory when MongoDB is not configured.
 */
const configureForDB = (db) => {
  try {
    const MongoStore = require("rate-limit-mongo");
    store = new MongoStore({
      uri: process.env.MONGODB_URI,
      collectionName: "rate_limits",
      expireTimeMs: 60 * 1000
    });
    console.log("[rate-limit] Using MongoDB store.");
  } catch (err) {
    console.warn("[rate-limit] Mongo store unavailable, using in-memory.", err.message);
  }
};

const createLimiter = ({
  windowMs = 60 * 1000,
  limit = 30,
  message,
  skipSuccessfulRequests = false
} = {}) =>
  rateLimit({
    windowMs,
    limit,
    store,
    skipSuccessfulRequests,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: message || { error: "Too many requests. Please slow down." }
  });

// General API limiter (existing behavior).
const apiLimiter = createLimiter({ limit: 30 });

// Stricter limiter for credential endpoints (brute-force protection).
// Successful sign-ins don't count — the budget is for *failed* attempts, so a
// legitimate user is never locked out by their own working logins.
const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  skipSuccessfulRequests: true,
  message: { error: "Too many authentication attempts. Please try again later." }
});

// Moderate limiter for chat CRUD.
const chatsLimiter = createLimiter({
  windowMs: 60 * 1000,
  limit: 60,
  message: { error: "Too many chat requests. Please slow down." }
});

module.exports = { apiLimiter, authLimiter, chatsLimiter, configureForDB };
