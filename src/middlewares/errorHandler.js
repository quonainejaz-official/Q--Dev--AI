const notFoundHandler = (req, res) => {
  res.status(404).json({ error: "Not found." });
};

const errorHandler = (err, req, res, _next) => {
  const isProd = process.env.NODE_ENV === "production";

  // Log with request ID for correlation.
  const requestId = req.id || "unknown";
  console.error(`[error] [${requestId}] ${err.message}`);
  if (!isProd) {
    console.error(err.stack);
  }

  if (res.headersSent) {
    return;
  }

  // Never leak internals in production.
  const message = isProd ? "Internal server error." : err.message;
  res.status(err.status || 500).json({ error: message });
};

module.exports = { notFoundHandler, errorHandler };
