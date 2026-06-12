const ZEN_API_URL = "https://opencode.ai/zen/v1/chat/completions";

const getHeaders = () => {
  const headers = { "Content-Type": "application/json" };
  if (process.env.OPENCODE_API_KEY) {
    headers.Authorization = `Bearer ${process.env.OPENCODE_API_KEY}`;
  }
  return headers;
};

const SVG_SYSTEM_PROMPT = `You are an SVG image generator. Given a text prompt, generate a valid SVG image representing it.
Rules:
- Output ONLY valid SVG code inside a fenced code block with language "svg"
- The SVG must have width="512" height="512" and viewBox="0 0 512 512"
- Use proper SVG elements: rect, circle, path, text, etc.
- Use appropriate colors and styling
- Keep it simple but visually appealing
- Do NOT include any explanation or text outside the code block
- The SVG should be self-contained (no external resources, no CSS imports)
- Use semantic colors and gradients where appropriate`;

const svgToDataUrl = (svgCode) => {
  const encoded = Buffer.from(svgCode).toString("base64");
  return `data:image/svg+xml;base64,${encoded}`;
};

const generateImage = async (prompt) => {
  const svgPrompt = `Generate an SVG image of: ${prompt}`;

  const body = JSON.stringify({
    model: "mimo-v2.5-free",
    messages: [
      { role: "system", content: SVG_SYSTEM_PROMPT },
      { role: "user", content: svgPrompt }
    ],
    max_tokens: 4096
  });

  const response = await fetch(ZEN_API_URL, {
    method: "POST",
    headers: getHeaders(),
    body,
    signal: AbortSignal.timeout(120000)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Zen API error (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content || "";

  // Extract SVG from fenced code block
  const svgMatch = reply.match(/```svg\s*\n?([\s\S]*?)```/) || reply.match(/```\s*\n?([\s\S]*?)```/);
  if (!svgMatch) {
    throw new Error("No SVG code found in response");
  }

  const svgCode = svgMatch[1].trim();
  if (!svgCode.startsWith("<svg") && !svgCode.includes("<svg")) {
    throw new Error("Response does not contain valid SVG");
  }

  return svgToDataUrl(svgCode);
};

module.exports = { generateImage };
