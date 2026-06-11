const express = require("express");
const { getIndex } = require("../controllers/pageController");

const router = express.Router();

router.get("/", getIndex);

module.exports = router;
