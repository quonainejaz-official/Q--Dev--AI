const {
  detectMediaType,
  extractBase64,
  toOpenAIFormat,
  toAnthropicFormat,
  toGeminiFormat,
  audioToOpenAIFormat
} = require("../src/utils/mediaNormalizer");

describe("detectMediaType", () => {
  test("detects image/png from data URL", () => {
    expect(detectMediaType("data:image/png;base64,abc")).toBe("image/png");
  });

  test("detects image/jpeg", () => {
    expect(detectMediaType("data:image/jpeg;base64,abc")).toBe("image/jpeg");
  });

  test("detects image/webp", () => {
    expect(detectMediaType("data:image/webp;base64,abc")).toBe("image/webp");
  });

  test("detects audio/mpeg", () => {
    expect(detectMediaType("data:audio/mpeg;base64,abc")).toBe("audio/mpeg");
  });

  test("returns default for empty input", () => {
    expect(detectMediaType("")).toBe("image/png");
    expect(detectMediaType(null)).toBe("image/png");
  });

  test("guesses from URL extensions", () => {
    expect(detectMediaType("https://example.com/photo.jpg")).toBe("image/jpeg");
    expect(detectMediaType("https://example.com/file.mp4")).toBe("video/mp4");
  });
});

describe("extractBase64", () => {
  test("extracts base64 from data URL", () => {
    const result = extractBase64("data:image/png;base64,iVBORw0KGgo=");
    expect(result).toBe("iVBORw0KGgo=");
  });

  test("returns null for non-data URL", () => {
    expect(extractBase64("https://example.com/image.png")).toBeNull();
  });

  test("returns null for null input", () => {
    expect(extractBase64(null)).toBeNull();
  });
});

describe("toOpenAIFormat", () => {
  test("converts image URLs to OpenAI format", () => {
    const result = toOpenAIFormat(["data:image/png;base64,abc"]);
    expect(result).toEqual([
      { type: "image_url", image_url: { url: "data:image/png;base64,abc" } }
    ]);
  });

  test("returns empty array for null input", () => {
    expect(toOpenAIFormat(null)).toEqual([]);
  });
});

describe("toAnthropicFormat", () => {
  test("converts data URL to Anthropic base64 format", () => {
    const result = toAnthropicFormat(["data:image/png;base64,iVBOR"]);
    expect(result).toEqual([
      {
        type: "image",
        source: { type: "base64", media_type: "image/png", data: "iVBOR" }
      }
    ]);
  });

  test("converts HTTP URL to Anthropic url format", () => {
    const result = toAnthropicFormat(["https://example.com/img.png"]);
    expect(result).toEqual([
      { type: "image", source: { type: "url", url: "https://example.com/img.png" } }
    ]);
  });
});

describe("toGeminiFormat", () => {
  test("converts data URL to Gemini inlineData format", () => {
    const result = toGeminiFormat(["data:image/jpeg;base64,/9j/"]);
    expect(result).toEqual([
      { inlineData: { mimeType: "image/jpeg", data: "/9j/" } }
    ]);
  });

  test("falls back to text for HTTP URLs", () => {
    const result = toGeminiFormat(["https://example.com/img.png"]);
    expect(result[0].text).toContain("Image:");
  });
});

describe("audioToOpenAIFormat", () => {
  test("converts audio data URLs", () => {
    const result = audioToOpenAIFormat(["data:audio/mpeg;base64,AAAB"]);
    expect(result).toEqual([
      { type: "input_audio", input_audio: { data: "AAAB", format: "mp3" } }
    ]);
  });

  test("returns empty array for null", () => {
    expect(audioToOpenAIFormat(null)).toEqual([]);
  });
});
