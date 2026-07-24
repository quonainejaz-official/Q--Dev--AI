const mockStreamFn = jest.fn();
const mockProvider = { stream: mockStreamFn, name: "mock" };

jest.mock("../src/providers/registry", () => ({
  registry: {
    select: jest.fn().mockReturnValue(mockProvider),
    selectAll: jest.fn().mockReturnValue([mockProvider]),
  },
}));

jest.mock("../src/services/imageGenService", () => ({
  generateImage: jest.fn(),
}));

const { registry } = require("../src/providers/registry");
const { generateImage } = require("../src/services/imageGenService");
const { getHistory, clearHistory, setHistory, postMessage, postGenerateImage } = require("../src/controllers/chatController");
const { mockReq, mockRes, mockNext } = require("./setup");

/** Parse SSE output from res._written into [{ event, data }, ...] */
const parseSSE = (written) => {
  const raw = written.map((c) => c.toString()).join("");
  const events = [];
  let currentEvent = null;
  for (const line of raw.split("\n")) {
    if (line.startsWith("event: ")) {
      currentEvent = line.slice(7).trim();
    } else if (line.startsWith("data: ")) {
      try {
        events.push({ event: currentEvent, data: JSON.parse(line.slice(6)) });
      } catch { /* skip */ }
      currentEvent = null;
    } else if (line.trim() === "") {
      currentEvent = null;
    }
  }
  return events;
};

describe("GET /api/history (getHistory)", () => {
  test("returns empty messages array", () => {
    const req = mockReq();
    const res = mockRes();
    getHistory(req, res);
    expect(res._json.messages).toEqual([]);
  });
});

describe("DELETE /api/history (clearHistory)", () => {
  test("returns success status", () => {
    const req = mockReq();
    const res = mockRes();
    clearHistory(req, res);
    expect(res._json.status).toBe("success");
    expect(res._json.message).toBe("Chat history cleared.");
  });
});

describe("PUT /api/history (setHistory)", () => {
  test("returns success with empty messages", () => {
    const req = mockReq();
    const res = mockRes();
    setHistory(req, res);
    expect(res._json.status).toBe("success");
    expect(res._json.messages).toEqual([]);
  });
});

describe("POST /api/generate-image", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test("returns 400 when prompt is missing", async () => {
    const req = mockReq({ body: {} });
    const res = mockRes();
    await postGenerateImage(req, res, mockNext());
    expect(res.statusCode).toBe(400);
    expect(res._json.error).toMatch(/prompt is required/i);
  });

  test("returns 400 when prompt is empty string", async () => {
    const req = mockReq({ body: { prompt: "   " } });
    const res = mockRes();
    await postGenerateImage(req, res, mockNext());
    expect(res.statusCode).toBe(400);
  });

  test("streams image data via SSE on success", async () => {
    const dataUrl = "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=";
    generateImage.mockResolvedValue({ dataUrl, revisedPrompt: "a cat", method: "svg" });

    const req = mockReq({ body: { prompt: "a cat" } });
    const res = mockRes();
    await postGenerateImage(req, res, mockNext());

    const events = parseSSE(res._written);
    expect(events[0]).toEqual({ event: "typing", data: { active: true } });
    expect(events[1]).toEqual({ event: "typing", data: { active: false } });
    expect(events[2].event).toBe("image");
    expect(events[2].data.dataUrl).toBe(dataUrl);
    expect(events[3].event).toBe("done");
    expect(res._ended).toBe(true);
  });

  test("streams error via SSE on failure", async () => {
    generateImage.mockRejectedValue(new Error("API down"));

    const req = mockReq({ body: { prompt: "a cat" } });
    const res = mockRes();
    await postGenerateImage(req, res, mockNext());

    const events = parseSSE(res._written);
    expect(events[0]).toEqual({ event: "typing", data: { active: true } });
    expect(events[1]).toEqual({ event: "typing", data: { active: false } });
    expect(events[2].event).toBe("error");
    expect(events[2].data.message).toMatch(/API down/);
  });
});

describe("POST /api/message (postMessage)", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test("returns 400 for invalid message without media", async () => {
    const req = mockReq({ body: { message: "" } });
    const res = mockRes();
    await postMessage(req, res, mockNext());
    expect(res.statusCode).toBe(400);
  });

  test("allows empty message when images are present", async () => {
    async function* mockStream() { yield { type: "token", text: "Hello" }; }
    mockStreamFn.mockReturnValue(mockStream());

    const req = mockReq({ body: { message: "", images: ["data:image/png;base64,abc"] } });
    const res = mockRes();
    await postMessage(req, res, mockNext());

    const events = parseSSE(res._written);
    expect(events.some((e) => e.event === "start")).toBe(true);
    expect(events.some((e) => e.event === "done")).toBe(true);
  });

  test("streams response chunks via SSE on success", async () => {
    async function* mockStream() {
      yield { type: "token", text: "Hello " };
      yield { type: "token", text: "World" };
    }
    mockStreamFn.mockReturnValue(mockStream());

    const req = mockReq({ body: { message: "Hi there", history: [] } });
    const res = mockRes();
    await postMessage(req, res, mockNext());

    const events = parseSSE(res._written);
    expect(events[0]).toEqual({ event: "typing", data: { active: true } });
    expect(events[1]).toEqual({ event: "typing", data: { active: false } });
    expect(events[2]).toEqual({ event: "start", data: {} });

    const chunks = events.filter((e) => e.event === "chunk");
    expect(chunks).toHaveLength(2);
    expect(chunks[0].data.text).toBe("Hello ");
    expect(chunks[1].data.text).toBe("World");

    expect(events.some((e) => e.event === "done")).toBe(true);
    expect(res._ended).toBe(true);
  });

  test("handles empty stream (no chunks)", async () => {
    async function* mockStream() {}
    mockStreamFn.mockReturnValue(mockStream());

    const req = mockReq({ body: { message: "test" } });
    const res = mockRes();
    await postMessage(req, res, mockNext());

    const events = parseSSE(res._written);
    expect(events.some((e) => e.event === "error")).toBe(true);
  });

  test("sends error via SSE on stream failure", async () => {
    async function* mockStream() { throw new Error("Stream broke"); }
    mockStreamFn.mockReturnValue(mockStream());

    const req = mockReq({ body: { message: "test" } });
    const res = mockRes();
    await postMessage(req, res, mockNext());

    const events = parseSSE(res._written);
    expect(events.some((e) => e.event === "error")).toBe(true);
  });

  test("trims duplicate last message from history", async () => {
    async function* mockStream() { yield { type: "token", text: "Reply" }; }
    mockStreamFn.mockReturnValue(mockStream());

    const req = mockReq({
      body: {
        message: "Hello",
        history: [
          { role: "user", content: "Hi" },
          { role: "bot", content: "Hey" },
          { role: "user", content: "Hello" },
        ],
      },
    });
    const res = mockRes();
    await postMessage(req, res, mockNext());

    const callArgs = mockStreamFn.mock.calls[0][0];
    expect(callArgs.history).toHaveLength(2);
    expect(callArgs.history[1].content).toBe("Hey");
  });

  test("normalizes bot roles in history", async () => {
    async function* mockStream() { yield { type: "token", text: "ok" }; }
    mockStreamFn.mockReturnValue(mockStream());

    const req = mockReq({
      body: {
        message: "test",
        history: [
          { role: "user", content: "Hi" },
          { role: "bot", content: "Hello" },
        ],
      },
    });
    const res = mockRes();
    await postMessage(req, res, mockNext());

    const callArgs = mockStreamFn.mock.calls[0][0];
    expect(callArgs.history[0].role).toBe("user");
    expect(callArgs.history[1].role).toBe("bot");
  });

  test("selects provider with vision capability when images present", async () => {
    async function* mockStream() { yield { type: "token", text: "I see a cat" }; }
    mockStreamFn.mockReturnValue(mockStream());

    const req = mockReq({
      body: { message: "what is this?", images: ["data:image/png;base64,abc"] },
    });
    const res = mockRes();
    await postMessage(req, res, mockNext());

    expect(registry.selectAll).toHaveBeenCalledWith({ vision: true, streaming: true });
  });

  test("sends Content-Type text/event-stream", async () => {
    async function* mockStream() { yield { type: "token", text: "ok" }; }
    mockStreamFn.mockReturnValue(mockStream());

    const req = mockReq({ body: { message: "hi" } });
    const res = mockRes();
    await postMessage(req, res, mockNext());

    expect(res._headers["Content-Type"]).toBe("text/event-stream");
  });
});
