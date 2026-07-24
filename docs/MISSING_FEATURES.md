# Missing Features & Known Gaps — Q-Dev-AI

**Last updated:** 2026-07-23

Things not yet built or only partially working. Remove items as they're completed and note in [MEMORY.md](MEMORY.md).

---

## Functional gaps

| # | Gap | Impact | Notes |
|---|-----|--------|-------|
| M1 | ~~**True token streaming**~~ | ~~Medium~~ | ✅ Done — responses are real SSE/chunked streamed from OpenCode Zen. |
| M2 | **Raster image generation** | Medium | Only SVG output. No PNG/photo-realistic generation. |
| M3 | **History API endpoints are stubs** | Low | `GET/PUT/DELETE /api/history` return empty/no-op; real history is `/api/chats` + localStorage. Either wire up or remove. |
| M4 | **Chat search / filtering** | Medium | Chat list only groups under "Today"; no search, no date grouping. |
| M5 | **Shareable / public chat links** | Low | No way to share a conversation. |
| M6 | **Account linking** | Low | Email + Google accounts with same email may not merge/link cleanly — verify behavior. |
| M7 | **Guest signup nudge** | Low | No prompt encouraging guests to create an account. |
| M8 | **Light theme / theme toggle** | Low | Dark theme only. |

---

## Technical / robustness gaps

| # | Gap | Impact | Notes |
|---|-----|--------|-------|
| T1 | ~~**Test coverage**~~ | ~~High~~ | ✅ Done — 96 tests: auth flow, chats CRUD/migration, chat controller, image gen, messageUtils, providers, prompt builder, model router. CI runs `npm test` on Node 18/20/22. |
| T2 | ~~**Unused legacy code**~~ | ~~Low~~ | ✅ Done — `huggingFaceService.js` + `sessionService.js` deleted; dead exports removed; `express-session` dep removed. README still needs update. |
| T3 | ~~**No soft-delete**~~ | ~~Low~~ | ✅ Done — `chat.softDelete()`, `chat.restore()`, pre-hook auto-filtering, TTL index auto-cleanup after 30 days. (`src/models/Chat.js`) |
| T4 | **Cloudinary failure handling** | Medium | Verify behavior when Cloudinary is down/unset — does media get skipped, or does save fail? |
| T5 | ~~**Rate-limit is per-instance**~~ | ~~Medium~~ | ✅ Done — backed with `rate-limit-mongo`; falls back to in-memory for guest mode. Auth + chats limiters added. |
| T6 | ~~**No request size guard server-side**~~ | ~~Medium~~ | ✅ Done — `mediaValidation.js` enforces count + byte limits per type. `MAX_BODY_SIZE` env (default 4mb). |
| T7 | **Accessibility** | Medium | Modals lack focus traps; ARIA/keyboard nav incomplete. |
| T8 | ~~**Observability**~~ | ~~Low~~ | ✅ Done — request IDs (`X-Request-Id`), structured error handler (hides internals in prod), health endpoints (`/healthz`, `/readyz`). |

---

## Documentation gaps
- README is outdated (mentions `/api/stream` SSE, Hugging Face branding). Align with [API_REFERENCE.md](API_REFERENCE.md) and [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md).
- Some env vars used in code aren't in `.env.example` (`HF_*`, `DNS_SERVERS`). See [SETUP.md](SETUP.md).
