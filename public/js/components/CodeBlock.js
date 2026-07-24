/**
 * CodeBlock — renders a code block with copy button and live preview.
 * <code-block language="js" code="..." raw="..."></code-block>
 */
import { copyToClipboard } from '../utils/clipboard.js';
import { escapeHtml } from '../utils/dom.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
  :host { display: block; margin: 8px 0; }
  .code-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 6px 12px; background: var(--code-header-bg, #1a1a2e);
    border-radius: 8px 8px 0 0; font-size: 12px;
  }
  .code-lang { color: var(--text-muted, #888); text-transform: uppercase; letter-spacing: 0.5px; }
  .code-actions { display: flex; gap: 6px; }
  .code-actions button {
    background: none; border: none; cursor: pointer;
    color: var(--text-muted, #888); padding: 2px 4px; border-radius: 4px;
    display: flex; align-items: center; transition: color 0.15s, background 0.15s;
  }
  .code-actions button:hover { color: var(--text-primary, #e0e0e0); background: rgba(255,255,255,0.1); }
  pre {
    margin: 0; padding: 16px; overflow-x: auto;
    background: var(--code-bg, #0d1117); border-radius: 0 0 8px 8px;
    font-size: 13px; line-height: 1.5;
  }
  code { font-family: 'SF Mono', 'Fira Code', monospace; color: var(--text-primary, #e0e0e0); }
  .preview-frame {
    width: 100%; min-height: 200px; border: 1px solid var(--border-color, #333);
    border-radius: 0 0 8px 8px; background: #fff;
  }
  :host(.preview-mode) pre { display: none; }
  :host(:not(.preview-mode)) .preview-frame { display: none; }
</style>
<div class="code-header">
  <span class="code-lang"></span>
  <div class="code-actions">
    <button class="copy-btn" title="Copy code">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
    </button>
    <button class="preview-btn" title="Toggle preview">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
    </button>
    <button class="canvas-btn" title="Open in Canvas">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>
    </button>
  </div>
</div>
<pre><code></code></pre>
<iframe class="preview-frame" sandbox="allow-scripts"></iframe>
`;

export class CodeBlock extends HTMLElement {
  static get observedAttributes() { return ['language', 'code', 'raw', 'preview-mode']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
    this._previewMode = false;
  }

  connectedCallback() {
    this.shadowRoot.querySelector('.copy-btn').addEventListener('click', () => {
      copyToClipboard(this.getAttribute('raw') || this._code);
    });
    this.shadowRoot.querySelector('.preview-btn').addEventListener('click', () => this._togglePreview());
    this.shadowRoot.querySelector('.canvas-btn').addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('open-canvas', {
        detail: { code: this.getAttribute('raw'), language: this.getAttribute('language') },
      }));
    });
    this._render();
  }

  attributeChangedCallback() { this._render(); }

  _render() {
    const lang = this.getAttribute('language') || 'plaintext';
    const raw = this.getAttribute('raw') || this.getAttribute('code') || '';
    this._code = raw;
    this.shadowRoot.querySelector('.code-lang').textContent = lang;
    this.shadowRoot.querySelector('code').textContent = raw;
    this._updatePreview();
  }

  _togglePreview() {
    this._previewMode = !this._previewMode;
    this.shadowRoot.host.classList.toggle('preview-mode', this._previewMode);
    if (this._previewMode) this._updatePreview();
  }

  _updatePreview() {
    const iframe = this.shadowRoot.querySelector('.preview-frame');
    const raw = this._code;
    const lang = this.getAttribute('language') || '';
    if (lang === 'html' || lang === 'svg') {
      iframe.srcdoc = raw;
    } else if (lang === 'css') {
      iframe.srcdoc = `<style>body{margin:0;padding:16px;}</style>${raw}`;
    } else if (lang === 'javascript') {
      iframe.srcdoc = `<body><script>try{${raw}}catch(e){document.body.textContent=e}<\/script></body>`;
    }
  }
}

customElements.define('code-block', CodeBlock);
