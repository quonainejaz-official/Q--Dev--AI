const { isDbConfigured } = require("../services/db");
const { registry } = require("../providers/registry");

/**
 * Liveness probe — is the process alive?
 * Used by load balancers / K8s to decide if the container should restart.
 */
const liveness = (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
};

/**
 * Readiness probe — is the service ready to accept traffic?
 * Checks DB connectivity and provider availability.
 */
const readiness = async (_req, res) => {
  const checks = {
    db: "skipped",
    providers: "ok"
  };

  // Check DB if configured.
  if (isDbConfigured()) {
    try {
      const { connectDB } = require("../services/db");
      const mongoose = require("mongoose");
      await connectDB();
      checks.db = mongoose.connection.readyState === 1 ? "ok" : "degraded";
    } catch (err) {
      checks.db = "error";
      checks.dbError = err.message;
    }
  }

  // Check providers.
  const providers = registry.list();
  if (providers.length === 0) {
    checks.providers = "error";
    checks.providersError = "No AI providers configured.";
  }

  const allOk = Object.values(checks).every((v) => v === "ok" || v === "skipped");
  res.status(allOk ? 200 : 503).json({
    status: allOk ? "ok" : "degraded",
    checks,
    uptime: process.uptime()
  });
};

module.exports = { liveness, readiness };
