// Load environment variables BEFORE any module that reads process.env at import.
require("dotenv").config();

const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const morgan = require("morgan");
const indexRoutes = require("./routes/index");
const apiRoutes = require("./routes/api");
const authRoutes = require("./routes/auth");
const chatsRoutes = require("./routes/chats");
const { attachUser } = require("./middlewares/auth");
const { apiLimiter } = require("./middlewares/rateLimiter");
const { notFoundHandler, errorHandler } = require("./middlewares/errorHandler");

const app = express();

// Startup diagnostics — helps confirm .env actually loaded.
console.log(
  `[config] MongoDB: ${process.env.MONGODB_URI ? "configured" : "NOT configured"} | ` +
    `Google: ${process.env.GOOGLE_CLIENT_ID ? "configured" : "NOT configured"} | ` +
    `Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME ? "configured" : "NOT configured"}`
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));

app.use(morgan("dev"));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(attachUser);

app.use(express.static(path.join(__dirname, "..", "public")));

app.use("/", indexRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/chats", chatsRoutes);
app.use("/api", apiLimiter, apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app };
