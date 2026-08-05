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
  :host { display: block; position: relative; width: 100%; }

  .trigger {
    display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 10px;
    border-radius: 14px; cursor: pointer; transition: all 0.18s ease;
    background: color-mix(in srgb, var(--surface-elevated, #272727) 84%, transparent);
    border: 1px solid var(--border-color, rgba(255,255,255,0.08)); width: 100%; box-sizing: border-box;
    box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 5%, transparent), 0 8px 24px rgba(0,0,0,.1);
  }
  .trigger:hover { background: var(--hover-bg, rgba(255,255,255,0.1)); transform: translateY(-1px); }
  .trigger:focus-visible { outline: 2px solid var(--accent-color, #4c82fb); outline-offset: 2px; }

  .user-badge-group { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; }

  .avatar {
    width: 34px; height: 34px; border-radius: 11px; flex-shrink: 0;
    background: linear-gradient(135deg, var(--accent-color, #4c82fb), #7357e8);
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 13px; font-weight: 700; text-transform: uppercase;
  }

  .user-info { flex: 1; min-width: 0; text-align: left; }
  .user-name {
    font-size: 13px; font-weight: 600; color: var(--text-primary, #e0e0e0);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .user-plan {
    font-size: 11px; color: var(--text-muted, #888); margin-top: 1px;
  }

  .upgrade-pill {
    padding: 4px 9px; border-radius: 9px; background: color-mix(in srgb, var(--accent-color, #4c82fb) 11%, transparent);
    color: var(--text-primary, #fff); font-size: 11px; font-weight: 600;
    border: 1px solid color-mix(in srgb, var(--accent-color, #4c82fb) 22%, var(--border-color, #333));
    transition: background 0.15s; flex-shrink: 0;
  }
  .upgrade-pill:hover { background: rgba(255,255,255,0.2); }

  .dropdown {
    position: absolute; bottom: calc(100% + 8px); left: 0; right: 0;
    min-width: 260px; background: var(--dropdown-bg, #212121); border-radius: 16px;
    border: 1px solid var(--border-color, #333); box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    padding: 8px; z-index: 10000; display: none;
    animation: slideUp 0.15s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .dropdown.open { display: block; }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .header-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 12px; border-radius: 10px; cursor: pointer; transition: background 0.12s;
  }
  .header-item:hover { background: var(--hover-bg, rgba(255,255,255,0.06)); }

  .menu-item {
    display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px;
    border-radius: 10px; cursor: pointer; transition: background 0.12s;
    color: var(--text-primary, #e0e0e0); font-size: 13px; border: none;
    background: none; width: 100%; text-align: left; box-sizing: border-box;
  }
  .menu-item:hover { background: var(--hover-bg, rgba(255,255,255,0.06)); }
  .menu-item-left { display: flex; align-items: center; gap: 10px; }
  .menu-item svg { flex-shrink: 0; color: var(--text-muted, #aaa); }

  .menu-divider {
    height: 1px; background: var(--border-color, rgba(255,255,255,0.1));
    margin: 6px 8px;
  }

  .logout-btn:hover { background: rgba(239, 68, 68, 0.1); }
  .logout-btn:hover .menu-item-left { color: #ef4444; }
  .logout-btn:hover svg { color: #ef4444; }
</style>

<div class="trigger" tabindex="0" role="button" aria-haspopup="true" aria-expanded="false">
  <div class="user-badge-group">
    <div class="avatar">G</div>
    <div class="user-info">
      <div class="user-name">Guest</div>
      <div class="user-plan">Free</div>
    </div>
  </div>
  <div class="upgrade-pill">Upgrade</div>
</div>

<div class="dropdown">
  <div class="header-item" data-action="profile">
    <div class="user-badge-group">
      <div class="avatar header-avatar">G</div>
      <div class="user-info">
        <div class="user-name header-name">Guest</div>
        <div class="user-plan header-plan">Free</div>
      </div>
    </div>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  </div>

  <div class="menu-divider"></div>

  <button class="menu-item" data-action="upgrade">
    <div class="menu-item-left">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>
      <span>Upgrade plan</span>
    </div>
  </button>

  <button class="menu-item" data-action="personalization">
    <div class="menu-item-left">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
      </svg>
      <span>Personalization</span>
    </div>
  </button>

  <button class="menu-item" data-action="profile">
    <div class="menu-item-left">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
      <span>Profile</span>
    </div>
  </button>

  <button class="menu-item" data-action="settings">
    <div class="menu-item-left">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
      <span>Settings</span>
    </div>
  </button>

  <div class="menu-divider"></div>

  <button class="menu-item" data-action="help">
    <div class="menu-item-left">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
      <span>Help</span>
    </div>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  </button>

  <div class="menu-divider"></div>

  <button class="menu-item logout-btn" data-action="logout">
    <div class="menu-item-left">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>
      <span class="logout-label">Log in</span>
    </div>
  </button>
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

    this.shadowRoot.querySelector('.trigger').addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggle();
    });

    this.shadowRoot.querySelectorAll('.menu-item, .header-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = item.dataset.action;
        if (action) {
          this._handleAction(action);
          this._close();
        }
      });
    });

    const upgradePill = this.shadowRoot.querySelector('.upgrade-pill');
    if (upgradePill) {
      upgradePill.addEventListener('click', (e) => {
        e.stopPropagation();
        this._handleAction('upgrade');
      });
    }

    document.addEventListener('click', (e) => {
      if (!this.contains(e.target)) this._close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this._close();
    });

    bus.on(EVENTS.AUTH.LOGIN_SUCCESS, () => this._render());
    bus.on(EVENTS.AUTH.LOGOUT, () => this._render());
    window.addEventListener('storage', () => this._render());
  }

  _render() {
    const user = AuthService.user;
    const avatars = this.shadowRoot.querySelectorAll('.avatar');
    const names = this.shadowRoot.querySelectorAll('.user-name');
    const plans = this.shadowRoot.querySelectorAll('.user-plan');
    const logoutLabel = this.shadowRoot.querySelector('.logout-label');

    const initial = (user?.name || user?.email || 'G').charAt(0).toUpperCase();
    const displayName = user ? (user.name || user.email || 'User') : 'Guest';
    const displayPlan = user?.plan || 'Free';

    avatars.forEach((el) => { el.textContent = initial; });
    names.forEach((el) => { el.textContent = displayName; });
    plans.forEach((el) => { el.textContent = displayPlan; });

    if (logoutLabel) {
      logoutLabel.textContent = user ? 'Log out' : 'Log in';
    }
  }

  _toggle() {
    const dropdown = this.shadowRoot.querySelector('.dropdown');
    const shouldOpen = !dropdown.classList.contains('open');
    this._isOpen = shouldOpen;
    dropdown.classList.toggle('open', shouldOpen);
    this.shadowRoot.querySelector('.trigger').setAttribute('aria-expanded', String(shouldOpen));
  }

  _close() {
    this._isOpen = false;
    this.shadowRoot.querySelector('.dropdown').classList.remove('open');
    this.shadowRoot.querySelector('.trigger').setAttribute('aria-expanded', 'false');
  }

  openDropdown() {
    this._isOpen = true;
    this.shadowRoot.querySelector('.dropdown').classList.add('open');
    this.shadowRoot.querySelector('.trigger').setAttribute('aria-expanded', 'true');
  }

  closeDropdown() {
    this._close();
  }

  _handleAction(action) {
    const user = AuthService.user;
    switch (action) {
      case 'settings':
        bus.emit(EVENTS.UI.SETTINGS_OPEN, { tab: 'general' });
        break;
      case 'personalization':
        bus.emit(EVENTS.UI.SETTINGS_OPEN, { tab: 'personalization' });
        break;
      case 'profile':
        if (!user) {
          bus.emit(EVENTS.AUTH.LOGIN_REQUIRED);
        } else {
          bus.emit(EVENTS.UI.SETTINGS_OPEN, { tab: 'account' });
        }
        break;
      case 'help':
        window.open('https://help.q-dev.ai', '_blank');
        break;
      case 'logout':
        if (user) {
          AuthService.logout();
          bus.emit(EVENTS.AUTH.LOGOUT);
          bus.emit(EVENTS.UI.TOAST, { message: 'Logged out', type: 'success' });
        } else {
          bus.emit(EVENTS.AUTH.LOGIN_REQUIRED);
        }
        break;
      case 'upgrade':
        bus.emit(EVENTS.UI.SETTINGS_OPEN, { tab: 'billing' });
        break;
    }
  }
}

customElements.define('profile-menu', ProfileMenu);
