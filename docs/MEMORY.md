# Project Memory — Q-Dev-AI

> **Running log of decisions, gotchas, and facts an AI assistant should know before working.**
> Read this first each session. Append new entries at the top of the relevant section with a date.

**Last updated:** 2026-07-23

---

## 🔑 Critical facts (read before coding)

- **AI providers (multi-provider, 3.4).** Providers are in `src/providers/{opencode,openai,anthropic,gemini}.js`. Registry in `registry.js` auto-registers based on env vars. Fallback priority: OpenCode → OpenAI → Anthropic → Gemini. Controller calls `registry.select()` / `registry.selectAll()`. Models: OpenCode (`big-pickle` text, `mimo-v2.5-free` vision), OpenAI (`gpt-4o`), Anthropic (`claude-sonnet-4-20250514`), Gemini (`gemini-2.0-flash`).
- **Identity is prompt-forced:** the model must always say it is "Q-Dev-AI by Quonain Ejaz", always claim video/PDF support, and never name the underlying vendor. Don't remove these system-prompt guards casually.
- **Streaming is SSE format** (`event:/data:` lines). Server emits `event: typing`, `event: start`, `event: chunk`, `event: done`, `event: error`, `event: image`. Client parses SSE via `startStreamEvent()` in `chat.js`. All providers use `BaseProvider.parseSSEStream()` for OpenAI-compatible SSE.
- **Provider abstraction layer** lives in `src/providers/` — `base.js` (BaseProvider), `opencode.js` (wraps OpenCode), `registry.js` (select with capability filters). Controller calls `registry.select()` / `registry.selectAll()`, not the service directly.
- **Soft deletes are active** — `Chat.deletedAt` field, pre-hook auto-filtering on find/findOne/findOneAndUpdate/countDocuments/aggregate. TTL index auto-removes soft-deleted chats after 30 days.
- **App degrades gracefully:** no `MONGODB_URI` → guest-only; no `GOOGLE_CLIENT_ID` → no Google button; no Cloudinary → media offload disabled.
- **Serverless (Vercel):** all traffic → `api/index.js` → `src/app.js`. No persistent memory between invocations; Mongo connection cached in `db.js` (which also overrides DNS).
- **Auth = JWT cookie `qai_token`** (7d, httpOnly, min 16 chars secret). No insecure fallback — env validation enforces `JWT_SECRET` in prod.

---

## 🧭 Where things live

- Chat AI: `src/providers/{opencode,openai,anthropic,gemini}.js` · Image gen: `src/services/imageGenService.js`
- Provider layer: `src/providers/{base,registry}.js`
- Prompt builder: `src/prompt/{promptBuilder.js,layers/{system,recent,summary,memory}.js}`
- Context management: `src/context/contextManager.js`
- Model router: `src/router/modelRouter.js`
- Controllers: `src/controllers/{auth,chat,chats,page,health}Controller.js`
- Models: `src/models/User.js`, `src/models/Chat.js`, `src/models/Message.js`
- Frontend: `views/index.ejs`, `public/js/chat.js` (~2,400 lines), `public/css/styles.css` (~2,100 lines)
- Validation/prompt utils: `src/utils/{messageUtils,mediaValidation}.js`
- Security: `src/middlewares/{auth,errorHandler,rateLimiter}.js`, `src/config/env.js`
- Health: `src/controllers/healthController.js`, `src/routes/health.js`

---

## ⚠️ Gotchas

- README is **outdated** — mentions `/api/stream` SSE and HF branding. Trust `docs/` over README.
- `GET/PUT/DELETE /api/history` are **stubs**; real history is `/api/chats` (Mongo) + localStorage (guest).
- Guest chats migrate on login via **upsert by `clientId`** — safe to re-run.
- Media is offloaded to Cloudinary and stored as URLs, not base64, in Mongo.
- Server writes SSE format (`event:/data:`), not NDJSON. Tests parse SSE via helper `parseSSE()`.
- `OPENCODE_API_KEY` is no longer required — at least one provider key must be set (OPENCODE, OPENAI, ANTHROPIC, or GEMINI).

---

## 📜 Decision log

- **2026-07-22 (session 3)** — Phase 2 architecture work: provider abstraction, SSE streaming, health endpoints, token accounting, cursor pagination, soft deletes, TTL indexes. 65 tests passing.
- **2026-07-22 (session 2)** — Real token streaming wired, test suite added (62 tests), `docs/` knowledge base created.
- (from git history) PDF export with branded header/footer added.
- (from git history) User accounts (email + Google) + MongoDB sync + Cloudinary added.
- (from git history) Mobile responsiveness fixes (viewport height, padding, safe areas, tap targets).
- (from git history) Voice `onend` uses `submitMessage()` (async-safe); `stopRecording` uses `sendButton.click()` (user-initiated).

---

## 📝 Session notes (append below)

### 2026-07-23 (session 4)
- **Phase 4 COMPLETED**: 4.2 web search, 4.3 vision standardization, 4.4 real image gen (DALL-E 3), 4.6 canvas/artifacts, 4.7 agent mode, 4.9 reasoning mode.
- **IMPROVEMENTS completed**: #10 accessibility, #13 light theme + toggle, #14 chat search + date grouping, #15 shareable read-only chat links, #17 PWA/installable.
- **3.6 Signed direct uploads**: `generateSignedUploadUrl` in `cloudinaryService.js`, `POST /api/media/signed-url` endpoint for client-to-Cloudinary direct uploads.
- **Tests**: 167 total across 14 test suites.
- **New files this session**: `src/services/searchService.js`, `src/controllers/searchController.js`, `src/controllers/shareController.js`, `src/routes/search.js`, `src/utils/mediaNormalizer.js`, `src/utils/reasoningDetector.js`, `src/agent/tools.js`, `src/agent/agentLoop.js`, `src/controllers/searchChatsController.js`, `public/manifest.json`, `public/sw.js`, `public/icons/`, `views/shared.ejs`
- **Next**: #7 split chat.js, #8 split styles.css, #12 Cloudinary graceful fallback

### 2026-07-22 (session 3)
- **Phase 3 completed**: 3.1 context management, 3.3 prompt builder, 3.4 multi-provider (OpenAI/Anthropic/Gemini), 3.7 model routing, 3.8 conversation storage redesign.
- **New files**: `src/context/contextManager.js`, `src/prompt/promptBuilder.js`, `src/prompt/layers/{system,recent,summary,memory}.js`, `src/router/modelRouter.js`, `src/models/Message.js`, `src/scripts/migrate-messages.js`
- **Tests**: 96 total across 8 test suites.
- **Next**: Phase 4 — 4.2 web search, 4.3 vision standardization, or 3.2 memory system (needs Atlas Vector Search).
- **Deferred**: Redis (caching/queue), memory system (Vector Search), tool calling (Phase 4), signed uploads.

### 2026-07-22 (session 2)
- **Real token streaming wired**: `opencodeService.js` streams SSE deltas from OpenCode Zen; `chatController.js` forwards chunks as newline-delimited JSON. Replaces fake client-side word-by-word typing.
- **Test suite added**: 62 tests across 5 files — `auth.test.js` (register/login/google/logout/me/middleware), `chats.test.js` (CRUD + migration), `chatController.test.js` (history stubs, image gen endpoint, message streaming), `imageGen.test.js` (SVG generation, API errors, auth headers), `messageUtils.test.js` (existing). All models and external services fully mocked. CI runs `npm test` on Node 18/20/22.
