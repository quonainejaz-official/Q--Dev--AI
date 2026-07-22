jest.mock("../src/services/opencodeService", () => ({
  streamVisionReply: jest.fn(),
  generateVisionReply: jest.fn(),
}));

jest.mock("../src/services/imageGenService", () => ({
  generateImage: jest.fn(),
}));

const { streamVisionReply } = require("../src/services/opencodeService");
const { generateImage } = require("../src/services/imageGenService");
const { getHistory, clearHistory, setHistory, postMessage, postGenerateImage } = require("../src/controllers/chatController");
const { mockReq, mockRes, mockNext } = require("./setup");

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns 400 when prompt is missing", async () => {
    const req = mockReq({ body: {} });
    const res = mockRes();
    const next = mockNext();

    await postGenerateImage(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res._json.error).toMatch(/prompt is required/i);
  });

  test("returns 400 when prompt is empty string", async () => {
    const req = mockReq({ body: { prompt: "   " } });
    const res = mockRes();

    await postGenerateImage(req, res, mockNext());

    expect(res.statusCode).toBe(400);
  });

  test("streams image data on success", async () => {
    const dataUrl = "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=";
    generateImage.mockResolvedValue(dataUrl);

    const req = mockReq({ body: { prompt: "a cat" } });
    const res = mockRes();
    const next = mockNext();

    await postGenerateImage(req, res, next);

    const written = res._written.map((c) => c.toString());
    const lines = written.filter((l) => l.trim()).map((l) => JSON.parse(l));

    expect(lines[0]).toEqual({ type: "typing", active: true });
    expect(lines[1]).toEqual({ type: "typing", active: false });
    expect(lines[2].type).toBe("image");
    expect(lines[2].dataUrl).toBe(dataUrl);
    expect(lines[3]).toEqual({ type: "done" });
    expect(res._ended).toBe(true);
  });

  test("streams error on failure", async () => {
    generateImage.mockRejectedValue(new Error("API down"));

    const req = mockReq({ body: { prompt: "a cat" } });
    const res = mockRes();
    const next = mockNext();

    await postGenerateImage(req, res, next);

    const written = res._written.map((c) => c.toString());
    const lines = written.filter((l) => l.trim()).map((l) => JSON.parse(l));

    expect(lines[0]).toEqual({ type: "typing", active: true });
    expect(lines[1]).toEqual({ type: "typing", active: false });
    expect(lines[2].type).toBe("error");
    expect(lines[2].message).toMatch(/API down/);
    expect(next).toHaveBeenCalled();
  });
});

describe("POST /api/message (postMessage)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns 400 for invalid message without media", async () => {
    const req = mockReq({ body: { message: "" } });
    const res = mockRes();
    const next = mockNext();

    await postMessage(req, res, next);

    expect(res.statusCode).toBe(400);
  });

  test("allows empty message when images are present", async () => {
    async function* mockStream() {
      yield "Hello";
    }
    streamVisionReply.mockReturnValue(mockStream());

    const req = mockReq({
      body: {
        message: "",
        images: ["data:image/png;base64,abc"],
      },
    });
    const res = mockRes();
    const next = mockNext();

    await postMessage(req, res, next);

    const written = res._written.map((c) => c.toString());
    const lines = written.filter((l) => l.trim()).map((l) => JSON.parse(l));

    expect(lines.some((l) => l.type === "start")).toBe(true);
    expect(lines.some((l) => l.type === "done")).toBe(true);
  });

  test("streams response chunks on success", async () => {
    async function* mockStream() {
      yield "Hello ";
      yield "World";
    }
    streamVisionReply.mockReturnValue(mockStream());

    const req = mockReq({
      body: {
        message: "Hi there",
        history: [],
      },
    });
    const res = mockRes();
    const next = mockNext();

    await postMessage(req, res, next);

    const written = res._written.map((c) => c.toString());
    const lines = written.filter((l) => l.trim()).map((l) => JSON.parse(l));

    expect(lines[0]).toEqual({ type: "typing", active: true });
    expect(lines[1]).toEqual({ type: "typing", active: false });
    expect(lines[2]).toEqual({ type: "start" });

    const chunks = lines.filter((l) => l.type === "chunk");
    expect(chunks).toHaveLength(2);
    expect(chunks[0].text).toBe("Hello ");
    expect(chunks[1].text).toBe("World");

    expect(lines.some((l) => l.type === "done")).toBe(true);
    expect(res._ended).toBe(true);
  });

  test("handles empty stream (no chunks)", async () => {
    async function* mockStream() {
      // empty generator
    }
    streamVisionReply.mockReturnValue(mockStream());

    const req = mockReq({ body: { message: "test" } });
    const res = mockRes();
    const next = mockNext();

    await postMessage(req, res, next);

    const written = res._written.map((c) => c.toString());
    const lines = written.filter((l) => l.trim()).map((l) => JSON.parse(l));

    expect(lines.some((l) => l.type === "error")).toBe(true);
    expect(next).toHaveBeenCalled();
  });

  test("sends error on stream failure", async () => {
    async function* mockStream() {
      throw new Error("Stream broke");
    }
    streamVisionReply.mockReturnValue(mockStream());

    const req = mockReq({ body: { message: "test" } });
    const res = mockRes();
    const next = mockNext();

    await postMessage(req, res, next);

    const written = res._written.map((c) => c.toString());
    const lines = written.filter((l) => l.trim()).map((l) => JSON.parse(l));

    expect(lines.some((l) => l.type === "error")).toBe(true);
    expect(next).toHaveBeenCalled();
  });

  test("trims duplicate last message from history", async () => {
    async function* mockStream() {
      yield "Reply";
    }
    streamVisionReply.mockReturnValue(mockStream());

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

    const callArgs = streamVisionReply.mock.calls[0][0];
    expect(callArgs.history).toHaveLength(2);
    expect(callArgs.history[1].content).toBe("Hey");
  });

  test("normalizes bot roles in history", async () => {
    async function* mockStream() {
      yield "ok";
    }
    streamVisionReply.mockReturnValue(mockStream());

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

    const callArgs = streamVisionReply.mock.calls[0][0];
    expect(callArgs.history[0].role).toBe("user");
    expect(callArgs.history[1].role).toBe("bot");
  });
});
