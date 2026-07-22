# Implementation Plan — Q-Dev-AI

**Last updated:** 2026-07-22 · Legend: ✅ done · 🟡 partial · ⬜ not started

---

## Phase 1 — Core Chat (✅ Done)
- ✅ Express + EJS app scaffold, Vercel serverless deploy
- ✅ Text chat via AI provider (now OpenCode Zen `mimo-v2.5-free`)
- ✅ Word-by-word pseudo-streaming responses
- ✅ Markdown rendering + code syntax highlighting
- ✅ Input validation, sanitization, rate limiting (30/min)

## Phase 2 — Multimodal (✅ Done)
- ✅ Image upload & vision
- ✅ Audio upload (input_audio)
- ✅ Video (sent as image frames)
- ✅ PDF upload + server-side text extraction (`pdf-parse`)
- ✅ Client-side upload limits & validation

## Phase 3 — Image Generation (✅ Done)
- ✅ `/imagine` command + "Create image" menu
- ✅ SVG generation → data URL
- ✅ Image viewer (copy / download / regenerate)
- ⬜ Raster (PNG) image generation

## Phase 4 — Accounts & Sync (✅ Done)
- ✅ Email/password register + login (bcrypt)
- ✅ Google Sign-In (google-auth-library)
- ✅ JWT httpOnly cookie session (30-day)
- ✅ MongoDB Chat persistence per user
- ✅ Cloudinary media offloading
- ✅ Guest → account migration (upsert by clientId)

## Phase 5 — UX Polish (✅ Done)
- ✅ Mobile responsiveness (sidebar collapse, safe areas, viewport fix)
- ✅ Voice input (Web Speech API) with auto-submit
- ✅ Branded PDF export (header/footer/logo)
- ✅ Chat rename / switch / delete

---

## Phase 6 — Hardening & Cleanup (🟡 In progress / next)
- ⬜ Remove/retire unused `huggingFaceService.js`; rename package from `hf-chatbot`
- ⬜ Update README (references outdated `/api/stream` SSE API)
- 🟡 Test coverage — only `messageUtils.test.js` exists; add controller/service tests
- ⬜ True token streaming (replace client-side simulated streaming)
- ⬜ Centralize/config-check secrets; document all env vars (see [SETUP.md](SETUP.md))
- ⬜ Error observability / logging beyond `morgan`

## Phase 7 — Feature Backlog (⬜ Planned)
See [MISSING_FEATURES.md](MISSING_FEATURES.md) and [IMPROVEMENTS.md](IMPROVEMENTS.md):
- ⬜ Light theme / theme toggle
- ⬜ Chat search
- ⬜ Shareable chat links
- ⬜ Signup nudge for guests
- ⬜ Accessibility pass

---

## How to use this file
When you finish a task, tick its box and add a note in [MEMORY.md](MEMORY.md). If you start a new area of work, add a phase/section so progress stays trackable.
