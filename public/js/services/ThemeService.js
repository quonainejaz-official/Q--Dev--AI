/**
 * ThemeService — light/dark toggle with system preference detection.
 */
import { store } from '../store/Store.js';
const THEME_KEY = 'qai_theme';
const DARK = 'dark';
const LIGHT = 'light';

export const ThemeService = {
  init() {
    let saved = localStorage.getItem(THEME_KEY);
    // Migrate the older JSON-encoded value written by StorageService.
    if (saved?.startsWith('"')) {
      try {
        saved = JSON.parse(saved);
        localStorage.setItem(THEME_KEY, saved);
      } catch { saved = null; }
    }
    const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : LIGHT;
    const theme = saved === 'system' || !saved ? system : saved;
    this.apply(theme);

    // Listen for system changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (localStorage.getItem(THEME_KEY) === 'system') {
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
    localStorage.setItem(THEME_KEY, next);
  },

  get current() {
    return store.select('theme');
  },
};
