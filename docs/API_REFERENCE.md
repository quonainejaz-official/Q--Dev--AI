# API Reference — Q-Dev-AI

**Last updated:** 2026-07-22 · Routes mounted in `src/app.js`

All responses JSON unless noted. AI endpoints return **newline-delimited JSON** stream events, not standard JSON.

---

## Auth model

- JWT stored in httpOnly cookie `qai_token` (30-day expiry).
- `/api/chats/*` require auth (`middlewares/auth.js` → `requireAuth`).
- Rate limit on `/api/*` AI routes: **30 requests / minute** (`middlewares/rateLimiter.js`).

---

## 1. Pages

### `GET /`
Renders `views/index.ejs`. Injects `window.__INITIAL_MESSAGES__` and `window.__GOOGLE_CLIENT_ID__`.

---

## 2. AI — `/api` (rate-limited)

Routes: `src/routes/api.js` · Controller: `chatController.js`

### `POST /api/message`
Multimodal AI chat. Returns a **stream** of newline-delimited JSON events.

**Body (JSON):**
```json
{
  "message": "string",
  "history": [ { "role": "user|bot", "content": "..." } ],
  "images": ["data:image/...;base64,..."],
  "audios": ["data:audio/...;base64,..."],
  "videos": ["data:video/...;base64,..."],
  "pdfs":   ["data:application/pdf;base64,..."]
}
```

**Stream events (one JSON object per line):**
| `type` | Meaning |
|--------|---------|
| `typing` | model is thinking |
| `start` | reply beginning |
| `chunk` | `{ "content": "word " }` incremental text |
| `done` | reply complete |
| `error` | `{ "message": "..." }` |

### `POST /api/generate-image`
Generates an SVG image from a prompt. Streams progress, final payload is an SVG data URL (`data:image/svg+xml;base64,...`).

**Body:** `{ "prompt": "string" }`

### `GET /api/history` · `DELETE /api/history` · `PUT /api/history`
History **stubs** — return empty / no-op. Real history lives client-side (guest) or in Mongo (`/api/chats`).

---

## 3. Auth — `/api/auth`

Routes: `src/routes/auth.js` · Controller: `authController.js`

### `POST /api/auth/register`
`{ "email", "password", "name" }` → creates user (bcrypt), sets `qai_token` cookie. Returns public user.

### `POST /api/auth/login`
`{ "email", "password" }` → verifies, sets cookie. Returns public user.

### `POST /api/auth/google`
`{ "credential": "<google_id_token>" }` → verified via `google-auth-library`, upserts user, sets cookie.

### `POST /api/auth/logout`
Clears `qai_token` cookie.

### `GET /api/auth/me`
Returns current user (`toPublicJSON()`) or 401 if not authenticated.

---

## 4. Chats — `/api/chats` (auth required)

Routes: `src/routes/chats.js` · Controller: `chatsController.js`

### `GET /api/chats`
List current user's chats (latest 200), newest first.

### `POST /api/chats`
Create or **upsert by `clientId`**. Body: `{ clientId, title, titleIsCustom, messages[] }`. Media base64 → Cloudinary URLs.

### `POST /api/chats/migrate`
Bulk migrate guest chats into the account (upsert by `clientId`). Body: `{ chats: [...] }`.

### `GET /api/chats/:id`
Fetch one chat (by `clientId` or `_id`).

### `PUT /api/chats/:id`
Update a chat (title, messages, etc.).

### `DELETE /api/chats/:id`
Hard-delete a chat.

---

## Error shape

Centralized handler (`middlewares/errorHandler.js`) returns:
```json
{ "error": "message" }
```
with appropriate HTTP status (400 validation, 401 auth, 429 rate limit, 500 server).
