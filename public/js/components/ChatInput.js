/**
 * ChatInput — message composer with attachments, voice, image gen.
 * <chat-input></chat-input>
 */
import { bus } from '../events/EventBus.js';
import { EVENTS } from '../events/events.js';
import { store } from '../store/Store.js';
import { debounce } from '../utils/debounce.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
  :host { display: block; padding: 12px 16px; border-top: 1px solid var(--border-color, #333); }
  .input-wrapper {
    display: flex; align-items: flex-end; gap: 8px;
    background: var(--input-bg, #1a1a2e); border-radius: 12px;
    padding: 8px 12px; border: 1px solid var(--border-color, #333);
    transition: border-color 0.2s;
  }
  .input-wrapper:focus-within { border-color: var(--accent-color, #6c63ff); }
  textarea {
    flex: 1; background: none; border: none; outline: none;
    color: var(--text-primary, #e0e0e0); font-size: 14px; line-height: 1.5;
    resize: none; min-height: 24px; max-height: 150px; font-family: inherit;
  }
  textarea::placeholder { color: var(--text-muted, #888); }
  .input-actions { display: flex; gap: 4px; flex-shrink: 0; }
  .input-actions button {
    background: none; border: none; cursor: pointer; padding: 6px;
    color: var(--text-muted, #888); border-radius: 6px; display: flex;
    align-items: center; transition: color 0.15s, background 0.15s;
  }
  .input-actions button:hover { color: var(--text-primary, #e0e0e0); background: rgba(255,255,255,0.1); }
  .input-actions button:disabled { opacity: 0.3; cursor: not-allowed; }
  .send-btn {
    background: var(--accent-color, #6c63ff) !important; color: #fff !important;
    border-radius: 8px !important;
  }
  .send-btn:hover { opacity: 0.9; }
  .stop-btn { color: #e74c3c !important; }
  .media-preview {
    display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;
  }
  .media-preview:empty { display: none; }
  .media-item {
    position: relative; width: 60px; height: 60px; border-radius: 8px;
    overflow: hidden; border: 2px solid var(--border-color, #333);
  }
  .media-item img { width: 100%; height: 100%; object-fit: cover; }
  .media-remove {
    position: absolute; top: -4px; right: -4px; width: 18px; height: 18px;
    background: #e74c3c; color: #fff; border: none; border-radius: 50%;
    cursor: pointer; font-size: 12px; display: flex; align-items: center;
    justify-content: center;
  }
  #file-input { display: none; }
</style>
<div class="media-preview"></div>
<div class="input-wrapper">
  <button class="attach-btn" title="Attach image">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
  </button>
  <textarea rows="1" placeholder="Message Q..."></textarea>
  <div class="input-actions">
    <button class="voice-btn" title="Voice input">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
    </button>
    <button class="image-gen-btn" title="Generate image">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    </button>
    <button class="stop-btn hidden" title="Stop generating">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
    </button>
    <button class="send-btn" title="Send message">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
    </button>
  </div>
</div>
<input type="file" id="file-input" accept="image/*" multiple>
`;

export class ChatInput extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
    this._textarea = this.shadowRoot.querySelector('textarea');
    this._mediaPreview = this.shadowRoot.querySelector('.media-preview');
    this._sendBtn = this.shadowRoot.querySelector('.send-btn');
    this._stopBtn = this.shadowRoot.querySelector('.stop-btn');
    this._fileInput = this.shadowRoot.querySelector('#file-input');
    this._media = [];
  }

  connectedCallback() {
    // Auto-resize
    this._textarea.addEventListener('input', () => {
      this._textarea.style.height = 'auto';
      this._textarea.style.height = Math.min(this._textarea.scrollHeight, 150) + 'px';
    });

    // Send on Enter (Shift+Enter for newline)
    this._textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._send();
      }
    });

    this._sendBtn.addEventListener('click', () => this._send());

    // Stop button
    this._stopBtn.addEventListener('click', () => {
      bus.emit('stream:stop');
    });

    // Attach
    this.shadowRoot.querySelector('.attach-btn').addEventListener('click', () => this._fileInput.click());
    this._fileInput.addEventListener('change', () => this._handleFiles());

    // Voice
    this.shadowRoot.querySelector('.voice-btn').addEventListener('click', () => {
      bus.emit('voice:toggle');
    });

    // Image gen
    this.shadowRoot.querySelector('.image-gen-btn').addEventListener('click', () => {
      bus.emit('imagegen:open');
    });

    // Streaming state
    this._unsub = store.subscribe('isStreaming', (streaming) => {
      this._stopBtn.classList.toggle('hidden', !streaming);
      this._sendBtn.classList.toggle('hidden', streaming);
      this._textarea.disabled = streaming;
    });
  }

  disconnectedCallback() {
    this._unsub?.();
  }

  async _handleFiles() {
    const files = [...this._fileInput.files];
    for (const file of files) {
      const url = URL.createObjectURL(file);
      this._media.push({ file, url, name: file.name });
    }
    this._renderMedia();
    this._fileInput.value = '';
  }

  _renderMedia() {
    this._mediaPreview.innerHTML = '';
    this._media.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = 'media-item';
      div.innerHTML = `<img src="${item.url}" alt="${item.name}"><button class="media-remove">×</button>`;
      div.querySelector('.media-remove').addEventListener('click', () => {
        this._media.splice(idx, 1);
        this._renderMedia();
      });
      this._mediaPreview.appendChild(div);
    });
  }

  _send() {
    const text = this._textarea.value.trim();
    if (!text && !this._media.length) return;
    if (store.select('isStreaming')) return;

    bus.emit(EVENTS.MESSAGE.SEND, {
      content: text,
      media: [...this._media],
    });

    this._textarea.value = '';
    this._textarea.style.height = 'auto';
    this._media = [];
    this._renderMedia();
  }

  focus() { this._textarea?.focus(); }
}

customElements.define('chat-input', ChatInput);
