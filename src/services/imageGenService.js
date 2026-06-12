const OPENCODE_IMG_URL = "https://opencode.ai/zen/v1/images/generations";
const HF_IMG_URL = "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell";

const generateWithOpenCode = async (prompt) => {
  const response = await fetch(OPENCODE_IMG_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENCODE_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "mimo-v2.5-free",
      prompt,
      n: 1,
      response_format: "b64_json"
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenCode image gen error (${response.status}): ${text}`);
  }

  const data = await response.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (b64) {
    return `data:image/png;base64,${b64}`;
  }
  throw new Error("No image data in OpenCode response");
};

const generateWithHuggingFace = async (prompt) => {
  const response = await fetch(HF_IMG_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HF_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ inputs: prompt })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HF image gen error (${response.status}): ${text}`);
  }

  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const mime = response.headers.get("content-type") || "image/png";
  return `data:${mime};base64,${base64}`;
};

const generateImage = async (prompt) => {
  try {
    return await generateWithOpenCode(prompt);
  } catch (ocErr) {
    // OpenCode failed, fallback to HuggingFace
    try {
      return await generateWithHuggingFace(prompt);
    } catch (hfErr) {
      throw new Error(`Image generation failed: OpenCode (${ocErr.message}) | HF (${hfErr.message})`);
    }
  }
};

module.exports = { generateImage };
