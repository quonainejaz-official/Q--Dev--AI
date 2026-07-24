const { BaseProvider } = require("./base");

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

const DEFAULT_MODELS = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"];

class OpenAIProvider extends BaseProvider {
  constructor(config = {}) {
    super("openai", config);
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.apiUrl = config.apiUrl || OPENAI_API_URL;
    this.defaultModel = config.defaultModel || process.env.OPENAI_MODEL || "gpt-4o";
  }

  get capabilities() {
    return {
      chat: true,
      streaming: true,
      vision: true,
      audio: false,
      embeddings: false,
      tools: true,
      maxContext: 128000,
      models: DEFAULT_MODELS
    };
  }

  _getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`
    };
  }

  async chat({ messages, model, tools, tool_choice }) {
    const payload = { model: model || this.defaultModel, messages };
    if (tools) payload.tools = tools;
    if (tool_choice) payload.tool_choice = tool_choice;
    const body = JSON.stringify(payload);
    const response = await this.fetchWithRetry(this.apiUrl, {
      method: "POST",
      headers: this._getHeaders(),
      body
    });
    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || null,
      tool_calls: data.choices?.[0]?.message?.tool_calls || null,
      usage: data.usage || null,
      finishReason: data.choices?.[0]?.finish_reason || null
    };
  }

  async *stream({ messages, model }) {
    const body = JSON.stringify({
      model: model || this.defaultModel,
      stream: true,
      stream_options: { include_usage: true },
      messages
    });
    const response = await this.fetchWithRetry(this.apiUrl, {
      method: "POST",
      headers: this._getHeaders(),
      body
    });
    yield* this.parseSSEStream(response);
  }
}

module.exports = { OpenAIProvider };
