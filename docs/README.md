# Q-Dev-AI — Documentation Index

> **Purpose of this folder:** Central knowledge base for the Q-Dev-AI project. These docs let any AI assistant (or human) quickly understand *what the project is*, *what has been built*, *what is missing*, and *what to do next* — so work stays consistent and on-track.

**Last updated:** 2026-07-22

---

## What is Q-Dev-AI?

A full-stack, multimodal AI chatbot web app. Users chat with an AI using **text, images, audio, video, and PDFs**, generate SVG images, keep chat history, optionally create accounts to sync chats across devices, and export conversations to PDF.

- **Product / brand name:** Q-Dev-AI (created by "Quonain Ejaz")
- **Package name:** `hf-chatbot` (legacy — see note below)
- **Repo:** github.com/quonainejaz-official/Q--Dev--AI
- **Stack:** Node.js + Express + EJS, vanilla JS frontend, MongoDB Atlas, Cloudinary, JWT/Google auth
- **AI provider (live):** OpenCode "Zen" API, model `mimo-v2.5-free` (NOT Hugging Face — see [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md))

---

## Document Map

| File | What it covers | Read this when… |
|------|----------------|-----------------|
| [PRD.md](PRD.md) | Product Requirements — vision, users, features, goals | You need to know *why* the project exists and what it should do |
| [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) | Architecture, request flow, services, deployment | You need to understand *how* the system works technically |
| [DATABASE_DESIGN.md](DATABASE_DESIGN.md) | MongoDB schemas, models, relationships | You are touching data, models, or storage |
| [API_REFERENCE.md](API_REFERENCE.md) | All HTTP endpoints, request/response shapes | You are calling or changing an endpoint |
| [UI_DESIGN.md](UI_DESIGN.md) | Page layout, components, styling, UX flows | You are working on frontend / UI / CSS |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Build phases, current status, roadmap | You are planning the next task |
| [MISSING_FEATURES.md](MISSING_FEATURES.md) | Gaps, incomplete work, known limitations | You want to know what's *not* done yet |
| [IMPROVEMENTS.md](IMPROVEMENTS.md) | Tech debt, refactors, quality/perf/security ideas | You want to make the codebase better |
| [MEMORY.md](MEMORY.md) | Running log of decisions, gotchas, project facts | Start here each session — persistent context |
| [SETUP.md](SETUP.md) | Env vars, local dev, deployment steps | You need to run or deploy the app |

---

## Quick facts for AI lookup

- **Entry points:** `src/server.js` (local), `api/index.js` (Vercel serverless), `src/app.js` (Express app)
- **AI logic:** `src/services/opencodeService.js` (chat), `src/services/imageGenService.js` (SVG gen)
- **Frontend:** `views/index.ejs`, `public/js/chat.js` (~2,400 lines), `public/css/styles.css` (~2,100 lines)
- **Models:** `src/models/User.js`, `src/models/Chat.js`
- **Legacy note:** package is named `hf-chatbot` and `huggingFaceService.js` exists but is **unused**; the live AI path is OpenCode Zen.

> ⚠️ **Convention:** When you complete meaningful work, update [MEMORY.md](MEMORY.md), tick items in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md), and remove resolved items from [MISSING_FEATURES.md](MISSING_FEATURES.md).
