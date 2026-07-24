/**
 * Image Generation Service (4.4) — real image generation via OpenAI DALL-E,
 * falling back to LLM-generated SVG.
 */

const OPENAI_API_URL = "https://api.openai.com/v1/images/generations";
const ZEN_API_URL = "https://opencode.ai/zen/v1/chat/completions";

const getOpenAIHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
});

const getOpenCodeHeaders = () => {
  const headers = { "Content-Type": "application/json" };
  if (process.env.OPENCODE_API_KEY) {
    headers.Authorization = `Bearer ${process.env.OPENCODE_API_KEY}`;
  }
  return headers;
};

/**
 * Generate image via OpenAI DALL-E 3.
 * @param {string} prompt
 * @param {string} size - "1024x1024" | "1024x1792" | "1792x1024"
 * @returns {Promise<string>} data URL of the generated image
 */
const generateWithDALLE = async (prompt, size = "1024x1024") => {
  const body = JSON.stringify({
    model: "dall-e-3",
    prompt,
    n: 1,
    size,
    response_format: "b64_json"
  });

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: getOpenAIHeaders(),
    body,
    signal: AbortSignal.timeout(60000)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DALL-E error (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image data in DALL-E response");

  const revisedPrompt = data.data[0].revised_prompt || prompt;
  return { dataUrl: `data:image/png;base64,${b64}`, revisedPrompt };
};

/**
 * Generate SVG image via LLM (fallback).
 */
const SVG_SYSTEM_PROMPT = `You are an SVG artist. Given a text prompt, generate a photorealistic detailed SVG image.

Rules:
- Output ONLY valid SVG code inside a fenced code block with language "svg"
- The SVG must have width="512" height="512" and viewBox="0 0 512 512"
- Use gradients, shadows, lighting effects, and layers for depth and realism
- Use proper SVG elements: defs, linearGradient, radialGradient, filter, drop-shadow, rect, circle, path, g
- Include detailed shapes, smooth curves, and precise colors
- Make the image visually rich with proper proportions and perspective
- Do NOT include any explanation or text outside the code block
- The SVG must be self-contained (no external resources)
- Use multiple layers and overlapping elements for realism
- Add subtle gradients and highlights for a polished look`;

const svgToDataUrl = (svgCode) => {
  const encoded = Buffer.from(svgCode).toString("base64");
  return `data:image/svg+xml;base64,${encoded}`;
};

const generateWithSVG = async (prompt) => {
  const body = JSON.stringify({
    model: "mimo-v2.5-free",
    messages: [
      { role: "system", content: SVG_SYSTEM_PROMPT },
      { role: "user", content: `Generate an SVG image of: ${prompt}` }
    ],
    max_tokens: 4096
  });

  const response = await fetch(ZEN_API_URL, {
    method: "POST",
    headers: getOpenCodeHeaders(),
    body,
    signal: AbortSignal.timeout(120000)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Zen API error (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content || "";

  const svgMatch = reply.match(/```svg\s*\n?([\s\S]*?)```/) || reply.match(/```\s*\n?([\s\S]*?)```/);
  if (!svgMatch) throw new Error("No SVG code found in response");

  const svgCode = svgMatch[1].trim();
  if (!svgCode.startsWith("<svg") && !svgCode.includes("<svg")) {
    throw new Error("Response does not contain valid SVG");
  }

  return { dataUrl: svgToDataUrl(svgCode), revisedPrompt: prompt };
};

/**
 * Main entry — tries DALL-E first, falls back to SVG.
 * @param {string} prompt
 * @param {Object} options
 * @param {string} options.size - Image size (default 1024x1024)
 * @returns {Promise<{ dataUrl: string, revisedPrompt: string, method: string }>}
 */
const generateImage = async (prompt, options = {}) => {
  const { size = "1024x1024" } = options;

  // Try DALL-E first if API key is available.
  if (process.env.OPENAI_API_KEY) {
    try {
      const result = await generateWithDALLE(prompt, size);
      return { ...result, method: "dall-e-3" };
    } catch (err) {
      console.warn(`[imageGen] DALL-E failed, falling back to SVG: ${err.message}`);
    }
  }

  // Fallback: SVG generation via LLM.
  const result = await generateWithSVG(prompt);
  return { ...result, method: "svg" };
};

module.exports = { generateImage, generateWithDALLE, generateWithSVG };
