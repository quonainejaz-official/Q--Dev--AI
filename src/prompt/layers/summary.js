const { estimateTokens } = require("./system");

/**
 * Summary layer — a rolling summary of older conversation history.
 * Priority: 70 (below recent messages, above user profile).
 *
 * @param {string|null} summary - The conversation summary text (null if none)
 * @returns {{ role: 'context', content: string|null, priority: number, tokens: number }|null}
 */
const summaryLayer = (summary) => {
  if (!summary || typeof summary !== "string" || !summary.trim()) {
    return null;
  }

  const content = `[Conversation summary of earlier messages]:\n${summary.trim()}`;

  return {
    role: "context",
    content,
    priority: 70,
    tokens: estimateTokens(content)
  };
};

module.exports = { summaryLayer };
