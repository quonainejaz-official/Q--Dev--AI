/**
 * StorageService — localStorage wrapper with JSON support.
 */
const PREFIX = 'qai_';

export const StorageService = {
  get(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch { /* quota exceeded — ignore */ }
  },

  remove(key) {
    localStorage.removeItem(PREFIX + key);
  },

  clear() {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(PREFIX)) localStorage.removeItem(k);
    }
  },
};
