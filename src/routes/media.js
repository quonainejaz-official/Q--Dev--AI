const express = require("express");
const { requireAuth } = require("../middlewares/auth");
const {
  uploadFile,
  uploadFiles,
  deleteFile,
  getFileInfo,
  getSignedUploadUrl
} = require("../controllers/mediaController");

const router = express.Router();

router.use(requireAuth);

router.post("/signed-url", getSignedUploadUrl);
router.post("/upload", uploadFile);
router.post("/upload/batch", uploadFiles);
router.delete("/delete", deleteFile);
router.get("/:publicId", getFileInfo);

module.exports = router;
