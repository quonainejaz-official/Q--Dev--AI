const { estimateTokens } = require("./system");

/**
 * Recent messages layer — the most recent N messages from the conversation.
 * Priority: 80 (high, but truncatable below system/safety).
 *
 * @param {Array} messages - Array of { role, content, ... }
 * @param {number} maxTokens - Token budget for this layer
 * @returns {{ role: 'context', messages: Array, priority: number, tokens: number }}
 */
const recentLayer = (messages, maxTokens = 8000) => {
  if (!Array.isArray(messages) || !messages.length) {
    return { role: "context", messages: [], priority: 80, tokens: 0 };
  }

  // Walk backwards, accumulating messages until we hit the token budget.
  const result = [];
  let totalTokens = 0;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const msgTokens = estimateTokens(msg.content);
    if (totalTokens + msgTokens > maxTokens) break;
    result.unshift(msg);
    totalTokens += msgTokens;
  }

  return {
    role: "context",
    messages: result,
    priority: 80,
    tokens: totalTokens
  };
};

module.exports = { recentLayer };
