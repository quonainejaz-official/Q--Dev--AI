/**
 * MarkdownRenderer — renders markdown text to HTML and injects <code-block> components.
 * <markdown-renderer content="..."></markdown-renderer>
 */
import { renderMarkdown } from '../utils/markdown.js';
import { escapeHtml } from '../utils/dom.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `<style>:host { display: block; } .content { word-wrap: break-word; } .content a { color: var(--accent-color, #6c63ff); }</style><div class="content"></div>`;

export class MarkdownRenderer extends HTMLElement {
  static get observedAttributes() { return ['content']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
    this._div = this.shadowRoot.querySelector('.content');
  }

  connectedCallback() { this._render(); }
  attributeChangedCallback() { this._render(); }

  set content(val) { this.setAttribute('content', val); }
  get content() { return this.getAttribute('content'); }

  _render() {
    const raw = this.getAttribute('content') || '';
    this._div.innerHTML = renderMarkdown(raw);
    // Convert code-block divs to custom elements
    this._div.querySelectorAll('.code-block').forEach((block) => {
      const cb = document.createElement('code-block');
      cb.setAttribute('language', block.dataset.language || 'plaintext');
      cb.setAttribute('raw', block.dataset.raw || '');
      cb.setAttribute('code', block.dataset.raw || '');
      block.replaceWith(cb);
    });
  }
}

customElements.define('markdown-renderer', MarkdownRenderer);
