/**
 * PromptSuggestions — welcome screen with clickable prompt cards.
 * <prompt-suggestions></prompt-suggestions>
 */
import { bus } from '../events/EventBus.js';
import { EVENTS } from '../events/events.js';

const SUGGESTIONS = [
  { icon: '💡', title: 'Explain a concept', prompt: 'Explain how async/await works in JavaScript' },
  { icon: '🛠️', title: 'Write code', prompt: 'Write a REST API with Express.js and MongoDB' },
  { icon: '🎨', title: 'Debug an issue', prompt: 'Help me debug this TypeError in my React component' },
  { icon: '📊', title: 'Analyze data', prompt: 'Help me analyze this CSV data and find trends' },
  { icon: '🚀', title: 'Deploy something', prompt: 'Help me deploy my Next.js app to Vercel' },
  { icon: '🔒', title: 'Security review', prompt: 'Review my authentication code for security issues' },
];

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
  :host { display: flex; flex-direction: column; align-items: center; justify-content: center;
    flex: 1; padding: 40px 16px; }
  .title { font-size: 22px; font-weight: 600; color: var(--text-primary, #e0e0e0);
    margin-bottom: 6px; }
  .subtitle { font-size: 14px; color: var(--text-muted, #888); margin-bottom: 28px; }
  .grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px; width: 100%; max-width: 700px;
  }
  .card {
    padding: 16px; border-radius: 12px; cursor: pointer;
    background: var(--card-bg, rgba(255,255,255,0.05));
    border: 1px solid var(--border-color, #333);
    transition: border-color 0.2s, background 0.2s;
  }
  .card:hover {
    border-color: var(--accent-color, #6c63ff);
    background: rgba(108,99,255,0.08);
  }
  .card-icon { font-size: 24px; margin-bottom: 8px; }
  .card-title { font-size: 13px; font-weight: 500; color: var(--text-primary, #e0e0e0); }
</style>
<div class="title">What can I help with?</div>
<div class="subtitle">Choose a prompt or type your own below</div>
<div class="grid">
  ${SUGGESTIONS.map((s) => `
    <div class="card" data-prompt="${s.prompt}">
      <div class="card-icon">${s.icon}</div>
      <div class="card-title">${s.title}</div>
    </div>
  `).join('')}
</div>
`;

export class PromptSuggestions extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
  }

  connectedCallback() {
    this.shadowRoot.querySelectorAll('.card').forEach((card) => {
      card.addEventListener('click', () => {
        const prompt = card.dataset.prompt;
        bus.emit(EVENTS.MESSAGE.SEND, { content: prompt, media: [] });
      });
    });
  }

  hide() { this.classList.add('hidden'); }
  show() { this.classList.remove('hidden'); }
}

customElements.define('prompt-suggestions', PromptSuggestions);
