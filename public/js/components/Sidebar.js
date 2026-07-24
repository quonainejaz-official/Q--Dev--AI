/**
 * Sidebar — conversation list shell with search, new chat, theme toggle.
 * <app-sidebar></app-sidebar>
 */
import { bus } from '../events/EventBus.js';
import { EVENTS } from '../events/events.js';
import { store } from '../store/Store.js';
import { ConversationService } from '../services/ConversationService.js';
import { debounce } from '../utils/debounce.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
  :host {
    display: flex; flex-direction: column; width: 280px; height: 100vh;
    background: var(--sidebar-bg, #111127); border-right: 1px solid var(--border-color, #333);
    transition: width 0.2s, transform 0.2s;
  }
  :host(.collapsed) { width: 0; overflow: hidden; }
  :host(.mobile-open) {
    position: fixed; top: 0; left: 0; z-index: 1000; width: 280px;
    transform: translateX(0);
  }
  .header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px; border-bottom: 1px solid var(--border-color, #333);
  }
  .logo { font-size: 18px; font-weight: 700; color: var(--text-primary, #e0e0e0); }
  .header-actions { display: flex; gap: 4px; }
  .header-actions button {
    background: none; border: none; cursor: pointer; padding: 6px;
    color: var(--text-muted, #888); border-radius: 6px; display: flex;
    transition: color 0.15s, background 0.15s;
  }
  .header-actions button:hover { color: var(--text-primary, #e0e0e0); background: rgba(255,255,255,0.1); }
  .search-box { padding: 8px 16px; }
  .search-box input {
    width: 100%; padding: 8px 12px; border-radius: 8px;
    border: 1px solid var(--border-color, #333); background: var(--input-bg, #1a1a2e);
    color: var(--text-primary, #e0e0e0); font-size: 13px; outline: none;
  }
  .search-box input:focus { border-color: var(--accent-color, #6c63ff); }
  .search-box input::placeholder { color: var(--text-muted, #888); }
  .mobile-overlay {
    display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 999;
  }
  :host(.mobile-open) .mobile-overlay { display: block; }
</style>
<div class="mobile-overlay"></div>
<div class="header">
  <span class="logo">Q</span>
  <div class="header-actions">
    <theme-toggle></theme-toggle>
    <button class="new-chat-btn" title="New chat">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>
    <button class="sidebar-toggle-btn" title="Close sidebar">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
    </button>
  </div>
</div>
<div class="search-box">
  <input type="text" placeholder="Search conversations..." class="search-input">
</div>
<conversation-list></conversation-list>
`;

export class AppSidebar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
    this._searchInput = this.shadowRoot.querySelector('.search-input');
    this._list = this.shadowRoot.querySelector('conversation-list');
  }

  connectedCallback() {
    // New chat
    this.shadowRoot.querySelector('.new-chat-btn').addEventListener('click', () => {
      store.dispatch('SET_CURRENT_CONVERSATION', null);
      store.dispatch('SET_MESSAGES', []);
      bus.emit(EVENTS.CONVERSATION.CHANGED, { id: null });
      this._list.refresh();
    });

    // Toggle sidebar
    this.shadowRoot.querySelector('.sidebar-toggle-btn').addEventListener('click', () => {
      this.classList.toggle('collapsed');
    });

    // Mobile overlay
    this.shadowRoot.querySelector('.mobile-overlay').addEventListener('click', () => {
      this.classList.remove('mobile-open');
    });

    // Search
    const doSearch = debounce(async (query) => {
      if (!query) {
        this._list.refresh();
        return;
      }
      try {
        const results = await ConversationService.search(query);
        store.dispatch('SET_CONVERSATIONS', results);
      } catch { /* ignore */ }
    }, 300);

    this._searchInput.addEventListener('input', (e) => doSearch(e.target.value));

    // Refresh on conversation events
    bus.on(EVENTS.CONVERSATION.LOADED, () => this._list.refresh());
    bus.on(EVENTS.CONVERSATION.CREATED, () => this._list.refresh());

    // Mobile open/close
    bus.on(EVENTS.SIDEBAR.OPEN, () => this.classList.add('mobile-open'));
    bus.on(EVENTS.SIDEBAR.CLOSE, () => this.classList.remove('mobile-open'));
    bus.on(EVENTS.SIDEBAR.TOGGLE, () => {
      if (store.select('isMobile')) {
        this.classList.toggle('mobile-open');
      } else {
        this.classList.toggle('collapsed');
      }
    });
  }

  toggle() {
    if (store.select('isMobile')) {
      this.classList.toggle('mobile-open');
    } else {
      this.classList.toggle('collapsed');
    }
  }
}

customElements.define('app-sidebar', AppSidebar);
