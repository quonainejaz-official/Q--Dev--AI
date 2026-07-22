const cloudinary = require("cloudinary").v2;

let configured = false;

const configure = () => {
  if (configured) return true;
  const {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET
  } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return false;
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET
  });
  configured = true;
  return true;
};

const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

// Uploads a single data URL / remote URL and returns the secure Cloudinary URL.
// `resourceType` should be "image", "video", or "raw" (for pdf/audio use raw).
const uploadOne = async (source, { folder = "q-dev-ai", resourceType = "auto" } = {}) => {
  if (!configure()) {
    throw new Error("Cloudinary is not configured.");
  }
  // If it's already a hosted URL (not a data URL), keep it as-is.
  if (typeof source === "string" && /^https?:\/\//i.test(source)) {
    return source;
  }
  const result = await cloudinary.uploader.upload(source, {
    folder,
    resource_type: resourceType
  });
  return result.secure_url;
};

// Uploads an array of data URLs; returns array of hosted URLs. Failures are
// skipped so a single bad asset doesn't break saving the whole chat.
const uploadMany = async (sources, opts) => {
  if (!Array.isArray(sources) || !sources.length) return [];
  const results = await Promise.allSettled(
    sources.map((s) => uploadOne(s, opts))
  );
  return results
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value);
};

module.exports = { uploadOne, uploadMany, isCloudinaryConfigured };
