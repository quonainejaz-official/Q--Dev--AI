const notFoundHandler = (req, res) => {
  res.status(404).json({ error: "Not found." });
};

const errorHandler = (err, req, res, next) => {
  console.error(err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: "Internal server error." });
};

module.exports = { notFoundHandler, errorHandler };
