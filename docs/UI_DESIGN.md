# UI Design — Component Architecture

**Last updated:** 2026-07-24

## Problem
The original `chat.js` was a single 2,800+ line file handling everything — rendering, streaming, uploads, auth, storage, sidebar, image generation, speech, PDF export. This caused:
- Null-reference crashes killing the entire app (one missing element = nothing renders)
- Impossible to add new features safely
- AI context window overflow when editing

## Solution
Split into **9 focused JS modules** with clear responsibilities. Each module:
- Guards all DOM access with null checks
- Exports a simple `init()` function
- Uses a shared `app` state object (no globals)

---

## File Structure

```
public/js/
├── app.js          ~80 lines   Entry point, state, init orchestration
├── api.js          ~120 lines  All fetch/API calls with auth headers
├── utils.js        ~80 lines   showToast, showModal, DOM helpers
├── sidebar.js      ~250 lines  Sidebar toggle, history list, search, theme
├── chat.js         ~600 lines  Core chat: render messages, streaming, submit
├── media.js        ~350 lines  File uploads, image gen, image viewer
├── canvas.js       ~150 lines  Canvas/panel split view (editor + iframe)
├── auth.js         ~200 lines  Auth modal, login/register, Google auth
├── speech.js       ~100 lines  Speech recognition (Web Speech API)
└── pdf.js          ~100 lines  PDF export
```

**Total:** ~2,030 lines across 10 files (vs 2,444 in one file)

---

## Dependency Graph

```
index.ejs loads:
  ├── app.js        (type=module)
  │   ├── api.js
  │   ├── utils.js
  │   ├── sidebar.js
  │   ├── chat.js
  │   ├── media.js
  │   ├── canvas.js
  │   ├── auth.js
  │   ├── speech.js
  │   └── pdf.js
```

All files use ES module syntax (`import`/`export`). No bundler needed — browsers support `<script type="module">` natively.

---

## Module Responsibilities

### app.js — Entry Point
- Initializes shared `window.APP` state (user, chats, activeChat, theme)
- Calls `init()` on each module in order
- Handles global keyboard shortcuts
- Manages `localStorage` persistence (save/load state)

### api.js — API Client
- `api.get(path)`, `api.post(path, body)`, `api.put(path, body)`, `api.delete(path)`
- Auto-attaches JWT from cookie/localStorage
- Returns parsed JSON or throws structured errors
- Used by all other modules

### utils.js — Shared Utilities
- `showToast(message, type)` — toast notifications
- `showModal(title, message, onConfirm)` — confirmation dialog
- `hideModal()` — close modal
- `$id(id)` — shorthand for `document.getElementById`
- `$el(sel)` — shorthand for `document.querySelector`

### sidebar.js — Sidebar & Navigation
- Sidebar collapse/expand toggle
- Chat history list rendering with date grouping (Today/Yesterday/Earlier)
- Chat search bar (debounced, calls `GET /api/chats/search?q=...`)
- Theme toggle (light/dark, persisted in `localStorage`)
- New chat button
- Chat item actions (rename, delete, share)

### chat.js — Core Chat
- Message rendering (markdown, code blocks, syntax highlighting)
- Chat form submission
- SSE streaming parser
- Auto-scroll on new messages
- Message actions (copy, retry)
- Typing indicator
- Welcome screen show/hide

### media.js — Media & Image Generation
- File upload (drag & drop, file picker)
- Image preview bar
- Image generation mode toggle
- DALL-E / SVG generation
- Image viewer modal (copy, download, edit/regenerate)
- Audio attachments

### canvas.js — Canvas/Artifacts Panel
- Split-panel layout (editor + iframe preview)
- Code editor (textarea with syntax-aware features)
- Live iframe preview via `srcdoc`
- Canvas button on code blocks (HTML/CSS/JS only)
- Close/copy/run actions

### auth.js — Authentication
- Auth modal (login/register tabs)
- Email/password form handling
- Google OAuth integration
- Auth state (show/hide login button vs account chip)
- Logout

### speech.js — Voice Input
- Web Speech API recognition
- Recording indicator
- Auto-submit on silence

### pdf.js — PDF Export
- Build print-friendly document
- Trigger `window.print()` with `@media print` styles

---

## New HTML Elements Required (in index.ejs)

### Skip-to-content
```html
<a href="#messageInput" class="skip-to-content">Skip to content</a>
```

### Theme Toggle (in sidebar footer)
```html
<button id="themeToggle" class="theme-toggle-btn" title="Toggle theme">
  <svg><!-- sun/moon icon --></svg>
</button>
```

### Chat Search (in sidebar, above history)
```html
<div class="sidebar-search">
  <input id="chatSearchInput" type="text" placeholder="Search chats..." />
</div>
```

### Share Button (in chat header actions)
```html
<button id="shareBtn" class="header-action-btn" title="Share chat">
  <svg><!-- share icon --></svg>
</button>
```

### Canvas Panel (after chat area)
```html
<div id="canvasPanel" class="canvas-panel hidden">
  <div class="canvas-header">
    <span class="canvas-title">Canvas</span>
    <div class="canvas-actions">
      <button id="canvasCopyBtn" class="canvas-action-btn">Copy</button>
      <button id="canvasRunBtn" class="canvas-action-btn">Run</button>
      <button id="canvasCloseBtn" class="canvas-action-btn">&times;</button>
    </div>
  </div>
  <div class="canvas-body">
    <textarea id="canvasEditor" class="canvas-editor"></textarea>
    <iframe id="canvasPreview" class="canvas-preview"></iframe>
  </div>
</div>
```

### Agent Mode Toggle (in input area)
```html
<button id="agentToggle" class="agent-toggle-btn" title="Agent mode">
  <svg><!-- agent icon --></svg>
</button>
```

### Web Search Toggle (in input area)
```html
<button id="webSearchToggle" class="search-toggle-btn" title="Web search">
  <svg><!-- search icon --></svg>
</button>
```

---

## New CSS Required

### Light Theme Variables
```css
[data-theme="light"] {
  --sidebar-bg: #ffffff;
  --main-bg: #f7f7f8;
  --text-primary: #1a1a1a;
  --text-secondary: #6b6b6b;
  --border-color: #e5e5e5;
  --accent-blue: #2563eb;
  --hover-bg: #f0f0f0;
  --input-bg: #ffffff;
}
```

### Accessibility
```css
.skip-to-content { /* visually hidden, focusable */ }
*:focus-visible { /* outline ring */ }
@media (prefers-reduced-motion: reduce) { /* disable animations */ }
```

### Component Styles
- `.theme-toggle-btn` — toggle button in sidebar
- `.sidebar-search` — search input in sidebar
- `.canvas-panel` — split panel layout
- `.canvas-editor` — code editor textarea
- `.canvas-preview` — iframe preview
- `.agent-toggle-btn` — agent mode toggle
- `.search-toggle-btn` — web search toggle
- `.share-btn` — share button in header

---

## Migration Strategy

1. Create all new JS modules
2. Update `index.ejs` with new HTML elements + `<script type="module" src="/js/app.js">`
3. Remove old `<script src="/js/chat.js">` tag
4. Update `styles.css` with new component styles + light theme
5. Keep old `chat.js` as `chat.legacy.js` temporarily for reference
6. Test each module independently
7. Verify all 167 backend tests still pass

---

## Features Checklist

| Feature | Backend | UI Status |
|---------|---------|-----------|
| Theme toggle (light/dark) | — | TODO |
| Chat search + date grouping | `GET /api/chats/search` | TODO |
| Shareable chat links | `POST /api/chats/:id/share` | TODO |
| Canvas/Artifacts panel | — (client-side) | TODO |
| Agent mode toggle | `POST /api/chats` (with tools) | TODO |
| Web search toggle | `GET /api/search` | TODO |
| Skip-to-content | — | TODO |
| Focus-visible styles | — | TODO |
| Prefers-reduced-motion | — | TODO |
| Signed direct uploads | `POST /api/media/signed-url` | TODO |
| Image generation (DALL-E) | `POST /api/chats` | TODO |
| Speech recognition | — (Web Speech API) | TODO |
| PDF export | — (client-side) | TODO |
