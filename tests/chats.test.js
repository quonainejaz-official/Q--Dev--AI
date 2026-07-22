jest.mock("../src/services/db", () => ({
  connectDB: jest.fn().mockResolvedValue(true),
}));

jest.mock("../src/services/cloudinaryService", () => ({
  uploadMany: jest.fn().mockResolvedValue([]),
  isCloudinaryConfigured: jest.fn().mockReturnValue(false),
}));

jest.mock("../src/models/Chat", () => {
  const store = {};
  let idCounter = 1;

  const toClientJSON = function () {
    return {
      id: this.clientId || this._id,
      _id: this._id,
      title: this.title,
      titleIsCustom: this.titleIsCustom,
      messages: this.messages,
      updatedAt: this.updatedAt,
    };
  };

  const mockDoc = (data) => {
    const doc = {
      _id: data._id || `chat-${idCounter++}`,
      userId: data.userId,
      clientId: data.clientId || null,
      title: data.title || "New Chat",
      titleIsCustom: data.titleIsCustom || false,
      messages: data.messages || [],
      updatedAt: Date.now(),
      save() {
        store[doc._id] = doc;
        return Promise.resolve(doc);
      },
    };
    doc.toClientJSON = toClientJSON.bind(doc);
    return doc;
  };

  const Chat = {
    _reset() {
      Object.keys(store).forEach((k) => delete store[k]);
      idCounter = 1;
    },
    async create(data) {
      const doc = mockDoc(data);
      store[doc._id] = doc;
      return doc;
    },
    find(query) {
      let docs = Object.values(store);
      if (query.userId) docs = docs.filter((d) => String(d.userId) === String(query.userId));
      const chain = {
        _docs: docs,
        sort() {
          chain._docs = [...chain._docs].sort((a, b) => b.updatedAt - a.updatedAt);
          return chain;
        },
        limit(n) {
          return chain._docs.slice(0, n);
        },
      };
      return chain;
    },
    async findOne(query) {
      const docs = Object.values(store);
      return docs.find((d) => {
        if (query._id && d._id !== query._id) return false;
        if (query.userId && String(d.userId) !== String(query.userId)) return false;
        if (query.clientId && d.clientId !== query.clientId) return false;
        return true;
      }) || null;
    },
    async deleteOne(query) {
      const docs = Object.values(store);
      const idx = docs.findIndex((d) => {
        if (query._id && d._id !== query._id) return false;
        if (query.userId && String(d.userId) !== String(query.userId)) return false;
        return true;
      });
      if (idx >= 0) {
        delete store[docs[idx]._id];
        return { deletedCount: 1 };
      }
      return { deletedCount: 0 };
    },
    async deleteMany() {
      Object.keys(store).forEach((k) => delete store[k]);
    },
  };
  return Chat;
});

const mongoose = require("mongoose");
const Chat = require("../src/models/Chat");
const { listChats, getChat, createChat, updateChat, deleteChat, migrateChats } = require("../src/controllers/chatsController");
const { mockReq, mockRes, mockNext } = require("./setup");

const userId = "user-123";
let chatId;

beforeAll(() => {
  Chat._reset();
});

afterAll(() => {
  Chat._reset();
});

describe("createChat", () => {
  test("creates a new chat", async () => {
    const req = mockReq({
      userId,
      body: { title: "My Chat", messages: [{ role: "user", content: "Hello" }] },
    });
    const res = mockRes();
    await createChat(req, res, mockNext());

    expect(res._json.chat.title).toBe("My Chat");
    expect(res._json.chat.messages).toHaveLength(1);
    expect(res._json.chat.messages[0].content).toBe("Hello");
    chatId = res._json.chat._id;
  });

  test("upserts by clientId when provided", async () => {
    const clientId = "guest-chat-abc";
    const req = mockReq({
      userId,
      body: { clientId, title: "Guest Chat", messages: [{ role: "user", content: "Hi from guest" }] },
    });
    const res = mockRes();
    await createChat(req, res, mockNext());

    expect(res._json.chat.title).toBe("Guest Chat");
    expect(res._json.chat.id).toBe(clientId);

    const req2 = mockReq({
      userId,
      body: { clientId, title: "Updated Title", messages: [{ role: "user", content: "Updated" }] },
    });
    const res2 = mockRes();
    await createChat(req2, res2, mockNext());

    expect(res2._json.chat.title).toBe("Updated Title");
    expect(res2._json.chat.messages).toHaveLength(1);
  });

  test("defaults title to New Chat when not provided", async () => {
    const req = mockReq({
      userId,
      body: { messages: [{ role: "user", content: "test" }] },
    });
    const res = mockRes();
    await createChat(req, res, mockNext());

    expect(res._json.chat.title).toBe("New Chat");
  });

  test("processes messages with media fields", async () => {
    const req = mockReq({
      userId,
      body: {
        messages: [
          { role: "user", content: "Hello", images: ["https://example.com/img.jpg"] },
          { role: "bot", content: "Hi there" },
        ],
      },
    });
    const res = mockRes();
    await createChat(req, res, mockNext());

    expect(res._json.chat.messages).toHaveLength(2);
    expect(res._json.chat.messages[0].images).toContain("https://example.com/img.jpg");
  });
});

describe("listChats", () => {
  test("lists chats for the authenticated user", async () => {
    const req = mockReq({ userId });
    const res = mockRes();
    await listChats(req, res, mockNext());

    expect(res._json.chats).toBeInstanceOf(Array);
    expect(res._json.chats.length).toBeGreaterThanOrEqual(1);
  });

  test("returns correct chat fields", async () => {
    const req = mockReq({ userId });
    const res = mockRes();
    await listChats(req, res, mockNext());

    const chat = res._json.chats[0];
    expect(chat).toHaveProperty("_id");
    expect(chat).toHaveProperty("title");
    expect(chat).toHaveProperty("titleIsCustom");
    expect(chat).toHaveProperty("messages");
    expect(chat).toHaveProperty("updatedAt");
  });
});

describe("getChat", () => {
  test("returns a single chat by id", async () => {
    const req = mockReq({ userId, params: { id: chatId } });
    const res = mockRes();
    await getChat(req, res, mockNext());

    expect(res._json.chat._id).toBe(chatId);
    expect(res._json.chat.title).toBe("My Chat");
  });

  test("returns 404 for non-existent chat", async () => {
    const req = mockReq({ userId, params: { id: "chat-nonexistent" } });
    const res = mockRes();
    await getChat(req, res, mockNext());

    expect(res.statusCode).toBe(404);
    expect(res._json.error).toMatch(/not found/i);
  });
});

describe("updateChat", () => {
  test("updates chat title", async () => {
    const req = mockReq({
      userId,
      params: { id: chatId },
      body: { title: "Updated Title", titleIsCustom: true },
    });
    const res = mockRes();
    await updateChat(req, res, mockNext());

    expect(res._json.chat.title).toBe("Updated Title");
    expect(res._json.chat.titleIsCustom).toBe(true);
  });

  test("updates messages", async () => {
    const req = mockReq({
      userId,
      params: { id: chatId },
      body: { messages: [{ role: "user", content: "Updated msg" }] },
    });
    const res = mockRes();
    await updateChat(req, res, mockNext());

    expect(res._json.chat.messages).toHaveLength(1);
    expect(res._json.chat.messages[0].content).toBe("Updated msg");
  });

  test("returns 404 for non-existent chat", async () => {
    const req = mockReq({ userId, params: { id: "chat-nonexistent" }, body: { title: "x" } });
    const res = mockRes();
    await updateChat(req, res, mockNext());

    expect(res.statusCode).toBe(404);
  });
});

describe("deleteChat", () => {
  test("deletes a chat", async () => {
    const created = await Chat.create({
      userId,
      title: "Delete Me",
      messages: [{ role: "user", content: "bye" }],
    });

    const req = mockReq({ userId, params: { id: created._id } });
    const res = mockRes();
    await deleteChat(req, res, mockNext());

    expect(res._json.status).toBe("success");
  });

  test("returns 404 for non-existent chat", async () => {
    const req = mockReq({ userId, params: { id: "chat-nonexistent" } });
    const res = mockRes();
    await deleteChat(req, res, mockNext());

    expect(res.statusCode).toBe(404);
  });
});

describe("migrateChats", () => {
  test("migrates guest chats", async () => {
    const req = mockReq({
      userId,
      body: {
        chats: [
          { clientId: "guest-1", title: "Guest Chat 1", messages: [{ role: "user", content: "Migrated 1" }] },
          { clientId: "guest-2", title: "Guest Chat 2", messages: [{ role: "user", content: "Migrated 2" }] },
        ],
      },
    });
    const res = mockRes();
    await migrateChats(req, res, mockNext());

    expect(res._json.chats).toHaveLength(2);
    expect(res._json.chats[0].title).toBe("Guest Chat 1");
    expect(res._json.chats[1].title).toBe("Guest Chat 2");
  });

  test("skips chats without messages", async () => {
    const req = mockReq({
      userId,
      body: {
        chats: [
          { clientId: "empty-chat", title: "Empty" },
          { clientId: "valid-chat", title: "Valid", messages: [{ role: "user", content: "Real" }] },
        ],
      },
    });
    const res = mockRes();
    await migrateChats(req, res, mockNext());

    expect(res._json.chats).toHaveLength(1);
  });

  test("handles empty chats array", async () => {
    const req = mockReq({ userId, body: { chats: [] } });
    const res = mockRes();
    await migrateChats(req, res, mockNext());

    expect(res._json.chats).toEqual([]);
  });

  test("handles missing chats field", async () => {
    const req = mockReq({ userId, body: {} });
    const res = mockRes();
    await migrateChats(req, res, mockNext());

    expect(res._json.chats).toEqual([]);
  });
});
