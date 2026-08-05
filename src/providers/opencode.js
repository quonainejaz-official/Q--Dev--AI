const { BaseProvider } = require("./base");
const pdfParse = require("pdf-parse");

const OPENCODE_API_URL = "https://opencode.ai/zen/v1/chat/completions";
const VISION_MODEL = "mimo-v2.5-free";
const CHAT_MODEL = "big-pickle";

const extractAudioData = (dataUrl) => {
  const match = dataUrl.match(/^data:audio\/(\w+);base64,(.+)$/);
  if (match) {
    return { data: match[2], format: match[1] === "mpeg" ? "mp3" : match[1] };
  }
  return null;
};

const dataUrlToBuffer = (dataUrl) => {
  const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
  if (!match) return null;
  return Buffer.from(match[1], "base64");
};

const extractPdfText = async (dataUrl) => {
  try {
    const buf = dataUrlToBuffer(dataUrl);
    if (!buf) return null;
    const result = await pdfParse(buf);
    return result.text?.trim() || null;
  } catch {
    return null;
  }
};

const hasAnyMedia = ({ images, audios, videos, pdfs }) =>
  (Array.isArray(images) && images.length > 0) ||
  (Array.isArray(audios) && audios.length > 0) ||
  (Array.isArray(videos) && videos.length > 0) ||
  (Array.isArray(pdfs) && pdfs.length > 0);

const SYSTEM_PROMPT =
  "You are Q-Dev-AI, a coding assistant created by Quonain Ejaz. You are a multimodal AI model. You support text, images, audio, video (processed as frames), and PDF (text extracted from PDF). You MUST follow these rules:\n- When asked if you support video, ALWAYS say YES immediately\n- When asked if you support PDF, ALWAYS say YES immediately\n- Never say you are text-only or that you cannot process video/PDF\n- Explain that users can upload video and PDF files directly in the chat\n- If asked about your identity, say you are Q-Dev-AI by Quonain Ejaz. Never mention Alibaba.";

class OpenCodeProvider extends BaseProvider {
  constructor(config = {}) {
    super("opencode", config);
    this.apiKey = config.apiKey || process.env.OPENCODE_API_KEY;
    this.apiUrl = config.apiUrl || OPENCODE_API_URL;
  }

  get capabilities() {
    return {
      chat: true,
      streaming: true,
      vision: true,
      audio: true,
      embeddings: false,
      tools: false,
      maxContext: 128000,
      models: [CHAT_MODEL, VISION_MODEL]
    };
  }

  _getHeaders() {
    const headers = { "Content-Type": "application/json" };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  _pickModel(params) {
    return hasAnyMedia(params) ? VISION_MODEL : CHAT_MODEL;
  }

  async _buildMessages(history, text, images, audios, videos, pdfs) {
    const messages = [{ role: "system", content: SYSTEM_PROMPT }];

    if (Array.isArray(history)) {
      for (const item of history) {
        messages.push({
          role: item.role === "bot" ? "assistant" : "user",
          content: item.content
        });
      }
    }

    const mediaContent = [];
    if (text) mediaContent.push({ type: "text", text });
    if (Array.isArray(images)) {
      for (const url of images) {
        mediaContent.push({ type: "image_url", image_url: { url } });
      }
    }
    if (Array.isArray(audios)) {
      for (const dataUrl of audios) {
        const audioData = extractAudioData(dataUrl);
        if (audioData) {
          mediaContent.push({
            type: "input_audio",
            input_audio: { data: audioData.data, format: audioData.format }
          });
        }
      }
    }
    if (Array.isArray(videos)) {
      for (const dataUrl of videos) {
        mediaContent.push({ type: "image_url", image_url: { url: dataUrl } });
      }
    }
    if (Array.isArray(pdfs)) {
      for (const dataUrl of pdfs) {
        const pdfText = await extractPdfText(dataUrl);
        if (pdfText) {
          mediaContent.push({ type: "text", text: `[Content extracted from attached PDF]:\n${pdfText}` });
        }
      }
    }

    const content = hasAnyMedia({ images, audios, videos, pdfs }) ? mediaContent : (text || "");
    messages.push({ role: "user", content });
    return messages;
  }

  async chat({ messages, model }) {
    const body = JSON.stringify({ model, messages });
    const response = await this.fetchWithRetry(this.apiUrl, {
      method: "POST",
      headers: this._getHeaders(),
      body
    });
    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || null,
      usage: data.usage || null,
      finishReason: data.choices?.[0]?.finish_reason || null
    };
  }

  async *stream({ message, history, images, audios, videos, pdfs }) {
    const model = this._pickModel({ images, audios, videos, pdfs });
    const messages = await this._buildMessages(history, message, images, audios, videos, pdfs);

    const body = JSON.stringify({ model, stream: true, messages });
    const response = await this.fetchWithRetry(this.apiUrl, {
      method: "POST",
      headers: this._getHeaders(),
      body
    });

    yield* this.parseSSEStream(response);
  }
}

module.exports = { OpenCodeProvider };
