const express = require("express");
const { liveness, readiness } = require("../controllers/healthController");

const router = express.Router();

router.get("/healthz", liveness);
router.get("/readyz", readiness);

module.exports = router;
