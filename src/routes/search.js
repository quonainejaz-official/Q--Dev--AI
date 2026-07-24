const express = require("express");
const { requireAuth } = require("../middlewares/auth");
const { postSearch } = require("../controllers/searchController");

const router = express.Router();

router.use(requireAuth);

router.post("/", postSearch);

module.exports = router;
