/**
 * ThemeService — light/dark toggle with system preference detection.
 */
import { store } from '../store/Store.js';
import { StorageService } from './StorageService.js';

const THEME_KEY = 'theme';
const DARK = 'dark';
const LIGHT = 'light';

export const ThemeService = {
  init() {
    const saved = StorageService.get(THEME_KEY);
    const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : LIGHT;
    const theme = saved || system;
    this.apply(theme);

    // Listen for system changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!StorageService.get(THEME_KEY)) {
        this.apply(e.matches ? DARK : LIGHT);
      }
    });
  },

  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    store.dispatch('SET_THEME', theme);
  },

  toggle() {
    const current = store.select('theme');
    const next = current === DARK ? LIGHT : DARK;
    this.apply(next);
    StorageService.set(THEME_KEY, next);
  },

  get current() {
    return store.select('theme');
  },
};
