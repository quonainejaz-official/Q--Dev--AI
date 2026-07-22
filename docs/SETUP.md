# Setup & Deployment — Q-Dev-AI

**Last updated:** 2026-07-22

---

## 1. Requirements
- Node.js ≥ 18
- (Optional) MongoDB Atlas, Cloudinary account, Google OAuth client

## 2. Install & run locally
```bash
npm install
cp .env.example .env   # fill in values
npm run dev            # nodemon, http://localhost:3001
npm start              # production start
npm test               # Jest
```
Local server entry: `src/server.js` (PORT || 3001).

## 3. Environment variables

### Core
| Var | Required | Default | Notes |
|-----|----------|---------|-------|
| `OPENCODE_API_KEY` | ✅ | — | AI provider (OpenCode Zen) bearer token |
| `PORT` | ⬜ | 3001 | local port |
| `NODE_ENV` | ⬜ | — | `production` on Vercel |
| `CORS_ORIGIN` | ⬜ | — | allowed origin(s) |
| `MAX_MESSAGE_LENGTH` | ⬜ | 50000 | input cap |
| `MAX_HISTORY_LENGTH` | ⬜ | 20 | history turns sent to model |

### Accounts (optional — enables sync)
| Var | Notes |
|-----|-------|
| `MONGODB_URI` | Atlas connection string; unset → guest-only mode |
| `JWT_SECRET` | strong secret in prod (dev fallback: `local-dev-jwt-secret`) |
| `GOOGLE_CLIENT_ID` | enables Google Sign-In button |

### Cloudinary (optional — media offloading)
| Var |
|-----|
| `CLOUDINARY_CLOUD_NAME` |
| `CLOUDINARY_API_KEY` |
| `CLOUDINARY_API_SECRET` |

### Used in code but missing from `.env.example` (add these)
| Var | Purpose |
|-----|---------|
| `HF_API_KEY`, `HF_MODEL`, `HF_PROVIDER` | legacy Hugging Face service (currently unused) |
| `DNS_SERVERS` | `db.js` DNS override for Atlas SRV in serverless (default `8.8.8.8,1.1.1.1`) |

## 4. Deployment (Vercel)
- `vercel.json` routes all traffic → `api/index.js` → re-exports `src/app.js`.
- Set all env vars in Vercel project settings.
- `vercel-build` script is a no-op (no build step).
- CI: `.github/workflows/node.js.yml` runs `npm test` on Node 18/20/22.

## 5. Health checks after deploy
- `GET /` renders the app.
- `POST /api/message` streams a reply (needs `OPENCODE_API_KEY`).
- `GET /api/auth/me` → 401 when logged out (confirms auth wired).
- Login + send a message → confirm chat appears in Mongo (if configured).
