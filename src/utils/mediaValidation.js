const MEDIA_LIMITS = {
  images: { maxCount: 5, maxSizeMB: 5 },
  videos: { maxCount: 3, maxSizeMB: 50 },
  audios: { maxCount: 3, maxSizeMB: 25 },
  pdfs: { maxCount: 3, maxSizeMB: 25 }
};

const TOTAL_MAX_MEDIA_BYTES = 100 * 1024 * 1024; // 100MB total cap

const estimateBase64Bytes = (dataUrl) => {
  if (typeof dataUrl !== "string") return 0;
  const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
  if (!match) return 0;
  return Math.ceil(match[1].length * 0.75);
};

const isHttpUrl = (s) => typeof s === "string" && /^https?:\/\//i.test(s);

const validateMedia = (body) => {
  const errors = [];
  let totalBytes = 0;

  for (const [kind, limits] of Object.entries(MEDIA_LIMITS)) {
    const arr = body?.[kind];
    if (!Array.isArray(arr) || arr.length === 0) continue;

    if (arr.length > limits.maxCount) {
      errors.push(
        `Too many ${kind}: ${arr.length} provided, maximum is ${limits.maxCount}.`
      );
    }

    const maxBytes = limits.maxSizeMB * 1024 * 1024;
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      // Already-hosted URLs skip size check (server doesn't re-download them).
      if (isHttpUrl(item)) continue;

      const bytes = estimateBase64Bytes(item);
      totalBytes += bytes;
      if (bytes > maxBytes) {
        const sizeMB = (bytes / (1024 * 1024)).toFixed(1);
        errors.push(
          `${kind}[${i}] is ${sizeMB}MB — exceeds the ${limits.maxSizeMB}MB limit.`
        );
      }
    }
  }

  if (totalBytes > TOTAL_MAX_MEDIA_BYTES) {
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
    errors.push(
      `Total media size (${totalMB}MB) exceeds the ${TOTAL_MAX_MEDIA_BYTES / (1024 * 1024)}MB combined limit.`
    );
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

module.exports = { validateMedia, MEDIA_LIMITS };
