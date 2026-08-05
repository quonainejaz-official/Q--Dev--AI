/**
 * pages/chat.js — page boot file. Coexists with old app.js.
 *
 * This file ONLY:
 * 1. Registers new Web Components (they render in shadow DOM, no conflict)
 * 2. Wires up share button to <share-modal>
 * 3. Wires up login button to <auth-modal> when old auth modal is hidden
 * 4. Does NOT touch any old app.js logic
 */

// ── Store reducers ───────────────────────────────────────────────────
import '../store/reducers.js';

// ── Web Components (importing registers them) ────────────────────────
import '../components/ToastNotification.js';
import '../components/TypingIndicator.js';
import '../components/ThemeToggle.js';
import '../components/Loader.js';
import '../components/CodeBlock.js';
import '../components/MarkdownRenderer.js';
import '../components/ChatMessage.js';
import '../components/ConversationItem.js';
import '../components/ConversationList.js';
import '../components/ChatInput.js';
import '../components/ConfirmModal.js';
import '../components/PromptSuggestions.js';
import '../components/ChatWindow.js';
import '../components/Sidebar.js';
import '../components/CanvasPanel.js';
import '../components/AuthModal.js';
import '../components/ProfileMenu.js';
import '../components/SettingsModal.js';
import '../components/ShareModal.js';

// ── Services ─────────────────────────────────────────────────────────
import { ThemeService } from '../services/ThemeService.js';
import { AppearanceService } from '../services/AppearanceService.js';
import { AuthService } from '../services/AuthService.js';
import { store } from '../store/Store.js';
import { bus } from '../events/EventBus.js';
import { EVENTS } from '../events/events.js';

// ── Initialize ───────────────────────────────────────────────────────
function init() {
  try {
    // 1. Theme
    ThemeService.init();
    AppearanceService.init();

    // 2. Auth session restore
    AuthService.init();

    // 3. Wire up share button → share-modal
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        const shareModal = document.querySelector('share-modal');
        if (!shareModal) return;
        const convId = window.__getCurrentChatId?.();
        if (convId) {
          shareModal.open(convId);
        } else {
          bus.emit(EVENTS.UI.TOAST, { message: 'Start a chat first to share', type: 'info' });
        }
      });
    }

    // 4. Wire up login button → old auth modal (let old app.js handle it)
    // We DON'T override the login button — old app.js handles it

    // 5. Wire up settings events from profile-menu
    bus.on(EVENTS.UI.SETTINGS_OPEN, (detail) => {
      const modal = document.querySelector('settings-modal');
      if (modal) modal.open(detail?.tab || 'general');
    });

    console.log('[Q] pages/chat.js initialized');
  } catch (err) {
    console.error('[Q] pages/chat.js init error:', err);
  }
}

// Run on DOM ready — but DON'T block if old app.js is already running
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
