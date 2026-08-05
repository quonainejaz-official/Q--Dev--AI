const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const isRetriableStatus = (status) => status === 429 || (status >= 500 && status <= 599);

/**
 * Base provider with common retry + error handling.
 * Each concrete provider extends this and implements stream() + chat().
 */
class BaseProvider {
  constructor(name, config = {}) {
    this.name = name;
    this.maxRetries = config.maxRetries || 3;
    this.retryBaseDelayMs = config.retryBaseDelayMs || 600;
  }

  /**
   * Provider capabilities declaration.
   * Subclasses override this.
   */
  get capabilities() {
    return {
      chat: true,
      streaming: true,
      vision: false,
      audio: false,
      embeddings: false,
      tools: false,
      maxContext: 4096,
      models: []
    };
  }

  /** Check if this provider can handle the given model. */
  supportsModel(model) {
    return this.capabilities.models.includes(model);
  }

  /** Check if this provider supports the required capabilities. */
  canHandle(requirements) {
    for (const [key, needed] of Object.entries(requirements)) {
      if (needed && this.capabilities[key] === false) return false;
    }
    return true;
  }

  /**
   * Non-streaming chat completion.
   * @param {Object} params - { messages, model, ... }
   * @returns {Object} - { content, usage, finishReason }
   */
  async chat(params) {
    throw new Error(`${this.name}: chat() not implemented`);
  }

  /**
   * Streaming chat completion.
   * Yields typed events: { type: 'token', text } | { type: 'done', usage? } | { type: 'error', error }
   * @param {Object} params - { messages, model, ... }
   */
  async *stream(params) {
    throw new Error(`${this.name}: stream() not implemented`);
  }

  /** Fetch with retry on transient failures. */
  async fetchWithRetry(url, options = {}) {
    let lastError;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) return response;

        const errorText = await response.text().catch(() => "");
        if (!isRetriableStatus(response.status) || attempt === this.maxRetries - 1) {
          throw new Error(`${this.name} API error (${response.status}): ${errorText}`);
        }
        lastError = new Error(`${this.name} API error (${response.status}): ${errorText}`);
      } catch (error) {
        lastError = error;
        if (attempt === this.maxRetries - 1) throw error;
      }
      await sleep(this.retryBaseDelayMs * Math.pow(2, attempt));
    }
    throw lastError || new Error(`${this.name} request failed.`);
  }

  /** Parse SSE stream from a fetch response into typed events. */
  async *parseSSEStream(response) {
    if (!response.body) {
      throw new Error(`${this.name}: No response body for streaming.`);
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let lastUsage = null;
    let sawDone = false;

    const processLine = (line) => {
      if (!line || line.startsWith(":")) return null;
      if (!line.startsWith("data:")) return null;
      const data = line.slice(5).trim();
      if (data === "[DONE]") {
        sawDone = true;
        return { type: "done", usage: lastUsage || null };
      }

      let payload;
      try {
        payload = JSON.parse(data);
      } catch {
        return null;
      }

      if (payload.error) {
        const error = typeof payload.error === "string"
          ? payload.error
          : payload.error.message || JSON.stringify(payload.error);
        return { type: "error", error };
      }

      if (payload.usage) {
        lastUsage = {
          tokensIn: payload.usage.prompt_tokens || 0,
          tokensOut: payload.usage.completion_tokens || 0,
          model: payload.model || null
        };
      }

      const token = this.extractToken(payload);
      return token ? { type: "token", text: token } : null;
    };

    const processBuffer = (flush = false) => {
      const events = [];
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        const event = processLine(line);
        if (event) events.push(event);
        if (sawDone) break;
      }

      if (flush && buffer.trim() && !sawDone) {
        const event = processLine(buffer.trim());
        if (event) events.push(event);
        buffer = "";
      }

      return events;
    };

    if (typeof response.body.getReader === "function") {
      const reader = response.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const events = processBuffer();
          for (const evt of events) yield evt;
          if (sawDone) return;
        }
      } finally {
        try { reader.releaseLock(); } catch { /* ignore */ }
      }
    } else if (typeof response.body[Symbol.asyncIterator] === "function") {
      for await (const chunk of response.body) {
        buffer += decoder.decode(chunk, { stream: true });

        const events = processBuffer();
        for (const evt of events) yield evt;
        if (sawDone) return;
      }
    } else if (typeof response.body[Symbol.iterator] === "function") {
      for (const chunk of response.body) {
        buffer += decoder.decode(chunk, { stream: true });

        const events = processBuffer();
        for (const evt of events) yield evt;
        if (sawDone) return;
      }
    } else {
      throw new Error(`${this.name}: Response body is not readable.`);
    }

    const events = processBuffer(true);
    for (const evt of events) yield evt;
    if (!sawDone) yield { type: "done", usage: lastUsage || null };
  }

  /** Override in subclass to extract token from provider-specific payload. */
  extractToken(payload) {
    const choice = payload?.choices?.[0];
    return (
      choice?.delta?.content ||
      choice?.message?.content ||
      choice?.text ||
      null
    );
  }
}

module.exports = { BaseProvider };
