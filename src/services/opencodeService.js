const OPENCODE_API_URL = "https://opencode.ai/zen/v1/chat/completions";
const VISION_MODEL = "mimo-v2.5-free";

const extractAudioData = (dataUrl) => {
  const match = dataUrl.match(/^data:audio\/(\w+);base64,(.+)$/);
  if (match) {
    return { data: match[2], format: match[1] === "mpeg" ? "mp3" : match[1] };
  }
  return null;
};

const buildAttachmentPart = (att) => {
  switch (att.type) {
    case "image":
      return { type: "image_url", image_url: { url: att.dataUrl } };
    case "audio": {
      const audioData = extractAudioData(att.dataUrl);
      if (!audioData) return null;
      return { type: "input_audio", input_audio: { data: audioData.data, format: audioData.format } };
    }
    default:
      return { type: "image_url", image_url: { url: att.dataUrl } };
  }
};

const buildMultimodalMessages = (history, text, attachments) => {
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
  if (text) content.push({ type: "text", text });
  if (Array.isArray(attachments)) {
    attachments.forEach((att) => {
      const part = buildAttachmentPart(att);
      if (part) content.push(part);
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

const generateVisionReply = async ({ message, history, images, audios, attachments }) => {
  const allAttachments = attachments || [];
  if (Array.isArray(images)) {
    images.forEach((d) => allAttachments.push({ type: "image", dataUrl: d }));
  }
  if (Array.isArray(audios)) {
    audios.forEach((d) => allAttachments.push({ type: "audio", dataUrl: d }));
  }

  const body = JSON.stringify({
    model: VISION_MODEL,
    messages: buildMultimodalMessages(history, message, allAttachments)
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
