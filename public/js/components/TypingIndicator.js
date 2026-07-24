/**
 * TypingIndicator — animated dots shown while AI is generating.
 * <typing-indicator></typing-indicator>
 */
const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
  :host { display: none; padding: 8px 16px; }
  :host(.active) { display: block; }
  .dots { display: flex; gap: 4px; padding: 8px 12px; }
  .dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--text-muted, #888);
    animation: bounce 1.4s infinite ease-in-out;
  }
  .dot:nth-child(2) { animation-delay: 0.16s; }
  .dot:nth-child(3) { animation-delay: 0.32s; }
  @keyframes bounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
    40% { transform: translateY(-6px); opacity: 1; }
  }
</style>
<div class="dots">
  <div class="dot"></div>
  <div class="dot"></div>
  <div class="dot"></div>
</div>
`;

export class TypingIndicator extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
  }

  show() { this.classList.add('active'); }
  hide() { this.classList.remove('active'); }
}

customElements.define('typing-indicator', TypingIndicator);
