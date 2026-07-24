/**
 * CanvasPanel — live HTML/CSS/JS preview panel (replaces old canvas.js).
 * <canvas-panel></canvas-panel>
 */
import { bus } from '../events/EventBus.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
  :host { display: none; flex-direction: column; border-left: 1px solid var(--border-color, #333); width: 40%; min-width: 300px; }
  :host(.open) { display: flex; }
  .header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px; border-bottom: 1px solid var(--border-color, #333);
    background: var(--sidebar-bg, #111127); font-size: 13px;
  }
  .header span { color: var(--text-primary, #e0e0e0); font-weight: 500; }
  .header-actions { display: flex; gap: 4px; }
  .header-actions button {
    background: none; border: none; cursor: pointer; padding: 4px;
    color: var(--text-muted, #888); border-radius: 4px; display: flex;
  }
  .header-actions button:hover { color: var(--text-primary, #e0e0e0); background: rgba(255,255,255,0.1); }
  .preview {
    flex: 1; background: #fff; border: none; width: 100%;
  }
</style>
<div class="header">
  <span>Preview</span>
  <div class="header-actions">
    <button class="refresh-btn" title="Refresh">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
    </button>
    <button class="close-btn" title="Close">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </div>
</div>
<iframe class="preview" sandbox="allow-scripts"></iframe>
`;

export class CanvasPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
    this._iframe = this.shadowRoot.querySelector('.preview');
  }

  connectedCallback() {
    this.shadowRoot.querySelector('.close-btn').addEventListener('click', () => this.close());
    this.shadowRoot.querySelector('.refresh-btn').addEventListener('click', () => this._refresh());
    bus.on('open-canvas', (detail) => this.open(detail.code, detail.language));
  }

  open(code, language = 'html') {
    this.classList.add('open');
    this._renderPreview(code, language);
  }

  close() {
    this.classList.remove('open');
    this._iframe.srcdoc = '';
  }

  _renderPreview(code, language) {
    let html = '';
    if (language === 'html' || language === 'svg') {
      html = code;
    } else if (language === 'css') {
      html = `<style>body{margin:0;padding:16px;}</style>${code}`;
    } else if (language === 'javascript') {
      html = `<body><script>try{${code}}catch(e){document.body.textContent=e}<\/script></body>`;
    } else {
      html = `<pre>${code}</pre>`;
    }
    this._iframe.srcdoc = html;
  }

  _refresh() {
    const src = this._iframe.srcdoc;
    this._iframe.srcdoc = '';
    requestAnimationFrame(() => { this._iframe.srcdoc = src; });
  }
}

customElements.define('canvas-panel', CanvasPanel);
