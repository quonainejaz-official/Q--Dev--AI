/**
 * ChatWindow — main message display area with streaming support.
 * <chat-window></chat-window>
 */
import { bus } from '../events/EventBus.js';
import { EVENTS } from '../events/events.js';
import { store } from '../store/Store.js';
import { ConversationService } from '../services/ConversationService.js';
import { StreamingService } from '../services/StreamingService.js';
import { AuthService } from '../services/AuthService.js';
import { scrollToBottom, isNearBottom } from '../utils/scroll.js';
import { escapeHtml } from '../utils/dom.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
  :host { display: flex; flex-direction: column; flex: 1; min-width: 0; position: relative; }
  #messages {
    flex: 1; overflow-y: auto; padding: 16px;
    display: flex; flex-direction: column;
  }
  .welcome { text-align: center; padding: 40px 16px; color: var(--text-muted, #888); }
  .welcome h2 { font-size: 22px; font-weight: 600; color: var(--text-primary, #e0e0e0); margin: 0 0 8px; }
  .welcome p { font-size: 14px; }
  .date-separator {
    text-align: center; padding: 16px 0 8px; font-size: 12px;
    color: var(--text-muted, #888); font-weight: 500;
  }
  .error-toast {
    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
    background: #e74c3c; color: #fff; padding: 10px 20px; border-radius: 8px;
    font-size: 13px; z-index: 9999; display: none;
    animation: slideUp 0.2s ease;
  }
  @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
</style>
<div id="messages">
  <div class="welcome">
    <h2>Welcome to Q</h2>
    <p>Start a conversation below</p>
  </div>
</div>
<div class="error-toast"></div>
<typing-indicator></typing-indicator>
<chat-input></chat-input>
`;

export class ChatWindow extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
    this._messages = this.shadowRoot.getElementById('messages');
    this._typing = this.shadowRoot.querySelector('typing-indicator');
    this._input = this.shadowRoot.querySelector('chat-input');
    this._errorToast = this.shadowRoot.querySelector('.error-toast');
    this._streamingContent = '';
    this._isStreamingMessage = false;
    this._currentStreamingId = null;
    this._autoScroll = true;
  }

  connectedCallback() {
    this._messages.addEventListener('scroll', () => {
      this._autoScroll = isNearBottom(this._messages, 200);
    });

    // Listen for message send
    bus.on(EVENTS.MESSAGE.SEND, (detail) => this._handleSend(detail));

    // Listen for stream chunks
    bus.on(EVENTS.STREAM.CHUNK, (detail) => this._handleStreamChunk(detail));
    bus.on(EVENTS.STREAM.STARTED, () => this._onStreamStart());
    bus.on(EVENTS.STREAM.FINISHED, () => this._onStreamFinished());
    bus.on(EVENTS.STREAM.ERROR, (detail) => this._onStreamError(detail));

    // Listen for conversation changes
    bus.on(EVENTS.CONVERSATION.CHANGED, (detail) => this._loadConversation(detail.id));
    bus.on(EVENTS.CONVERSATION.DELETED, (detail) => this._handleDelete(detail.id));
    bus.on(EVENTS.CONVERSATION.TITLE_EDIT, (detail) => this._handleRename(detail));

    // Listen for stop
    bus.on('stream:stop', () => StreamingService.abort());

    // Load conversation on init
    this._unsub = store.subscribe('currentConversationId', (id) => {
      if (id) this._loadConversation(id);
    });
  }

  disconnectedCallback() {
    this._unsub?.();
  }

  async _loadConversation(id) {
    try {
      store.dispatch('SET_CURRENT_CONVERSATION', id);
      const conversation = await ConversationService.get(id);
      store.dispatch('SET_MESSAGES', conversation.messages || []);
      this._renderMessages();
      scrollToBottom(false);
    } catch (err) {
      bus.emit(EVENTS.UI.TOAST, { message: 'Failed to load conversation', type: 'error' });
    }
  }

  _renderMessages() {
    const messages = store.select('messages');
    const welcome = this._messages.querySelector('.welcome');
    if (welcome) welcome.remove();

    this._messages.innerHTML = '';
    let lastDate = '';

    for (const msg of messages) {
      const msgDate = new Date(msg.createdAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
      if (msgDate !== lastDate) {
        const sep = document.createElement('div');
        sep.className = 'date-separator';
        sep.textContent = msgDate;
        this._messages.appendChild(sep);
        lastDate = msgDate;
      }
      this._messages.appendChild(this._createMessageElement(msg));
    }
  }

  _createMessageElement(msg) {
    const el = document.createElement('chat-message');
    el.setAttribute('role', msg.role);
    el.setAttribute('content', msg.content);
    el.setAttribute('created-at', msg.createdAt);
    if (msg.messageId) el.setAttribute('message-id', msg.messageId);
    if (msg.images?.length) el.setAttribute('images', JSON.stringify(msg.images));
    return el;
  }

  async _handleSend({ content, media }) {
    if (store.select('isStreaming')) return;

    let user = AuthService.user;
    if (!user) {
      try {
        user = await AuthService.login('guest@q.dev', 'guest123');
      } catch {
        user = { _id: 'guest' };
      }
    }

    // Create or get conversation
    let conversationId = store.select('currentConversationId');
    if (!conversationId) {
      const conv = await ConversationService.create(content.slice(0, 50));
      conversationId = conv._id || conv.id;
      store.dispatch('SET_CURRENT_CONVERSATION', conversationId);
      bus.emit(EVENTS.CONVERSATION.CREATED, { id: conversationId });
    }

    // Remove welcome
    const welcome = this._messages.querySelector('.welcome');
    if (welcome) welcome.remove();

    // Add user message
    const userMsg = {
      role: 'user',
      content,
      messageId: Date.now().toString(),
      createdAt: new Date().toISOString(),
      images: media?.map((m) => ({ url: m.url, name: m.name })) || [],
    };
    store.dispatch('APPEND_MESSAGE', userMsg);
    this._messages.appendChild(this._createMessageElement(userMsg));
    scrollToBottom();

    // Upload images if any
    const uploadedImages = [];
    for (const item of (media || [])) {
      if (item.file) {
        try {
          const { MediaService } = await import('../services/MediaService.js');
          const uploaded = await MediaService.uploadImage(item.file);
          uploadedImages.push(uploaded);
        } catch (err) {
          bus.emit(EVENTS.UI.TOAST, { message: `Failed to upload ${item.name}`, type: 'error' });
        }
      }
    }

    // Stream response
    this._streamingContent = '';
    this._isStreamingMessage = false;
    this._currentStreamingId = null;

    try {
      await StreamingService.send({
        message: content,
        conversationId,
        images: uploadedImages,
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        this._showError(err.message || 'Failed to get response');
      }
    }
  }

  _onStreamStart() {
    this._typing.show();
    this._isStreamingMessage = false;
    this._streamingContent = '';
    this._currentStreamingId = null;
  }

  _handleStreamChunk(data) {
    if (data.type === 'text' || data.text) {
      const text = data.text || data.content || '';
      if (!text) return;

      this._typing.hide();

      if (!this._isStreamingMessage) {
        this._isStreamingMessage = true;
        this._streamingContent = '';
        this._currentStreamingId = Date.now().toString();
        const assistantMsg = {
          role: 'assistant',
          content: '',
          messageId: this._currentStreamingId,
          createdAt: new Date().toISOString(),
        };
        store.dispatch('APPEND_MESSAGE', assistantMsg);
        this._messages.appendChild(this._createMessageElement(assistantMsg));
      }

      this._streamingContent += text;
      this._updateStreamingMessage();
    }
  }

  _updateStreamingMessage() {
    const msgs = this._messages.querySelectorAll('chat-message');
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg) {
      const md = lastMsg.shadowRoot?.querySelector('markdown-renderer');
      if (md) md.setAttribute('content', this._streamingContent);
    }
    if (this._autoScroll) scrollToBottom(false);
  }

  _onStreamFinished() {
    this._typing.hide();
    if (this._isStreamingMessage && this._currentStreamingId) {
      const msgs = store.select('messages');
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg && lastMsg.messageId === this._currentStreamingId) {
        lastMsg.content = this._streamingContent;
      }
    }
    this._isStreamingMessage = false;
    this._currentStreamingId = null;
    this._streamingContent = '';
  }

  _onStreamError({ error }) {
    this._typing.hide();
    this._showError(error);
  }

  _showError(message) {
    this._errorToast.textContent = message;
    this._errorToast.style.display = 'block';
    setTimeout(() => { this._errorToast.style.display = 'none'; }, 4000);
  }

  async _handleDelete({ id }) {
    try {
      await ConversationService.delete(id);
      if (store.select('currentConversationId') === id) {
        store.dispatch('SET_CURRENT_CONVERSATION', null);
        store.dispatch('SET_MESSAGES', []);
        this._messages.innerHTML = `
          <div class="welcome">
            <h2>Welcome to Q</h2>
            <p>Start a conversation below</p>
          </div>
        `;
      }
      bus.emit(EVENTS.CONVERSATION.LOADED);
      bus.emit(EVENTS.UI.TOAST, { message: 'Conversation deleted', type: 'success' });
    } catch {
      bus.emit(EVENTS.UI.TOAST, { message: 'Failed to delete conversation', type: 'error' });
    }
  }

  async _handleRename({ id, title }) {
    const newTitle = prompt('Rename conversation:', title);
    if (!newTitle || newTitle === title) return;
    try {
      await ConversationService.rename(id, newTitle);
      bus.emit(EVENTS.CONVERSATION.LOADED);
    } catch {
      bus.emit(EVENTS.UI.TOAST, { message: 'Failed to rename', type: 'error' });
    }
  }

  clearWelcome() {
    const welcome = this._messages.querySelector('.welcome');
    if (welcome) welcome.remove();
  }
}

customElements.define('chat-window', ChatWindow);
