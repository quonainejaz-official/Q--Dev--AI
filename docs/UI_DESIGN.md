# UI Design — Q-Dev-AI

**Last updated:** 2026-07-22

Single-page app. View: `views/index.ejs` · Logic: `public/js/chat.js` (~2,400 lines) · Styles: `public/css/styles.css` (~2,100 lines, hand-written, no framework).

---

## 1. Layout

```
┌───────────────┬──────────────────────────────────────┐
│  SIDEBAR      │  HEADER (title • edit • Export PDF)   │
│  • Brand logo ├──────────────────────────────────────┤
│  • New chat   │                                        │
│  • Chat list  │   WELCOME SCREEN  /  MESSAGES          │
│    (Today)    │   (markdown + code highlight)          │
│               │   typing indicator                     │
│  • Account    ├──────────────────────────────────────┤
│    footer     │   COMPOSER (textarea + + menu + mic)   │
└───────────────┴──────────────────────────────────────┘
```

---

## 2. Components

### Sidebar
- Brand logo, **New chat** button.
- Chat history list grouped under "Today".
- Account footer: **Login/Sign-up** button ↔ account chip (avatar, name, email, logout) when authenticated.
- Mobile: collapsible with overlay; state persisted in `qai-sidebar-collapsed`.

### Main / Header
- Chat title with inline rename.
- **Export PDF** button (branded print-to-PDF).

### Messages area
- Welcome screen ("How can I help you?") when empty.
- Message bubbles (user/bot), markdown rendered, code syntax-highlighted (`highlightCode`).
- Typing indicator during streaming.

### Composer
- Auto-growing textarea (maxlength 50000).
- **"+" add menu:** photos/files, upload audio, create image.
- Attach buttons (file/image/audio), **mic** button (Web Speech API).
- Recording indicator ("Listening…" animation).
- Image-generation-mode banner (when in `/imagine` mode).
- Send button + disclaimer text.

### Modals / overlays
- **Image viewer** (copy / download / edit=regenerate).
- Generic **confirm** modal.
- **Auth modal** (login/signup tabs + Google button; only when `googleClientId` set).
- Toast notifications.

---

## 3. Styling

- Single hand-written `public/css/styles.css`.
- CSS variables, **dark theme**.
- Responsive `@media (max-width: 768px)` breakpoints (sidebar collapse, safe areas, viewport-height fixes, larger tap targets).
- Dedicated `@media print` block (~line 1922) for branded PDF export (running header/footer with logo, title, timestamp, footer `ai.qdevaol.site`).

---

## 4. Client State & Storage

| Key | Purpose |
|-----|---------|
| `qai-chat-history` | guest chat list (localStorage) |
| `qai-current-chat` | active chat id |
| `qai-sidebar-collapsed` | sidebar UI state |
| `window.__INITIAL_MESSAGES__` | server-injected initial messages |
| `window.__GOOGLE_CLIENT_ID__` | enables Google button when set |

---

## 5. Key UX Flows

- **Guest chat:** type → stream reply → auto-saved to localStorage.
- **Login → migration:** guest chats upserted to account, list refreshes.
- **Image gen:** `/imagine <prompt>` or menu → SVG rendered in viewer.
- **Voice:** mic → dictation fills textarea; `onend` auto-submits (async-safe).
- **PDF export:** header button builds print DOM → `window.print()`.

---

## 6. Upload Limits (enforced client-side, `chat.js`)

| Type | Max count | Max size |
|------|-----------|----------|
| Images | 5 | 5 MB |
| Videos | 3 | 50 MB |
| PDFs | 3 | 25 MB |
| Audio | 3 | 25 MB |

---

## 7. UI Improvement Ideas

- Light theme / theme toggle.
- Chat search & grouping beyond "Today".
- Better loading/skeleton states.
- Accessibility pass (ARIA, keyboard nav, focus traps in modals).
- See [IMPROVEMENTS.md](IMPROVEMENTS.md).
