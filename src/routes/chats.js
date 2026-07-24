const express = require("express");
const { requireAuth } = require("../middlewares/auth");
const {
  listChats,
  getChat,
  createChat,
  updateChat,
  deleteChat,
  migrateChats
} = require("../controllers/chatsController");
const { searchMessages } = require("../controllers/searchChatsController");
const { toggleShare, getShareStatus } = require("../controllers/shareController");

const router = express.Router();

router.use(requireAuth);

router.get("/search", searchMessages);
router.get("/", listChats);
router.post("/", createChat);
router.post("/migrate", migrateChats);
router.get("/:id", getChat);
router.put("/:id", updateChat);
router.delete("/:id", deleteChat);
router.get("/:id/share", getShareStatus);
router.post("/:id/share", toggleShare);

module.exports = router;
