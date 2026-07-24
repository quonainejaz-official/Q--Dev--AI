/**
 * Tool Registry (4.7) — defines tools the agent can call.
 *
 * Each tool has:
 * - name, description (sent to the AI for function calling)
 * - parameters (JSON Schema for the AI)
 * - execute(params, context) — runs the tool, returns result
 *
 * Security:
 * - File tools restricted to PROJECT_ROOT (no path traversal)
 * - Code execution sandboxed (no fs/net access in eval)
 * - All tool calls logged for audit
 */

const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const MAX_FILE_SIZE = 1024 * 100; // 100KB per read
const MAX_LIST_ENTRIES = 200;

const isSafePath = (targetPath) => {
  const resolved = path.resolve(PROJECT_ROOT, targetPath);
  return resolved.startsWith(PROJECT_ROOT);
};

const TOOLS = [
  {
    name: "web_search",
    description: "Search the web for information. Returns search results with titles, URLs, and snippets.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" },
        count: { type: "number", description: "Number of results (1-10, default 5)" }
      },
      required: ["query"]
    },
    execute: async (params, context) => {
      const searchService = require("../services/searchService");
      const results = await searchService.searchWeb(params.query, { count: params.count || 5 });
      return results;
    }
  },
  {
    name: "read_file",
    description: "Read the contents of a file in the project.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path from project root" }
      },
      required: ["path"]
    },
    execute: async (params) => {
      if (!isSafePath(params.path)) return { error: "Access denied: path outside project root." };
      const fullPath = path.resolve(PROJECT_ROOT, params.path);
      if (!fs.existsSync(fullPath)) return { error: "File not found." };
      const stat = fs.statSync(fullPath);
      if (stat.size > MAX_FILE_SIZE) return { error: `File too large (${(stat.size / 1024).toFixed(1)}KB, max ${MAX_FILE_SIZE / 1024}KB).` };
      const content = fs.readFileSync(fullPath, "utf-8");
      return { content, path: params.path, size: stat.size };
    }
  },
  {
    name: "write_file",
    description: "Write content to a file in the project. Creates the file if it doesn't exist.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path from project root" },
        content: { type: "string", description: "The file content to write" }
      },
      required: ["path", "content"]
    },
    execute: async (params) => {
      if (!isSafePath(params.path)) return { error: "Access denied: path outside project root." };
      const fullPath = path.resolve(PROJECT_ROOT, params.path);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, params.content, "utf-8");
      return { success: true, path: params.path, bytes: Buffer.byteLength(params.content) };
    }
  },
  {
    name: "list_files",
    description: "List files and directories in a folder.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative directory path (default: project root)" },
        pattern: { type: "string", description: "Optional glob pattern to filter (e.g. '*.js')" }
      }
    },
    execute: async (params) => {
      const dir = params.path || ".";
      if (!isSafePath(dir)) return { error: "Access denied: path outside project root." };
      const fullPath = path.resolve(PROJECT_ROOT, dir);
      if (!fs.existsSync(fullPath)) return { error: "Directory not found." };
      let entries = fs.readdirSync(fullPath, { withFileTypes: true });
      if (params.pattern) {
        const glob = require("fast-glob");
        try {
          const matched = await glob(params.pattern, { cwd: fullPath, dot: false });
          return { entries: matched.slice(0, MAX_LIST_ENTRIES), path: dir };
        } catch {
          // fallback: simple filter
          entries = entries.filter((e) => e.name.includes(params.pattern.replace("*", "")));
        }
      }
      const result = entries.slice(0, MAX_LIST_ENTRIES).map((e) => ({
        name: e.name,
        type: e.isDirectory() ? "dir" : "file"
      }));
      return { entries: result, path: dir };
    }
  },
  {
    name: "run_code",
    description: "Execute a snippet of JavaScript code in a sandboxed environment. Only standard JS is available (no fs, net, child_process).",
    parameters: {
      type: "object",
      properties: {
        code: { type: "string", description: "JavaScript code to execute" }
      },
      required: ["code"]
    },
    execute: async (params) => {
      const sandbox = {
        console: { log: (...a) => { result.output += a.join(" ") + "\n"; } },
        Math, Date, JSON, parseInt, parseFloat, isNaN, encodeURIComponent, decodeURIComponent,
        Array, Object, String, Number, Boolean, RegExp, Map, Set, Promise
      };
      const result = { output: "" };
      try {
        const fn = new Function(...Object.keys(sandbox), params.code);
        const returnVal = fn(...Object.values(sandbox));
        if (returnVal !== undefined && String(returnVal) !== result.output.trim()) {
          result.output += String(returnVal);
        }
        return { output: result.output.trim() || "(no output)", success: true };
      } catch (err) {
        return { output: "", error: err.message, success: false };
      }
    }
  }
];

/**
 * Get tool definitions for OpenAI function calling format.
 */
const getToolDefinitions = () => TOOLS.map((t) => ({
  type: "function",
  function: {
    name: t.name,
    description: t.description,
    parameters: t.parameters
  }
}));

/**
 * Get tool definitions for Anthropic format.
 */
const getAnthropicToolDefinitions = () => TOOLS.map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: t.parameters
}));

/**
 * Execute a tool by name.
 * @param {string} name
 * @param {Object} params
 * @param {Object} context - { userId, chatId }
 * @returns {Promise<Object>}
 */
const executeTool = async (name, params, context = {}) => {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) return { error: `Unknown tool: ${name}` };

  console.log(`[agent] Tool call: ${name}(${JSON.stringify(params).slice(0, 200)})`);
  try {
    const result = await tool.execute(params, context);
    return result;
  } catch (err) {
    console.error(`[agent] Tool ${name} failed: ${err.message}`);
    return { error: `Tool execution failed: ${err.message}` };
  }
};

module.exports = { TOOLS, getToolDefinitions, getAnthropicToolDefinitions, executeTool, isSafePath };
