# Missing Features & Known Gaps — Q-Dev-AI

**Last updated:** 2026-07-22

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
| T1 | ~~**Test coverage**~~ | ~~High~~ | ✅ Done — 62 tests: auth flow, chats CRUD/migration, chat controller, image gen, messageUtils. CI runs `npm test` on Node 18/20/22. |
| T2 | **Unused legacy code** | Low | `huggingFaceService.js` unused; package named `hf-chatbot`; README describes old SSE API. Clean up. |
| T3 | **No soft-delete** | Low | `DELETE /api/chats/:id` is a hard delete — no recovery. |
| T4 | **Cloudinary failure handling** | Medium | Verify behavior when Cloudinary is down/unset — does media get skipped, or does save fail? |
| T5 | **Rate-limit is per-instance** | Medium | `express-rate-limit` in serverless is per-cold-instance memory — not globally accurate. Consider a shared store. |
| T6 | **No request size guard server-side** | Medium | Upload limits are enforced client-side only; add server-side body-size limits. |
| T7 | **Accessibility** | Medium | Modals lack focus traps; ARIA/keyboard nav incomplete. |
| T8 | **Observability** | Low | Only `morgan` logs; no structured error reporting/alerting. |

---

## Documentation gaps
- README is outdated (mentions `/api/stream` SSE, Hugging Face branding). Align with [API_REFERENCE.md](API_REFERENCE.md) and [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md).
- Some env vars used in code aren't in `.env.example` (`HF_*`, `DNS_SERVERS`). See [SETUP.md](SETUP.md).
