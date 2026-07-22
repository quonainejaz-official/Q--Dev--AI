process.env.JWT_SECRET = "test-jwt-secret";
process.env.NODE_ENV = "test";

function mockReq(overrides = {}) {
  return {
    body: {},
    params: {},
    query: {},
    cookies: {},
    userId: null,
    ...overrides,
  };
}

function mockRes() {
  const res = {
    statusCode: null,
    _json: null,
    _headers: {},
    _ended: false,
    _written: [],
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(data) {
      res._json = data;
      return res;
    },
    setHeader(name, value) {
      res._headers[name] = value;
    },
    get(name) {
      return res._headers[name];
    },
    flushHeaders() {},
    write(chunk) {
      res._written.push(chunk);
    },
    end() {
      res._ended = true;
    },
    cookie() {
      return res;
    },
    clearCookie() {
      return res;
    },
  };
  return res;
}

function mockNext() {
  return jest.fn();
}

module.exports = { mockReq, mockRes, mockNext };
