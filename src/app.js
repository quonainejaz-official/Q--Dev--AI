require("dotenv").config();
const { validateEnv } = require("./config/env");
validateEnv();

const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const morgan = require("morgan");
const indexRoutes = require("./routes/index");
const apiRoutes = require("./routes/api");
const authRoutes = require("./routes/auth");
const chatsRoutes = require("./routes/chats");
const healthRoutes = require("./routes/health");
const searchRoutes = require("./routes/search");
const usersRoutes = require("./routes/users");
const messagesRoutes = require("./routes/messages");
const mediaRoutes = require("./routes/media");
const { attachUser } = require("./middlewares/auth");
const { apiLimiter, chatsLimiter } = require("./middlewares/rateLimiter");
const { notFoundHandler, errorHandler } = require("./middlewares/errorHandler");
const { initProviders } = require("./providers/registry");
const { viewShared, getSharedChat } = require("./controllers/shareController");

// --- Initialize AI providers (2.1) ---
initProviders();

const app = express();

// --- Request ID (every request gets a unique X-Request-Id) ---
app.use((req, res, next) => {
  req.id = req.headers["x-request-id"] || crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
});

// --- Security headers (CSP in report-only initially — 1.8) ---
const isProd = process.env.NODE_ENV === "production";
app.use(helmet({
  contentSecurityPolicy: isProd ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://accounts.google.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://*.googleusercontent.com"],
      connectSrc: ["'self'", "https://accounts.google.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameSrc: ["'self'", "https://accounts.google.com"],
      formAction: ["'self'", "https://accounts.google.com"],
      objectSrc: ["'none'"]
    }
  } : false,
  crossOriginEmbedderPolicy: false,
  // Google Identity Services signs in via a popup that posts the credential
  // back to window.opener. COOP "same-origin" (helmet's default) nulls out
  // the opener, so the popup hangs on accounts.google.com/gsi/transform and
  // the callback never fires. "same-origin-allow-popups" keeps the isolation
  // for embedders while letting our own popups talk back to us.
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  // GSI requires the origin to be sent; helmet's default "no-referrer" breaks it.
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

// --- MongoDB injection protection ---
app.use(mongoSanitize({ replaceWith: "_" }));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));

app.use(morgan("dev"));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true
  })
);

// --- Consistent body size limits (both json + urlencoded) ---
const MAX_BODY_SIZE = process.env.MAX_BODY_SIZE || "4mb";
app.use(express.json({ limit: MAX_BODY_SIZE }));
app.use(express.urlencoded({ extended: true, limit: MAX_BODY_SIZE }));
app.use(cookieParser());
app.use(attachUser);

app.use(express.static(path.join(__dirname, "..", "public")));

// --- Routes with rate limiting ---
app.use("/healthz", healthRoutes);
app.use("/readyz", healthRoutes);
app.use("/", indexRoutes);
// authRoutes applies authLimiter per-route (credential endpoints only).
app.use("/api/auth", authRoutes);
app.use("/api/users", chatsLimiter, usersRoutes);
app.use("/api/chats", chatsLimiter, chatsRoutes);
app.use("/api/messages", chatsLimiter, messagesRoutes);
app.use("/api/media", chatsLimiter, mediaRoutes);
app.use("/api/search", apiLimiter, searchRoutes);
app.use("/api/shared", viewShared);
app.get("/api/shared/:shareId", getSharedChat);
app.get("/shared/:shareId", viewShared);
app.use("/api", apiLimiter, apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

// --- Enable Mongo-backed rate limiter when DB is available (1.4) ---
if (process.env.MONGODB_URI) {
  const { configureForDB } = require("./middlewares/rateLimiter");
  configureForDB();
}

module.exports = { app };
