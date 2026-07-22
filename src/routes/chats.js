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

const router = express.Router();

router.use(requireAuth);

router.get("/", listChats);
router.post("/", createChat);
router.post("/migrate", migrateChats);
router.get("/:id", getChat);
router.put("/:id", updateChat);
router.delete("/:id", deleteChat);

module.exports = router;
