/**
 * AuthModal — login/register modal.
 * <auth-modal></auth-modal>
 */
import { bus } from '../events/EventBus.js';
import { EVENTS } from '../events/events.js';
import { store } from '../store/Store.js';
import { AuthService } from '../services/AuthService.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
  :host { display: none; position: fixed; inset: 0; z-index: 9998; align-items: center; justify-content: center; }
  :host(.open) { display: flex; }
  .backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.6); }
  .dialog {
    position: relative; background: var(--modal-bg, #1a1a2e);
    border-radius: 12px; padding: 28px; max-width: 380px; width: 90%;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  }
  .dialog h2 { margin: 0 0 20px; font-size: 18px; color: var(--text-primary, #e0e0e0); text-align: center; }
  .field { margin-bottom: 14px; }
  .field label { display: block; font-size: 12px; color: var(--text-muted, #888); margin-bottom: 4px; }
  .field input {
    width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color, #333);
    background: var(--input-bg, #0d1117); color: var(--text-primary, #e0e0e0); font-size: 14px; outline: none;
  }
  .field input:focus { border-color: var(--accent-color, #6c63ff); }
  .error-msg { color: #e74c3c; font-size: 12px; margin-bottom: 10px; display: none; }
  .submit-btn {
    width: 100%; padding: 10px; border: none; border-radius: 8px;
    background: var(--accent-color, #6c63ff); color: #fff; font-size: 14px;
    font-weight: 600; cursor: pointer; transition: opacity 0.15s;
  }
  .submit-btn:hover { opacity: 0.9; }
  .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .toggle-view {
    text-align: center; margin-top: 14px; font-size: 13px;
    color: var(--text-muted, #888);
  }
  .toggle-view a {
    color: var(--accent-color, #6c63ff); cursor: pointer;
    text-decoration: none;
  }
  .toggle-view a:hover { text-decoration: underline; }
  .close-btn {
    position: absolute; top: 12px; right: 12px; background: none; border: none;
    cursor: pointer; color: var(--text-muted, #888); padding: 4px;
  }
</style>
<div class="backdrop"></div>
<div class="dialog">
  <button class="close-btn">×</button>
  <h2 class="title">Sign In</h2>
  <div class="error-msg"></div>
  <div class="field name-field" style="display:none">
    <label>Name</label>
    <input type="text" name="name" placeholder="Your name">
  </div>
  <div class="field"><label>Email</label><input type="email" name="email" placeholder="you@example.com"></div>
  <div class="field"><label>Password</label><input type="password" name="password" placeholder="••••••••"></div>
  <button class="submit-btn">Sign In</button>
  <div class="toggle-view">
    <span class="toggle-text">Don't have an account?</span>
    <a class="toggle-link">Sign Up</a>
  </div>
</div>
`;

export class AuthModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
    this._isLogin = true;
  }

  connectedCallback() {
    this.shadowRoot.querySelector('.backdrop').addEventListener('click', () => this.close());
    this.shadowRoot.querySelector('.close-btn').addEventListener('click', () => this.close());
    this.shadowRoot.querySelector('.toggle-link').addEventListener('click', () => this._toggleView());
    this.shadowRoot.querySelector('.submit-btn').addEventListener('click', () => this._submit());
    this.shadowRoot.querySelector('input[name="password"]').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._submit();
    });
  }

  open(isLogin = true) {
    this._isLogin = isLogin;
    this._updateView();
    this.classList.add('open');
    this.shadowRoot.querySelector('input[name="email"]').focus();
  }

  close() {
    this.classList.remove('open');
    this._clearFields();
  }

  _toggleView() {
    this._isLogin = !this._isLogin;
    this._updateView();
  }

  _updateView() {
    const title = this.shadowRoot.querySelector('.title');
    const nameField = this.shadowRoot.querySelector('.name-field');
    const submitBtn = this.shadowRoot.querySelector('.submit-btn');
    const toggleText = this.shadowRoot.querySelector('.toggle-text');
    const toggleLink = this.shadowRoot.querySelector('.toggle-link');

    title.textContent = this._isLogin ? 'Sign In' : 'Sign Up';
    nameField.style.display = this._isLogin ? 'none' : 'block';
    submitBtn.textContent = this._isLogin ? 'Sign In' : 'Sign Up';
    toggleText.textContent = this._isLogin ? "Don't have an account?" : 'Already have an account?';
    toggleLink.textContent = this._isLogin ? 'Sign Up' : 'Sign In';
  }

  async _submit() {
    const email = this.shadowRoot.querySelector('input[name="email"]').value.trim();
    const password = this.shadowRoot.querySelector('input[name="password"]').value;
    const name = this.shadowRoot.querySelector('input[name="name"]').value.trim();
    const errorEl = this.shadowRoot.querySelector('.error-msg');
    const submitBtn = this.shadowRoot.querySelector('.submit-btn');

    if (!email || !password) {
      errorEl.textContent = 'Please fill in all fields';
      errorEl.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    errorEl.style.display = 'none';

    try {
      if (this._isLogin) {
        await AuthService.login(email, password);
      } else {
        await AuthService.register(name, email, password);
      }
      this.close();
      bus.emit(EVENTS.AUTH.LOGIN);
      bus.emit(EVENTS.UI.TOAST, { message: 'Welcome!', type: 'success' });
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
    }
  }

  _clearFields() {
    this.shadowRoot.querySelectorAll('input').forEach((i) => { i.value = ''; });
    this.shadowRoot.querySelector('.error-msg').style.display = 'none';
  }
}

customElements.define('auth-modal', AuthModal);
