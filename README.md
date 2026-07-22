# HF Chatbot (Express + EJS)

Full-stack chatbot using a free Hugging Face conversational model, vanilla JS frontend, and Express backend with SSE.

## Features
- Server-side rendered EJS + single-page interactions
- Streaming bot replies with live Markdown formatting and typing indicator
- **User accounts** (email/password + Google sign-in) with chats synced to MongoDB Atlas across devices
- **Guest mode**: works without login (chats saved in the browser); guest chats migrate to the account on first login
- Cloudinary storage for uploaded/generated images
- Input validation, sanitization, rate limiting, and logging

## Setup
1. Install dependencies
   ```bash
   npm install
   ```
2. Configure environment variables — copy `.env.example` to `.env` and fill in the values.

   The app runs **without** the account features if `MONGODB_URI` is not set (guest-only mode). To enable login and cross-device sync you need three external services:

   | Service | Env vars | Where to get it |
   | --- | --- | --- |
   | MongoDB Atlas | `MONGODB_URI` | Create a free cluster at cloud.mongodb.com → "Connect" → "Drivers" → copy the connection string. Add your IP (or `0.0.0.0/0` for Vercel) to Network Access. |
   | Google Sign-In | `GOOGLE_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID (type: **Web application**). Add your site URL to **Authorized JavaScript origins**. |
   | Cloudinary | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | cloudinary.com dashboard → Account Details. |

   Also set `JWT_SECRET` to a long random string (used to sign login sessions).

3. Start the server
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000`

> On **Vercel**, add all the same variables under Project → Settings → Environment Variables. MongoDB Network Access must allow `0.0.0.0/0` since Vercel IPs are dynamic.

## Auth & Chat API
- `POST /api/auth/register` — `{ email, password, name? }`
- `POST /api/auth/login` — `{ email, password }`
- `POST /api/auth/google` — `{ credential }` (Google ID token)
- `POST /api/auth/logout`
- `GET  /api/auth/me` — current user (or `null`)
- `GET/POST /api/chats`, `GET/PUT/DELETE /api/chats/:id`, `POST /api/chats/migrate` — all require auth

## API
- `GET /api/history`
  - Returns the current session chat history.
- `POST /api/message`
  - Body: `{ "message": "Hello" }`
  - Queues a bot response and returns `{ "status": "queued" }`.
- `GET /api/stream`
  - SSE stream of events:
    - `typing`: `{ "active": true|false }`
    - `bot`: `{ "message": "..." }`
    - `botError`: `{ "message": "..." }`

## Tests
```bash
npm test
```
