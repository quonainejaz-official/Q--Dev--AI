/**
 * ConversationList — renders the sidebar conversation list.
 * <conversation-list></conversation-list>
 */
import { bus } from '../events/EventBus.js';
import { EVENTS } from '../events/events.js';
import { ConversationService } from '../services/ConversationService.js';
import { store } from '../store/Store.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
  :host { display: block; flex: 1; overflow-y: auto; }
  .list { display: flex; flex-direction: column; padding: 4px 0; }
  .date-group-label {
    padding: 8px 20px 4px; font-size: 11px; font-weight: 600;
    color: var(--text-muted, #888); text-transform: uppercase; letter-spacing: 0.5px;
  }
  .empty { text-align: center; padding: 32px 16px; color: var(--text-muted, #888); font-size: 13px; }
</style>
<div class="list"></div>
`;

export class ConversationList extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
    this._list = this.shadowRoot.querySelector('.list');
  }

  connectedCallback() {
    this._unsub = store.subscribe('conversations', () => this._render());
    this._load();
  }

  disconnectedCallback() {
    this._unsub?.();
  }

  async _load() {
    try {
      const conversations = await ConversationService.list();
      store.dispatch('SET_CONVERSATIONS', conversations);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }

  _render() {
    const conversations = store.select('conversations');
    const currentId = store.select('currentConversationId');
    this._list.innerHTML = '';

    if (!conversations.length) {
      this._list.innerHTML = '<div class="empty">No conversations yet</div>';
      return;
    }

    // Group by date
    const groups = {};
    for (const c of conversations) {
      const date = new Date(c.updatedAt || c.createdAt).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(c);
    }

    for (const [label, items] of Object.entries(groups)) {
      const groupLabel = document.createElement('div');
      groupLabel.className = 'date-group-label';
      groupLabel.textContent = label;
      this._list.appendChild(groupLabel);
      for (const c of items) {
        const item = document.createElement('conversation-item');
        item.setAttribute('id', c._id || c.id);
        item.setAttribute('title', c.title);
        item.setAttribute('updated-at', c.updatedAt || c.createdAt);
        if ((c._id || c.id) === currentId) item.setAttribute('active', '');
        this._list.appendChild(item);
      }
    }
  }

  refresh() { this._load(); }
}

customElements.define('conversation-list', ConversationList);
