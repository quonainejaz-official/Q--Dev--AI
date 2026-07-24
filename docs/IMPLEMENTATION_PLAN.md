# Implementation Plan — Q-Dev-AI

**Last updated:** 2026-07-23 · Legend: ✅ done · 🟡 partial · ⬜ not started

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

## Phase 6 — Hardening & Cleanup (✅ Done)
- ✅ True token streaming — SSE/chunked streaming from OpenCode Zen (`opencodeService.js`, `chatController.js`)
- ✅ Test coverage — 96 tests across auth, chats CRUD/migration, chat controller, image gen, messageUtils, providers, prompt builder, model router (`tests/`)
- ✅ Remove/retire unused `huggingFaceService.js` + `sessionService.js` + dead exports; `express-session` dep removed
- ✅ Error observability — request IDs, structured error handler, `X-Request-Id` header, health endpoints
- ✅ Server-side media validation + body size limits (`mediaValidation.js`, `MAX_BODY_SIZE` env)
- ✅ Rate-limit coverage — auth + chats limiters, backed by `rate-limit-mongo`
- ✅ Env validation at boot (`src/config/env.js`), JWT secret hardened
- ✅ Security headers — Helmet + CSP (production), `express-mongo-sanitize`, ObjectId validation
- ✅ XSS protection — DOMPurify on client-side markdown rendering
- ⬜ Update README (references outdated `/api/stream` SSE API)

## Phase 7 — Scalable Backend (✅ Done)
- ✅ Provider abstraction layer (`src/providers/base.js`, `opencode.js`, `registry.js`)
- ✅ Cross-provider fallback (registry `selectAll()` with capability filters)
- ✅ SSE streaming standardization (`event:/data:` format, client parser updated)
- ✅ Health endpoints (`/healthz`, `/readyz` checking DB + providers)
- ✅ Token accounting (`usage` with tokensIn/tokensOut/model on `done` event)
- ✅ Database indexing (compound indexes, sparse unique clientId)
- ✅ Chat schema enhancements (token fields, deletedAt, messageCount)
- ✅ Cursor-based pagination (`?cursor=<ISO date>&limit=<n>`)
- ✅ Soft deletes + TTL auto-cleanup (30 days)
- ⬜ Queue/background workers (deferred — needs Redis + separate service)
- ⬜ Caching strategy (deferred — needs Redis)

## Phase 8 — AI Architecture (✅ Done)
- ✅ Multi-provider AI layer (OpenAI, Anthropic, Gemini + OpenCode)
- ✅ Context management (`src/context/contextManager.js`)
- ✅ Prompt builder (layered pipeline with token budgeting)
- ✅ Model routing (cost-tier heuristic routing)
- ✅ Conversation storage redesign (Message collection split from Chat)
- ⬜ Memory system (deferred — needs MongoDB Atlas Vector Search)
- ⬜ Tool calling framework (design done, implement in Phase 4)
- ⬜ Signed direct uploads (deferred)

## Phase 8 — Feature Backlog (⬜ Planned)
See [MISSING_FEATURES.md](MISSING_FEATURES.md) and [IMPROVEMENTS.md](IMPROVEMENTS.md):
- ⬜ Light theme / theme toggle
- ⬜ Chat search
- ⬜ Shareable chat links
- ⬜ Signup nudge for guests
- ⬜ Accessibility pass

---

## How to use this file
When you finish a task, tick its box and add a note in [MEMORY.md](MEMORY.md). If you start a new area of work, add a phase/section so progress stays trackable.
