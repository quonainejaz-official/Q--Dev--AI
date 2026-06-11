# HF Chatbot (Express + EJS)

Full-stack chatbot using a free Hugging Face conversational model, vanilla JS frontend, and Express backend with SSE.

## Features
- Server-side rendered EJS + single-page interactions
- Server-Sent Events for async bot replies and typing indicator
- Session-based conversation history
- Hugging Face Inference API integration
- Input validation, sanitization, rate limiting, and logging

## Setup
1. Install dependencies
   ```bash
   npm install
   ```
2. Configure environment variables
   ```bash
   HF_API_KEY=your_huggingface_api_key_here
   HF_MODEL=katanemo/Arch-Router-1.5B:hf-inference
   SESSION_SECRET=chatbotsessionsecret
   PORT=3001
   MAX_MESSAGE_LENGTH=50000
   MAX_HISTORY_LENGTH=20
   CORS_ORIGIN=http://localhost:3000
   ```
3. Start the server
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000`

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
