const OPENCODE_API_URL = "https://opencode.ai/zen/v1/chat/completions";
const VISION_MODEL = "mimo-v2.5-free";
const pdfParse = require("pdf-parse");

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
        "You are Q-Dev-AI, a coding assistant created by Qonain. When asked about your identity, always say you are Q-Dev-AI, your coding assistant made by Qonain. Never mention Alibaba or any other creator."
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

const generateVisionReply = async ({ message, history, images, audios, videos, pdfs }) => {
  const body = JSON.stringify({
    model: VISION_MODEL,
    messages: await buildMultimodalMessagesAll(history, message, images, audios, videos, pdfs)
  });

  const response = await fetch(OPENCODE_API_URL, {
    method: "POST",
    headers: getHeaders(),
    body
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenCode API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const reply = parseReply(data);

  if (!reply) {
    throw new Error("Unable to parse response from OpenCode API.");
  }

  return reply;
};

module.exports = { generateVisionReply };
