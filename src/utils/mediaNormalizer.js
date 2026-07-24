/**
 * Media Normalizer (4.3) — normalizes media across providers.
 *
 * Each provider handles images/audio differently:
 * - OpenAI/OpenCode: { type: "image_url", image_url: { url } }
 * - Anthropic: { type: "image", source: { type: "base64", media_type, data } }
 * - Gemini: { inlineData: { mimeType, data } }
 *
 * This module converts raw media arrays into provider-specific formats.
 */

/**
 * Detect media type from a data URL or URL.
 * @param {string} url
 * @returns {string} MIME type
 */
const detectMediaType = (url) => {
  if (!url) return "image/png";
  const match = url.match(/^data:(image\/\w+|audio\/\w+|video\/\w+);/);
  if (match) return match[1];
  if (url.includes(".png")) return "image/png";
  if (url.includes(".jpg") || url.includes(".jpeg")) return "image/jpeg";
  if (url.includes(".gif")) return "image/gif";
  if (url.includes(".webp")) return "image/webp";
  if (url.includes(".mp3")) return "audio/mpeg";
  if (url.includes(".wav")) return "audio/wav";
  if (url.includes(".mp4")) return "video/mp4";
  return "image/png";
};

/**
 * Extract base64 data from a data URL.
 * @param {string} dataUrl
 * @returns {string|null} base64 data (without prefix)
 */
const extractBase64 = (dataUrl) => {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
  return match ? match[1] : null;
};

/**
 * Convert images to OpenAI/OpenCode format.
 * @param {string[]} images - Array of data URLs or HTTP URLs
 * @returns {Array} OpenAI-compatible image content parts
 */
const toOpenAIFormat = (images) => {
  if (!Array.isArray(images)) return [];
  return images.map((url) => ({
    type: "image_url",
    image_url: { url }
  }));
};

/**
 * Convert images to Anthropic format.
 * @param {string[]} images - Array of data URLs or HTTP URLs
 * @returns {Array} Anthropic-compatible image content parts
 */
const toAnthropicFormat = (images) => {
  if (!Array.isArray(images)) return [];
  return images.map((url) => {
    const mediaType = detectMediaType(url);
    const base64Data = url.startsWith("data:") ? extractBase64(url) : null;
    if (base64Data) {
      return {
        type: "image",
        source: { type: "base64", media_type: mediaType, data: base64Data }
      };
    }
    // HTTP URL — use url type (Anthropic supports this).
    return {
      type: "image",
      source: { type: "url", url }
    };
  });
};

/**
 * Convert images to Gemini format.
 * @param {string[]} images - Array of data URLs
 * @returns {Array} Gemini-compatible parts
 */
const toGeminiFormat = (images) => {
  if (!Array.isArray(images)) return [];
  return images.map((url) => {
    const mediaType = detectMediaType(url);
    const base64Data = extractBase64(url);
    if (base64Data) {
      return {
        inlineData: { mimeType: mediaType, data: base64Data }
      };
    }
    // HTTP URL — not supported by Gemini inlineData; return as text reference.
    return { text: `[Image: ${url}]` };
  });
};

/**
 * Convert audio to OpenAI format.
 * @param {string[]} audios - Array of data URLs
 * @returns {Array}
 */
const audioToOpenAIFormat = (audios) => {
  if (!Array.isArray(audios)) return [];
  return audios.map((dataUrl) => {
    const match = dataUrl.match(/^data:audio\/(\w+);base64,(.+)$/);
    if (!match) return null;
    return {
      type: "input_audio",
      input_audio: { data: match[2], format: match[1] === "mpeg" ? "mp3" : match[1] }
    };
  }).filter(Boolean);
};

module.exports = {
  detectMediaType,
  extractBase64,
  toOpenAIFormat,
  toAnthropicFormat,
  toGeminiFormat,
  audioToOpenAIFormat
};
