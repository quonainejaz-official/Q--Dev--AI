describe("imageGenService", () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  describe("DALL-E generation", () => {
    test("generates image via DALL-E and returns data URL", async () => {
      const b64 = Buffer.from('<svg width="100" height="100"></svg>').toString("base64");
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ b64_json: b64, revised_prompt: "A blue square" }]
        })
      });

      process.env.OPENAI_API_KEY = "sk-test-key";
      const { generateImage } = require("../src/services/imageGenService");
      const result = await generateImage("a blue square");

      expect(result.method).toBe("dall-e-3");
      expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
      expect(result.revisedPrompt).toBe("A blue square");
    });

    test("falls back to SVG when DALL-E fails", async () => {
      const svgContent = '<svg width="512" height="512"><rect fill="blue"/></svg>';

      // First call: DALL-E (fails). Second call: SVG (succeeds).
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: async () => "Bad request"
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: "```svg\n" + svgContent + "\n```" } }]
          })
        });

      process.env.OPENAI_API_KEY = "sk-test-key";
      process.env.OPENCODE_API_KEY = "oc-test-key";
      const { generateImage } = require("../src/services/imageGenService");
      const result = await generateImage("a blue square");

      expect(result.method).toBe("svg");
      expect(result.dataUrl).toMatch(/^data:image\/svg\+xml;base64,/);
    });

    test("falls back to SVG when no OPENAI_API_KEY", async () => {
      const svgContent = '<svg width="512" height="512"><rect fill="red"/></svg>';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "```svg\n" + svgContent + "\n```" } }]
        })
      });

      delete process.env.OPENAI_API_KEY;
      process.env.OPENCODE_API_KEY = "oc-test-key";
      const { generateImage } = require("../src/services/imageGenService");
      const result = await generateImage("a red square");

      expect(result.method).toBe("svg");
    });
  });

  describe("SVG fallback generation", () => {
    test("generates SVG and returns data URL", async () => {
      const svgContent = '<svg width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="blue"/></svg>';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "```svg\n" + svgContent + "\n```" } }],
        }),
      });

      delete process.env.OPENAI_API_KEY;
      process.env.OPENCODE_API_KEY = "test-key";
      const { generateImage } = require("../src/services/imageGenService");
      const result = await generateImage("a blue square");

      expect(result.method).toBe("svg");
      expect(result.dataUrl).toMatch(/^data:image\/svg\+xml;base64,/);
      const decoded = Buffer.from(result.dataUrl.split(",")[1], "base64").toString();
      expect(decoded).toBe(svgContent);
    });

    test("throws when API returns non-OK status", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal server error",
      });

      delete process.env.OPENAI_API_KEY;
      process.env.OPENCODE_API_KEY = "test-key";
      const { generateImage } = require("../src/services/imageGenService");
      await expect(generateImage("test")).rejects.toThrow(/500/);
    });

    test("throws when no SVG found in response", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "I can't generate images." } }],
        }),
      });

      delete process.env.OPENAI_API_KEY;
      process.env.OPENCODE_API_KEY = "test-key";
      const { generateImage } = require("../src/services/imageGenService");
      await expect(generateImage("test")).rejects.toThrow(/no svg code/i);
    });

    test("throws when SVG does not contain svg tag", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "```svg\n<p>not svg</p>\n```" } }],
        }),
      });

      delete process.env.OPENAI_API_KEY;
      process.env.OPENCODE_API_KEY = "test-key";
      const { generateImage } = require("../src/services/imageGenService");
      await expect(generateImage("test")).rejects.toThrow(/not contain valid svg/i);
    });

    test("handles generic fenced code block with SVG inside", async () => {
      const svgContent = '<svg width="512" height="512"></svg>';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "```\n" + svgContent + "\n```" } }],
        }),
      });

      delete process.env.OPENAI_API_KEY;
      process.env.OPENCODE_API_KEY = "test-key";
      const { generateImage } = require("../src/services/imageGenService");
      const result = await generateImage("test");
      expect(result.dataUrl).toMatch(/^data:image\/svg\+xml;base64,/);
    });

    test("sends Authorization header when API key is set", async () => {
      const svgContent = '<svg width="512" height="512"></svg>';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "```svg\n" + svgContent + "\n```" } }],
        }),
      });

      delete process.env.OPENAI_API_KEY;
      process.env.OPENCODE_API_KEY = "my-secret-key";
      const { generateImage } = require("../src/services/imageGenService");
      await generateImage("test");

      const [, options] = global.fetch.mock.calls[0];
      expect(options.headers.Authorization).toBe("Bearer my-secret-key");
    });

    test("works without API key (no auth header)", async () => {
      const svgContent = '<svg width="512" height="512"></svg>';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "```svg\n" + svgContent + "\n```" } }],
        }),
      });

      delete process.env.OPENAI_API_KEY;
      delete process.env.OPENCODE_API_KEY;
      const { generateImage } = require("../src/services/imageGenService");
      await generateImage("test");

      const [, options] = global.fetch.mock.calls[0];
      expect(options.headers.Authorization).toBeUndefined();
    });
  });
});
