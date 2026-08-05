/**
 * SettingsModal — ChatGPT-style settings with left sidebar tabs.
 * <settings-modal></settings-modal>
 * Open via: bus.emit(EVENTS.UI.SETTINGS_OPEN, { tab: 'general' })
 */
import { bus } from '../events/EventBus.js';
import { EVENTS } from '../events/events.js';
import { store } from '../store/Store.js';
import { ThemeService } from '../services/ThemeService.js';
import { AuthService } from '../services/AuthService.js';
import { StorageService } from '../services/StorageService.js';
import { AppearanceService } from '../services/AppearanceService.js';

const TABS = [
  { id: 'general', label: 'General', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>' },
  { id: 'notifications', label: 'Notifications', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>' },
  { id: 'personalization', label: 'Personalization', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>' },
  { id: 'plugins', label: 'Plugins', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>' },
  { id: 'voice', label: 'Voice', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>' },
  { id: 'billing', label: 'Billing', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>' },
  { id: 'data', label: 'Data controls', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>' },
  { id: 'storage', label: 'Storage', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M21 19c0 1.66-4 3-9 3s-9-1.34-9-3"></path></svg>' },
  { id: 'safety', label: 'Safety', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>' },
  { id: 'security', label: 'Security and login', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>' },
  { id: 'parental', label: 'Parental controls', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>' },
  { id: 'trusted', label: 'Trusted contact', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></svg>' },
  { id: 'account', label: 'Account', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>' },
];

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
  :host { display: none; position: fixed; inset: 0; z-index: 9998; }
  :host(.open) { display: flex; align-items: center; justify-content: center; }

  .backdrop {
    position: absolute; inset: 0; background: rgba(0,0,0,0.6);
    animation: fadeIn 0.15s ease;
  }

  .modal {
    position: relative; display: flex; width: 90%; max-width: 900px;
    height: 80vh; max-height: 700px; background: var(--modal-bg, #1e1e1e);
    border-radius: 16px; overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    animation: slideUp 0.2s ease; border: 1px solid var(--border-color, #333);
  }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

  .sidebar {
    width: 220px; flex-shrink: 0; border-right: 1px solid var(--border-color, #333);
    padding: 16px 8px; display: flex; flex-direction: column;
    background: var(--sidebar-bg, #171717); overflow-y: auto;
  }

  .sidebar-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 8px 16px; border-bottom: 1px solid var(--border-color, #333);
    margin-bottom: 8px;
  }

  .sidebar-title { font-size: 16px; font-weight: 600; color: var(--text-primary, #e0e0e0); }

  .close-btn {
    background: none; border: none; cursor: pointer; padding: 6px;
    color: var(--text-muted, #888); border-radius: 6px; display: flex;
    transition: color 0.15s, background 0.15s;
  }
  .close-btn:hover { color: var(--text-primary, #e0e0e0); background: rgba(255,255,255,0.1); }

  .nav-item {
    display: flex; align-items: center; gap: 10px; padding: 10px 12px;
    border-radius: 8px; cursor: pointer; transition: background 0.12s;
    color: var(--text-muted, #888); font-size: 13px; border: none;
    background: none; width: 100%; text-align: left; margin-bottom: 2px;
  }
  .nav-item:hover { background: var(--hover-bg, rgba(255,255,255,0.08)); color: var(--text-primary, #e0e0e0); }
  .nav-item.active { background: var(--active-bg, rgba(255,255,255,0.15)); color: var(--text-primary, #fff); font-weight: 500; }
  .nav-item svg { flex-shrink: 0; }

  .content { flex: 1; overflow-y: auto; padding: 24px 32px; background: var(--modal-bg, #1e1e1e); }

  .section-title {
    font-size: 20px; font-weight: 600; color: var(--text-primary, #e0e0e0);
    margin-bottom: 20px;
  }

  .setting-group {
    margin-bottom: 24px; padding-bottom: 24px;
    border-bottom: 1px solid var(--border-color, #333);
  }
  .setting-group:last-child { border-bottom: none; }

  .setting-label {
    font-size: 14px; font-weight: 500; color: var(--text-primary, #e0e0e0);
    margin-bottom: 4px;
  }
  .setting-desc {
    font-size: 12px; color: var(--text-muted, #888); margin-bottom: 8px;
  }

  .setting-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 0; gap: 16px;
  }
  .setting-row + .setting-row { border-top: 1px solid var(--border-color, #2a2a2a); }

  .select-wrapper { position: relative; }
  .custom-select {
    padding: 8px 32px 8px 12px; border-radius: 8px;
    border: 1px solid var(--border-color, #444); background: var(--input-bg, #2d2d2d);
    color: var(--text-primary, #e0e0e0); font-size: 13px; cursor: pointer;
    appearance: none; outline: none; min-width: 140px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 10px center;
  }
  .custom-select:focus { border-color: var(--accent-color, #6c63ff); }
  .custom-select option { background: var(--modal-bg, #1e1e1e); color: var(--text-primary, #e0e0e0); }

  .toggle {
    position: relative; width: 44px; height: 24px; cursor: pointer; flex-shrink: 0;
  }
  .toggle input { opacity: 0; width: 0; height: 0; }
  .toggle-slider {
    position: absolute; inset: 0; background: var(--border-color, #555);
    border-radius: 12px; transition: background 0.2s;
  }
  .toggle-slider::before {
    content: ''; position: absolute; width: 18px; height: 18px;
    left: 3px; bottom: 3px; background: #fff; border-radius: 50%;
    transition: transform 0.2s;
  }
  .toggle input:checked + .toggle-slider { background: var(--accent-color, #5b7cfa); }
  .toggle input:checked + .toggle-slider::before { transform: translateX(20px); }

  .accent-colors { display: flex; gap: 8px; }
  .accent-color {
    width: 24px; height: 24px; border-radius: 50%; cursor: pointer;
    border: 2px solid transparent; transition: border-color 0.15s, transform 0.15s;
  }
  .accent-color:hover { transform: scale(1.1); }
  .accent-color.active { border-color: #fff; }
  .accent-custom {
    width: 28px; height: 28px; padding: 2px; border: 1px solid var(--border-color, #444);
    border-radius: 50%; background: transparent; cursor: pointer;
  }

  .color-customizer {
    display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px; margin-top: 12px;
  }
  .color-field {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    padding: 10px 12px; border: 1px solid var(--border-color, #333);
    border-radius: 8px; background: var(--surface-elevated, var(--input-bg, #272727));
    color: var(--text-primary, #e0e0e0); font-size: 12px;
  }
  .color-field input[type="color"] {
    width: 34px; height: 28px; padding: 2px; border: 1px solid var(--border-color, #333);
    border-radius: 6px; background: transparent; cursor: pointer;
  }
  .reset-colors-btn {
    margin-top: 10px; border: 1px solid var(--border-color, #333); border-radius: 8px;
    background: transparent; color: var(--text-primary, #e0e0e0); padding: 8px 12px;
    cursor: pointer; font: inherit; font-size: 12px;
  }
  .reset-colors-btn:hover { background: var(--hover-bg, rgba(255,255,255,.06)); }
  @media (max-width: 640px) { .color-customizer { grid-template-columns: 1fr; } }

  .btn-danger {
    padding: 8px 16px; border-radius: 8px; border: 1px solid #e74c3c;
    background: transparent; color: #e74c3c; font-size: 13px; cursor: pointer;
    transition: background 0.15s;
  }
  .btn-danger:hover { background: rgba(231, 76, 60, 0.1); }

  .btn-primary {
    padding: 8px 16px; border-radius: 8px; border: none;
    background: var(--accent-color, #10a37f); color: #fff; font-size: 13px;
    font-weight: 500; cursor: pointer; transition: opacity 0.15s;
  }
  .btn-primary:hover { opacity: 0.9; }

  .mfa-section {
    padding: 16px; background: rgba(255,255,255,0.03);
    border-radius: 12px; border: 1px solid var(--border-color, #333);
    margin-bottom: 24px; position: relative;
  }
  .mfa-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .mfa-icon {
    width: 32px; height: 32px; border-radius: 8px;
    background: rgba(255,255,255,0.1); display: flex;
    align-items: center; justify-content: center; color: #fff;
  }
  .mfa-title { font-size: 15px; font-weight: 600; color: var(--text-primary, #e0e0e0); }
  .mfa-desc { font-size: 13px; color: var(--text-muted, #888); margin-bottom: 12px; line-height: 1.4; }

  .profile-section {
    display: flex; align-items: center; gap: 16px; padding: 20px;
    background: rgba(255,255,255,0.04); border-radius: 12px;
    margin-bottom: 24px; border: 1px solid var(--border-color, #333);
  }
  .profile-avatar {
    width: 56px; height: 56px; border-radius: 50%;
    background: linear-gradient(135deg, #2b5876 0%, #4e4376 100%);
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 22px; font-weight: 600;
  }
  .profile-info { flex: 1; }
  .profile-name { font-size: 16px; font-weight: 600; color: var(--text-primary, #e0e0e0); }
  .profile-email { font-size: 13px; color: var(--text-muted, #888); margin-top: 2px; }
  .profile-plan {
    font-size: 11px; background: rgba(255,255,255,0.1); color: #fff;
    padding: 3px 10px; border-radius: 10px; margin-top: 6px; display: inline-block;
  }

  .textarea {
    width: 100%; min-height: 120px; padding: 12px; border-radius: 8px;
    border: 1px solid var(--border-color, #444); background: var(--input-bg, #2d2d2d);
    color: var(--text-primary, #e0e0e0); font-size: 13px; resize: vertical;
    font-family: inherit; outline: none;
  }
  .textarea:focus { border-color: var(--accent-color, #6c63ff); }

  .prompt-templates { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
  .prompt-template {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 12px; background: rgba(255,255,255,0.03);
    border-radius: 8px; border: 1px solid var(--border-color, #333);
  }
  .prompt-template-label { font-size: 13px; color: var(--text-primary, #e0e0e0); }

  .response-style { display: flex; gap: 8px; margin-top: 8px; }
  .style-option {
    flex: 1; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color, #444);
    background: transparent; color: var(--text-muted, #888); font-size: 13px;
    cursor: pointer; text-align: center; transition: all 0.15s;
  }
  .style-option:hover { border-color: var(--accent-color, #6c63ff); color: var(--text-primary, #e0e0e0); }
  .style-option.active {
    border-color: var(--accent-color, #6c63ff); color: var(--text-primary, #e0e0e0);
    background: rgba(108, 99, 255, 0.1);
  }

  .empty-state {
    text-align: center; padding: 40px 20px; color: var(--text-muted, #888);
  }
  .empty-state svg { margin-bottom: 12px; opacity: 0.5; }
  .empty-state p { font-size: 13px; line-height: 1.5; }
</style>

<div class="backdrop"></div>
<div class="modal">
  <div class="sidebar">
    <div class="sidebar-header">
      <span class="sidebar-title">Settings</span>
      <button class="close-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <nav class="nav-list"></nav>
  </div>
  <div class="content"></div>
</div>
`;

export class SettingsModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
    this._activeTab = 'general';
    this._navList = this.shadowRoot.querySelector('.nav-list');
    this._content = this.shadowRoot.querySelector('.content');
  }

  connectedCallback() {
    this._renderNav();

    this.shadowRoot.querySelector('.close-btn').addEventListener('click', () => this.close());
    this.shadowRoot.querySelector('.backdrop').addEventListener('click', () => this.close());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.classList.contains('open')) this.close();
    });

    bus.on(EVENTS.UI.SETTINGS_OPEN, (detail) => {
      this.open(detail?.tab || 'general');
    });
  }

  _renderNav() {
    this._navList.innerHTML = '';
    for (const tab of TABS) {
      const btn = document.createElement('button');
      btn.className = `nav-item${tab.id === this._activeTab ? ' active' : ''}`;
      btn.dataset.tab = tab.id;
      btn.innerHTML = `${tab.icon}<span>${tab.label}</span>`;
      btn.addEventListener('click', () => this._switchTab(tab.id));
      this._navList.appendChild(btn);
    }
  }

  _switchTab(tabId) {
    this._activeTab = tabId;
    this._navList.querySelectorAll('.nav-item').forEach((n) => {
      n.classList.toggle('active', n.dataset.tab === tabId);
    });
    this._renderContent();
  }

  open(tab = 'general') {
    this._activeTab = tab;
    this._renderNav();
    this._renderContent();
    this.classList.add('open');
  }

  close() {
    this.classList.remove('open');
  }

  _renderContent() {
    switch (this._activeTab) {
      case 'general': this._renderGeneral(); break;
      case 'personalization': this._renderPersonalization(); break;
      case 'notifications': this._renderNotifications(); break;
      case 'plugins': this._renderPlugins(); break;
      case 'voice': this._renderVoice(); break;
      case 'billing': this._renderBilling(); break;
      case 'data': this._renderData(); break;
      case 'storage': this._renderStorage(); break;
      case 'safety': this._renderSafety(); break;
      case 'security': this._renderSecurity(); break;
      case 'parental': this._renderParental(); break;
      case 'trusted': this._renderTrusted(); break;
      case 'account': this._renderAccount(); break;
      default: this._renderGeneral();
    }
  }

  _renderGeneral() {
    const savedTheme = localStorage.getItem('qai_theme') || 'dark';
    const defaultAccent = document.documentElement.getAttribute('data-theme') === 'light' ? '#3568e8' : '#5b7cfa';
    const savedAccent = AppearanceService.get('accentColor') || defaultAccent;
    this._content.innerHTML = `
      <h2 class="section-title">General</h2>

      <div class="setting-group">
        <div class="setting-row">
          <div>
            <div class="setting-label">Appearance</div>
            <div class="setting-desc">Choose your preferred application theme</div>
          </div>
          <select class="custom-select" data-setting="theme">
            <option value="system" ${savedTheme === 'system' ? 'selected' : ''}>System</option>
            <option value="light" ${savedTheme === 'light' ? 'selected' : ''}>Light</option>
            <option value="dark" ${savedTheme === 'dark' ? 'selected' : ''}>Dark</option>
          </select>
        </div>

        <div class="setting-row">
          <div>
            <div class="setting-label">Accent color</div>
            <div class="setting-desc">Customize theme accent color</div>
          </div>
          <div class="accent-colors">
            <div class="accent-color ${savedAccent === defaultAccent ? 'active' : ''}" style="background: ${defaultAccent};" data-color="${defaultAccent}" title="Theme default"></div>
            <div class="accent-color ${savedAccent === '#10a37f' ? 'active' : ''}" style="background: #10a37f;" data-color="#10a37f" title="Emerald"></div>
            <div class="accent-color ${savedAccent === '#8b5cf6' ? 'active' : ''}" style="background: #8b5cf6;" data-color="#8b5cf6" title="Violet"></div>
            <div class="accent-color ${savedAccent === '#e85555' ? 'active' : ''}" style="background: #e85555;" data-color="#e85555" title="Coral"></div>
            <input class="accent-custom" type="color" value="${savedAccent}" title="Custom accent color" aria-label="Custom accent color">
          </div>
        </div>

        <div class="setting-row">
          <div>
            <div class="setting-label">Language</div>
            <div class="setting-desc">Interface display language</div>
          </div>
          <select class="custom-select" data-setting="language">
            <option value="auto">Auto-detect</option>
            <option value="en">English</option>
            <option value="ur">&#1575;&#1585;&#1583;&#1608;</option>
            <option value="es">Espa&ntilde;ol</option>
          </select>
        </div>
      </div>

      <div class="setting-group">
        <div class="setting-row">
          <div>
            <div class="setting-label">Sound Notifications</div>
            <div class="setting-desc">Play audio tone when AI finishes response</div>
          </div>
          <label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label>
        </div>
      </div>
    `;

    this._content.querySelector('[data-setting="theme"]').addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'system') {
        const sys = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        ThemeService.apply(sys);
        localStorage.setItem('qai_theme', 'system');
      } else {
        ThemeService.apply(val);
        localStorage.setItem('qai_theme', val);
      }
      bus.emit(EVENTS.THEME.TOGGLED);
      bus.emit(EVENTS.UI.TOAST, { message: `Theme set to ${val}`, type: 'info' });
    });

    this._content.querySelectorAll('.accent-color').forEach((el) => {
      el.addEventListener('click', () => {
        this._content.querySelectorAll('.accent-color').forEach((c) => c.classList.remove('active'));
        el.classList.add('active');
        AppearanceService.set('accentColor', el.dataset.color);
      });
    });

    this._content.querySelector('.accent-custom').addEventListener('input', (e) => {
      this._content.querySelectorAll('.accent-color').forEach((c) => c.classList.remove('active'));
      AppearanceService.set('accentColor', e.target.value);
    });
  }

  _renderPersonalization() {
    const customInstructions = StorageService.get('customInstructions') || '';
    const responseStyle = StorageService.get('responseStyle') || 'balanced';
    const memoryEnabled = StorageService.get('memoryEnabled') !== 'false';
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const accentColor = AppearanceService.get('accentColor') || (isLight ? '#3568e8' : '#5b7cfa');
    const sidebarBackground = AppearanceService.get('sidebarBackground') || (isLight ? '#ffffff' : '#121212');
    const chatBackground = AppearanceService.get('chatBackground') || (isLight ? '#f7f7f8' : '#1a1a1a');
    const userBubbleColor = AppearanceService.get('userBubbleColor') || accentColor;
    const assistantBubbleColor = AppearanceService.get('assistantBubbleColor') || (isLight ? '#ffffff' : '#202020');

    this._content.innerHTML = `
      <h2 class="section-title">Personalization</h2>

      <div class="setting-group">
        <div class="setting-label">Chat appearance</div>
        <div class="setting-desc">Choose colors for the sidebar, chat canvas, and message cards. Changes are saved on this device.</div>
        <div class="color-customizer">
          <label class="color-field">Sidebar <input type="color" data-chat-color="sidebarBackground" value="${sidebarBackground}"></label>
          <label class="color-field">Chat background <input type="color" data-chat-color="chatBackground" value="${chatBackground}"></label>
          <label class="color-field">Your messages <input type="color" data-chat-color="userBubbleColor" value="${userBubbleColor}"></label>
          <label class="color-field">AI messages <input type="color" data-chat-color="assistantBubbleColor" value="${assistantBubbleColor}"></label>
        </div>
        <button class="reset-colors-btn" id="resetChatColors" type="button">Use theme defaults</button>
      </div>

      <div class="setting-group">
        <div class="setting-label">Custom Instructions</div>
        <div class="setting-desc">What would you like Q-Dev-AI to know about you to provide better responses?</div>
        <textarea
          id="customInstrBox"
          class="textarea"
          placeholder="Example: I'm a developer working on Node.js and React. I prefer concise code snippets with clean formatting."
        >${customInstructions}</textarea>
        <div style="display:flex;justify-content:flex-end;margin-top:8px;">
          <button class="btn-primary" id="saveInstrBtn">Save Instructions</button>
        </div>
      </div>

      <div class="setting-group">
        <div class="setting-label">Response Style</div>
        <div class="setting-desc">Choose how the AI should respond</div>
        <div class="response-style">
          <button class="style-option ${responseStyle === 'concise' ? 'active' : ''}" data-style="concise">Concise</button>
          <button class="style-option ${responseStyle === 'balanced' ? 'active' : ''}" data-style="balanced">Balanced</button>
          <button class="style-option ${responseStyle === 'detailed' ? 'active' : ''}" data-style="detailed">Detailed</button>
        </div>
      </div>

      <div class="setting-group">
        <div class="setting-label">Memory</div>
        <div class="setting-desc">Allow Q-Dev-AI to remember details across chats to personalize answers.</div>
        <div class="setting-row">
          <div>
            <div class="setting-label">Enable Memory</div>
            <div class="setting-desc">Remember preferences across conversations</div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="memoryToggle" ${memoryEnabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="setting-group">
        <div class="setting-label">Prompt Templates</div>
        <div class="setting-desc">Quick prompt shortcuts for common tasks</div>
        <div class="prompt-templates">
          <div class="prompt-template">
            <span class="prompt-template-label">Code explanation</span>
            <label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label>
          </div>
          <div class="prompt-template">
            <span class="prompt-template-label">Debug assistance</span>
            <label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label>
          </div>
          <div class="prompt-template">
            <span class="prompt-template-label">Code review</span>
            <label class="toggle"><input type="checkbox"><span class="toggle-slider"></span></label>
          </div>
        </div>
      </div>
    `;

    this._content.querySelector('#saveInstrBtn').addEventListener('click', () => {
      const text = this._content.querySelector('#customInstrBox').value;
      StorageService.set('customInstructions', text);
      bus.emit(EVENTS.UI.TOAST, { message: 'Custom instructions saved', type: 'success' });
    });

    this._content.querySelectorAll('[data-chat-color]').forEach((input) => {
      input.addEventListener('input', () => AppearanceService.set(input.dataset.chatColor, input.value));
    });

    this._content.querySelector('#resetChatColors').addEventListener('click', () => {
      AppearanceService.resetChatColors();
      this._renderPersonalization();
      bus.emit(EVENTS.UI.TOAST, { message: 'Chat colors reset to theme defaults', type: 'success' });
    });

    this._content.querySelectorAll('.style-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        this._content.querySelectorAll('.style-option').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        StorageService.set('responseStyle', btn.dataset.style);
      });
    });

    this._content.querySelector('#memoryToggle').addEventListener('change', (e) => {
      StorageService.set('memoryEnabled', String(e.target.checked));
    });
  }

  _renderNotifications() {
    this._content.innerHTML = `
      <h2 class="section-title">Notifications</h2>
      <div class="setting-group">
        <div class="setting-row">
          <div>
            <div class="setting-label">Sound Notifications</div>
            <div class="setting-desc">Play audio tone when AI finishes response</div>
          </div>
          <label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label>
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-label">Desktop Notifications</div>
            <div class="setting-desc">Show browser push notifications</div>
          </div>
          <label class="toggle"><input type="checkbox"><span class="toggle-slider"></span></label>
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-label">Email Notifications</div>
            <div class="setting-desc">Receive email updates about your account</div>
          </div>
          <label class="toggle"><input type="checkbox"><span class="toggle-slider"></span></label>
        </div>
      </div>
    `;
  }

  _renderPlugins() {
    this._content.innerHTML = `
      <h2 class="section-title">Plugins</h2>
      <div class="setting-group">
        <div class="setting-label">Web Search Plugin</div>
        <div class="setting-desc">Allow AI to search the web for live documentation</div>
        <div class="setting-row">
          <div class="setting-label">Active</div>
          <label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label>
        </div>
      </div>
      <div class="setting-group">
        <div class="setting-label">Code Interpreter</div>
        <div class="setting-desc">Allow AI to write and execute code in a sandboxed environment</div>
        <div class="setting-row">
          <div class="setting-label">Active</div>
          <label class="toggle"><input type="checkbox"><span class="toggle-slider"></span></label>
        </div>
      </div>
    `;
  }

  _renderVoice() {
    this._content.innerHTML = `
      <h2 class="section-title">Voice</h2>
      <div class="setting-group">
        <div class="setting-row">
          <div>
            <div class="setting-label">Voice Input Mode</div>
            <div class="setting-desc">Automatically send audio after speech ends</div>
          </div>
          <label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label>
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-label">Voice Output</div>
            <div class="setting-desc">Read AI responses aloud</div>
          </div>
          <label class="toggle"><input type="checkbox"><span class="toggle-slider"></span></label>
        </div>
      </div>
    `;
  }

  _renderBilling() {
    const user = AuthService.user;
    this._content.innerHTML = `
      <h2 class="section-title">Billing</h2>
      <div class="profile-section">
        <div class="profile-info">
          <div class="profile-name">${user?.plan || 'Free'} Plan</div>
          <div class="profile-email">Standard AI models with text and vision access</div>
        </div>
        <button class="btn-primary">Upgrade to Pro</button>
      </div>
      <div class="setting-group">
        <div class="setting-label">Usage</div>
        <div class="setting-desc">Current billing period</div>
        <div class="setting-row">
          <div class="setting-label">Messages Used</div>
          <span style="color:var(--text-muted,#888);font-size:13px;">-- / --</span>
        </div>
        <div class="setting-row">
          <div class="setting-label">Storage Used</div>
          <span style="color:var(--text-muted,#888);font-size:13px;">-- MB</span>
        </div>
      </div>
    `;
  }

  _renderData() {
    this._content.innerHTML = `
      <h2 class="section-title">Data controls</h2>
      <div class="setting-group">
        <div class="setting-label">Shared Links</div>
        <div class="setting-desc">Manage public shared links created from your chats</div>
        <button class="btn-primary" id="manageSharedBtn">Manage Shared Links</button>
      </div>
      <div class="setting-group">
        <div class="setting-label">Export Data</div>
        <div class="setting-desc">Download all your chat data as JSON</div>
        <button class="btn-primary" id="exportDataBtn">Export</button>
      </div>
      <div class="setting-group">
        <div class="setting-label">Clear Chat History</div>
        <div class="setting-desc">Permanently delete local chat history</div>
        <button class="btn-danger" id="clearHistBtn">Clear History</button>
      </div>
    `;

    this._content.querySelector('#clearHistBtn')?.addEventListener('click', () => {
      localStorage.removeItem('qai-chat-history');
      bus.emit(EVENTS.UI.TOAST, { message: 'Chat history cleared', type: 'success' });
    });

    this._content.querySelector('#exportDataBtn')?.addEventListener('click', () => {
      const data = localStorage.getItem('qai-chat-history') || '[]';
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'q-dev-ai-export.json';
      a.click();
      URL.revokeObjectURL(url);
      bus.emit(EVENTS.UI.TOAST, { message: 'Data exported', type: 'success' });
    });
  }

  _renderStorage() {
    this._content.innerHTML = `
      <h2 class="section-title">Storage</h2>
      <div class="setting-group">
        <div class="setting-label">Cache Data</div>
        <div class="setting-desc">Local offline cache usage</div>
        <div class="setting-row">
          <span style="font-size:13px;color:var(--text-muted,#888);">Calculating...</span>
        </div>
      </div>
      <div class="setting-group">
        <button class="btn-danger" id="clearCacheBtn">Clear Cache</button>
      </div>
    `;

    if ('storage' in navigator && navigator.storage?.estimate) {
      navigator.storage.estimate().then((est) => {
        const used = est.usage ? (est.usage / 1048576).toFixed(2) : '0';
        const total = est.quota ? (est.quota / 1048576).toFixed(0) : '?';
        const row = this._content.querySelector('.setting-row span');
        if (row) row.textContent = `${used} MB / ${total} MB`;
      });
    }

    this._content.querySelector('#clearCacheBtn')?.addEventListener('click', () => {
      localStorage.clear();
      bus.emit(EVENTS.UI.TOAST, { message: 'Cache cleared', type: 'success' });
    });
  }

  _renderSafety() {
    this._content.innerHTML = `
      <h2 class="section-title">Safety</h2>
      <div class="setting-group">
        <div class="setting-row">
          <div>
            <div class="setting-label">Content Filter</div>
            <div class="setting-desc">Filter potentially harmful or explicit content</div>
          </div>
          <label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label>
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-label">Safe Browsing</div>
            <div class="setting-desc">Block links to potentially unsafe websites</div>
          </div>
          <label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label>
        </div>
      </div>
    `;
  }

  _renderSecurity() {
    this._content.innerHTML = `
      <h2 class="section-title">Security and login</h2>
      <div class="setting-group">
        <div class="mfa-section">
          <div class="mfa-header">
            <div class="mfa-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <span class="mfa-title">Multi-Factor Authentication</span>
          </div>
          <p class="mfa-desc">Add an extra layer of security to your account by requiring a verification code in addition to your password.</p>
          <button class="btn-primary">Setup MFA</button>
        </div>
      </div>
      <div class="setting-group">
        <div class="setting-label">Active Sessions</div>
        <div class="setting-desc">Manage devices where you're currently logged in</div>
        <button class="btn-danger">Sign out all other sessions</button>
      </div>
    `;
  }

  _renderParental() {
    this._content.innerHTML = `
      <h2 class="section-title">Parental controls</h2>
      <div class="setting-group">
        <div class="setting-row">
          <div>
            <div class="setting-label">Content Filter</div>
            <div class="setting-desc">Strict mode for family access</div>
          </div>
          <label class="toggle"><input type="checkbox"><span class="toggle-slider"></span></label>
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-label">Usage Time Limit</div>
            <div class="setting-desc">Limit daily usage time</div>
          </div>
          <select class="custom-select">
            <option value="none">No limit</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="120">2 hours</option>
          </select>
        </div>
      </div>
    `;
  }

  _renderTrusted() {
    this._content.innerHTML = `
      <h2 class="section-title">Trusted contact</h2>
      <div class="setting-group">
        <div class="setting-label">Emergency Recovery</div>
        <div class="setting-desc">Add a trusted contact email for account recovery</div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <input type="email" class="textarea" style="min-height:auto;padding:8px 12px;" placeholder="trusted@example.com">
          <button class="btn-primary">Add</button>
        </div>
      </div>
    `;
  }

  _renderAccount() {
    const user = AuthService.user;
    this._content.innerHTML = `
      <h2 class="section-title">Account</h2>
      <div class="profile-section">
        <div class="profile-avatar">${(user?.name || user?.email || 'G').charAt(0).toUpperCase()}</div>
        <div class="profile-info">
          <div class="profile-name">${user?.name || 'Guest User'}</div>
          <div class="profile-email">${user?.email || 'No email associated'}</div>
          <div class="profile-plan">${user?.plan || 'Free'}</div>
        </div>
      </div>
      <div class="setting-group">
        <div class="setting-label">Account Actions</div>
        ${user ? `
          <button class="btn-danger" id="logoutBtn">Log out</button>
        ` : `
          <button class="btn-primary" id="loginBtn">Log in / Sign up</button>
        `}
      </div>
    `;

    if (user) {
      this._content.querySelector('#logoutBtn')?.addEventListener('click', () => {
        AuthService.logout();
        bus.emit(EVENTS.AUTH.LOGOUT);
        bus.emit(EVENTS.UI.TOAST, { message: 'Logged out', type: 'success' });
        this.close();
      });
    } else {
      this._content.querySelector('#loginBtn')?.addEventListener('click', () => {
        bus.emit(EVENTS.AUTH.LOGIN_REQUIRED);
        this.close();
      });
    }
  }
}

customElements.define('settings-modal', SettingsModal);
