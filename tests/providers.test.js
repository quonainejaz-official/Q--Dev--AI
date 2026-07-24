const { OpenAIProvider } = require("../src/providers/openai");
const { AnthropicProvider } = require("../src/providers/anthropic");
const { GeminiProvider } = require("../src/providers/gemini");

describe("OpenAIProvider", () => {
  let provider;

  beforeEach(() => {
    provider = new OpenAIProvider({ apiKey: "test-key" });
  });

  test("has correct capabilities", () => {
    const caps = provider.capabilities;
    expect(caps.chat).toBe(true);
    expect(caps.streaming).toBe(true);
    expect(caps.vision).toBe(true);
    expect(caps.tools).toBe(true);
    expect(caps.models).toContain("gpt-4o");
  });

  test("canHandle returns true for supported capabilities", () => {
    expect(provider.canHandle({ chat: true })).toBe(true);
    expect(provider.canHandle({ vision: true })).toBe(true);
    expect(provider.canHandle({ streaming: true })).toBe(true);
  });

  test("canHandle returns false for unsupported capabilities", () => {
    expect(provider.canHandle({ audio: true })).toBe(false);
    expect(provider.canHandle({ embeddings: true })).toBe(false);
  });
});

describe("AnthropicProvider", () => {
  let provider;

  beforeEach(() => {
    provider = new AnthropicProvider({ apiKey: "test-key" });
  });

  test("has correct capabilities", () => {
    const caps = provider.capabilities;
    expect(caps.chat).toBe(true);
    expect(caps.streaming).toBe(true);
    expect(caps.vision).toBe(true);
    expect(caps.tools).toBe(true);
    expect(caps.maxContext).toBe(200000);
    expect(caps.models).toContain("claude-sonnet-4-20250514");
  });

  test("canHandle returns true for supported capabilities", () => {
    expect(provider.canHandle({ chat: true })).toBe(true);
    expect(provider.canHandle({ vision: true })).toBe(true);
  });

  test("canHandle returns false for unsupported capabilities", () => {
    expect(provider.canHandle({ audio: true })).toBe(false);
  });
});

describe("GeminiProvider", () => {
  let provider;

  beforeEach(() => {
    provider = new GeminiProvider({ apiKey: "test-key" });
  });

  test("has correct capabilities", () => {
    const caps = provider.capabilities;
    expect(caps.chat).toBe(true);
    expect(caps.streaming).toBe(true);
    expect(caps.vision).toBe(true);
    expect(caps.tools).toBe(false);
    expect(caps.maxContext).toBe(1000000);
    expect(caps.models).toContain("gemini-2.0-flash");
  });

  test("canHandle returns true for supported capabilities", () => {
    expect(provider.canHandle({ chat: true })).toBe(true);
    expect(provider.canHandle({ vision: true })).toBe(true);
  });

  test("canHandle returns false for unsupported capabilities", () => {
    expect(provider.canHandle({ tools: true })).toBe(false);
    expect(provider.canHandle({ audio: true })).toBe(false);
  });
});
