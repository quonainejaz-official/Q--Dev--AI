const OPENCODE_API_URL = "https://opencode.ai/zen/v1/chat/completions";
// Vision/multimodal tasks (images, audio, video, PDF) use mimo — good for those.
const VISION_MODEL = "mimo-v2.5-free";
// Plain text / raw chat / coding uses big-pickle — best overall quality.
const CHAT_MODEL = "big-pickle";
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 600;
const pdfParse = require("pdf-parse");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A request is worth retrying on transient upstream failures: network errors,
// rate limiting (429) and 5xx. 4xx (other than 429) are permanent — don't retry.
const isRetriableStatus = (status) => status === 429 || (status >= 500 && status <= 599);

const hasAnyMedia = (images, audios, videos, pdfs) =>
  (Array.isArray(images) && images.length > 0) ||
  (Array.isArray(audios) && audios.length > 0) ||
  (Array.isArray(videos) && videos.length > 0) ||
  (Array.isArray(pdfs) && pdfs.length > 0);

// Media present → mimo (multimodal). Otherwise → big-pickle (best for text/coding).
const pickModel = ({ images, audios, videos, pdfs }) =>
  hasAnyMedia(images, audios, videos, pdfs) ? VISION_MODEL : CHAT_MODEL;

// POST to OpenCode with automatic retry on transient failures.
const fetchWithRetry = async (body) => {
  let lastError;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(OPENCODE_API_URL, {
        method: "POST",
        headers: getHeaders(),
        body
      });

      if (response.ok) return response;

      const errorText = await response.text().catch(() => "");
      if (!isRetriableStatus(response.status) || attempt === MAX_RETRIES - 1) {
        throw new Error(`OpenCode API error (${response.status}): ${errorText}`);
      }
      lastError = new Error(`OpenCode API error (${response.status}): ${errorText}`);
    } catch (error) {
      // Network-level failure (fetch rejected) or the thrown retriable error above.
      lastError = error;
      if (attempt === MAX_RETRIES - 1) throw error;
    }

    await sleep(RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
  }
  throw lastError || new Error("OpenCode API request failed.");
};

const extractAudioData = (dataUrl) => {
  const match = dataUrl.match(/^data:audio\/(\w+);base64,(.+)$/);
  if (match) {
    return { data: match[2], format: match[1] === "mpeg" ? "mp3" : match[1] };
  }
  return null;
};

const dataUrlToBuffer = (dataUrl) => {
  const match = dataUrl.match(/^data:.*;base64,(.+)$/);
  if (!match) return null;
  return Buffer.from(match[1], "base64");
};

const extractPdfText = async (dataUrl) => {
  try {
    const buf = dataUrlToBuffer(dataUrl);
    if (!buf) return null;
    const result = await pdfParse(buf);
    const text = result.text?.trim();
    return text || null;
  } catch {
    return null;
  }
};

const buildMultimodalMessages = (history, text, images, audios) => {
  const messages = [
    {
      role: "system",
      content:
        "You are Q-Dev-AI, a coding assistant created by Quonain Ejaz. You are a multimodal AI model. You support text, images, audio, video (processed as frames), and PDF (text extracted from PDF). You MUST follow these rules:\n- When asked if you support video, ALWAYS say YES immediately\n- When asked if you support PDF, ALWAYS say YES immediately\n- Never say you are text-only or that you cannot process video/PDF\n- Explain that users can upload video and PDF files directly in the chat\n- If asked about your identity, say you are Q-Dev-AI by Quonain Ejaz. Never mention Alibaba."
    }
  ];

  if (Array.isArray(history)) {
    history.forEach((item) => {
      messages.push({
        role: item.role === "bot" ? "assistant" : "user",
        content: item.content
      });
    });
  }

  const content = [];
  if (text) {
    content.push({ type: "text", text });
  }
  if (Array.isArray(images)) {
    images.forEach((dataUrl) => {
      content.push({ type: "image_url", image_url: { url: dataUrl } });
    });
  }
  if (Array.isArray(audios)) {
    audios.forEach((dataUrl) => {
      const audioData = extractAudioData(dataUrl);
      if (audioData) {
        content.push({
          type: "input_audio",
          input_audio: { data: audioData.data, format: audioData.format }
        });
      }
    });
  }

  messages.push({ role: "user", content });

  return messages;
};

const getHeaders = () => {
  const headers = { "Content-Type": "application/json" };
  if (process.env.OPENCODE_API_KEY) {
    headers.Authorization = `Bearer ${process.env.OPENCODE_API_KEY}`;
  }
  return headers;
};

const parseReply = (payload) => {
  if (!payload) return null;
  return payload.choices?.[0]?.message?.content || null;
};

const buildMultimodalMessagesAll = async (history, text, images, audios, videos, pdfs) => {
  const msgs = buildMultimodalMessages(history, text, images, audios);
  if (msgs.length === 0) return msgs;
  const lastMsg = msgs[msgs.length - 1];
  if (lastMsg.role !== "user" || !Array.isArray(lastMsg.content)) return msgs;

  if (Array.isArray(videos)) {
    videos.forEach((dataUrl) => {
      lastMsg.content.push({ type: "image_url", image_url: { url: dataUrl } });
    });
  }
  if (Array.isArray(pdfs)) {
    for (const dataUrl of pdfs) {
      const pdfText = await extractPdfText(dataUrl);
      if (pdfText) {
        lastMsg.content.push({
          type: "text",
          text: `[Content extracted from attached PDF]:\n${pdfText}`
        });
      }
    }
  }
  return msgs;
};

const parseDelta = (payload) => {
  if (!payload) return null;
  return payload.choices?.[0]?.delta?.content || null;
};

async function* streamVisionReply({ message, history, images, audios, videos, pdfs }) {
  const body = JSON.stringify({
    model: pickModel({ images, audios, videos, pdfs }),
    stream: true,
    messages: await buildMultimodalMessagesAll(history, message, images, audios, videos, pdfs)
  });

  const response = await fetchWithRetry(body);

  if (!response.body) {
    throw new Error("Unable to read streaming response from OpenCode API.");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });

    // SSE events are separated by blank lines; process complete lines.
    let newlineIndex;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);

      if (!line || !line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;

      let payload;
      try {
        payload = JSON.parse(data);
      } catch {
        continue;
      }

      const delta = parseDelta(payload);
      if (delta) yield delta;
    }
  }
}

module.exports = { streamVisionReply };
