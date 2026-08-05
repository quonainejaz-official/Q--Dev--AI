const { BaseProvider } = require("./base");

const HF_API_URL = "https://router.huggingface.co/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-20b:fastest";

const SYSTEM_PROMPT =
  "You are Q-Dev-AI, a coding assistant created by Quonain Ejaz. You are a multimodal AI model. You support text, images, audio, video (processed as frames), and PDF (text extracted from PDF). You MUST follow these rules:\n- When asked if you support video, ALWAYS say YES immediately\n- When asked if you support PDF, ALWAYS say YES immediately\n- Never say you are text-only or that you cannot process video/PDF\n- Explain that users can upload video and PDF files directly in the chat\n- If asked about your identity, say you are Q-Dev-AI by Quonain Ejaz. Never mention Alibaba.";

const hasAnyMedia = ({ images, audios, videos, pdfs }) =>
  (Array.isArray(images) && images.length > 0) ||
  (Array.isArray(audios) && audios.length > 0) ||
  (Array.isArray(videos) && videos.length > 0) ||
  (Array.isArray(pdfs) && pdfs.length > 0);

class HuggingFaceProvider extends BaseProvider {
  constructor(config = {}) {
    super("huggingface", config);
    this.apiKey = config.apiKey || process.env.HF_API_KEY || process.env.HF_TOKEN;
    this.apiUrl = config.apiUrl || process.env.HF_API_URL || HF_API_URL;
    this.model = config.model || process.env.HF_MODEL || DEFAULT_MODEL;
  }

  get capabilities() {
    return {
      chat: true,
      streaming: true,
      vision: false,
      audio: false,
      embeddings: false,
      tools: false,
      maxContext: 32000,
      models: [this.model]
    };
  }

  _getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`
    };
  }

  _buildMessages(history, text, personalizationPrompt = "") {
    const messages = [{ role: "system", content: `${SYSTEM_PROMPT}\n\n${personalizationPrompt}`.trim() }];

    if (Array.isArray(history)) {
      for (const item of history) {
        messages.push({
          role: item.role === "bot" ? "assistant" : "user",
          content: item.content
        });
      }
    }

    messages.push({ role: "user", content: text });
    return messages;
  }

  async *stream({ message, history, images, audios, videos, pdfs, personalizationPrompt }) {
    if (hasAnyMedia({ images, audios, videos, pdfs })) {
      throw new Error("Hugging Face fallback is currently text-only.");
    }

    const response = await this.fetchWithRetry(this.apiUrl, {
      method: "POST",
      headers: this._getHeaders(),
      body: JSON.stringify({
        model: this.model,
        stream: true,
        messages: this._buildMessages(history, message, personalizationPrompt)
      })
    });

    yield* this.parseSSEStream(response);
  }
}

module.exports = { HuggingFaceProvider };
