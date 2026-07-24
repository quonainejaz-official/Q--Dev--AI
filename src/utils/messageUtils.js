const validator = require("validator");

const MAX_MESSAGE_LENGTH = Number.parseInt(
  process.env.MAX_MESSAGE_LENGTH || "50000",
  10
);
const MAX_MESSAGE_LINES = 5000;
const MAX_MESSAGE_WORDS = 50000;
const MAX_HISTORY_LENGTH = Number.parseInt(
  process.env.MAX_HISTORY_LENGTH || "20",
  10
);

const countLines = (text) => {
  if (!text) return 0;
  return text.split(/\r\n|\r|\n/).length;
};

const countWords = (text) => {
  const trimmed = validator.trim(text);
  if (!trimmed) return 0;
  const matches = trimmed.match(/\S+/g);
  return matches ? matches.length : 0;
};

const validateMessage = (message) => {
  if (typeof message !== "string") {
    return { valid: false, error: "Message must be a string." };
  }
  const trimmed = validator.trim(message);
  if (!trimmed) {
    return { valid: false, error: "Message cannot be empty." };
  }
  if (!validator.isLength(trimmed, { min: 1, max: MAX_MESSAGE_LENGTH })) {
    return {
      valid: false,
      error: `Message must be ${MAX_MESSAGE_LENGTH} characters or less.`
    };
  }
  if (countLines(trimmed) > MAX_MESSAGE_LINES) {
    return {
      valid: false,
      error: `Message must be ${MAX_MESSAGE_LINES} lines or less.`
    };
  }
  if (countWords(trimmed) > MAX_MESSAGE_WORDS) {
    return {
      valid: false,
      error: `Message must be ${MAX_MESSAGE_WORDS} words or less.`
    };
  }
  return { valid: true, value: trimmed };
};

const sanitizeMessage = (message) => validator.escape(message);

module.exports = {
  MAX_MESSAGE_LENGTH,
  MAX_MESSAGE_LINES,
  MAX_MESSAGE_WORDS,
  MAX_HISTORY_LENGTH,
  validateMessage,
  sanitizeMessage
};
