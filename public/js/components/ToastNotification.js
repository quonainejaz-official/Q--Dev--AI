/**
 * ToastNotification — auto-dismissing toast messages.
 * <toast-container></toast-container>
 */
import { bus } from '../events/EventBus.js';
import { EVENTS } from '../events/events.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
  :host {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 10000;
    display: flex;
    flex-direction: column-reverse;
    gap: 8px;
    pointer-events: none;
  }
  .toast {
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 14px;
    color: #fff;
    pointer-events: auto;
    opacity: 0;
    transform: translateY(10px);
    transition: opacity 0.2s, transform 0.2s;
    max-width: 340px;
    word-break: break-word;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }
  .toast.show { opacity: 1; transform: translateY(0); }
  .toast.success { background: #2ecc71; }
  .toast.error { background: #e74c3c; }
  .toast.info { background: #3498db; }
  .toast.warning { background: #f39c12; }
</style>
<div id="container"></div>
`;

export class ToastContainer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
    this._container = this.shadowRoot.getElementById('container');
  }

  connectedCallback() {
    this._unsub = bus.on(EVENTS.UI.TOAST, (detail) => {
      this._show(detail.message, detail.type || 'info', detail.duration || 3000);
    });
  }

  disconnectedCallback() {
    this._unsub?.();
  }

  _show(message, type, duration) {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    this._container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, duration);
  }
}

customElements.define('toast-container', ToastContainer);
