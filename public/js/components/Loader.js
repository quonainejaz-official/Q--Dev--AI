/**
 * Loader — spinner overlay.
 * <app-loader></app-loader>
 * Set `.active` class to show, remove to hide.
 */
const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
  :host { display: none; position: fixed; inset: 0; z-index: 9999;
    background: rgba(0,0,0,0.4); align-items: center; justify-content: center; }
  :host(.active) { display: flex; }
  .spinner {
    width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.2);
    border-top-color: #fff; border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
<div class="spinner"></div>
`;

export class AppLoader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
  }

  show() { this.classList.add('active'); }
  hide() { this.classList.remove('active'); }
}

customElements.define('app-loader', AppLoader);
