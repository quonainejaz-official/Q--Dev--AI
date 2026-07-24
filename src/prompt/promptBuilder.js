const { systemLayer, estimateTokens } = require("./layers/system");
const { recentLayer } = require("./layers/recent");
const { summaryLayer } = require("./layers/summary");
const { memoryLayer } = require("./layers/memory");

/**
 * Prompt Builder (3.3) — composes layered context to fit a token budget.
 *
 * Pipeline (highest priority first, truncate lowest first under budget):
 *   System Prompt (100) → Recent Messages (80) → Summary (70) → Memory (65) → Current Message
 *
 * @param {Object} ctx
 * @param {string} ctx.message - Current user message
 * @param {Array}  ctx.history - Recent message history [{role, content}]
 * @param {string|null} ctx.summary - Conversation summary
 * @param {Array}  ctx.memories - Retrieved memories [{text, type, importance}]
 * @param {Object} ctx.media - { images, audios, videos, pdfs }
 * @param {number} ctx.maxContextTokens - Total token budget (default 12000)
 * @returns {Array} messages array ready for the provider
 */
const buildPrompt = (ctx) => {
  const {
    message,
    history = [],
    summary = null,
    memories = [],
    media = {},
    maxContextTokens = 12000
  } = ctx;

  // Reserve tokens for the current message + media overhead.
  const currentMsgTokens = estimateTokens(message) + 1000; // buffer for media
  const availableForContext = maxContextTokens - currentMsgTokens - 500; // 500 for safety margin

  // Build layers with their token costs.
  const sys = systemLayer();
  const recent = recentLayer(history, Math.floor(availableForContext * 0.6));
  const summ = summaryLayer(summary);
  const mem = memoryLayer(memories, Math.floor(availableForContext * 0.2));

  // Budget allocation: system gets fixed, rest is split.
  const usedTokens = sys.tokens + recent.tokens + (summ?.tokens || 0) + (mem?.tokens || 0);

  // Build the messages array.
  const messages = [];

  // System prompt (always included).
  messages.push({ role: "system", content: sys.content });

  // Summary (if exists and fits).
  if (summ && usedTokens < availableForContext) {
    messages.push({ role: "user", content: summ.content });
    messages.push({ role: "assistant", content: "I understand the conversation summary. Continue." });
  }

  // Memory (if exists and fits).
  if (mem && usedTokens + (summ?.tokens || 0) < availableForContext) {
    messages.push({ role: "user", content: mem.content });
    messages.push({ role: "assistant", content: "I've noted these facts. Continue." });
  }

  // Recent messages.
  for (const msg of recent.messages) {
    messages.push({
      role: msg.role === "bot" ? "assistant" : "user",
      content: msg.content
    });
  }

  // Current user message with media.
  const userContent = buildUserContent(message, media);
  messages.push({ role: "user", content: userContent });

  return messages;
};

/**
 * Build the current user message content (supports multimodal).
 */
function buildUserContent(text, media = {}) {
  const { images, audios, videos, pdfs } = media;
  const hasMedia =
    (Array.isArray(images) && images.length) ||
    (Array.isArray(audios) && audios.length) ||
    (Array.isArray(videos) && videos.length) ||
    (Array.isArray(pdfs) && pdfs.length);

  if (!hasMedia) {
    return text || "";
  }

  const content = [];
  if (text) content.push({ type: "text", text });

  if (Array.isArray(images)) {
    for (const url of images) {
      content.push({ type: "image_url", image_url: { url } });
    }
  }
  if (Array.isArray(videos)) {
    for (const url of videos) {
      content.push({ type: "image_url", image_url: { url } });
    }
  }
  if (Array.isArray(audios)) {
    for (const dataUrl of audios) {
      const match = dataUrl.match(/^data:audio\/(\w+);base64,(.+)$/);
      if (match) {
        content.push({
          type: "input_audio",
          input_audio: { data: match[2], format: match[1] === "mpeg" ? "mp3" : match[1] }
        });
      }
    }
  }

  return content;
}

module.exports = { buildPrompt, buildUserContent, estimateTokens };
