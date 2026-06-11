const clients = new Map();

const addClient = (sessionId, res) => {
  if (!clients.has(sessionId)) {
    clients.set(sessionId, new Set());
  }
  clients.get(sessionId).add(res);
};

const removeClient = (sessionId, res) => {
  const sessionClients = clients.get(sessionId);
  if (!sessionClients) {
    return;
  }
  sessionClients.delete(res);
  if (sessionClients.size === 0) {
    clients.delete(sessionId);
  }
};

const sendEvent = (sessionId, eventName, payload) => {
  const sessionClients = clients.get(sessionId);
  if (!sessionClients) {
    return;
  }
  const data = JSON.stringify(payload);
  sessionClients.forEach((client) => {
    client.write(`event: ${eventName}\n`);
    client.write(`data: ${data}\n\n`);
  });
};

module.exports = { addClient, removeClient, sendEvent };
