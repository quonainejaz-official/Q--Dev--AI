# Project Memory — Q-Dev-AI

> **Running log of decisions, gotchas, and facts an AI assistant should know before working.**
> Read this first each session. Append new entries at the top of the relevant section with a date.

**Last updated:** 2026-07-22

---

## 🔑 Critical facts (read before coding)

- **AI provider is OpenCode Zen, NOT Hugging Face.** Live path: `src/services/opencodeService.js` → `https://opencode.ai/zen/v1/chat/completions`, model `mimo-v2.5-free`, key `OPENCODE_API_KEY`. The package name `hf-chatbot` and `huggingFaceService.js` are **legacy/unused**.
- **Identity is prompt-forced:** the model must always say it is "Q-Dev-AI by Qonain", always claim video/PDF support, and never name the underlying vendor. Don't remove these system-prompt guards casually.
- **Streaming is faked client-side** (~35ms/word via newline-delimited JSON). Not real token streaming.
- **App degrades gracefully:** no `MONGODB_URI` → guest-only; no `GOOGLE_CLIENT_ID` → no Google button; no Cloudinary → media offload disabled.
- **Serverless (Vercel):** all traffic → `api/index.js` → `src/app.js`. No persistent memory between invocations; Mongo connection cached in `db.js` (which also overrides DNS).
- **Auth = JWT cookie `qai_token`** (30-day, httpOnly). `express-session` is a dep but the flow is stubbed.

---

## 🧭 Where things live

- Chat AI: `src/services/opencodeService.js` · Image gen: `src/services/imageGenService.js`
- Controllers: `src/controllers/{auth,chat,chats,page}Controller.js`
- Models: `src/models/User.js`, `src/models/Chat.js`
- Frontend: `views/index.ejs`, `public/js/chat.js` (~2,400 lines), `public/css/styles.css` (~2,100 lines)
- Validation/prompt utils: `src/utils/messageUtils.js`

---

## ⚠️ Gotchas

- README is **outdated** — mentions `/api/stream` SSE and HF branding. Trust `docs/` over README.
- `GET/PUT/DELETE /api/history` are **stubs**; real history is `/api/chats` (Mongo) + localStorage (guest).
- Guest chats migrate on login via **upsert by `clientId`** — safe to re-run.
- Client upload limits (5 img/5MB, 3 vid/50MB, 3 pdf/25MB, 3 audio/25MB) are **client-side only**.
- Media is offloaded to Cloudinary and stored as URLs, not base64, in Mongo.

---

## 📜 Decision log

- **2026-07-22** — Created `docs/` knowledge base (PRD, System Design, DB, API, UI, Impl Plan, Missing Features, Improvements, this Memory, Setup) to keep project trackable for AI assistants.
- (from git history) PDF export with branded header/footer added.
- (from git history) User accounts (email + Google) + MongoDB sync + Cloudinary added.
- (from git history) Mobile responsiveness fixes (viewport height, padding, safe areas, tap targets).
- (from git history) Voice `onend` uses `submitMessage()` (async-safe); `stopRecording` uses `sendButton.click()` (user-initiated).

---

## 📝 Session notes (append below)

<!-- Add dated notes here as work progresses. Example:
### 2026-08-01
- Removed legacy huggingFaceService.js; renamed package to q-dev-ai. Updated README.
-->
