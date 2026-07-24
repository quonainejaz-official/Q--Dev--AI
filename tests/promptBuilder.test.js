const { systemLayer, estimateTokens } = require("../src/prompt/layers/system");
const { recentLayer } = require("../src/prompt/layers/recent");
const { summaryLayer } = require("../src/prompt/layers/summary");
const { memoryLayer } = require("../src/prompt/layers/memory");
const { buildPrompt } = require("../src/prompt/promptBuilder");

describe("systemLayer", () => {
  test("returns system message with priority 100", () => {
    const layer = systemLayer();
    expect(layer.role).toBe("system");
    expect(layer.priority).toBe(100);
    expect(layer.content).toContain("Q-Dev-AI");
    expect(layer.tokens).toBeGreaterThan(0);
  });
});

describe("estimateTokens", () => {
  test("returns 0 for empty/null input", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens(null)).toBe(0);
    expect(estimateTokens(undefined)).toBe(0);
  });

  test("estimates ~1 token per 4 chars", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcdefgh")).toBe(2);
  });
});

describe("recentLayer", () => {
  test("returns empty for no messages", () => {
    const layer = recentLayer([]);
    expect(layer.messages).toEqual([]);
    expect(layer.tokens).toBe(0);
  });

  test("includes all messages within budget", () => {
    const msgs = [
      { role: "user", content: "Hi" },
      { role: "bot", content: "Hello" },
      { role: "user", content: "How are you?" }
    ];
    const layer = recentLayer(msgs, 1000);
    expect(layer.messages).toHaveLength(3);
    expect(layer.priority).toBe(80);
  });

  test("truncates oldest messages when budget exceeded", () => {
    const msgs = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "bot",
      content: `Message ${i} with some content to fill tokens`
    }));
    const layer = recentLayer(msgs, 200); // very tight budget
    expect(layer.messages.length).toBeLessThan(20);
    // Should keep the most recent messages.
    const lastMsg = layer.messages[layer.messages.length - 1];
    expect(lastMsg.content).toContain("Message");
  });
});

describe("summaryLayer", () => {
  test("returns null for empty summary", () => {
    expect(summaryLayer(null)).toBeNull();
    expect(summaryLayer("")).toBeNull();
    expect(summaryLayer("  ")).toBeNull();
  });

  test("returns summary context with priority 70", () => {
    const layer = summaryLayer("User asked about Python decorators.");
    expect(layer).not.toBeNull();
    expect(layer.role).toBe("context");
    expect(layer.priority).toBe(70);
    expect(layer.content).toContain("Conversation summary");
    expect(layer.content).toContain("Python decorators");
  });
});

describe("memoryLayer", () => {
  test("returns null for empty memories", () => {
    expect(memoryLayer([])).toBeNull();
    expect(memoryLayer(null)).toBeNull();
  });

  test("returns memories sorted by importance", () => {
    const memories = [
      { text: "Low importance fact", type: "fact", importance: 0.3 },
      { text: "High importance fact", type: "preference", importance: 0.9 },
      { text: "Medium fact", type: "fact", importance: 0.6 }
    ];
    const layer = memoryLayer(memories, 5000);
    expect(layer).not.toBeNull();
    expect(layer.priority).toBe(65);
    expect(layer.content).toContain("High importance fact");
    // High importance should come first.
    const highIdx = layer.content.indexOf("High importance");
    const lowIdx = layer.content.indexOf("Low importance");
    expect(highIdx).toBeLessThan(lowIdx);
  });
});

describe("buildPrompt", () => {
  test("builds basic prompt with system + user message", () => {
    const messages = buildPrompt({ message: "Hello" });
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("Q-Dev-AI");
    expect(messages[messages.length - 1].role).toBe("user");
    expect(messages[messages.length - 1].content).toBe("Hello");
  });

  test("includes history as assistant/user messages", () => {
    const messages = buildPrompt({
      message: "What about Python?",
      history: [
        { role: "user", content: "Hi" },
        { role: "bot", content: "Hello!" }
      ]
    });
    // System + user(Hi) + assistant(Hello!) + user(What about Python?)
    expect(messages.length).toBeGreaterThanOrEqual(4);
    expect(messages[1].role).toBe("user");
    expect(messages[1].content).toBe("Hi");
    expect(messages[2].role).toBe("assistant");
    expect(messages[2].content).toBe("Hello!");
  });

  test("includes summary when provided", () => {
    const messages = buildPrompt({
      message: "Continue",
      summary: "User learning React hooks."
    });
    // Should have system + summary exchange + user message.
    const summaryMsg = messages.find((m) =>
      typeof m.content === "string" && m.content.includes("Conversation summary")
    );
    expect(summaryMsg).toBeDefined();
  });

  test("includes memories when provided", () => {
    const messages = buildPrompt({
      message: "Help me",
      memories: [{ text: "Prefers TypeScript", type: "preference", importance: 0.9 }]
    });
    const memMsg = messages.find((m) =>
      typeof m.content === "string" && m.content.includes("TypeScript")
    );
    expect(memMsg).toBeDefined();
  });

  test("handles multimodal media", () => {
    const messages = buildPrompt({
      message: "What is this?",
      media: { images: ["data:image/png;base64,abc123"] }
    });
    const userMsg = messages[messages.length - 1];
    expect(Array.isArray(userMsg.content)).toBe(true);
    expect(userMsg.content[0].type).toBe("text");
    expect(userMsg.content[1].type).toBe("image_url");
  });
});
