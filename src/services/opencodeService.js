const OPENCODE_API_URL = "https://opencode.ai/zen/v1/chat/completions";
const VISION_MODEL = "mimo-v2.5-free";

const buildVisionMessages = (history, text, imageDataUrl) => {
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
  if (imageDataUrl) {
    content.push({ type: "image_url", image_url: { url: imageDataUrl } });
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

const generateVisionReply = async ({ message, history, imageDataUrl }) => {
  const body = JSON.stringify({
    model: VISION_MODEL,
    messages: buildVisionMessages(history, message, imageDataUrl)
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
