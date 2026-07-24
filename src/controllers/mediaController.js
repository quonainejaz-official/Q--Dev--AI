const { connectDB } = require("../services/db");
const { 
  uploadSingle, 
  uploadMany, 
  deleteResource, 
  isCloudinaryConfigured,
  generateSignedUploadUrl 
} = require("../services/cloudinaryService");

// Upload single file
const uploadFile = async (req, res, next) => {
  try {
    if (!isCloudinaryConfigured()) {
      return res.status(503).json({ 
        error: "File upload is not available (Cloudinary not configured)." 
      });
    }

    const { file, resourceType } = req.body;
    
    if (!file || typeof file !== 'string') {
      return res.status(400).json({ error: "File data is required" });
    }

    const result = await uploadSingle(file, { 
      resourceType: resourceType || 'auto' 
    });

    res.json({ 
      url: result.url, 
      publicId: result.publicId,
      resourceType: result.resourceType 
    });
  } catch (error) {
    next(error);
  }
};

// Upload multiple files
const uploadFiles = async (req, res, next) => {
  try {
    if (!isCloudinaryConfigured()) {
      return res.status(503).json({ 
        error: "File upload is not available (Cloudinary not configured)." 
      });
    }

    const { files, resourceType } = req.body;
    
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "Files array is required" });
    }

    const results = await uploadMany(files, { 
      resourceType: resourceType || 'auto' 
    });

    res.json({ 
      files: results.map(r => ({
        url: r.url,
        publicId: r.publicId,
        resourceType: r.resourceType
      }))
    });
  } catch (error) {
    next(error);
  }
};

// Delete file
const deleteFile = async (req, res, next) => {
  try {
    if (!isCloudinaryConfigured()) {
      return res.status(503).json({ 
        error: "File deletion is not available (Cloudinary not configured)." 
      });
    }

    const { publicId, resourceType } = req.body;
    
    if (!publicId) {
      return res.status(400).json({ error: "Public ID is required" });
    }

    await deleteResource(publicId, resourceType);

    res.json({ status: "success", message: "File deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// Get file info (if needed for PWA)
const getFileInfo = async (req, res, next) => {
  try {
    if (!isCloudinaryConfigured()) {
      return res.status(503).json({ 
        error: "File info is not available (Cloudinary not configured)." 
      });
    }

    const { publicId } = req.params;
    
    if (!publicId) {
      return res.status(400).json({ error: "Public ID is required" });
    }

    // Cloudinary admin API would be needed here
    // For now, return basic info from publicId
    res.json({ 
      publicId,
      url: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}`
    });
  } catch (error) {
    next(error);
  }
};

// Returns a signed URL for direct client-to-Cloudinary upload (3.6).
const getSignedUploadUrl = (req, res, next) => {
  try {
    if (!isCloudinaryConfigured()) {
      return res.status(503).json({ error: "Cloudinary is not configured." });
    }
    const { resourceType, folder } = req.body;
    const result = generateSignedUploadUrl({
      resourceType: resourceType || "auto",
      folder: folder || "q-dev-ai"
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadFile,
  uploadFiles,
  deleteFile,
  getFileInfo,
  getSignedUploadUrl
};
