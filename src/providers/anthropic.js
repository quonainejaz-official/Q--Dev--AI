const { BaseProvider } = require("./base");

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

const DEFAULT_MODELS = ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"];

class AnthropicProvider extends BaseProvider {
  constructor(config = {}) {
    super("anthropic", config);
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    this.apiUrl = config.apiUrl || ANTHROPIC_API_URL;
    this.defaultModel = config.defaultModel || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
  }

  get capabilities() {
    return {
      chat: true,
      streaming: true,
      vision: true,
      audio: false,
      embeddings: false,
      tools: true,
      maxContext: 200000,
      models: DEFAULT_MODELS
    };
  }

  _getHeaders() {
    return {
      "Content-Type": "application/json",
      "x-api-key": this.apiKey,
      "anthropic-version": ANTHROPIC_VERSION
    };
  }

  _convertMessages(history, text, images) {
    const messages = [];

    if (Array.isArray(history)) {
      for (const item of history) {
        messages.push({
          role: item.role === "bot" ? "assistant" : "user",
          content: item.content
        });
      }
    }

    const content = [];
    if (text) content.push({ type: "text", text });
    if (Array.isArray(images)) {
      for (const url of images) {
        const mediaType = url.match(/^data:(image\/\w+);/)?.[1] || "image/png";
        const base64Data = url.replace(/^data:[^;]+;base64,/, "");
        content.push({
          type: "image",
          source: { type: "base64", media_type: mediaType, data: base64Data }
        });
      }
    }

    messages.push({ role: "user", content });
    return messages;
  }

  async chat({ messages, model, tools }) {
    const payload = {
      model: model || this.defaultModel,
      max_tokens: 4096,
      messages
    };
    if (tools) payload.tools = tools;
    const body = JSON.stringify(payload);
    const response = await this.fetchWithRetry(this.apiUrl, {
      method: "POST",
      headers: this._getHeaders(),
      body
    });
    const data = await response.json();
    return {
      content: data.content || null,
      usage: data.usage || null,
      finishReason: data.stop_reason || null
    };
  }

  async *stream({ messages, model }) {
    const body = JSON.stringify({
      model: model || this.defaultModel,
      max_tokens: 4096,
      stream: true,
      messages
    });
    const response = await this.fetchWithRetry(this.apiUrl, {
      method: "POST",
      headers: this._getHeaders(),
      body
    });

    if (!response.body) {
      throw new Error(`${this.name}: No response body for streaming.`);
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let lastUsage = null;

    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });

      let newlineIndex;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);

        if (!line.startsWith("event: ")) continue;
        const event = line.slice(7).trim();

        // Read the next line (data:)
        const dataLineIndex = buffer.indexOf("\n");
        if (dataLineIndex === -1) break;
        const dataLine = buffer.slice(0, dataLineIndex).trim();
        buffer = buffer.slice(dataLineIndex + 1);

        if (!dataLine.startsWith("data: ")) continue;
        let payload;
        try {
          payload = JSON.parse(dataLine.slice(6));
        } catch {
          continue;
        }

        if (event === "message_start" && payload.message?.usage) {
          lastUsage = {
            tokensIn: payload.message.usage.input_tokens || 0,
            tokensOut: 0,
            model: payload.message.model || null
          };
        } else if (event === "message_delta" && payload.usage) {
          if (lastUsage) {
            lastUsage.tokensOut = payload.usage.output_tokens || 0;
          }
        } else if (event === "content_block_delta" && payload.type === "content_block_delta") {
          if (payload.delta?.type === "text_delta" && payload.delta.text) {
            yield { type: "token", text: payload.delta.text };
          }
        } else if (event === "message_stop") {
          yield { type: "done", usage: lastUsage || null };
          return;
        }
      }
    }

    yield { type: "done", usage: lastUsage || null };
  }
}

module.exports = { AnthropicProvider };
