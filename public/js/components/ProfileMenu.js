/**
 * ProfileMenu — ChatGPT-style profile dropdown popup.
 * Shows user info, settings, logout when clicking the user avatar.
 * <profile-menu></profile-menu>
 */
import { bus } from '../events/EventBus.js';
import { EVENTS } from '../events/events.js';
import { store } from '../store/Store.js';
import { AuthService } from '../services/AuthService.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
  :host { display: block; position: relative; }
  
  .trigger {
    display: flex; align-items: center; gap: 10px; padding: 8px 12px;
    border-radius: 10px; cursor: pointer; transition: background 0.15s;
    border: 1px solid transparent; width: 100%;
  }
  .trigger:hover { background: var(--hover-bg, rgba(255,255,255,0.08)); }
  
  .avatar {
    width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 13px; font-weight: 600;
  }
  
  .user-info { flex: 1; min-width: 0; text-align: left; }
  .user-name {
    font-size: 13px; font-weight: 500; color: var(--text-primary, #e0e0e0);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .user-plan {
    font-size: 11px; color: var(--text-muted, #888); margin-top: 1px;
  }
  
  .dropdown {
    position: absolute; bottom: calc(100% + 8px); left: 0; right: 0;
    background: var(--dropdown-bg, #1a1a2e); border-radius: 12px;
    border: 1px solid var(--border-color, #333); box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    padding: 6px; z-index: 1000; display: none;
    animation: slideUp 0.15s ease;
  }
  .dropdown.open { display: block; }
  
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .menu-item {
    display: flex; align-items: center; gap: 10px; padding: 10px 12px;
    border-radius: 8px; cursor: pointer; transition: background 0.12s;
    color: var(--text-primary, #e0e0e0); font-size: 13px; border: none;
    background: none; width: 100%; text-align: left;
  }
  .menu-item:hover { background: var(--hover-bg, rgba(255,255,255,0.08)); }
  .menu-item svg { flex-shrink: 0; color: var(--text-muted, #888); }
  
  .menu-divider {
    height: 1px; background: var(--border-color, #333);
    margin: 4px 12px;
  }
  
  .upgrade-section {
    padding: 8px 12px; margin-top: 4px;
    border-top: 1px solid var(--border-color, #333);
  }
  .upgrade-btn {
    display: flex; align-items: center; justify-content: space-between;
    width: 100%; padding: 10px 12px; border-radius: 8px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff; font-size: 13px; font-weight: 500; border: none; cursor: pointer;
    transition: opacity 0.15s;
  }
  .upgrade-btn:hover { opacity: 0.9; }
  .upgrade-badge {
    font-size: 10px; background: rgba(255,255,255,0.2); padding: 2px 8px;
    border-radius: 10px;
  }
</style>

<div class="trigger" tabindex="0" role="button" aria-haspopup="true">
  <div class="avatar"></div>
  <div class="user-info">
    <div class="user-name"></div>
    <div class="user-plan">Free</div>
  </div>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
</div>

<div class="dropdown">
  <button class="menu-item" data-action="upgrade">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
    Upgrade plan
  </button>
  <button class="menu-item" data-action="personalization">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
    Personalization
  </button>
  <button class="menu-item" data-action="profile">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
    Profile
  </button>
  <button class="menu-item" data-action="settings">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
    Settings
  </button>
  
  <div class="menu-divider"></div>
  
  <button class="menu-item" data-action="help">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
    Help
  </button>
  <button class="menu-item" data-action="logout" style="color: #e74c3c;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #e74c3c;">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
    Log out
  </button>
  
  <div class="upgrade-section">
    <button class="upgrade-btn">
      <span>Upgrade plan</span>
      <span class="upgrade-badge">PRO</span>
    </button>
  </div>
</div>
`;

export class ProfileMenu extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
    this._isOpen = false;
  }

  connectedCallback() {
    this._render();
    
    // Toggle dropdown
    this.shadowRoot.querySelector('.trigger').addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggle();
    });

    // Menu item clicks
    this.shadowRoot.querySelectorAll('.menu-item').forEach((item) => {
      item.addEventListener('click', () => {
        const action = item.dataset.action;
        this._handleAction(action);
        this._close();
      });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!this.contains(e.target)) this._close();
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this._close();
    });
  }

  _render() {
    const user = AuthService.user;
    const avatar = this.shadowRoot.querySelector('.avatar');
    const name = this.shadowRoot.querySelector('.user-name');
    const plan = this.shadowRoot.querySelector('.user-plan');

    if (user) {
      avatar.textContent = (user.name || user.email || 'U').charAt(0).toUpperCase();
      name.textContent = user.name || user.email || 'User';
      plan.textContent = user.plan || 'Free';
    } else {
      avatar.textContent = 'G';
      name.textContent = 'Guest';
      plan.textContent = 'Free';
    }
  }

  _toggle() {
    this._isOpen = !this._isOpen;
    this.shadowRoot.querySelector('.dropdown').classList.toggle('open', this._isOpen);
  }

  _close() {
    this._isOpen = false;
    this.shadowRoot.querySelector('.dropdown').classList.remove('open');
  }

  _handleAction(action) {
    switch (action) {
      case 'settings':
        bus.emit(EVENTS.UI.SETTINGS_OPEN);
        break;
      case 'personalization':
        bus.emit(EVENTS.UI.SETTINGS_OPEN, { tab: 'personalization' });
        break;
      case 'profile':
        bus.emit(EVENTS.UI.SETTINGS_OPEN, { tab: 'account' });
        break;
      case 'help':
        window.open('https://help.q-dev.ai', '_blank');
        break;
      case 'logout':
        AuthService.logout();
        bus.emit(EVENTS.AUTH.LOGOUT);
        bus.emit(EVENTS.UI.TOAST, { message: 'Logged out', type: 'success' });
        break;
      case 'upgrade':
        bus.emit(EVENTS.UI.TOAST, { message: 'Upgrade coming soon!', type: 'info' });
        break;
    }
  }
}

customElements.define('profile-menu', ProfileMenu);
