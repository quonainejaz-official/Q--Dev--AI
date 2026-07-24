/**
 * Store reducers — define how each action transforms state.
 * Import this module once at startup to register all reducers.
 */
import { store } from './Store.js';

store.addReducer('SET_USER', (state, user) => ({ ...state, user }));
store.addReducer('SET_TOKEN', (state, token) => ({ ...state, token }));
store.addReducer('SET_AUTH_MODAL', (state, { isOpen, isLogin }) => ({
  ...state,
  isAuthModalOpen: isOpen ?? state.isAuthModalOpen,
  isLoginView: isLogin ?? state.isLoginView,
}));
store.addReducer('LOGOUT', (state) => ({
  ...state,
  user: null,
  token: null,
  currentConversationId: null,
  messages: [],
}));
store.addReducer('SET_CONVERSATIONS', (state, conversations) => ({ ...state, conversations }));
store.addReducer('SET_CURRENT_CONVERSATION', (state, id) => ({ ...state, currentConversationId: id }));
store.addReducer('SET_MESSAGES', (state, messages) => ({ ...state, messages }));
store.addReducer('APPEND_MESSAGE', (state, msg) => ({ ...state, messages: [...state.messages, msg] }));
store.addReducer('UPDATE_LAST_MESSAGE', (state, update) => {
  const msgs = [...state.messages];
  if (msgs.length === 0) return state;
  msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], ...update };
  return { ...state, messages: msgs };
});
store.addReducer('SET_STREAMING', (state, isStreaming) => ({ ...state, isStreaming }));
store.addReducer('SET_ABORT_CONTROLLER', (state, controller) => ({ ...state, abortController: controller }));
store.addReducer('SET_THEME', (state, theme) => ({ ...state, theme }));
store.addReducer('SET_SIDEBAR', (state, open) => ({ ...state, sidebarOpen: open }));
store.addReducer('SET_MOBILE', (state, isMobile) => ({ ...state, isMobile }));
store.addReducer('SET_IMAGE_GEN_LOADING', (state, loading) => ({ ...state, isImageGenLoading: loading }));
store.addReducer('SET_MEDIA_ATTACHMENTS', (state, attachments) => ({ ...state, mediaAttachments: attachments }));
store.addReducer('ADD_MEDIA_ATTACHMENT', (state, attachment) => ({
  ...state,
  mediaAttachments: [...state.mediaAttachments, attachment],
}));
store.addReducer('REMOVE_MEDIA_ATTACHMENT', (state, index) => ({
  ...state,
  mediaAttachments: state.mediaAttachments.filter((_, i) => i !== index),
}));
store.addReducer('ADD_TOAST', (state, toast) => ({
  ...state,
  toasts: [...state.toasts, { id: Date.now(), ...toast }],
}));
store.addReducer('REMOVE_TOAST', (state, id) => ({
  ...state,
  toasts: state.toasts.filter((t) => t.id !== id),
}));
