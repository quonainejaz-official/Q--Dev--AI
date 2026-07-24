/**
 * Event names — single source of truth for all bus events.
 * Import these instead of hardcoding strings.
 *
 * Convention: `domain:noun:verb` or `domain:verb`
 *
 * Usage:
 *   import { bus, EVENTS } from '../events/EventBus.js';
 *   bus.on(EVENTS.MESSAGE.RECEIVED, handler);
 *   bus.emit(EVENTS.MESSAGE.SEND, payload);
 */
export const EVENTS = Object.freeze({
  MESSAGE: {
    SEND:       'message:send',
    RECEIVED:   'message:received',
    EDIT:       'message:edit',
    COPY:       'message:copy',
  },
  CONVERSATION: {
    CHANGED:    'conversation:changed',
    CREATED:    'conversation:created',
    DELETED:    'conversation:deleted',
    TITLE_EDIT: 'conversation:titleEdit',
    LOADED:     'conversation:loaded',
    SEARCH:     'conversation:search',
  },
  STREAM: {
    STARTED:    'stream:started',
    CHUNK:      'stream:chunk',
    FINISHED:   'stream:finished',
    ERROR:      'stream:error',
  },
  THEME: {
    TOGGLED:    'theme:toggled',
    SYSTEM:     'theme:systemChanged',
  },
  AUTH: {
    LOGIN:      'auth:login',
    LOGOUT:     'auth:logout',
    SESSION:    'auth:session',
  },
  SIDEBAR: {
    TOGGLE:     'sidebar:toggle',
    OPEN:       'sidebar:open',
    CLOSE:      'sidebar:close',
  },
  MEDIA: {
    ATTACH:     'media:attach',
    REMOVE:     'media:remove',
    CLEAR:      'media:clear',
    IMAGE_GEN:  'media:imageGen',
  },
  CANVAS: {
    OPEN:       'canvas:open',
    CLOSE:      'canvas:close',
    RUN:        'canvas:run',
  },
  UI: {
    TOAST:         'ui:toast',
    MODAL_OPEN:    'ui:modalOpen',
    MODAL_CLOSE:   'ui:modalClose',
    LOADING:       'ui:loading',
    SETTINGS_OPEN: 'ui:settingsOpen',
    SETTINGS_CLOSE:'ui:settingsClose',
  },
  SHARE: {
    OPEN:          'share:open',
    CLOSE:         'share:close',
    LINK_CREATED:  'share:linkCreated',
  },
});
