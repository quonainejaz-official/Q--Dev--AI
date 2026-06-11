const { MAX_HISTORY_LENGTH } = require("../utils/messageUtils");

const getHistory = (req) => {
  if (!req.session.messages) {
    req.session.messages = [];
  }
  return req.session.messages;
};

const addMessage = (req, role, content) => {
  const history = getHistory(req);
  history.push({ role, content, timestamp: Date.now() });
  if (history.length > MAX_HISTORY_LENGTH) {
    req.session.messages = history.slice(-MAX_HISTORY_LENGTH);
  }
  return req.session.messages;
};

const clearHistory = (req) => {
  req.session.messages = [];
  return req.session.messages;
};

const setHistory = (req, messages) => {
  if (!Array.isArray(messages)) {
    req.session.messages = [];
    return req.session.messages;
  }
  req.session.messages = messages.slice(-MAX_HISTORY_LENGTH);
  return req.session.messages;
};

module.exports = { getHistory, addMessage, clearHistory, setHistory };
