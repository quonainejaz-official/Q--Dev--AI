/**
 * ConfirmModal — generic confirm/cancel dialog.
 * <confirm-modal></confirm-modal>
 * Use: modal.open({ title, message, onConfirm, onCancel })
 */
import { bus } from '../events/EventBus.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
  :host { display: none; position: fixed; inset: 0; z-index: 9998; align-items: center; justify-content: center; }
  :host(.open) { display: flex; }
  .backdrop {
    position: absolute; inset: 0; background: rgba(0,0,0,0.6);
    animation: fadeIn 0.15s ease;
  }
  .dialog {
    position: relative; background: var(--modal-bg, #1a1a2e);
    border-radius: 12px; padding: 24px; max-width: 400px; width: 90%;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    animation: slideUp 0.2s ease;
  }
  .dialog h3 { margin: 0 0 8px; font-size: 16px; color: var(--text-primary, #e0e0e0); }
  .dialog p { margin: 0 0 20px; font-size: 14px; color: var(--text-secondary, #aaa); }
  .actions { display: flex; justify-content: flex-end; gap: 8px; }
  .btn {
    padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer;
    font-size: 14px; font-weight: 500; transition: background 0.15s;
  }
  .btn-cancel { background: var(--hover-bg, rgba(255,255,255,0.1)); color: var(--text-primary, #e0e0e0); }
  .btn-cancel:hover { background: rgba(255,255,255,0.15); }
  .btn-confirm { background: #e74c3c; color: #fff; }
  .btn-confirm:hover { background: #c0392b; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
<div class="backdrop"></div>
<div class="dialog">
  <h3 class="title"></h3>
  <p class="message"></p>
  <div class="actions">
    <button class="btn btn-cancel">Cancel</button>
    <button class="btn btn-confirm">Confirm</button>
  </div>
</div>
`;

export class ConfirmModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
    this._callbacks = {};
  }

  connectedCallback() {
    this.shadowRoot.querySelector('.btn-cancel').addEventListener('click', () => this._cancel());
    this.shadowRoot.querySelector('.btn-confirm').addEventListener('click', () => this._confirm());
    this.shadowRoot.querySelector('.backdrop').addEventListener('click', () => this._cancel());
  }

  open({ title, message, confirmText = 'Confirm', onConfirm, onCancel }) {
    this.shadowRoot.querySelector('.title').textContent = title;
    this.shadowRoot.querySelector('.message').textContent = message;
    this.shadowRoot.querySelector('.btn-confirm').textContent = confirmText;
    this._callbacks = { onConfirm, onCancel };
    this.classList.add('open');
  }

  _confirm() {
    this._callbacks.onConfirm?.();
    this.classList.remove('open');
  }

  _cancel() {
    this._callbacks.onCancel?.();
    this.classList.remove('open');
  }
}

customElements.define('confirm-modal', ConfirmModal);
