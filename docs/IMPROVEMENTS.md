# Improvements & Tech Debt — Q-Dev-AI

**Last updated:** 2026-07-22

Ideas to make the codebase better (quality, performance, security, maintainability). Ranked roughly by value.

---

## High value

1. ~~**Wire real token streaming**~~ — ✅ Done. Real SSE/chunked streaming from OpenCode Zen. (`opencodeService.js`, `chatController.js`)
2. ~~**Add tests**~~ — ✅ Done. 62 tests covering controllers, auth flow, chats CRUD/migration, image gen. CI runs `npm test` on Node 18/20/22. (`tests/`)
3. **Server-side upload limits** — enforce body/file size on the server, not just `chat.js`. Add `express.json({ limit })` and per-type checks.
4. **Shared rate-limit store** — `express-rate-limit` per-instance is inaccurate in serverless; back it with Redis/Mongo or an edge limiter.
5. **Secrets & config hygiene** — validate required env at boot, fail fast with clear messages; document every var in `.env.example` + [SETUP.md](SETUP.md).

## Medium value

6. **Retire legacy** — delete unused `huggingFaceService.js`, rename package `hf-chatbot` → `q-dev-ai`, rewrite README to match reality.
7. **Split `chat.js`** — ~2,400 lines in one file; modularize (rendering, streaming, uploads, auth, storage) for maintainability. Consider a light build step.
8. **Split `styles.css`** — ~2,100 lines; break into logical partials.
9. **DB indexes** — add compound `{ userId, updatedAt }` for chat listing; review query patterns.
10. **Accessibility** — focus traps in modals, ARIA roles, keyboard navigation, prefers-reduced-motion.
11. **Error observability** — structured logging + error reporting (Sentry-style) beyond `morgan`.
12. **Graceful Cloudinary fallback** — clear behavior/tests when Cloudinary is unavailable.

## Lower value / polish

13. **Light theme + toggle** (persist preference).
14. **Chat search & better grouping** (Today / Yesterday / dates).
15. **Shareable read-only chat links.**
16. **Soft-delete + trash** for chats.
17. **PWA / installable** for mobile.
18. **i18n** — the app has bilingual (English/Urdu) users; consider localization.

---

## Security checklist to revisit
- httpOnly + Secure + SameSite on `qai_token` cookie (verify in prod).
- Ensure `JWT_SECRET` is a strong value in prod (dev fallback exists).
- Sanitize/validate all AI inputs (partly done via `messageUtils`).
- Verify Google ID-token audience matches `GOOGLE_CLIENT_ID`.
- Never log secrets or full base64 media.
- Consider CSP headers for the served page.
