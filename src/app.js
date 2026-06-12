const path = require("path");
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");
const indexRoutes = require("./routes/index");
const apiRoutes = require("./routes/api");
const { apiLimiter } = require("./middlewares/rateLimiter");
const { notFoundHandler, errorHandler } = require("./middlewares/errorHandler");

dotenv.config();

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));

app.use(morgan("dev"));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "local-dev-secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    }
  })
);

app.use(express.static(path.join(__dirname, "..", "public")));

app.use("/", indexRoutes);
app.use("/api", apiLimiter, apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app };
