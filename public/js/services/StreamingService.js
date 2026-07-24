/**
 * StreamingService — handles SSE/streaming responses from the AI.
 */
import { store } from '../store/Store.js';
import { bus } from '../events/EventBus.js';
import { EVENTS } from '../events/events.js';
import { ChatService } from './ChatService.js';

export const StreamingService = {
  abort() {
    const controller = store.select('abortController');
    if (controller) controller.abort();
    store.dispatch('SET_STREAMING', false);
    store.dispatch('SET_ABORT_CONTROLLER', null);
  },

  async send(payload) {
    const controller = new AbortController();
    store.dispatch('SET_ABORT_CONTROLLER', controller);
    store.dispatch('SET_STREAMING', true);
    bus.emit(EVENTS.STREAM.STARTED);

    try {
      const res = await ChatService.sendMessageStream(payload, controller.signal);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              bus.emit(EVENTS.STREAM.FINISHED);
              return;
            }
            try {
              const parsed = JSON.parse(data);
              bus.emit(EVENTS.STREAM.CHUNK, parsed);
            } catch { /* skip malformed */ }
          }
        }
      }
      bus.emit(EVENTS.STREAM.FINISHED);
    } catch (err) {
      if (err.name !== 'AbortError') {
        bus.emit(EVENTS.STREAM.ERROR, { error: err.message });
        throw err;
      }
    } finally {
      store.dispatch('SET_STREAMING', false);
      store.dispatch('SET_ABORT_CONTROLLER', null);
    }
  },
};
