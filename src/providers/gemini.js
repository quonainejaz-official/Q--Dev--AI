const { BaseProvider } = require("./base");

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const DEFAULT_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro", "gemini-1.5-flash"];

class GeminiProvider extends BaseProvider {
  constructor(config = {}) {
    super("gemini", config);
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    this.defaultModel = config.defaultModel || process.env.GEMINI_MODEL || "gemini-2.0-flash";
  }

  get capabilities() {
    return {
      chat: true,
      streaming: true,
      vision: true,
      audio: false,
      embeddings: false,
      tools: false,
      maxContext: 1000000,
      models: DEFAULT_MODELS
    };
  }

  _getApiUrl(model, stream = false) {
    const action = stream ? "streamGenerateContent?alt=sse" : "generateContent";
    return `${GEMINI_BASE_URL}/${model}:${action}`;
  }

  _getHeaders() {
    return { "Content-Type": "application/json" };
  }

  _convertMessages(history, text, images) {
    const contents = [];

    if (Array.isArray(history)) {
      for (const item of history) {
        contents.push({
          role: item.role === "bot" ? "model" : "user",
          parts: [{ text: item.content }]
        });
      }
    }

    const parts = [];
    if (text) parts.push({ text });
    if (Array.isArray(images)) {
      for (const url of images) {
        const match = url.match(/^data:image\/(\w+);base64,(.+)$/);
        if (match) {
          parts.push({
            inlineData: { mimeType: `image/${match[1] === "jpeg" ? "jpeg" : match[1]}`, data: match[2] }
          });
        }
      }
    }

    contents.push({ role: "user", parts });
    return contents;
  }

  async chat({ messages, model }) {
    const url = `${this._getApiUrl(model || this.defaultModel)}?key=${this.apiKey}`;
    const body = JSON.stringify({ contents: messages });
    const response = await this.fetchWithRetry(url, {
      method: "POST",
      headers: this._getHeaders(),
      body
    });
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    return {
      content: text,
      usage: data.usageMetadata || null,
      finishReason: data.candidates?.[0]?.finishReason || null
    };
  }

  async *stream({ messages, model }) {
    const url = this._getApiUrl(model || this.defaultModel, true) + `&key=${this.apiKey}`;
    const body = JSON.stringify({ contents: messages });
    const response = await this.fetchWithRetry(url, {
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

        if (!line || !line.startsWith("data:")) continue;
        const data = line.slice(5).trim();

        let payload;
        try {
          payload = JSON.parse(data);
        } catch {
          continue;
        }

        if (payload.usageMetadata) {
          lastUsage = {
            tokensIn: payload.usageMetadata.promptTokenCount || 0,
            tokensOut: payload.usageMetadata.candidatesTokenCount || 0,
            model: model || this.defaultModel
          };
        }

        const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) yield { type: "token", text };
      }
    }

    yield { type: "done", usage: lastUsage || null };
  }
}

module.exports = { GeminiProvider };
