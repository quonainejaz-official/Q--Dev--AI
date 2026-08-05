import { StorageService } from './StorageService.js';

const SETTINGS = {
  accentColor: '--accent-color',
  sidebarBackground: '--sidebar-bg',
  chatBackground: '--chat-background',
  userBubbleColor: '--user-bubble-bg',
  assistantBubbleColor: '--assistant-bubble-bg'
};

export const AppearanceService = {
  init() {
    Object.entries(SETTINGS).forEach(([key, property]) => {
      const value = StorageService.get(key);
      if (typeof value === 'string' && value) {
        document.documentElement.style.setProperty(property, value);
      }
    });
  },

  set(key, value) {
    const property = SETTINGS[key];
    if (!property) return;
    document.documentElement.style.setProperty(property, value);
    StorageService.set(key, value);
  },

  get(key) {
    return StorageService.get(key);
  },

  resetChatColors() {
    ['sidebarBackground', 'chatBackground', 'userBubbleColor', 'assistantBubbleColor'].forEach((key) => {
      document.documentElement.style.removeProperty(SETTINGS[key]);
      StorageService.remove(key);
    });
  }
};
