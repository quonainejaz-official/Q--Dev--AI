/**
 * ChatMessage — a single message bubble (user or assistant).
 * <chat-message role="user|assistant" content="..." created-at="..."></chat-message>
 */
import { bus } from '../events/EventBus.js';
import { EVENTS } from '../events/events.js';
import { timeAgo } from '../utils/time.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { escapeHtml } from '../utils/dom.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
  :host { display: block; }
  .message { display: flex; gap: 12px; padding: 16px; border-radius: 12px; margin: 4px 0; }
  .message.user { justify-content: flex-end; }
  .message.assistant { justify-content: flex-start; }
  .avatar {
    width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
    background: var(--accent-color, #6c63ff); display: flex; align-items: center;
    justify-content: center; color: #fff; font-size: 14px; font-weight: 600;
  }
  .message.user .avatar { background: var(--user-avatar-bg, #4a90d9); }
  .bubble {
    max-width: 75%; padding: 12px 16px; border-radius: 12px;
    font-size: 14px; line-height: 1.6; position: relative;
  }
  .message.user .bubble {
    background: var(--user-bubble-bg, #3a3a5c); color: var(--text-primary, #e0e0e0);
    border-bottom-right-radius: 4px;
  }
  .message.assistant .bubble {
    background: var(--assistant-bubble-bg, #2a2a3e); color: var(--text-primary, #e0e0e0);
    border-bottom-left-radius: 4px;
  }
  .meta {
    display: flex; align-items: center; gap: 8px; margin-top: 4px;
    font-size: 11px; color: var(--text-muted, #888);
  }
  .message.user .meta { justify-content: flex-end; }
  .actions {
    position: absolute; top: 4px; right: 4px; display: flex; gap: 2px;
    opacity: 0; transition: opacity 0.15s;
  }
  .bubble:hover .actions { opacity: 1; }
  .actions button {
    background: none; border: none; cursor: pointer; padding: 4px;
    color: var(--text-muted, #888); border-radius: 4px; display: flex;
    transition: color 0.15s, background 0.15s;
  }
  .actions button:hover { color: var(--text-primary, #e0e0e0); background: rgba(255,255,255,0.1); }
  .image-attachments { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
  .image-attachments img {
    max-width: 200px; max-height: 200px; border-radius: 8px; cursor: pointer;
    transition: transform 0.2s;
  }
  .image-attachments img:hover { transform: scale(1.05); }
</style>
<div class="message">
  <div class="avatar"></div>
  <div class="bubble">
    <div class="image-attachments"></div>
    <markdown-renderer></markdown-renderer>
    <div class="actions">
      <button class="copy-btn" title="Copy">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
      </button>
      <button class="edit-btn" title="Edit" data-action="edit">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
    </div>
    <div class="meta"><span class="timestamp"></span></div>
  </div>
</div>
`;

export class ChatMessage extends HTMLElement {
  static get observedAttributes() { return ['role', 'content', 'created-at', 'message-id']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
    this._bubble = this.shadowRoot.querySelector('.bubble');
    this._md = this.shadowRoot.querySelector('markdown-renderer');
    this._avatar = this.shadowRoot.querySelector('.avatar');
    this._timestamp = this.shadowRoot.querySelector('.timestamp');
    this._imageContainer = this.shadowRoot.querySelector('.image-attachments');
  }

  connectedCallback() {
    this._render();
    this.shadowRoot.querySelector('.copy-btn').addEventListener('click', () => {
      copyToClipboard(this.getAttribute('content') || '');
    });
    this.shadowRoot.querySelector('.edit-btn').addEventListener('click', () => {
      bus.emit(EVENTS.MESSAGE.EDIT, { messageId: this.getAttribute('message-id'), content: this.getAttribute('content') });
    });
  }

  attributeChangedCallback() { this._render(); }

  _render() {
    const role = this.getAttribute('role') || 'assistant';
    const content = this.getAttribute('content') || '';
    const createdAt = this.getAttribute('created-at');

    this._bubble.className = `bubble`;
    this._avatar.className = 'avatar';
    const name = role === 'assistant' ? 'Q' : 'U';
    this._avatar.textContent = name;
    this._md.setAttribute('content', content);
    if (createdAt) this._timestamp.textContent = timeAgo(createdAt);

    // Render attached images
    this._imageContainer.innerHTML = '';
    const images = this.getAttribute('images');
    if (images) {
      try {
        const arr = JSON.parse(images);
        arr.forEach((img) => {
          const im = document.createElement('img');
          im.src = img.url;
          im.alt = img.name || 'Attached image';
          im.loading = 'lazy';
          this._imageContainer.appendChild(im);
        });
      } catch { /* ignore */ }
    }
  }
}

customElements.define('chat-message', ChatMessage);
