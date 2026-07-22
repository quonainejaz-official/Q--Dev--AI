# System Design — Q-Dev-AI

**Last updated:** 2026-07-22

---

## 1. High-Level Architecture

```
Browser (EJS page + vanilla JS SPA)
        │  fetch (newline-delimited JSON streaming)
        ▼
Express app (src/app.js)
  ├── Pages      /            → renders views/index.ejs
  ├── AI API     /api         → chat, image-gen  (rate-limited 30/min)
  ├── Auth       /api/auth    → register/login/google/logout/me
  └── Chats      /api/chats   → CRUD + migrate (auth required)
        │
        ├── opencodeService  → OpenCode Zen API (model: mimo-v2.5-free)
        ├── imageGenService  → same provider, returns SVG
        ├── cloudinaryService→ media upload (images/audio/video/pdf)
        └── db (mongoose)    → MongoDB Atlas (User, Chat)
```

**Deployment:** Vercel serverless. `vercel.json` routes all traffic → `api/index.js` → re-exports `src/app.js`. Local dev uses `src/server.js` (PORT || 3001).

---

## 2. Tech Stack

- **Runtime:** Node.js ≥18, CommonJS.
- **Web framework:** Express 4, EJS views.
- **Frontend:** Server-rendered EJS + vanilla JS (`public/js/chat.js`), hand-written CSS. No build step, no framework.
- **Auth:** `jsonwebtoken` (JWT in httpOnly cookie `qai_token`, 30-day), `bcryptjs`, `google-auth-library`.
- **DB:** `mongoose` 9 → MongoDB Atlas.
- **Media:** `cloudinary`; PDF text extraction via `pdf-parse` / `pdfjs-dist`.
- **Middleware:** `cors`, `cookie-parser`, `morgan`, `express-rate-limit`, `validator`, `dotenv`.
- **CI:** GitHub Actions (`npm test` on Node 18/20/22). Tests via Jest.

---

## 3. AI Provider (IMPORTANT)

- **Live provider:** OpenCode "Zen" — `https://opencode.ai/zen/v1/chat/completions` (OpenAI-compatible).
- **Model:** `mimo-v2.5-free` (constant `VISION_MODEL` in `src/services/opencodeService.js`).
- **Auth:** `OPENCODE_API_KEY` as Bearer token.
- **Legacy:** `src/services/huggingFaceService.js` exists (explains package name `hf-chatbot`) but is **NOT used** by current controllers.
- **Identity prompt engineering:** system prompt forces the model to identify as "Q-Dev-AI by Quonain Ejaz", always claim video/PDF support, and never mention the underlying model vendor.

---

## 4. Request Flow — Chat Message

1. Client (`chat.js`) gathers text + attachments, POSTs to `/api/message`.
2. `chatController.postMessage` validates/sanitizes input (`utils/messageUtils.js`).
3. Attachments assembled into multimodal parts: `image_url`, `input_audio`, video → image frames, PDF → extracted text.
4. `opencodeService.generateVisionReply` calls the Zen API.
5. Response streamed to client as newline-delimited JSON events: `type: typing | start | chunk | done | error` (~35ms/word — **pseudo-streaming**, not true token streaming).
6. Client renders markdown + syntax highlighting incrementally.

## 5. Request Flow — Image Generation

1. `/imagine <prompt>` or "Create image" menu → `POST /api/generate-image`.
2. `imageGenService.generateImage` prompts model to emit an SVG (512×512) in a fenced code block.
3. SVG extracted, returned as `data:image/svg+xml;base64,...`.
4. Client renders in an image viewer (copy / download / regenerate).

## 6. Auth & Session

- Register/login → bcrypt-hashed password OR Google ID-token verification.
- Issues 30-day JWT in httpOnly cookie `qai_token`.
- `middlewares/auth.js`: `requireAuth` protects `/api/chats/*`.
- `JWT_SECRET` env (falls back to `local-dev-jwt-secret` in dev).

## 7. Data & Media Storage

- Chats stored in MongoDB per-user (see [DATABASE_DESIGN.md](DATABASE_DESIGN.md)).
- To keep documents small, base64 media is uploaded to Cloudinary and replaced with URLs (`chatsController.processMedia`).
- Guest chats live in `localStorage` (`qai-chat-history`, `qai-current-chat`), migrated on first login via `POST /api/chats/migrate` (upsert by `clientId`).

## 8. Graceful Degradation

- No `MONGODB_URI` → app runs in **guest-only** mode.
- No `GOOGLE_CLIENT_ID` → Google button hidden.
- No Cloudinary creds → media offloading disabled (media may bloat docs / be skipped).
- Startup logs which of Mongo/Google/Cloudinary are configured (`src/app.js`).

## 9. Key Files

| Concern | File |
|---------|------|
| App config / routing | `src/app.js` |
| Local server | `src/server.js` |
| Vercel entry | `api/index.js` |
| Chat AI | `src/services/opencodeService.js` |
| Image gen | `src/services/imageGenService.js` |
| Cloudinary | `src/services/cloudinaryService.js` |
| Mongo connection | `src/services/db.js` (cached conn + DNS override) |
| Controllers | `src/controllers/*.js` |
| Models | `src/models/User.js`, `src/models/Chat.js` |
| Validation/prompt utils | `src/utils/messageUtils.js` |

## 10. Known Architectural Notes

- Streaming is simulated client-side, not true SSE/token streaming (README mentions old `/api/stream` — outdated).
- `express-session` is a dependency but the session flow is largely stubbed; auth is JWT-based.
- `db.js` overrides DNS servers (`DNS_SERVERS`, default `8.8.8.8,1.1.1.1`) to work around Atlas SRV lookups in serverless.
