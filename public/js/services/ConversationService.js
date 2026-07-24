/**
 * ConversationService — CRUD operations for conversations.
 */
const API = '/api/chats';

const authFetch = (path, opts = {}) =>
  fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });

export const ConversationService = {
  async list() {
    const res = await authFetch(API);
    if (!res.ok) throw new Error('Failed to load conversations');
    return res.json();
  },

  async get(id) {
    const res = await authFetch(`${API}/${id}`);
    if (!res.ok) throw new Error('Failed to load conversation');
    return res.json();
  },

  async create(title = 'New Chat') {
    const res = await authFetch(API, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error('Failed to create conversation');
    return res.json();
  },

  async delete(id) {
    const res = await authFetch(`${API}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete conversation');
    return res.json();
  },

  async rename(id, title) {
    const res = await authFetch(`${API}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error('Failed to rename conversation');
    return res.json();
  },

  async search(query) {
    const res = await authFetch(`${API}/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Search failed');
    return res.json();
  },

  async share(id) {
    const res = await authFetch(`${API}/${id}/share`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to share');
    return res.json();
  },
};
