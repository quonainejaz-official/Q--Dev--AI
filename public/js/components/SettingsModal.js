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

const TABS = [
  { id: 'general', label: 'General', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>' },
  { id: 'personalization', label: 'Personalization', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>' },
  { id: 'notifications', label: 'Notifications', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>' },
  { id: 'voice', label: 'Voice', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>' },
  { id: 'data', label: 'Data controls', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>' },
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
    height: 80vh; max-height: 700px; background: var(--modal-bg, #1a1a2e);
    border-radius: 16px; overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    animation: slideUp 0.2s ease;
  }
  
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  
  .sidebar {
    width: 220px; flex-shrink: 0; border-right: 1px solid var(--border-color, #333);
    padding: 16px 8px; display: flex; flex-direction: column;
    background: var(--sidebar-bg, #111127);
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
  .nav-item.active { background: var(--active-bg, rgba(108,99,255,0.15)); color: var(--text-primary, #e0e0e0); }
  .nav-item svg { flex-shrink: 0; }
  
  .content { flex: 1; overflow-y: auto; padding: 24px 32px; }
  
  .section-title {
    font-size: 18px; font-weight: 600; color: var(--text-primary, #e0e0e0);
    margin-bottom: 20px;
  }
  
  .setting-group {
    margin-bottom: 24px; padding-bottom: 24px;
    border-bottom: 1px solid var(--border-color, #333);
  }
  .setting-group:last-child { border-bottom: none; }
  
  .setting-label {
    font-size: 13px; font-weight: 500; color: var(--text-primary, #e0e0e0);
    margin-bottom: 4px;
  }
  .setting-desc {
    font-size: 12px; color: var(--text-muted, #888); margin-bottom: 8px;
  }
  
  .setting-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 0;
  }
  .setting-row + .setting-row { border-top: 1px solid var(--border-color, #333); }
  
  .select-wrapper { position: relative; }
  .custom-select {
    padding: 8px 32px 8px 12px; border-radius: 8px;
    border: 1px solid var(--border-color, #333); background: var(--input-bg, #0d1117);
    color: var(--text-primary, #e0e0e0); font-size: 13px; cursor: pointer;
    appearance: none; outline: none; min-width: 120px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 10px center;
  }
  .custom-select:focus { border-color: var(--accent-color, #6c63ff); }
  .custom-select option { background: var(--modal-bg, #1a1a2e); color: var(--text-primary, #e0e0e0); }
  
  .toggle {
    position: relative; width: 44px; height: 24px; cursor: pointer;
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
  .toggle input:checked + .toggle-slider { background: var(--accent-color, #6c63ff); }
  .toggle input:checked + .toggle-slider::before { transform: translateX(20px); }
  
  .accent-colors { display: flex; gap: 8px; }
  .accent-color {
    width: 28px; height: 28px; border-radius: 50%; cursor: pointer;
    border: 2px solid transparent; transition: border-color 0.15s, transform 0.15s;
  }
  .accent-color:hover { transform: scale(1.1); }
  .accent-color.active { border-color: #fff; }
  
  .btn-danger {
    padding: 8px 16px; border-radius: 8px; border: 1px solid #e74c3c;
    background: transparent; color: #e74c3c; font-size: 13px; cursor: pointer;
    transition: background 0.15s;
  }
  .btn-danger:hover { background: rgba(231, 76, 60, 0.1); }
  
  .btn-primary {
    padding: 8px 16px; border-radius: 8px; border: none;
    background: var(--accent-color, #6c63ff); color: #fff; font-size: 13px;
    font-weight: 500; cursor: pointer; transition: opacity 0.15s;
  }
  .btn-primary:hover { opacity: 0.9; }
  
  .profile-section {
    display: flex; align-items: center; gap: 16px; padding: 20px;
    background: var(--hover-bg, rgba(255,255,255,0.05)); border-radius: 12px;
    margin-bottom: 24px;
  }
  .profile-avatar {
    width: 56px; height: 56px; border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 22px; font-weight: 600;
  }
  .profile-info { flex: 1; }
  .profile-name { font-size: 16px; font-weight: 600; color: var(--text-primary, #e0e0e0); }
  .profile-email { font-size: 13px; color: var(--text-muted, #888); margin-top: 2px; }
  .profile-plan {
    font-size: 11px; background: var(--accent-color, #6c63ff); color: #fff;
    padding: 3px 10px; border-radius: 10px; margin-top: 6px; display: inline-block;
  }
  
  .empty-state {
    text-align: center; padding: 40px; color: var(--text-muted, #888);
  }
  .empty-state svg { margin-bottom: 12px; opacity: 0.5; }
  
  .prompt-templates { display: flex; flex-direction: column; gap: 8px; }
  .prompt-template {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; background: var(--hover-bg, rgba(255,255,255,0.05));
    border-radius: 8px; border: 1px solid var(--border-color, #333);
  }
  .prompt-template-info { flex: 1; }
  .prompt-template-name { font-size: 13px; font-weight: 500; color: var(--text-primary, #e0e0e0); }
  .prompt-template-desc { font-size: 12px; color: var(--text-muted, #888); margin-top: 2px; }
  .prompt-template-toggle { margin-left: 12px; }
  
  .mfa-section {
    padding: 16px; background: var(--hover-bg, rgba(255,255,255,0.05));
    border-radius: 12px; border: 1px solid var(--border-color, #333);
    margin-bottom: 24px;
  }
  .mfa-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .mfa-icon {
    width: 32px; height: 32px; border-radius: 8px;
    background: var(--accent-color, #6c63ff); display: flex;
    align-items: center; justify-content: center; color: #fff;
  }
  .mfa-title { font-size: 14px; font-weight: 600; color: var(--text-primary, #e0e0e0); }
  .mfa-desc { font-size: 12px; color: var(--text-muted, #888); margin-bottom: 12px; }
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
      case 'voice': this._renderVoice(); break;
      case 'data': this._renderData(); break;
      case 'account': this._renderAccount(); break;
      default: this._renderGeneral();
    }
  }

  _renderGeneral() {
    const currentTheme = ThemeService.current;
    this._content.innerHTML = `
      <h2 class="section-title">General</h2>
      
      <div class="mfa-section">
        <div class="mfa-header">
          <div class="mfa-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <span class="mfa-title">Secure your account</span>
        </div>
        <p class="mfa-desc">Add multi-factor authentication (MFA), like a text message or authenticator app, to help protect your account when logging in.</p>
        <button class="btn-primary" onclick="this.closest('settings-modal')._handleMFA()">Set up MFA</button>
      </div>
      
      <div class="setting-group">
        <div class="setting-row">
          <div>
            <div class="setting-label">Appearance</div>
            <div class="setting-desc">Choose your preferred theme</div>
          </div>
          <select class="custom-select" data-setting="theme">
            <option value="system" ${currentTheme === 'system' ? 'selected' : ''}>System</option>
            <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>Dark</option>
            <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>Light</option>
          </select>
        </div>
        
        <div class="setting-row">
          <div>
            <div class="setting-label">Accent color</div>
            <div class="setting-desc">Customize your interface color</div>
          </div>
          <div class="accent-colors">
            <div class="accent-color active" style="background: #6c63ff;" data-color="#6c63ff"></div>
            <div class="accent-color" style="background: #2ecc71;" data-color="#2ecc71"></div>
            <div class="accent-color" style="background: #e74c3c;" data-color="#e74c3c"></div>
            <div class="accent-color" style="background: #f39c12;" data-color="#f39c12"></div>
            <div class="accent-color" style="background: #3498db;" data-color="#3498db"></div>
            <div class="accent-color" style="background: #e91e63;" data-color="#e91e63"></div>
          </div>
        </div>
        
        <div class="setting-row">
          <div>
            <div class="setting-label">Language</div>
            <div class="setting-desc">Select your preferred language</div>
          </div>
          <select class="custom-select" data-setting="language">
            <option value="auto">Auto-detect</option>
            <option value="en">English</option>
            <option value="es">Espa&ntilde;ol</option>
            <option value="fr">Fran&ccedil;ais</option>
            <option value="de">Deutsch</option>
            <option value="ur">اردو</option>
            <option value="ar">&#1575;&#1604;&#1593;&#1585;&#1576;&#1610;&#1577;</option>
          </select>
        </div>
        
        <div class="setting-row">
          <div>
            <div class="setting-label">Send messages on Enter</div>
            <div class="setting-desc">Press Enter to send, Shift+Enter for new line</div>
          </div>
          <label class="toggle">
            <input type="checkbox" data-setting="enterToSend" checked>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    `;

    // Theme select
    this._content.querySelector('[data-setting="theme"]').addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'system') {
        const sys = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        ThemeService.apply(sys);
        StorageService.remove('theme');
      } else {
        ThemeService.apply(val);
        StorageService.set('theme', val);
      }
      bus.emit(EVENTS.THEME.TOGGED);
    });

    // Accent colors
    this._content.querySelectorAll('.accent-color').forEach((el) => {
      el.addEventListener('click', () => {
        this._content.querySelectorAll('.accent-color').forEach((c) => c.classList.remove('active'));
        el.classList.add('active');
        document.documentElement.style.setProperty('--accent-color', el.dataset.color);
        StorageService.set('accentColor', el.dataset.color);
        bus.emit(EVENTS.UI.TOAST, { message: 'Accent color updated', type: 'success' });
      });
    });

    // Enter to send toggle
    this._content.querySelector('[data-setting="enterToSend"]').addEventListener('change', (e) => {
      StorageService.set('enterToSend', e.target.checked);
    });
  }

  _renderPersonalization() {
    const customInstructions = StorageService.get('customInstructions') || '';
    const promptMode = StorageService.get('promptMode') || 'default';
    
    this._content.innerHTML = `
      <h2 class="section-title">Personalization</h2>
      
      <div class="setting-group">
        <div class="setting-label">Custom Instructions</div>
        <div class="setting-desc">Add information about yourself that the AI should remember. This will be included in every conversation.</div>
        <textarea 
          style="width:100%;min-height:120px;padding:12px;border-radius:8px;border:1px solid var(--border-color,#333);background:var(--input-bg,#0d1117);color:var(--text-primary,#e0e0e0);font-size:13px;resize:vertical;font-family:inherit;margin-top:8px;"
          placeholder="Example: I'm a software engineer who prefers Python. I like concise answers with code examples."
        >${customInstructions}</textarea>
        <div style="display:flex;justify-content:flex-end;margin-top:8px;">
          <button class="btn-primary" data-action="save-instructions">Save</button>
        </div>
      </div>
      
      <div class="setting-group">
        <div class="setting-label">Prompt Templates</div>
        <div class="setting-desc">Choose which prompt suggestions to show in new chats.</div>
        <div class="prompt-templates">
          <div class="prompt-template">
            <div class="prompt-template-info">
              <div class="prompt-template-name">Code Generation</div>
              <div class="prompt-template-desc">Show code-related prompt suggestions</div>
            </div>
            <label class="prompt-template-toggle toggle">
              <input type="checkbox" data-prompt="code" checked>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="prompt-template">
            <div class="prompt-template-info">
              <div class="prompt-template-name">Writing</div>
              <div class="prompt-template-desc">Show writing-related prompt suggestions</div>
            </div>
            <label class="prompt-template-toggle toggle">
              <input type="checkbox" data-prompt="writing" checked>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="prompt-template">
            <div class="prompt-template-info">
              <div class="prompt-template-name">Analysis</div>
              <div class="prompt-template-desc">Show analysis-related prompt suggestions</div>
            </div>
            <label class="prompt-template-toggle toggle">
              <input type="checkbox" data-prompt="analysis" checked>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
      
      <div class="setting-group">
        <div class="setting-label">Response Style</div>
        <div class="setting-desc">Choose how the AI responds to you.</div>
        <div class="setting-row">
          <div class="setting-label">Default response length</div>
          <select class="custom-select" data-setting="responseLength">
            <option value="balanced" ${promptMode === 'balanced' ? 'selected' : ''}>Balanced</option>
            <option value="concise" ${promptMode === 'concise' ? 'selected' : ''}>Concise</option>
            <option value="detailed" ${promptMode === 'detailed' ? 'selected' : ''}>Detailed</option>
          </select>
        </div>
      </div>
    `;

    // Save instructions
    this._content.querySelector('[data-action="save-instructions"]').addEventListener('click', () => {
      const textarea = this._content.querySelector('textarea');
      StorageService.set('customInstructions', textarea.value);
      bus.emit(EVENTS.UI.TOAST, { message: 'Custom instructions saved', type: 'success' });
    });
  }

  _renderNotifications() {
    const notifSettings = StorageService.get('notifications') || { sound: true, desktop: true, email: false };
    
    this._content.innerHTML = `
      <h2 class="section-title">Notifications</h2>
      
      <div class="setting-group">
        <div class="setting-row">
          <div>
            <div class="setting-label">Sound notifications</div>
            <div class="setting-desc">Play a sound when receiving responses</div>
          </div>
          <label class="toggle">
            <input type="checkbox" data-notif="sound" ${notifSettings.sound ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        
        <div class="setting-row">
          <div>
            <div class="setting-label">Desktop notifications</div>
            <div class="setting-desc">Show desktop notifications for new messages</div>
          </div>
          <label class="toggle">
            <input type="checkbox" data-notif="desktop" ${notifSettings.desktop ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        
        <div class="setting-row">
          <div>
            <div class="setting-label">Email notifications</div>
            <div class="setting-desc">Receive email updates about your account</div>
          </div>
          <label class="toggle">
            <input type="checkbox" data-notif="email" ${notifSettings.email ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    `;

    this._content.querySelectorAll('[data-notif]').forEach((el) => {
      el.addEventListener('change', (e) => {
        const settings = { ...notifSettings, [e.target.dataset.notif]: e.target.checked };
        StorageService.set('notifications', settings);
        if (e.target.dataset.notif === 'desktop' && e.target.checked) {
          Notification?.requestPermission();
        }
      });
    });
  }

  _renderVoice() {
    const voiceSettings = StorageService.get('voice') || { autoSend: false, language: 'en-US' };
    
    this._content.innerHTML = `
      <h2 class="section-title">Voice</h2>
      
      <div class="setting-group">
        <div class="setting-row">
          <div>
            <div class="setting-label">Auto-send after recording</div>
            <div class="setting-desc">Automatically send voice messages when you stop recording</div>
          </div>
          <label class="toggle">
            <input type="checkbox" data-voice="autoSend" ${voiceSettings.autoSend ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        
        <div class="setting-row">
          <div>
            <div class="setting-label">Voice language</div>
            <div class="setting-desc">Select the language for voice recognition</div>
          </div>
          <select class="custom-select" data-voice="language">
            <option value="en-US" ${voiceSettings.language === 'en-US' ? 'selected' : ''}>English (US)</option>
            <option value="en-GB" ${voiceSettings.language === 'en-GB' ? 'selected' : ''}>English (UK)</option>
            <option value="es-ES" ${voiceSettings.language === 'es-ES' ? 'selected' : ''}>Espa&ntilde;ol</option>
            <option value="fr-FR" ${voiceSettings.language === 'fr-FR' ? 'selected' : ''}>Fran&ccedil;ais</option>
            <option value="de-DE" ${voiceSettings.language === 'de-DE' ? 'selected' : ''}>Deutsch</option>
            <option value="ur-PK" ${voiceSettings.language === 'ur-PK' ? 'selected' : ''}>اردو</option>
          </select>
        </div>
      </div>
      
      <div class="setting-group">
        <div class="setting-label">Voice Input</div>
        <div class="setting-desc">Test your microphone</div>
        <button class="btn-primary" id="testMicBtn" style="margin-top:8px;">Test Microphone</button>
      </div>
    `;

    this._content.querySelectorAll('[data-voice]').forEach((el) => {
      el.addEventListener('change', (e) => {
        const settings = { ...voiceSettings, [e.target.dataset.voice]: e.target.value || e.target.checked };
        StorageService.set('voice', settings);
      });
    });

    this._content.querySelector('#testMicBtn')?.addEventListener('click', () => {
      bus.emit(EVENTS.UI.TOAST, { message: 'Microphone test started...', type: 'info' });
    });
  }

  _renderData() {
    this._content.innerHTML = `
      <h2 class="section-title">Data controls</h2>
      
      <div class="setting-group">
        <div class="setting-label">Export Data</div>
        <div class="setting-desc">Download all your conversations and data</div>
        <button class="btn-primary" data-action="export" style="margin-top:8px;">Export Data</button>
      </div>
      
      <div class="setting-group">
        <div class="setting-label">Clear All Data</div>
        <div class="setting-desc">Permanently delete all your conversations and data. This cannot be undone.</div>
        <button class="btn-danger" data-action="clear-data" style="margin-top:8px;">Clear Data</button>
      </div>
      
      <div class="setting-group">
        <div class="setting-label">Chat History</div>
        <div class="setting-desc">Control how long your chat history is stored</div>
        <div class="setting-row">
          <div class="setting-label">Retention period</div>
          <select class="custom-select" data-setting="retention">
            <option value="forever">Forever</option>
            <option value="1year">1 year</option>
            <option value="3months">3 months</option>
            <option value="1month">1 month</option>
          </select>
        </div>
      </div>
    `;

    this._content.querySelector('[data-action="export"]')?.addEventListener('click', () => {
      bus.emit(EVENTS.UI.TOAST, { message: 'Preparing export...', type: 'info' });
    });

    this._content.querySelector('[data-action="clear-data"]')?.addEventListener('click', () => {
      bus.emit(EVENTS.UI.MODAL_OPEN, {
        title: 'Clear All Data',
        message: 'This will permanently delete all your conversations. This action cannot be undone.',
        confirmText: 'Clear Data',
        onConfirm: () => {
          StorageService.clear();
          bus.emit(EVENTS.UI.TOAST, { message: 'All data cleared', type: 'success' });
        },
      });
    });
  }

  _renderAccount() {
    const user = AuthService.user;
    this._content.innerHTML = `
      <h2 class="section-title">Account</h2>
      
      <div class="profile-section">
        <div class="profile-avatar">${(user?.name || user?.email || 'G').charAt(0).toUpperCase()}</div>
        <div class="profile-info">
          <div class="profile-name">${user?.name || 'Guest User'}</div>
          <div class="profile-email">${user?.email || 'Not signed in'}</div>
          <div class="profile-plan">${user?.plan || 'Free'}</div>
        </div>
        <button class="btn-primary" data-action="edit-profile">Edit Profile</button>
      </div>
      
      <div class="setting-group">
        <div class="setting-label">Email</div>
        <div class="setting-desc">${user?.email || 'No email set'}</div>
      </div>
      
      <div class="setting-group">
        <div class="setting-label">Password</div>
        <div class="setting-desc">Last changed: Never</div>
        <button class="btn-primary" data-action="change-password" style="margin-top:8px;">Change Password</button>
      </div>
      
      <div class="setting-group">
        <div class="setting-label">Delete Account</div>
        <div class="setting-desc">Permanently delete your account and all associated data</div>
        <button class="btn-danger" data-action="delete-account" style="margin-top:8px;">Delete Account</button>
      </div>
    `;

    this._content.querySelector('[data-action="delete-account"]')?.addEventListener('click', () => {
      bus.emit(EVENTS.UI.MODAL_OPEN, {
        title: 'Delete Account',
        message: 'This will permanently delete your account and all data. This cannot be undone.',
        confirmText: 'Delete Account',
        onConfirm: () => {
          AuthService.logout();
          bus.emit(EVENTS.UI.TOAST, { message: 'Account deleted', type: 'success' });
        },
      });
    });
  }

  _handleMFA() {
    bus.emit(EVENTS.UI.TOAST, { message: 'MFA setup coming soon!', type: 'info' });
  }
}

customElements.define('settings-modal', SettingsModal);
