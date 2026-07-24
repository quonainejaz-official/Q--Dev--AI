const Message = require("../models/Message");
const { estimateTokens } = require("../prompt/layers/system");

const SUMMARIZE_THRESHOLD = 40; // summarize when history exceeds this many messages
const MAX_HISTORY_MESSAGES = 60; // hard cap on messages sent to prompt

/**
 * Context Manager (3.1) — manages conversation context for the prompt builder.
 *
 * Responsibilities:
 * - Fetch recent messages from the Message collection
 * - Detect when summarization is needed
 * - Build the context object for the prompt builder
 */
class ContextManager {
  constructor(options = {}) {
    this.summarizeThreshold = options.summarizeThreshold || SUMMARIZE_THRESHOLD;
    this.maxHistory = options.maxHistory || MAX_HISTORY_MESSAGES;
  }

  /**
   * Fetch recent messages for a chat.
   * @param {string} chatId
   * @param {string} userId
   * @param {number} limit - Max messages to fetch
   * @returns {Promise<Array>} messages sorted oldest-first
   */
  async fetchMessages(chatId, userId, limit = this.maxHistory) {
    const messages = await Message.find({ chatId, userId })
      .sort({ timestamp: -1 })
      .limit(limit);

    // Reverse to oldest-first order for the prompt.
    return messages.reverse();
  }

  /**
   * Check if summarization is needed.
   * @param {string} chatId
   * @param {string} userId
   * @returns {Promise<boolean>}
   */
  async needsSummarization(chatId, userId) {
    const count = await Message.countDocuments({ chatId, userId });
    return count > this.summarizeThreshold;
  }

  /**
   * Build the context object for the prompt builder.
   * @param {Object} params
   * @param {string} params.chatId
   * @param {string} params.userId
   * @param {string} params.message - Current user message
   * @param {Object} params.media - { images, audios, videos, pdfs }
   * @param {string|null} params.summary - Existing conversation summary
   * @param {Array} params.memories - Retrieved memories
   * @param {number} params.maxContextTokens
   * @returns {Promise<Object>} context object for buildPrompt
   */
  async buildContext({
    chatId,
    userId,
    message,
    media = {},
    summary = null,
    memories = [],
    maxContextTokens = 12000
  }) {
    const history = await this.fetchMessages(chatId, userId);

    return {
      message,
      history,
      summary,
      memories,
      media,
      maxContextTokens
    };
  }
}

module.exports = { ContextManager, SUMMARIZE_THRESHOLD, MAX_HISTORY_MESSAGES };
