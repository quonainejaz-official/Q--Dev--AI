const { detectReasoning, getReasoningModel, REASONING_PATTERNS } = require("../src/utils/reasoningDetector");

describe("detectReasoning", () => {
  test("returns false for simple greetings", () => {
    const result = detectReasoning("hello");
    expect(result.isReasoning).toBe(false);
  });

  test("detects math problems", () => {
    const result = detectReasoning("Solve the equation 2x + 5 = 15");
    expect(result.isReasoning).toBe(true);
  });

  test("detects code analysis requests", () => {
    const result = detectReasoning("Analyze the time complexity of this function");
    expect(result.isReasoning).toBe(true);
  });

  test("detects step-by-step reasoning", () => {
    const result = detectReasoning("Think step by step through this problem");
    expect(result.isReasoning).toBe(true);
  });

  test("detects comparison questions", () => {
    const result = detectReasoning("Compare React and Vue for a large enterprise app");
    expect(result.isReasoning).toBe(true);
  });

  test("detects long complex questions", () => {
    const long = "What are the implications of using microservices vs monolith for a startup that expects rapid growth and needs to handle millions of users while keeping costs low and maintainability high?";
    const result = detectReasoning(long);
    expect(result.isReasoning).toBe(true);
  });

  test("returns false for null/undefined", () => {
    expect(detectReasoning(null).isReasoning).toBe(false);
    expect(detectReasoning(undefined).isReasoning).toBe(false);
  });

  test("returns 0 confidence for empty string", () => {
    expect(detectReasoning("").confidence).toBe(0);
  });
});

describe("getReasoningModel", () => {
  test("returns correct model for known providers", () => {
    const opencodeProvider = { name: "opencode", capabilities: { models: ["big-pickle", "mimo-v2.5-free"] } };
    expect(getReasoningModel(opencodeProvider)).toBe("big-pickle");

    const openaiProvider = { name: "openai", capabilities: { models: ["gpt-4o", "gpt-4o-mini"] } };
    expect(getReasoningModel(openaiProvider)).toBe("gpt-4o");

    const anthropicProvider = { name: "anthropic", capabilities: { models: ["claude-sonnet-4-20250514"] } };
    expect(getReasoningModel(anthropicProvider)).toBe("claude-sonnet-4-20250514");
  });

  test("falls back to first model for unknown provider", () => {
    const provider = { name: "unknown", capabilities: { models: ["model-a", "model-b"] } };
    expect(getReasoningModel(provider)).toBe("model-a");
  });

  test("returns null for provider with no models", () => {
    const provider = { name: "empty", capabilities: { models: [] } };
    expect(getReasoningModel(provider)).toBeNull();
  });
});

describe("REASONING_PATTERNS", () => {
  test("contains expected patterns", () => {
    expect(REASONING_PATTERNS.length).toBeGreaterThan(0);
  });
});
