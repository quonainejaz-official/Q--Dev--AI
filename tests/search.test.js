const { searchWeb, formatResults } = require("../src/services/searchService");

describe("searchWeb", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env.BRAVE_API_KEY;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.BRAVE_API_KEY = originalEnv;
  });

  test("throws when BRAVE_API_KEY is not set", async () => {
    delete process.env.BRAVE_API_KEY;
    await expect(searchWeb("test")).rejects.toThrow("BRAVE_API_KEY is not configured");
  });

  test("calls Brave API with correct params", async () => {
    process.env.BRAVE_API_KEY = "test-key";
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        web: {
          results: [
            { title: "Result 1", url: "https://example.com/1", description: "Snippet 1" },
            { title: "Result 2", url: "https://example.com/2", description: "Snippet 2" }
          ]
        }
      })
    });
    global.fetch = mockFetch;

    const results = await searchWeb("React hooks", { count: 2 });

    expect(results).toHaveLength(2);
    expect(results[0].title).toBe("Result 1");
    expect(results[0].url).toBe("https://example.com/1");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("q=React+hooks"),
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Subscription-Token": "test-key"
        })
      })
    );
  });

  test("throws on API error", async () => {
    process.env.BRAVE_API_KEY = "test-key";
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized"
    });

    await expect(searchWeb("test")).rejects.toThrow("Brave Search API error (401)");
  });

  test("returns empty array when no results", async () => {
    process.env.BRAVE_API_KEY = "test-key";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ web: { results: [] } })
    });

    const results = await searchWeb("nonexistent query xyz");
    expect(results).toEqual([]);
  });

  test("limits count to max 10", async () => {
    process.env.BRAVE_API_KEY = "test-key";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ web: { results: Array(15).fill({ title: "x", url: "x", description: "x" }) } })
    });

    const results = await searchWeb("test", { count: 15 });
    expect(results).toHaveLength(10);
  });
});

describe("formatResults", () => {
  test("formats results into readable string", () => {
    const results = [
      { title: "React Docs", url: "https://react.dev", snippet: "Learn React" },
      { title: "React Tutorial", url: "https://example.com", snippet: "Get started" }
    ];
    const formatted = formatResults(results);
    expect(formatted).toContain("React Docs");
    expect(formatted).toContain("https://react.dev");
    expect(formatted).toContain("1.");
    expect(formatted).toContain("2.");
  });

  test("returns message for empty results", () => {
    expect(formatResults([])).toBe("No search results found.");
    expect(formatResults(null)).toBe("No search results found.");
  });
});
