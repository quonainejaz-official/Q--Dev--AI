const express = require("express");
const {
  postMessage,
  postGenerateImage,
  getHistory,
  clearHistory,
  setHistory
} = require("../controllers/chatController");

const router = express.Router();

router.get("/history", getHistory);
router.delete("/history", clearHistory);
router.put("/history", setHistory);
router.post("/message", postMessage);
router.post("/generate-image", postGenerateImage);

module.exports = router;
