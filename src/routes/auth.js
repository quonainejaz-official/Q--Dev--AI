const express = require("express");
const {
  register,
  login,
  googleAuth,
  logout,
  me
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleAuth);
router.post("/logout", logout);
router.get("/me", me);

module.exports = router;
