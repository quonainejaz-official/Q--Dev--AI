const HF_API_URL = "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell";

const generateImage = async (prompt) => {
  const response = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HF_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ inputs: prompt })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Image generation error (${response.status}): ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = response.headers.get("content-type") || "image/png";
  return `data:${mimeType};base64,${base64}`;
};

module.exports = { generateImage };
