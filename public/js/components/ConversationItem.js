/**
 * ConversationItem — a single conversation in the sidebar.
 * <conversation-item id="..." title="..." updated-at="..."></conversation-item>
 */
import { bus } from '../events/EventBus.js';
import { EVENTS } from '../events/events.js';
import { timeAgo } from '../utils/time.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
  :host { display: block; }
  .item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 12px; margin: 2px 8px; border-radius: 8px; cursor: pointer;
    transition: background 0.15s; font-size: 13px; color: var(--text-primary, #e0e0e0);
  }
  .item:hover { background: var(--hover-bg, rgba(255,255,255,0.08)); }
  .item.active { background: var(--active-bg, rgba(108,99,255,0.15)); }
  .item-content { flex: 1; min-width: 0; }
  .title {
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    font-weight: 500;
  }
  .meta { font-size: 11px; color: var(--text-muted, #888); margin-top: 2px; }
  .actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.15s; }
  .item:hover .actions { opacity: 1; }
  .actions button {
    background: none; border: none; cursor: pointer; padding: 4px;
    color: var(--text-muted, #888); border-radius: 4px; display: flex;
  }
  .actions button:hover { color: var(--text-primary, #e0e0e0); background: rgba(255,255,255,0.1); }
</style>
<div class="item" tabindex="0">
  <div class="item-content">
    <div class="title"></div>
    <div class="meta"></div>
  </div>
  <div class="actions">
    <button class="rename-btn" title="Rename">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
    </button>
    <button class="delete-btn" title="Delete">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
    </button>
  </div>
</div>
`;

export class ConversationItem extends HTMLElement {
  static get observedAttributes() { return ['id', 'title', 'updated-at', 'active']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
    this._item = this.shadowRoot.querySelector('.item');
    this._title = this.shadowRoot.querySelector('.title');
    this._meta = this.shadowRoot.querySelector('.meta');
  }

  connectedCallback() {
    this._item.addEventListener('click', (e) => {
      if (e.target.closest('.actions')) return;
      bus.emit(EVENTS.CONVERSATION.CHANGED, { id: this.getAttribute('id') });
    });
    this.shadowRoot.querySelector('.rename-btn').addEventListener('click', () => {
      bus.emit(EVENTS.CONVERSATION.TITLE_EDIT, { id: this.getAttribute('id'), title: this.getAttribute('title') });
    });
    this.shadowRoot.querySelector('.delete-btn').addEventListener('click', () => {
      bus.emit(EVENTS.CONVERSATION.DELETED, { id: this.getAttribute('id') });
    });
    this._render();
  }

  attributeChangedCallback() { this._render(); }

  _render() {
    const title = this.getAttribute('title') || 'New Chat';
    const updatedAt = this.getAttribute('updated-at');
    const active = this.hasAttribute('active');
    this._title.textContent = title;
    this._meta.textContent = updatedAt ? timeAgo(updatedAt) : '';
    this._item.classList.toggle('active', active);
  }
}

customElements.define('conversation-item', ConversationItem);
