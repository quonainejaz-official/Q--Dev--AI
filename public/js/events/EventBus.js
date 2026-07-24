/**
 * EventBus — centralized publish/subscribe for inter-component communication.
 *
 * Events follow a `domain:action` convention:
 *   message:send, conversation:changed, theme:toggled, stream:started, etc.
 *
 * Usage:
 *   import { bus } from '../events/EventBus.js';
 *   bus.on('theme:toggled', ({ theme }) => console.log(theme));
 *   bus.emit('theme:toggled', { theme: 'light' });
 *   bus.off('theme:toggled', handler);
 *
 * Components should call `bus.destroy()` in their `disconnectedCallback`
 * to automatically remove all listeners they registered.
 */
class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /**
   * Register a listener for an event.
   * @param {string} event
   * @param {Function} callback
   * @returns {Function} unsubscribe function (convenience)
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);

    // Return unsubscribe function for inline cleanup
    return () => this.off(event, callback);
  }

  /**
   * Remove a specific listener, or all listeners for an event.
   * @param {string} event
   * @param {Function} [callback] — if omitted, removes ALL listeners for this event
   */
  off(event, callback) {
    if (!callback) {
      this._listeners.delete(event);
      return;
    }
    const set = this._listeners.get(event);
    if (set) {
      set.delete(callback);
      if (set.size === 0) this._listeners.delete(event);
    }
  }

  /**
   * Emit an event with optional payload.
   * @param {string} event
   * @param {*} [detail]
   */
  emit(event, detail) {
    const set = this._listeners.get(event);
    if (!set) return;
    for (const cb of set) {
      try {
        cb(detail);
      } catch (err) {
        console.error(`[EventBus] Error in listener for "${event}":`, err);
      }
    }
  }

  /**
   * Register a one-time listener that auto-removes after first call.
   * @param {string} event
   * @param {Function} callback
   */
  once(event, callback) {
    const wrapper = (detail) => {
      this.off(event, wrapper);
      callback(detail);
    };
    this.on(event, wrapper);
  }

  /**
   * Remove ALL listeners. Useful for testing or full teardown.
   */
  clear() {
    this._listeners.clear();
  }

  /**
   * Return the number of registered listeners (for debugging).
   */
  get listenerCount() {
    let count = 0;
    for (const set of this._listeners.values()) count += set.size;
    return count;
  }
}

/** Singleton — the entire app shares one bus. */
export const bus = new EventBus();
