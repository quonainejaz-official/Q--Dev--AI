jest.mock("../src/services/db", () => ({
  connectDB: jest.fn().mockResolvedValue(true),
  isDbConfigured: jest.fn().mockReturnValue(true),
}));

jest.mock("google-auth-library", () => {
  class MockOAuth2Client {
    async verifyIdToken() {
      return {
        getPayload: () => ({
          sub: "google-uid-123",
          email: "googler@gmail.com",
          name: "Googler",
          picture: "https://lh3.googleusercontent.com/avatar",
        }),
      };
    }
  }
  return { OAuth2Client: MockOAuth2Client };
});

jest.mock("../src/models/User", () => {
  const store = {};
  let idCounter = 1;

  const mockDoc = (data) => ({
    _id: data._id || `user-${idCounter++}`,
    email: data.email,
    passwordHash: data.passwordHash || null,
    googleId: data.googleId || null,
    name: data.name || "",
    avatar: data.avatar || "",
    toPublicJSON() {
      return { id: this._id, email: this.email, name: this.name, avatar: this.avatar };
    },
    save() {
      store[this._id] = this;
      return Promise.resolve(this);
    },
  });

  const User = {
    _reset() {
      Object.keys(store).forEach((k) => delete store[k]);
      idCounter = 1;
    },
    async create(data) {
      const doc = mockDoc(data);
      store[doc._id] = doc;
      return doc;
    },
    async findOne(query) {
      const docs = Object.values(store);
      return docs.find((d) => {
        if (query.email && d.email !== query.email) return false;
        if (query.googleId && d.googleId !== query.googleId) return false;
        if (query.$or) {
          return query.$or.some((cond) => {
            if (cond.googleId) return d.googleId === cond.googleId;
            if (cond.email) return d.email === cond.email;
            return false;
          });
        }
        return true;
      }) || null;
    },
    async findById(id) {
      return store[id] || null;
    },
    async deleteMany() {
      Object.keys(store).forEach((k) => delete store[k]);
    },
  };
  return User;
});

const User = require("../src/models/User");
const { register, login, googleAuth, logout, me } = require("../src/controllers/authController");
const { signToken } = require("../src/middlewares/auth");
const { mockReq, mockRes, mockNext } = require("./setup");

let testUserId;

beforeAll(() => {
  User._reset();
});

afterAll(() => {
  User._reset();
});

describe("register", () => {
  test("registers a new user with valid email and password", async () => {
    const req = mockReq({ body: { email: "test@example.com", password: "secret123", name: "Tester" } });
    const res = mockRes();
    const next = mockNext();

    await register(req, res, next);

    expect(res._json.user.email).toBe("test@example.com");
    expect(res._json.user.name).toBe("Tester");
    expect(res._json.user.id).toBeDefined();
    testUserId = res._json.user.id;
  });

  test("returns 400 for invalid email", async () => {
    const req = mockReq({ body: { email: "not-an-email", password: "secret123" } });
    const res = mockRes();
    await register(req, res, mockNext());

    expect(res.statusCode).toBe(400);
    expect(res._json.error).toMatch(/valid email/i);
  });

  test("returns 400 for short password", async () => {
    const req = mockReq({ body: { email: "short@example.com", password: "ab" } });
    const res = mockRes();
    await register(req, res, mockNext());

    expect(res.statusCode).toBe(400);
    expect(res._json.error).toMatch(/6 characters/i);
  });

  test("returns 409 for duplicate email", async () => {
    const req = mockReq({ body: { email: "test@example.com", password: "secret123" } });
    const res = mockRes();
    await register(req, res, mockNext());

    expect(res.statusCode).toBe(409);
    expect(res._json.error).toMatch(/already registered/i);
  });

  test("defaults name to email prefix when not provided", async () => {
    const req = mockReq({ body: { email: "defaultname@example.com", password: "secret123" } });
    const res = mockRes();
    await register(req, res, mockNext());

    expect(res._json.user.name).toBe("defaultname");
  });
});

describe("login", () => {
  test("logs in with correct credentials", async () => {
    const req = mockReq({ body: { email: "test@example.com", password: "secret123" } });
    const res = mockRes();
    await login(req, res, mockNext());

    expect(res._json.user.email).toBe("test@example.com");
  });

  test("returns 401 for wrong password", async () => {
    const req = mockReq({ body: { email: "test@example.com", password: "wrongpassword" } });
    const res = mockRes();
    await login(req, res, mockNext());

    expect(res.statusCode).toBe(401);
    expect(res._json.error).toMatch(/invalid email or password/i);
  });

  test("returns 401 for non-existent email", async () => {
    const req = mockReq({ body: { email: "nobody@example.com", password: "secret123" } });
    const res = mockRes();
    await login(req, res, mockNext());

    expect(res.statusCode).toBe(401);
  });
});

describe("googleAuth", () => {
  const origGoogleId = process.env.GOOGLE_CLIENT_ID;

  beforeAll(() => {
    process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
  });

  afterAll(() => {
    if (origGoogleId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = origGoogleId;
  });

  test("creates user from Google credential", async () => {
    const req = mockReq({ body: { credential: "valid-google-token" } });
    const res = mockRes();
    await googleAuth(req, res, mockNext());

    expect(res._json.user.email).toBe("googler@gmail.com");
    expect(res._json.user.name).toBe("Googler");
  });

  test("returns 400 when credential is missing", async () => {
    const req = mockReq({ body: {} });
    const res = mockRes();
    await googleAuth(req, res, mockNext());

    expect(res.statusCode).toBe(400);
    expect(res._json.error).toMatch(/missing google credential/i);
  });

  test("returns 503 when GOOGLE_CLIENT_ID is not set", async () => {
    delete process.env.GOOGLE_CLIENT_ID;

    const req = mockReq({ body: { credential: "token" } });
    const res = mockRes();
    await googleAuth(req, res, mockNext());

    expect(res.statusCode).toBe(503);
    expect(res._json.error).toMatch(/not configured/i);

    process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
  });
});

describe("logout", () => {
  test("clears cookie and returns success", () => {
    const req = mockReq();
    const res = mockRes();
    logout(req, res);

    expect(res._json.status).toBe("success");
  });
});

describe("me", () => {
  test("returns user when authenticated", async () => {
    const req = mockReq({ userId: testUserId });
    const res = mockRes();
    await me(req, res, mockNext());

    expect(res._json.user.email).toBe("test@example.com");
  });

  test("returns null user when not authenticated", async () => {
    const req = mockReq({ userId: null });
    const res = mockRes();
    await me(req, res, mockNext());

    expect(res._json.user).toBeNull();
  });
});

describe("auth middleware", () => {
  const { attachUser, requireAuth } = require("../src/middlewares/auth");

  test("attachUser sets userId from valid cookie", () => {
    const token = signToken("507f1f77bcf86cd799439011");
    const req = { cookies: { qai_token: token }, userId: null };
    const next = jest.fn();

    attachUser(req, {}, next);
    expect(req.userId).toBe("507f1f77bcf86cd799439011");
    expect(next).toHaveBeenCalled();
  });

  test("attachUser sets userId null for invalid token", () => {
    const req = { cookies: { qai_token: "garbage" }, userId: undefined };
    const next = jest.fn();

    attachUser(req, {}, next);
    expect(req.userId).toBeNull();
  });

  test("attachUser does nothing without cookie", () => {
    const req = { cookies: {}, userId: undefined };
    const next = jest.fn();

    attachUser(req, {}, next);
    expect(req.userId).toBeUndefined();
  });

  test("requireAuth returns 401 when no userId", () => {
    const req = { userId: null };
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res._json.error).toMatch(/authentication required/i);
    expect(next).not.toHaveBeenCalled();
  });

  test("requireAuth calls next when userId is present", () => {
    const req = { userId: "some-id" };
    const next = jest.fn();

    requireAuth(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });
});
