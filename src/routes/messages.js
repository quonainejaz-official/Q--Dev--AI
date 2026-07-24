const express = require("express");
const { requireAuth } = require("../middlewares/auth");
const {
  getMessage,
  editMessage,
  deleteMessage,
  bulkDeleteMessages
} = require("../controllers/messagesController");

const router = express.Router();

router.use(requireAuth);

router.get("/:id", getMessage);
router.put("/:id", editMessage);
router.delete("/:id", deleteMessage);
router.post("/bulk-delete", bulkDeleteMessages);

module.exports = router;
