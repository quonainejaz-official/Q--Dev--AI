const express = require("express");
const { requireAuth } = require("../middlewares/auth");
const {
  getProfile,
  updateProfile,
  updatePreferences,
  changePassword,
  deleteAccount
} = require("../controllers/userController");

const router = express.Router();

router.use(requireAuth);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/preferences", updatePreferences);
router.post("/change-password", changePassword);
router.delete("/account", deleteAccount);

module.exports = router;
