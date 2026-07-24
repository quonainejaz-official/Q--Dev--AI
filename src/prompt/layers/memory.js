const { estimateTokens } = require("./system");

/**
 * Memory layer — retrieved user memories/facts from vector search.
 * Priority: 65 (below summary, above current message).
 *
 * @param {Array} memories - Array of { text, type, importance }
 * @param {number} maxTokens - Token budget for this layer
 * @returns {{ role: 'context', content: string|null, priority: number, tokens: number }|null}
 */
const memoryLayer = (memories, maxTokens = 2000) => {
  if (!Array.isArray(memories) || !memories.length) {
    return null;
  }

  // Sort by importance descending, take what fits.
  const sorted = [...memories].sort((a, b) => (b.importance || 0) - (a.importance || 0));
  const lines = [];
  let totalTokens = 0;

  for (const mem of sorted) {
    if (!mem.text) continue;
    const line = `- [${mem.type || "fact"}] ${mem.text}`;
    const lineTokens = estimateTokens(line);
    if (totalTokens + lineTokens > maxTokens) break;
    lines.push(line);
    totalTokens += lineTokens;
  }

  if (!lines.length) return null;

  const content = `[User facts and preferences]:\n${lines.join("\n")}`;

  return {
    role: "context",
    content,
    priority: 65,
    tokens: totalTokens
  };
};

module.exports = { memoryLayer };
