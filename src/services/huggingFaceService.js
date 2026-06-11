const { buildChatMessages } = require("../utils/messageUtils");

const HF_API_URL = "https://router.huggingface.co/v1/chat/completions";
const DEFAULT_MODEL = "katanemo/Arch-Router-1.5B";
const DEFAULT_PROVIDER = "hf-inference";

const resolveModel = (model) => {
  if (!model) {
    return `${DEFAULT_MODEL}:${DEFAULT_PROVIDER}`;
  }
  if (model.includes(":")) {
    return model;
  }
  const provider = process.env.HF_PROVIDER || DEFAULT_PROVIDER;
  return `${model}:${provider}`;
};

const getHeaders = () => {
  const headers = { "Content-Type": "application/json" };
  if (process.env.HF_API_KEY) {
    headers.Authorization = `Bearer ${process.env.HF_API_KEY}`;
  }
  return headers;
};

const parseReply = (payload) => {
  if (!payload) {
    return null;
  }
  return payload.choices?.[0]?.message?.content || null;
};

const generateReply = async ({ message, history }) => {
  const model = resolveModel(process.env.HF_MODEL);
  const body = JSON.stringify({
    model,
    messages: buildChatMessages(history, message)
  });

  const response = await fetch(HF_API_URL, {
    method: "POST",
    headers: getHeaders(),
    body
  });

  if (!response.ok && response.status === 404 && model !== resolveModel()) {
    const fallbackBody = JSON.stringify({
      model: resolveModel(),
      messages: buildChatMessages(history, message)
    });
    const fallbackResponse = await fetch(HF_API_URL, {
      method: "POST",
      headers: getHeaders(),
      body: fallbackBody
    });
    if (!fallbackResponse.ok) {
      const errorText = await fallbackResponse.text();
      throw new Error(
        `API error (${fallbackResponse.status}): ${errorText}`
      );
    }
    const fallbackData = await fallbackResponse.json();
    const fallbackReply = parseReply(fallbackData);
    if (!fallbackReply) {
      throw new Error("Unable to parse response from API.");
    }
    return fallbackReply;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Hugging Face API error (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();
  const reply = parseReply(data);

  if (!reply) {
    throw new Error("Unable to parse response from API.");
  }

  return reply;
};

module.exports = { generateReply };
