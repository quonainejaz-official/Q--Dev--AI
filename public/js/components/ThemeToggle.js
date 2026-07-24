/**
 * ThemeToggle — button that toggles light/dark theme.
 * <theme-toggle></theme-toggle>
 */
import { bus } from '../events/EventBus.js';
import { EVENTS } from '../events/events.js';
import { ThemeService } from '../services/ThemeService.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
  :host { display: inline-flex; }
  button {
    background: none; border: none; cursor: pointer;
    padding: 6px; border-radius: 6px;
    color: var(--text-primary, #e0e0e0);
    display: flex; align-items: center; justify-content: center;
    transition: background 0.2s;
  }
  button:hover { background: var(--hover-bg, rgba(255,255,255,0.1)); }
  .sun, .moon { width: 20px; height: 20px; }
  :host([data-theme="dark"]) .sun { display: none; }
  :host([data-theme="light"]) .moon { display: none; }
</style>
<button class="theme-toggle" aria-label="Toggle theme">
  <svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </svg>
  <svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
</button>
`;

export class ThemeToggle extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
    this.shadowRoot.querySelector('button').addEventListener('click', () => ThemeService.toggle());
  }

  connectedCallback() {
    this._render();
    this._unsub = bus.on(EVENTS.UI.TOAST, () => {}); // no-op, just need subscription pattern
    this._themeUnsub = bus.on('theme:changed', () => this._render());
  }

  disconnectedCallback() {
    this._themeUnsub?.();
  }

  _render() {
    this.setAttribute('data-theme', ThemeService.current);
  }
}

customElements.define('theme-toggle', ThemeToggle);
