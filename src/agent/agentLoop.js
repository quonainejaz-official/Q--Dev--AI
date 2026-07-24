/**
 * Agent Loop (4.7) — orchestrates tool-calling conversations.
 *
 * Flow:
 * 1. User sends a message
 * 2. AI decides if tools are needed (via function calling)
 * 3. Tools are executed, results sent back to AI
 * 4. Loop repeats until AI gives a final text response (max iterations capped)
 *
 * Supports OpenAI and Anthropic function calling formats.
 */

const { executeTool, getToolDefinitions, getAnthropicToolDefinitions } = require("./tools");
const { getProvider } = require("../providers/registry");

const MAX_TOOL_ITERATIONS = 8;
const AGENT_SYSTEM_PROMPT = `You are Q-Dev-AI, an AI assistant with access to tools. You can:
- Search the web for current information
- Read, write, and list project files
- Execute JavaScript code

When a task requires using tools, call the appropriate function. After receiving tool results, provide a clear summary to the user.
Always explain what you did and what the results mean.`;

/**
 * Build OpenAI messages array with tool definitions.
 */
const buildOpenAIMessages = (message, history = []) => {
  const messages = [
    { role: "system", content: AGENT_SYSTEM_PROMPT },
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: message }
  ];
  return messages;
};

/**
 * Build Anthropic messages array with tool definitions.
 */
const buildAnthropicMessages = (message, history = []) => {
  const messages = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: message }
  ];
  return messages;
};

/**
 * Execute one round of tool calls from an OpenAI-style response.
 */
const handleOpenAIToolCalls = async (toolCalls, context) => {
  const results = [];
  for (const tc of toolCalls) {
    const fnName = tc.function.name;
    let params = {};
    try {
      params = typeof tc.function.arguments === "string"
        ? JSON.parse(tc.function.arguments)
        : tc.function.arguments;
    } catch { /* invalid JSON, pass empty */ }

    const result = await executeTool(fnName, params, context);
    results.push({
      role: "tool",
      tool_call_id: tc.id,
      content: JSON.stringify(result)
    });
  }
  return results;
};

/**
 * Execute one round of tool calls from an Anthropic-style response.
 */
const handleAnthropicToolCalls = async (toolUseBlocks, context) => {
  const toolResults = [];
  for (const block of toolUseBlocks) {
    const result = await executeTool(block.name, block.input, context);
    toolResults.push({
      type: "tool_result",
      tool_use_id: block.id,
      content: JSON.stringify(result)
    });
  }
  return toolResults;
};

/**
 * Run the agent loop with a provider.
 *
 * @param {Object} params
 * @param {string} params.message - User message
 * @param {Array}  params.history - Chat history [{ role, content }]
 * @param {Object} params.provider - Provider instance
 * @param {string} params.model - Model name
 * @param {Function} params.onToken - Token callback for streaming (optional)
 * @param {AbortSignal} params.signal - Abort signal (optional)
 * @returns {Promise<{ content: string, toolCalls: number }>}
 */
const runAgentLoop = async ({ message, history = [], provider, model, onToken, signal }) => {
  const isAnthropic = provider.name === "anthropic";
  let messages = isAnthropic
    ? buildAnthropicMessages(message, history)
    : buildOpenAIMessages(message, history);
  const tools = isAnthropic ? getAnthropicToolDefinitions() : getToolDefinitions();
  let totalToolCalls = 0;

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    if (signal?.aborted) break;

    const response = await provider.chat({
      model,
      messages,
      tools: isAnthropic ? tools : tools,
      tool_choice: isAnthropic ? undefined : "auto"
    });

    const choice = response.choices?.[0] || {};
    const assistantMessage = choice.message || response;

    // If no tool calls, we have the final answer.
    const toolCalls = assistantMessage.tool_calls || [];
    if (!toolCalls.length) {
      // Check Anthropic format: content blocks with tool_use
      const content = assistantMessage.content || "";
      if (isAnthropic && Array.isArray(assistantMessage.content)) {
        const toolUseBlocks = assistantMessage.content.filter((b) => b.type === "tool_use");
        if (toolUseBlocks.length > 0) {
          totalToolCalls += toolUseBlocks.length;
          const toolResults = await handleAnthropicToolCalls(toolUseBlocks, { userId: context?.userId });
          messages.push({ role: "assistant", content: assistantMessage.content });
          messages.push({ role: "user", content: toolResults });
          continue;
        }
        // Extract text from content blocks
        const textBlocks = assistantMessage.content.filter((b) => b.type === "text");
        const finalText = textBlocks.map((b) => b.text).join("\n");
        return { content: finalText, toolCalls: totalToolCalls };
      }
      return { content: content || "(no response)", toolCalls: totalToolCalls };
    }

    // Process OpenAI tool calls.
    totalToolCalls += toolCalls.length;
    const context = {}; // Could be enriched with userId/chatId from caller.
    const toolResults = await handleOpenAIToolCalls(toolCalls, context);

    // Append assistant message + tool results and loop.
    messages.push({ role: "assistant", content: assistantMessage.content || null, tool_calls: toolCalls });
    messages.push(...toolResults);
  }

  return { content: "(Agent loop reached maximum iterations)", toolCalls: totalToolCalls };
};

module.exports = { runAgentLoop, AGENT_SYSTEM_PROMPT, MAX_TOOL_ITERATIONS };
