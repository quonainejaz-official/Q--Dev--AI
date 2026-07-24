jest.mock("../src/models/Chat", () => {
  const mockChain = {
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue([]),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  };
  const fn = jest.fn(() => mockChain);
  fn.find = jest.fn(() => ({ ...mockChain, select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) }));
  return fn;
});

jest.mock("../src/models/Message", () => {
  const mockChain = {
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue([]),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  };
  const fn = jest.fn(() => mockChain);
  fn.find = jest.fn(() => ({ ...mockChain }));
  return fn;
});

const { searchMessages } = require("../src/controllers/searchChatsController");
const Chat = require("../src/models/Chat");
const Message = require("../src/models/Message");

const mockReq = (overrides = {}) => ({
  userId: "user123",
  query: {},
  ...overrides
});

const mockRes = () => {
  const res = { statusCode: null, _json: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res._json = data; return res; };
  return res;
};

const mockNext = () => jest.fn();

describe("searchMessages", () => {
  beforeEach(() => jest.clearAllMocks());

  test("returns 400 when query is empty", async () => {
    const req = mockReq({ query: {} });
    const res = mockRes();
    await searchMessages(req, res, mockNext());
    expect(res.statusCode).toBe(400);
  });

  test("returns 401 when userId missing", async () => {
    const req = mockReq({ userId: null });
    const res = mockRes();
    await searchMessages(req, res, mockNext());
    expect(res.statusCode).toBe(401);
  });

  test("returns results for valid query", async () => {
    Chat.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: "chat1" }])
    });

    Message.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        { chatId: "chat1", role: "user", content: "Hello world", timestamp: Date.now() }
      ])
    });

    const req = mockReq({ query: { q: "hello" } });
    const res = mockRes();
    await searchMessages(req, res, mockNext());

    expect(res._json.results).toBeDefined();
    expect(res._json.results.length).toBe(1);
    expect(res._json.query).toBe("hello");
  });

  test("returns empty results for no match", async () => {
    Chat.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: "chat1" }])
    });

    Message.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([])
    });

    const req = mockReq({ query: { q: "nonexistent" } });
    const res = mockRes();
    await searchMessages(req, res, mockNext());

    expect(res._json.results).toEqual([]);
    expect(res._json.total).toBe(0);
  });
});
