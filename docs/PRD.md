# Product Requirements Document (PRD) — Q-Dev-AI

**Status:** Living document · **Last updated:** 2026-07-22

---

## 1. Vision

Q-Dev-AI is a free, multimodal AI coding & general-purpose chat assistant on the web. It aims to feel like a polished commercial chatbot (ChatGPT/Claude-style UX) while running on a free AI backend, with optional accounts for cross-device chat history.

**One-liner:** "Chat with an AI using text, images, audio, video and PDFs — generate images, keep your history, export to PDF."

---

## 2. Target Users

- **Developers / students** wanting a free coding assistant.
- **Casual users** who want a multimodal chatbot (upload a photo, ask about a PDF, dictate by voice).
- **Guest users** — usable with zero signup (history in browser localStorage).
- **Registered users** — want chat history synced across devices.

---

## 3. Core Features (Implemented)

| # | Feature | Notes |
|---|---------|-------|
| F1 | **Multimodal chat** | Text + images + audio + video (as frames) + PDFs (text extracted server-side) |
| F2 | **Streamed responses** | Word-by-word pseudo-streaming (~35ms/word) via newline-delimited JSON |
| F3 | **AI image generation** | `/imagine` command → model returns SVG → rendered as image, with copy/download/regenerate |
| F4 | **User accounts** | Email+password (bcrypt) and Google Sign-In; 30-day JWT in httpOnly cookie |
| F5 | **Guest mode + migration** | Works logged-out (localStorage); guest chats migrate to account on first login |
| F6 | **Cross-device sync** | Logged-in chats stored in MongoDB; media offloaded to Cloudinary |
| F7 | **Voice input** | Web Speech API dictation with animated listening indicator |
| F8 | **PDF export** | Branded header/footer, print-to-PDF of a conversation |
| F9 | **Markdown + code rendering** | Custom renderer + syntax highlighting |
| F10 | **Mobile responsive** | Collapsible sidebar, safe-area handling, responsive breakpoints |
| F11 | **Rate limiting & validation** | 30 req/min, input sanitization, escaping |

---

## 4. User Stories

- *As a guest*, I can start chatting immediately without an account, and my chats stay in this browser.
- *As a user*, I can sign up / log in (email or Google) so my chats follow me across devices.
- *As a user*, I can upload an image/PDF/audio and ask the AI about it.
- *As a user*, I can generate an image from a text prompt.
- *As a user*, I can dictate my message by voice.
- *As a user*, I can export a conversation as a branded PDF.
- *As a user*, I can rename, switch between, and delete my chats.

---

## 5. Non-Goals (for now)

- True token-level streaming from the model (currently simulated client-side).
- Team/multi-user collaboration on a single chat.
- Payment / subscription tiers.
- Native mobile apps.
- Raster (PNG/photo-realistic) image generation — only SVG today.

---

## 6. Success Metrics (suggested)

- Time-to-first-message for a new guest < 2s.
- Successful multimodal parse rate (image/PDF understood) > 95%.
- Chat sync success on login (migration) ~100%.
- Zero secrets leaked; all media served via Cloudinary URLs.

---

## 7. Constraints & Assumptions

- **Free AI backend** (`mimo-v2.5-free`) → rate/quality limits expected; identity is prompt-forced to "Q-Dev-AI".
- **Serverless (Vercel)** → no long-lived in-memory state; MongoDB connection is cached per invocation.
- Optional services (Mongo/Google/Cloudinary) degrade gracefully — app runs guest-only if unset.

---

## 8. Open Product Questions

- Should guests be nudged to sign up after N messages?
- Should image generation support raster output?
- Should there be a shareable public chat link?

See [MISSING_FEATURES.md](MISSING_FEATURES.md) and [IMPROVEMENTS.md](IMPROVEMENTS.md) for the backlog.
