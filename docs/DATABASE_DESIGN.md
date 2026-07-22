# Database Design — Q-Dev-AI

**Database:** MongoDB Atlas (via Mongoose 9) · **Last updated:** 2026-07-22

Database is **optional**: if `MONGODB_URI` is unset, the app runs guest-only (history in browser localStorage). Connection is cached per serverless invocation in `src/services/db.js`.

---

## 1. Collections Overview

| Collection | Model file | Purpose |
|------------|-----------|---------|
| `users` | `src/models/User.js` | Registered accounts (email/password or Google) |
| `chats` | `src/models/Chat.js` | Saved conversations per user |

---

## 2. `User` Schema (`src/models/User.js`)

| Field | Type | Notes |
|-------|------|-------|
| `email` | String | unique, lowercase, **indexed** |
| `passwordHash` | String \| null | bcrypt hash; `null` for Google-only accounts |
| `googleId` | String \| null | **indexed**; `null` for password accounts |
| `name` | String | display name |
| `avatar` | String | avatar URL (from Google or default) |
| `createdAt` / `updatedAt` | Date | timestamps |

- **Method:** `toPublicJSON()` — returns safe user object **without** `passwordHash`.
- A user may authenticate by password, Google, or (potentially) both linked by email.

---

## 3. `Chat` Schema (`src/models/Chat.js`)

| Field | Type | Notes |
|-------|------|-------|
| `userId` | ObjectId → User | **indexed** |
| `clientId` | String | client-generated id; **indexed**; used for guest-migration upserts |
| `title` | String | chat title |
| `titleIsCustom` | Boolean | true if user renamed (prevents auto-retitle) |
| `messages[]` | [Message subdoc] | embedded messages |
| `createdAt` / `updatedAt` | Date | timestamps |

- **Method:** `toClientJSON()` — exposes `id` (uses `clientId` or `_id`).

### Embedded `Message` subdocument (`_id: false`)

| Field | Type | Notes |
|-------|------|-------|
| `role` | String | `"user"` \| `"bot"` |
| `content` | String | text content |
| `timestamp` | Date | when sent |
| `images[]` | [String] | Cloudinary URLs |
| `audios[]` | [String] | Cloudinary URLs |
| `videos[]` | [String] | Cloudinary URLs |
| `pdfs[]` | [String] | Cloudinary URLs |

> **Media rule:** base64 payloads are uploaded to Cloudinary and stored as URLs (`chatsController.processMedia`) to keep documents small and within Mongo limits.

---

## 4. Relationships

```
User (1) ────< (many) Chat
                        │
                        └──< (many) Message (embedded, not a separate collection)
```

- Messages are **embedded** in the parent chat document (not referenced) — good for read-in-one-shot, bounded by Mongo's 16MB doc limit (mitigated by offloading media to Cloudinary).

---

## 5. Indexes

- `users.email` (unique)
- `users.googleId`
- `chats.userId`
- `chats.clientId`

---

## 6. Guest → Account Migration

- Guest chats keyed by `clientId` in localStorage.
- On first login, `POST /api/chats/migrate` **upserts by `clientId`**, preventing duplicates if migration runs twice.

---

## 7. Design Notes / Future

- Consider a compound index `{ userId, updatedAt }` for the "list latest 200" query.
- Consider TTL/archival for very old guest-migrated chats.
- If per-chat message counts grow large, revisit embedded vs. referenced messages.
- No soft-delete today — `DELETE /api/chats/:id` is a hard delete.
