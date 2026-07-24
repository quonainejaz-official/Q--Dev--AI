# Improvements & Tech Debt — Q-Dev-AI

**Last updated:** 2026-07-23

Ideas to make the codebase better (quality, performance, security, maintainability). Ranked roughly by value.

---

## High value

1. ~~**Wire real token streaming**~~ — ✅ Done. Real SSE/chunked streaming from OpenCode Zen. (`opencodeService.js`, `chatController.js`)
2. ~~**Add tests**~~ — ✅ Done. 167 tests across 14 suites. CI runs `npm test` on Node 18/20/22. (`tests/`)
3. ~~**Server-side upload limits**~~ — ✅ Done. Server-side body/file validation via `mediaValidation.js` + `MAX_BODY_SIZE` env. (`src/utils/mediaValidation.js`)
4. ~~**Shared rate-limit store**~~ — ✅ Done. Backed with `rate-limit-mongo`; falls back to in-memory for guest mode. Auth + chats limiters added. (`src/middlewares/rateLimiter.js`)
5. ~~**Secrets & config hygiene**~~ — ✅ Done. Boot-time env validation (`src/config/env.js`), fails fast in prod. JWT secret hardened (no fallback, min 16 chars). `.env.example` updated.

## Medium value

6. ~~**Retire legacy**~~ — ✅ Done. `huggingFaceService.js` + `sessionService.js` deleted. Dead exports removed (`buildChatMessages`, `buildConversationInput`, `generateVisionReply`). `express-session` dep removed.
7. **Split `chat.js`** — ~2,600 lines in one file; modularize (rendering, streaming, uploads, auth, storage) for maintainability.
8. **Split `styles.css`** — ~2,200 lines; break into logical partials.
9. ~~**DB indexes**~~ — ✅ Done. Compound `{ userId, updatedAt }` indexes added. Sparse unique `clientId` index. TTL index on `deletedAt` for auto-cleanup. (`src/models/Chat.js`)
10. ~~**Accessibility**~~ — ✅ Done. Skip-to-content link, focus-visible styles, prefers-reduced-motion, ARIA labels on key elements.
11. ~~**Error observability**~~ — ✅ Done. Request IDs (`crypto.randomUUID()`), `X-Request-Id` header propagation, structured error handler hides internals in prod. Health endpoints (`/healthz`, `/readyz`). (`src/middlewares/errorHandler.js`, `src/controllers/healthController.js`)
12. **Graceful Cloudinary fallback** — clear behavior/tests when Cloudinary is unavailable.

## Lower value / polish

13. ~~**Light theme + toggle**~~ — ✅ Done. Full light theme CSS, toggle button in sidebar, persisted in localStorage.
14. ~~**Chat search & better grouping**~~ — ✅ Done. Backend search endpoint (`/api/chats/search`), client search bar, date grouping (Today/Yesterday/Earlier).
15. ~~**Shareable read-only chat links.**~~ — ✅ Done. `shareId`/`sharedAt` on Chat, share toggle endpoint, public shared view route, client share button with copy-to-clipboard.
16. ~~**Soft-delete + trash** for chats~~ — ✅ Done. `chat.softDelete()`, `chat.restore()`, pre-hook auto-filtering on all query methods. TTL auto-cleanup after 30 days. (`src/models/Chat.js`)
17. ~~**PWA / installable** for mobile.~~ — ✅ Done. Web manifest, service worker (stale-while-revalidate), install prompt, PWA meta tags.
18. **i18n** — the app has bilingual (English/Urdu) users; consider localization.

## Phase 4 — AI platform features ✅ Done (2026-07-23)

19. ~~**Web search**~~ — ✅ Done. Brave Search API integration, client-side toggle, search-before-send. (`src/services/searchService.js`, `src/controllers/searchController.js`)
20. ~~**Vision standardization**~~ — ✅ Done. Normalized media across providers (OpenAI/Anthropic/Gemini format adapters). (`src/utils/mediaNormalizer.js`)
21. ~~**Reasoning mode**~~ — ✅ Done. Pattern-based complexity detection, routes to reasoning models. (`src/utils/reasoningDetector.js`)
22. ~~**Real image generation**~~ — ✅ Done. DALL-E 3 via OpenAI, falls back to SVG generation. (`src/services/imageGenService.js`)
23. ~~**Canvas/Artifacts**~~ — ✅ Done. Split-panel sandbox with code editor + live iframe preview. "Canvas" button on HTML/CSS/JS code blocks. (`public/js/chat.js`, `public/css/styles.css`)
24. ~~**Agent mode**~~ — ✅ Done. Tool calling framework with 5 tools (web_search, read_file, write_file, list_files, run_code). Agent loop with OpenAI/Anthropic function calling. (`src/agent/tools.js`, `src/agent/agentLoop.js`)

## Phase 4 — Deferred items

25. **Long-term memory** (4.1) — needs MongoDB Atlas Vector Search setup.
26. **Voice** (4.5) — STT (Whisper) + TTS. Complex, latency-sensitive.
27. **Citations** (4.8) — track source spans through retrieval → render inline.
28. **Planning mode** (4.10) — multi-step plan → execute tools → verify.
29. **Multi-agent workflows** (4.11) — orchestrator + specialized agents; high risk/effort.

---

## Security checklist to revisit
- ~~httpOnly + Secure + SameSite on `qai_token` cookie~~ — ✅ verified.
- ~~Ensure `JWT_SECRET` is a strong value in prod~~ — ✅ env validation refuses boot if missing in prod; min 16 chars enforced.
- Sanitize/validate all AI inputs (partly done via `messageUtils`).
- ~~Verify Google ID-token audience matches `GOOGLE_CLIENT_ID`~~ — ✅ in auth middleware.
- Never log secrets or full base64 media.
- ~~Consider CSP headers for the served page~~ — ✅ Helmet CSP in production (Google Auth + Cloudinary allowed).
