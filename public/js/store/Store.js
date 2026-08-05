/**
 * Store — reactive central state for the entire application.
 *
 * Components subscribe to state changes and receive only the slice they care about.
 * State is modified exclusively through actions, which keeps changes predictable.
 *
 * Usage:
 *   import { store } from '../store/Store.js';
 *   store.subscribe('theme', (theme) => applyTheme(theme));
 *   store.dispatch('SET_THEME', 'dark');
 *   const current = store.select('theme');
 */
class Store {
  /**
   * @param {object} initialState
   */
  constructor(initialState = {}) {
    this._state = { ...initialState };
    /** @type {Map<string, Set<Function>>} key → listeners */
    this._subscribers = new Map();
    /** @type {Map<string, Function>} actionName → reducer */
    this._reducers = new Map();
  }

  /**
   * Register a reducer: `store.addReducer('SET_THEME', (state, payload) => ({ ...state, theme: payload }))`
   * @param {string} action
   * @param {Function} reducer — (state, payload) => newState
   */
  addReducer(action, reducer) {
    this._reducers.set(action, reducer);
  }

  /**
   * Dispatch an action to update state.
   * @param {string} action
   * @param {*} [payload]
   */
  dispatch(action, payload) {
    const reducer = this._reducers.get(action);
    if (!reducer) {
      console.warn(`[Store] No reducer registered for action "${action}"`);
      return;
    }

    const prev = { ...this._state };
    this._state = reducer(this._state, payload);

    // Notify subscribers whose keys actually changed
    for (const [key, listeners] of this._subscribers) {
      if (prev[key] !== this._state[key]) {
        for (const cb of listeners) {
          try { cb(this._state[key], prev[key]); }
          catch (err) { console.error(`[Store] Subscriber error for "${key}":`, err); }
        }
      }
    }
  }

  /**
   * Subscribe to changes on a specific key.
   * @param {string} key — top-level state key
   * @param {Function} callback — (newValue, oldValue) => void
   * @returns {Function} unsubscribe function
   */
  subscribe(key, callback) {
    if (!this._subscribers.has(key)) {
      this._subscribers.set(key, new Set());
    }
    this._subscribers.get(key).add(callback);
    return () => this._subscribers.get(key)?.delete(callback);
  }

  /**
   * Get the current value of a key (or entire state).
   * @param {string} [key]
   * @returns {*}
   */
  select(key) {
    return key ? this._state[key] : { ...this._state };
  }

  /**
   * Reset state to initial values and notify all subscribers.
   * @param {object} initialState
   */
  reset(initialState) {
    const prev = { ...this._state };
    this._state = { ...initialState };
    for (const [key, listeners] of this._subscribers) {
      if (prev[key] !== this._state[key]) {
        for (const cb of listeners) {
          try { cb(this._state[key], prev[key]); }
          catch (err) { console.error(`[Store] Reset subscriber error for "${key}":`, err); }
        }
      }
    }
  }
}

// ── Application state shape ──────────────────────────────────────────
const initialState = {
  // Auth
  user: null,
  token: null,
  isAuthModalOpen: false,
  isLoginView: true,

  // Conversations
  currentConversationId: null,
  conversations: [],

  // Messages
  messages: [],

  // Streaming
  isStreaming: false,
  abortController: null,

  // UI
  theme: (localStorage.getItem('qai_theme') || 'dark').replaceAll('"', ''),
  sidebarOpen: window.innerWidth > 768,
  isMobile: window.innerWidth <= 768,
  isImageGenLoading: false,

  // Media attachments
  mediaAttachments: [],

  // Toast
  toasts: [],
};

export const store = new Store(initialState);
