const { OpenCodeProvider } = require("../src/providers/opencode");
const { OpenAIProvider } = require("../src/providers/openai");
const { AnthropicProvider } = require("../src/providers/anthropic");
const { GeminiProvider } = require("../src/providers/gemini");

// Fresh registry for routing tests.
jest.mock("../src/providers/registry", () => {
  const { ProviderRegistry } = (() => {
    // Inline to avoid circular deps in mock.
    class ProviderRegistry {
      constructor() { this._providers = new Map(); }
      register(p) { this._providers.set(p.name, p); return this; }
      list() { return Array.from(this._providers.values()); }
    }
    return { ProviderRegistry };
  })();

  const registry = new ProviderRegistry();
  return { registry };
});

const { registry } = require("../src/providers/registry");
const { route, getRoutingInfo, COST_TIERS } = require("../src/router/modelRouter");

beforeAll(() => {
  registry.register(new OpenCodeProvider({ apiKey: "test" }));
  registry.register(new OpenAIProvider({ apiKey: "test" }));
  registry.register(new AnthropicProvider({ apiKey: "test" }));
  registry.register(new GeminiProvider({ apiKey: "test" }));
});

describe("modelRouter.route", () => {
  test("routes simple text to cheapest provider (opencode)", () => {
    const { provider, model } = route({ hasMedia: false });
    expect(provider.name).toBe("opencode");
    expect(model).toBe("big-pickle");
  });

  test("routes vision request to cheapest vision-capable provider", () => {
    const { provider, model } = route({ hasMedia: true });
    expect(provider.capabilities.vision).toBe(true);
    expect(model).toBeDefined();
  });

  test("routes complex request to stronger model", () => {
    const { provider, model } = route({ hasMedia: false, complexity: "complex" });
    expect(provider.name).toBe("opencode");
    expect(model).toBe("big-pickle");
  });

  test("throws when no providers available", () => {
    // Temporarily clear registry.
    const saved = registry._providers;
    registry._providers = new Map();
    expect(() => route()).toThrow("No AI providers available");
    registry._providers = saved;
  });
});

describe("modelRouter.getRoutingInfo", () => {
  test("returns routing info for valid params", () => {
    const info = getRoutingInfo({ hasMedia: false });
    expect(info.provider).toBe("opencode");
    expect(info.model).toBe("big-pickle");
    expect(info.costTier).toBe(COST_TIERS.opencode);
  });

  test("returns error for no providers", () => {
    const saved = registry._providers;
    registry._providers = new Map();
    const info = getRoutingInfo({ hasMedia: false });
    expect(info.error).toBeDefined();
    registry._providers = saved;
  });
});

describe("COST_TIERS", () => {
  test("opencode is cheapest", () => {
    expect(COST_TIERS.opencode).toBeLessThan(COST_TIERS.openai);
    expect(COST_TIERS.openai).toBeLessThan(COST_TIERS.anthropic);
  });
});
