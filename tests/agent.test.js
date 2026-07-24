const { TOOLS, getToolDefinitions, getAnthropicToolDefinitions, executeTool, isSafePath } = require("../src/agent/tools");

describe("isSafePath", () => {
  test("allows safe relative paths", () => {
    expect(isSafePath("src/server.js")).toBe(true);
    expect(isSafePath("package.json")).toBe(true);
    expect(isSafePath("src/utils/helpers.js")).toBe(true);
  });

  test("rejects path traversal", () => {
    expect(isSafePath("../etc/passwd")).toBe(false);
    expect(isSafePath("src/../../secret")).toBe(false);
    expect(isSafePath("/etc/passwd")).toBe(false);
  });
});

describe("getToolDefinitions", () => {
  test("returns OpenAI-format tool definitions", () => {
    const defs = getToolDefinitions();
    expect(Array.isArray(defs)).toBe(true);
    expect(defs.length).toBeGreaterThanOrEqual(5);

    const names = defs.map((d) => d.function.name);
    expect(names).toContain("web_search");
    expect(names).toContain("read_file");
    expect(names).toContain("write_file");
    expect(names).toContain("list_files");
    expect(names).toContain("run_code");
  });

  test("each definition has required fields", () => {
    const defs = getToolDefinitions();
    for (const def of defs) {
      expect(def.type).toBe("function");
      expect(def.function.name).toBeDefined();
      expect(def.function.description).toBeDefined();
      expect(def.function.parameters).toBeDefined();
    }
  });
});

describe("getAnthropicToolDefinitions", () => {
  test("returns Anthropic-format tool definitions", () => {
    const defs = getAnthropicToolDefinitions();
    expect(defs.length).toBeGreaterThanOrEqual(5);
    for (const def of defs) {
      expect(def.name).toBeDefined();
      expect(def.description).toBeDefined();
      expect(def.input_schema).toBeDefined();
    }
  });
});

describe("run_code tool", () => {
  test("executes code with console.log", async () => {
    const result = await executeTool("run_code", { code: "console.log(1 + 2)" });
    expect(result.success).toBe(true);
    expect(result.output).toContain("3");
  });

  test("captures console.log output", async () => {
    const result = await executeTool("run_code", { code: "console.log('hello')" });
    expect(result.output).toContain("hello");
  });

  test("returns error for invalid code", async () => {
    const result = await executeTool("run_code", { code: "throw new Error('boom')" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("boom");
  });

  test("cannot access fs", async () => {
    const result = await executeTool("run_code", { code: "console.log(typeof fs)" });
    expect(result.output).toContain("undefined");
  });
});

describe("read_file tool", () => {
  test("reads existing file", async () => {
    const result = await executeTool("read_file", { path: "package.json" });
    expect(result.content).toBeDefined();
    expect(result.path).toBe("package.json");
  });

  test("rejects path traversal", async () => {
    const result = await executeTool("read_file", { path: "../.env" });
    expect(result.error).toContain("Access denied");
  });

  test("returns error for missing file", async () => {
    const result = await executeTool("read_file", { path: "nonexistent.txt" });
    expect(result.error).toContain("not found");
  });
});

describe("list_files tool", () => {
  test("lists project root", async () => {
    const result = await executeTool("list_files", { path: "src" });
    expect(result.entries).toBeDefined();
    expect(Array.isArray(result.entries)).toBe(true);
    expect(result.entries.length).toBeGreaterThan(0);
  });

  test("rejects path traversal", async () => {
    const result = await executeTool("list_files", { path: "../" });
    expect(result.error).toContain("Access denied");
  });
});

describe("unknown tool", () => {
  test("returns error for unknown tool", async () => {
    const result = await executeTool("nonexistent_tool", {});
    expect(result.error).toContain("Unknown tool");
  });
});
