const express = require("express");
const {
  postMessage,
  getHistory,
  clearHistory,
  setHistory
} = require("../controllers/chatController");

const router = express.Router();

router.get("/history", getHistory);
router.delete("/history", clearHistory);
router.put("/history", setHistory);
router.post("/message", postMessage);

module.exports = router;
