# Q-Dev-AI — Architecture Roadmap

> **Goal:** evolve Q-Dev-AI from a production-hardening target into a scalable, maintainable, extensible AI platform whose architecture approaches modern assistants (ChatGPT-class).
>
> **Status of this document:** PLANNING ONLY. No code has been changed. This is the resumable source of truth — if work stops, resume from the "Progress Tracker" at the bottom.
>
> Last updated: 2026-07-22

---

## 0. Current-State Snapshot (verified from codebase)

**Stack:** Express 4 (CommonJS) + EJS, dual entry ([src/server.js](../src/server.js) local, [api/index.js](../api/index.js) Vercel serverless), MongoDB/Mongoose (optional — guest mode if unset), Cloudinary (optional), JWT auth (email + Google).

**AI layer:**
- Single provider: **OpenCode Zen** (`https://opencode.ai/zen/v1/chat/completions`, OpenAI-compatible), auth `OPENCODE_API_KEY`. See [src/services/opencodeService.js](../src/services/opencodeService.js).
- Two hardcoded models: `big-pickle` (text/code), `mimo-v2.5-free` (vision). Model chosen automatically by `pickModel()` based on media presence — **no per-request/user override**.
- Retry with exponential backoff on 429/5xx (`MAX_RETRIES=3`).
- **Streaming**: upstream SSE → downstream **NDJSON over `res.write`** ([chatController.js](../src/controllers/chatController.js) `postMessage`). Not `text/event-stream`.
- System prompt is **inline** in [opencodeService.js](../src/services/opencodeService.js#L84) (identity: "Q-Dev-AI, created by Quonain Ejaz").
- Image gen ([imageGenService.js](../src/services/imageGenService.js)) is **not a real image model** — it prompts the LLM to emit SVG. 
- [huggingFaceService.js](../src/services/huggingFaceService.js) + `buildChatMessages`/`buildConversationInput` in [messageUtils.js](../src/utils/messageUtils.js) are **dead code**.

**Data layer:**
- `Chat` = embedded `messages[]` (role enum `user|bot`, content, timestamp, media URL arrays). No token counts, no per-message metadata, no soft-delete, no TTL.
- History capped at `MAX_HISTORY_LENGTH` (default **20**) on both send and persist.
- `listChats` `.limit(200)`, sorted by `updatedAt` — **no pagination/cursor/skip**.
- Indexes: `Chat.userId`, `Chat.clientId`, `User.email` (unique), `User.googleId`. No compound indexes, no TTL.
- Media stored as Cloudinary URLs; base64 dropped if Cloudinary unconfigured.

**Security/ops gaps:**
- `express.json({limit:"50mb"})` but `urlencoded` has no limit; Vercel real body cap ~4.5MB (mismatch surfaced as 413 error only).
- No server-side media count/size validation (client-only in [public/js/chat.js](../public/js/chat.js)).
- Rate limiter (`express-rate-limit`, **in-memory**) applied only to `/api`; `/api/auth` + `/api/chats` unprotected. In-memory store unreliable on serverless.
- No boot-time env validation; `JWT_SECRET` has insecure dev fallback with no prod guard.
- No Helmet/CSP/security headers, no request IDs, no structured logging, minimal centralized error handling.

---

## Evaluation legend

Each recommendation lists: **Why** · **Where it fits** · **Complexity** (S/M/L/XL) · **Risks** · **Dependencies** · **Order**.

Complexity: **S** ≈ hours · **M** ≈ 1–2 days · **L** ≈ 3–5 days · **XL** ≈ 1–3+ weeks.

---

# Phase 1 — Production Hardening

Foundation. Everything else assumes this is done. Mostly additive, low structural risk.

### 1.1 Server-side upload/media validation
- **Why:** client-only limits ([public/js/chat.js](../public/js/chat.js)) are trivially bypassed; the server forwards `images/audios/videos/pdfs` straight to the model with no count/byte checks.
- **Where:** new `src/utils/mediaValidation.js`; call in [chatController.js](../src/controllers/chatController.js) `postMessage` and [chatsController.js](../src/controllers/chatsController.js) `processMedia`. Mirror client constants (5 images/5MB, 3 videos/50MB, 3 pdfs/25MB, 3 audios/25MB). Base64 bytes ≈ `len * 0.75`.
- **Complexity:** S · **Risks:** false rejects if client limits drift — keep constants in one shared module · **Deps:** none · **Order:** 1st.

### 1.2 Consistent body size limits
- **Why:** 50MB JSON vs ~4.5MB Vercel cap vs 50MB client video = inconsistent; `urlencoded` unbounded-by-default.
- **Where:** [src/app.js:36-37](../src/app.js#L36). Set both `json` and `urlencoded` limits from one env-driven constant (`MAX_BODY_SIZE`, default `4mb` to match platform). Document the platform ceiling.
- **Complexity:** S · **Risks:** lowering limit breaks large uploads — coordinate with 1.1 + eventual signed uploads (3.6) · **Deps:** 1.1 · **Order:** 1st.

### 1.3 Proper rate limiting (coverage)
- **Why:** `/api/auth` (brute-force surface) and `/api/chats` currently unlimited.
- **Where:** [src/app.js:44-46](../src/app.js#L44). Add a stricter `authLimiter` to `/api/auth`; apply a limiter to `/api/chats`.
- **Complexity:** S · **Risks:** too-tight auth limits lock out legit retries · **Deps:** 1.4 · **Order:** 2nd.

### 1.4 Shared rate-limit store for serverless
- **Why:** in-memory counters are per-lambda and reset on cold start → limits not enforced across instances.
- **Where:** [src/middlewares/rateLimiter.js](../src/middlewares/rateLimiter.js). Back with **Mongo** (`rate-limit-mongo`) since Mongo is already wired — avoids adding Redis now. Fall back to MemoryStore when DB unconfigured (guest mode). Revisit if Redis is introduced in Phase 2.
- **Complexity:** M · **Risks:** added DB write latency per request; Mongo store less precise than Redis under high concurrency · **Deps:** MongoDB · **Order:** 2nd.

### 1.5 Environment validation (fail-fast)
- **Why:** no boot validation; failures surface lazily and cryptically.
- **Where:** new `src/config/env.js` with `validateEnv()` called at top of [src/app.js](../src/app.js). Required vs optional lists; **refuse to boot in production** if `JWT_SECRET` is the dev fallback. Sync `.env.example` (add `DNS_SERVERS`; decide `HF_*` — see 1.11).
- **Complexity:** S · **Risks:** over-strict lists break local/guest mode — mark Mongo/Cloudinary optional · **Deps:** none · **Order:** 1st.

### 1.6 JWT security
- **Why:** insecure fallback secret ([auth.js:5](../src/middlewares/auth.js#L5)); no rotation/refresh strategy.
- **Where:** [src/middlewares/auth.js](../src/middlewares/auth.js). Remove prod fallback (covered by 1.5), consider shortening `expiresIn` + refresh tokens (defer refresh to Phase 4 accounts work). Store minimal claims.
- **Complexity:** S (secret) / M (refresh tokens) · **Risks:** invalidating existing tokens on secret change · **Deps:** 1.5 · **Order:** 1st (secret), later (refresh).

### 1.7 Helmet + security headers
- **Why:** no security headers today.
- **Where:** [src/app.js](../src/app.js), add `helmet()` early. HSTS, noSniff, frameguard, referrer-policy.
- **Complexity:** S · **Risks:** defaults may block inline assets — tune with CSP (1.8) · **Deps:** none · **Order:** 2nd.

### 1.8 CSP headers
- **Why:** EJS views render user/model content; CSP is core XSS defense.
- **Where:** Helmet `contentSecurityPolicy`. Allowlist Cloudinary, Google (auth), OpenCode. Watch inline scripts in EJS — may need nonces.
- **Complexity:** M · **Risks:** breaking the frontend with a too-strict policy — roll out in report-only first · **Deps:** 1.7 · **Order:** 3rd.

### 1.9 XSS protection + input sanitization
- **Why:** model output is streamed to DOM; currently `sanitizeMessage` = `validator.escape` on deltas ([chatController.js:113](../src/controllers/chatController.js#L113)) — but Markdown/code rendering on the client is the real risk surface.
- **Where:** audit client render path in [public/js/chat.js](../public/js/chat.js); sanitize rendered HTML (DOMPurify) if Markdown is rendered. Keep server-side escape for stored content.
- **Complexity:** M · **Risks:** over-escaping breaks code blocks/formatting · **Deps:** 1.8 · **Order:** 3rd.

### 1.10 Mongo injection protection
- **Why:** user-supplied `:id`, `clientId`, query fields flow into queries.
- **Where:** add `express-mongo-sanitize` in [src/app.js](../src/app.js); validate `ObjectId` params in [chatsController.js](../src/controllers/chatsController.js).
- **Complexity:** S · **Risks:** minimal · **Deps:** none · **Order:** 2nd.

### 1.11 Dead-code cleanup
- **Why:** [huggingFaceService.js](../src/services/huggingFaceService.js), `buildChatMessages`, `buildConversationInput`, unused `generateVisionReply` export, `express-session` dep add confusion and attack surface.
- **Where:** delete files/exports; remove `HF_*` from docs OR keep as documented-but-inactive. Recommend **delete** (the provider abstraction in 3.4 replaces it cleanly).
- **Complexity:** S · **Risks:** removing something later needed — provider layer supersedes it · **Deps:** none · **Order:** anytime in Phase 1.

### 1.12 Request IDs + structured logging + error handling
- **Why:** `morgan` only; no correlation IDs, no centralized error handler, stack traces may leak.
- **Where:** add request-id middleware (`X-Request-Id`), swap to **pino** structured logs, add a final error-handling middleware in [src/app.js](../src/app.js) that hides internals in prod and logs with request id. (Overlaps Phase 2 observability — do the middleware here, expand metrics later.)
- **Complexity:** M · **Risks:** log volume/cost on serverless · **Deps:** none · **Order:** 2nd.

**Phase 1 recommended order:** 1.5 → 1.1 → 1.2 → 1.6(secret) → 1.11 → 1.10 → 1.7 → 1.4 → 1.3 → 1.12 → 1.8 → 1.9.

---

# Phase 2 — Scalable Backend Architecture

Introduces structure the AI phases depend on. Some items require refactoring.

### 2.1 Provider abstraction layer *(shared with 3.4 — same work)*
- **Why:** provider + models are hardcoded; adding a provider means editing service internals. This is the single highest-leverage refactor — everything in Phase 3 depends on it.
- **Where:** new `src/providers/` with a `Provider` interface (`chat()`, `stream()`, `embed?()`, `capabilities`). Wrap current OpenCode logic as `providers/opencode.js`. A `providers/index.js` registry + factory. [chatController.js](../src/controllers/chatController.js) calls the registry, not the service directly.
- **Complexity:** L · **Risks:** must preserve current streaming/media behavior exactly · **Deps:** none · **Order:** first structural item of Phase 2.

### 2.2 Retry/fallback system
- **Why:** retry exists per-call but no cross-provider fallback.
- **Where:** in the provider registry (2.1) — on terminal failure, fall back to next configured provider with same capability.
- **Complexity:** M · **Risks:** fallback masking real errors; cost surprises · **Deps:** 2.1 · **Order:** after 2.1.

### 2.3 Streaming responses (standardize)
- **Why:** current NDJSON-over-`res.write` works but is ad hoc; SSE is the ChatGPT-standard and reconnection-friendly.
- **Where:** [chatController.js](../src/controllers/chatController.js) + client. Move to `text/event-stream` (SSE) with typed events (`token`, `tool_call`, `done`, `error`). Keep NDJSON as fallback if needed.
- **Complexity:** M · **Risks:** client rewrite; proxy buffering on Vercel · **Deps:** 2.1 · **Order:** mid Phase 2.

### 2.4 Background workers + 2.5 Queue for long-running jobs
- **Why:** PDF parsing, image gen, embeddings, summarization are slow and block the request; serverless has execution-time limits.
- **Where:** introduce a queue (**BullMQ + Redis**, or a Mongo-backed lightweight queue if avoiding Redis). Workers run outside the request. **Note:** Vercel serverless is a poor host for long workers — this likely forces a **separate worker service** (Railway/Render/Fly) or a managed queue. Major architectural decision.
- **Complexity:** XL · **Risks:** infra split, new deploy target, cost · **Deps:** Redis (recommended) · **Order:** later Phase 2 — gate on whether long jobs actually appear (image gen, embeddings).

### 2.6 Caching strategy (Redis or Mongo)
- **Why:** repeated prompts, embeddings, and retrievals are re-computed.
- **Where:** cache embeddings + retrieval results + optionally identical-prompt responses. Redis if introduced for queue; else Mongo TTL collection.
- **Complexity:** M · **Risks:** stale/incorrect cache hits for non-deterministic LLM output — cache embeddings/retrieval, not free-form completions by default · **Deps:** 2.4 or Mongo · **Order:** after memory system exists (3.2).

### 2.7 Cost optimization → *(see 3.7 routing — the primary lever)*
- **Where:** provider layer (2.1) records per-request token+cost; routing (3.7) picks cheapest capable model.

### 2.8 Request tracing + 2.9 Metrics + 2.10 Health endpoints + 2.11 Structured logging
- **Why:** no visibility into latency, error rates, token spend, provider health.
- **Where:** extend 1.12. Add `/healthz` (liveness) + `/readyz` (DB/provider checks). Emit metrics (Prometheus-style or a hosted APM). Propagate request id into provider calls + logs.
- **Complexity:** M · **Risks:** serverless metrics need push/hosted collector · **Deps:** 1.12 · **Order:** alongside 2.1.

### 2.12 Token accounting
- **Why:** no idea what anything costs; prerequisite for routing + quotas.
- **Where:** provider layer returns `usage`; persist per-message/per-user. Add `tokensIn/tokensOut/costUsd/model` to message metadata (needs schema change 2.14).
- **Complexity:** M · **Risks:** providers not always returning usage — estimate via tokenizer fallback · **Deps:** 2.1, 2.14 · **Order:** after 2.1.

### 2.13 Database indexing
- **Why:** only single-field indexes exist; queries sort by `updatedAt`, filter by `userId`.
- **Where:** add compound `{ userId: 1, updatedAt: -1 }` on Chat; indexes for new collections (2.14). Enable explicit index management (avoid `autoIndex` in prod).
- **Complexity:** S · **Risks:** index build time on large collections · **Deps:** none · **Order:** early Phase 2.

### 2.14 Better chat storage schema *(see 3.8 — full redesign)*
- **Why:** embedded `messages[]` caps growth, blocks pagination, has no token/metadata fields.
- **Where:** split `messages` into their own collection (detail in 3.8). Add per-message metadata (tokens, model, finishReason).
- **Complexity:** L · **Risks:** data migration · **Deps:** 2.13 · **Order:** foundational for Phase 3 memory/pagination.

### 2.15 Conversation pagination
- **Why:** `.limit(200)` no cursor; can't scroll long histories.
- **Where:** cursor-based (by `updatedAt`/`_id`) on `listChats`; message-level pagination once messages are a collection (2.14/3.8).
- **Complexity:** M · **Risks:** client changes · **Deps:** 2.14 · **Order:** after 2.14.

### 2.16 Soft deletes + 2.17 TTL indexes
- **Why:** hard deletes are unrecoverable; no auto-expiry for guest chats/ephemeral data.
- **Where:** add `deletedAt` (soft delete) + query filter; TTL index on guest chats / old summaries / cache collections.
- **Complexity:** S · **Risks:** forgetting the soft-delete filter leaks deleted data — centralize in a base query helper · **Deps:** 2.14 · **Order:** with 2.14.

**Phase 2 recommended order:** 2.1 → 2.13 → 2.14 → 2.16/2.17 → 2.15 → 2.8/2.9/2.10 → 2.12 → 2.2 → 2.3 → 2.6 → 2.4/2.5 (gated).

---

# Phase 3 — ChatGPT-Level AI Architecture

The intelligence layer. Depends on Phase 2's provider abstraction (2.1) and schema redesign (2.14/3.8).

## 3.1 Context Management

**Why:** today only the last 20 messages are sent — no summarization, no relevance selection, no window budgeting. This is the core quality gap vs ChatGPT.

Design:
- **Conversation summarization:** rolling summary generated by a cheap model when history exceeds a threshold; store as a `summary` record (3.8). Older messages replaced by summary in the prompt.
- **Context compression:** dedup/trim, drop low-value turns, compress tool outputs.
- **Importance scoring:** score messages (recency, user emphasis, entities, pinned) to decide what to keep verbatim vs summarize.
- **Dynamic prompt building:** assemble context to fit a token budget (see 3.3).
- **Context window optimization:** budget allocator — reserve tokens for system/safety/memory/docs/summary/recent/current, truncate lowest-priority first.

- **Where:** new `src/context/` module invoked by [chatController.js](../src/controllers/chatController.js) before the provider call. Needs token counting (2.12) and message collection (3.8).
- **Complexity:** L · **Risks:** summary drift/hallucination losing critical facts; extra latency+cost per turn · **Deps:** 2.1, 2.12, 3.8 · **Order:** after schema + provider layer.

## 3.2 Memory System (semantic, embeddings)

**Recommendation: start with MongoDB Atlas Vector Search.**
- **Rationale for THIS project:** Mongo is already the datastore and connection is wired ([db.js](../src/services/db.js)); Atlas Vector Search keeps memories co-located with chats/users (no second system to operate, no cross-store consistency), and scales fine to low-millions of vectors. **Qdrant** is the best self-hosted/perf upgrade path if vector volume or filtering complexity grows; **Pinecone** is the lowest-ops managed option but adds a vendor + cost + a separate store; **Weaviate** is powerful but heavier to operate than this project warrants. Choose Pinecone only if not on Atlas and you want zero vector-infra ops; choose Qdrant when you outgrow Atlas Vector Search.
- **What to store:** durable user facts/preferences, salient conversation takeaways, entities, and document chunks — each with `embedding`, `text`, `type`, `userId`, `sourceChatId`, `importance`, `createdAt`, `lastUsedAt`.
- **Retrieval strategy:** embed the current query (+ recent context), ANN search filtered by `userId`, top-K, then re-rank (see below).
- **Memory ranking:** hybrid score = semantic similarity × importance × recency decay × usage frequency. Optionally a cheap LLM re-rank on the top candidates.
- **Memory expiration:** TTL for low-importance/stale memories (2.17); promote frequently-used memories (bump `importance`/`lastUsedAt`).
- **Memory updates:** dedup/merge near-duplicate memories; supersede contradicted facts (store latest, mark old superseded); a periodic consolidation job (queue, 2.5).
- **Where:** new `src/memory/` + `memories` collection (3.8); embedding calls via provider layer (`embed()`); write path after each turn (async/queued), read path in context builder (3.1/3.3).
- **Complexity:** XL · **Risks:** embedding cost, privacy (must be per-user isolated + deletable — GDPR), retrieval of wrong/outdated memories · **Deps:** 2.1(+embed), 3.8, ideally 2.5 · **Order:** after context management basics.

## 3.3 Prompt Builder (layered)

**Why:** the system prompt is a single inline string ([opencodeService.js:84](../src/services/opencodeService.js#L84)); there is no composition, no injection of memory/docs/summary.

Layered pipeline (highest priority first, truncate lowest first under budget):

```
System Prompt → Safety Layer → Developer Instructions → User Profile/Memory
→ Retrieved Memories → Retrieved Documents → Conversation Summary
→ Recent Messages → Current User Message → LLM
```

- **Where:** new `src/prompt/promptBuilder.js`. Each layer is a pure function `(ctx) => messages[]` returning typed segments with a priority + token cost. A budget allocator composes them to fit the model's context window (uses token counter 2.12 and context module 3.1). Called by [chatController.js](../src/controllers/chatController.js). Move the inline prompt into a versioned `src/prompt/layers/system.js`.
- **Implementation notes:** layers pull from: user doc (profile), memory retrieval (3.2), doc retrieval (RAG), summary record (3.1), message collection (3.8). Safety layer is non-truncatable. Make prompts versioned + testable.
- **Complexity:** L · **Risks:** prompt bloat/cost; layer ordering bugs; must keep safety layer immune to truncation · **Deps:** 3.1, 3.2, 2.12 · **Order:** alongside 3.1 (they co-evolve).

## 3.4 Multi-Provider AI Layer *(= 2.1, expanded)*

**Why:** enable OpenAI, Claude, Gemini, DeepSeek, Groq, Together, OpenRouter, + OpenCode behind one interface.

- **Interface (every provider implements):**
  ```
  capabilities: { chat, vision, audio, embeddings, tools, streaming, maxContext, models[] }
  async chat({ messages, model, tools?, ... }) -> { content, usage, toolCalls?, finishReason }
  async *stream({ ... }) -> yields { type: 'token'|'tool_call'|'done', ... }
  async embed({ input, model }) -> { vectors, usage }   // optional
  ```
- **Where:** `src/providers/{opencode,openai,anthropic,gemini,groq,together,openrouter}.js` + `registry.js`. Adapters normalize each vendor's request/response/streaming/tool schema to the common shape. OpenRouter alone covers many models — good early win.
- **Complexity:** L (framework) + S–M per provider · **Risks:** feature drift between providers (tools/vision differ); normalizing streaming + tool-call formats · **Deps:** none (this IS the foundation) · **Order:** FIRST real Phase 2/3 work.

## 3.5 Tool Calling Framework (design only)

**Why:** to let the model invoke Web Search, Calculator, Memory, PDF Reader, Image Generator, Code Execution, Database Search, and future tools.

- **Design:** a `Tool` interface `{ name, description, parameters (JSON Schema), handler(args, ctx), permissions }`. A registry exposes tool specs to providers that support tool/function calling (capability-gated via 3.4). An orchestration loop: model emits tool_call → validate args → run handler (sandboxed/queued for heavy tools) → feed result back → continue until final answer. Per-tool authz + rate limits + audit log (request id from 1.12).
- **Where:** `src/tools/` with one file per tool + `registry.js`; orchestration in a `src/agent/` loop that wraps the provider stream. Memory/PDF/ImageGen tools reuse existing services.
- **Complexity:** XL · **Risks:** infinite tool loops (cap iterations), unsafe code execution (must sandbox — see 4.7), prompt-injection via tool output · **Deps:** 3.4 (tool-capable providers), 2.5 (heavy tools) · **Order:** after provider layer + streaming; implement tools incrementally in Phase 4.

## 3.6 Media Pipeline — signed direct uploads

**Current:** base64 data URLs inside the JSON body → server → Cloudinary. Bloats payloads, hits the ~4.5MB Vercel cap, wastes serverless memory/time, double-transfers bytes.

**Recommended redesign: direct signed uploads to Cloudinary.**
- **Flow:** client requests a signed upload params from server (`/api/uploads/sign`) → client uploads file **directly** to Cloudinary → client sends only the resulting **URL + metadata** to the chat endpoint.
- **Trade-offs:**
  - *Pros:* removes body-size bottleneck, offloads bandwidth/CPU from the server, enables larger files, faster perceived uploads, cheaper serverless.
  - *Cons:* more client complexity; must validate/scan uploaded files server-side after the fact (type, size, moderation); signed-params endpoint must be authz'd + rate-limited to prevent abuse; orphaned-upload cleanup needed (TTL/cron).
- **Where:** new `src/controllers/uploadController.js` + route; [cloudinaryService.js](../src/services/cloudinaryService.js) generates signatures; client upload widget in [public/js/chat.js](../public/js/chat.js). PDFs still need text extraction — do it in a worker (2.4) from the hosted URL.
- **Complexity:** L · **Risks:** unvalidated/malicious uploads, orphan files, signature abuse · **Deps:** 1.1/1.2 (limits), ideally 2.5 (post-processing) · **Order:** after Phase 1; high ROI once large media matters.

## 3.7 AI Cost Optimization — model routing

Routing decision inputs: task type, complexity, media presence, user tier, context size, latency budget.

```
Simple prompts   → cheap/fast model (e.g. Groq/Haiku-class)
Coding           → strong coding model
Reasoning        → reasoning model (higher cost, gated)
Images           → real image model (see 4.4)
Vision inputs    → vision-capable model
```

- **How decisions are made:** a `router` that (a) uses cheap heuristics first (media present? code fences/keywords? length?), then (b) optionally a tiny classifier LLM call for ambiguous cases (cache results, 2.6). Respects a per-user cost budget/quota (token accounting 2.12). Always fall back to a safe default (2.2).
- **Where:** `src/router/modelRouter.js`, called by [chatController.js](../src/controllers/chatController.js) before provider selection; picks provider+model from the registry (3.4) by capability + cost.
- **Complexity:** L · **Risks:** misrouting hurts quality (route conservatively, prefer stronger model when uncertain); classifier adds latency/cost · **Deps:** 3.4, 2.12, 2.6 · **Order:** after provider layer + token accounting.

## 3.8 Conversation Storage redesign

**Recommendation: split into separate collections.**

| Collection | Why separate |
|---|---|
| `conversations` | Metadata only (title, userId, timestamps, summaryRef, counts). Small, fast to list/paginate. |
| `messages` | One doc per message → unbounded history, cursor pagination (2.15), per-message metadata (tokens/model/finishReason), independent indexing. Removes the 16MB embedded-array ceiling. |
| `summaries` | Rolling conversation summaries (3.1) — regenerated independently, TTL-able. |
| `memories` | Semantic memory + embeddings (3.2). Vector index. Per-user isolated, TTL for expiry. |
| `attachments` | Media metadata (Cloudinary URL, type, size, ownerId, chatId) — dedup, lifecycle/cleanup, moderation status. Decouples media from message text. |

- **Why overall:** the current embedded model blocks pagination, per-message metadata, token accounting, and memory — all Phase 3 needs. Separation enables independent scaling, indexing, and lifecycle (TTL/soft-delete) per concern.
- **Where:** new models in [src/models/](../src/models/); rewrite [chatsController.js](../src/controllers/chatsController.js) CRUD; **data migration script** from embedded `messages[]` → `messages` collection.
- **Complexity:** L–XL (with migration) · **Risks:** migration correctness, more queries per read (mitigate with proper indexes 2.13 + projections), transactional writes across collections · **Deps:** 2.13 · **Order:** foundational — do early in Phase 2/3 boundary, before memory/pagination.

**Phase 3 recommended order:** 3.4(=2.1) → 3.8 → 3.1 + 3.3 (co-develop) → 3.7 → 3.2 → 3.6 → 3.5(design; implement in Phase 4).

---

# Phase 4 — Future Features Roadmap

Each gated on the relevant Phase 3 foundation.

| # | Feature | Depends on | Complexity | Notes / Risk |
|---|---|---|---|---|
| 4.1 | **Long-term memory** | 3.2, 3.8 | XL | Productionize memory system; privacy/delete controls, consolidation jobs. |
| 4.2 | **Web search** | 3.5, 3.4 | M | First real tool. Provider (Brave/Bing/SerpAPI). Injection risk from results. |
| 4.3 | **Vision** | 3.4, 3.6 | M | Partly present (`mimo` vision). Standardize via provider capability + signed uploads. |
| 4.4 | **Image generation (real)** | 3.4, 2.5 | M | Replace SVG-via-LLM with DALL·E/SD/Flux via provider layer. Async (queue). |
| 4.5 | **Voice** | 3.4, 2.5, 3.6 | L | STT (Whisper) + TTS. Streaming audio; latency-sensitive. |
| 4.6 | **Canvas / Artifacts** | 2.3, 3.5 | L | Structured doc/code artifacts with live edit. Big frontend surface. |
| 4.7 | **Code execution sandbox** | 3.5, 2.4/2.5 | XL | **Highest security risk.** Must be isolated (Firecracker/gVisor/E2B/Docker-in-worker), resource-capped, network-egress-controlled. Never in-process. |
| 4.8 | **Citations** | 3.2/RAG, 4.2 | M | Track source spans through retrieval → render inline. Requires retrieval provenance. |
| 4.9 | **Reasoning mode** | 3.4, 3.7 | M | Route to reasoning models; expose thinking/steps (careful with token cost + latency). |
| 4.10 | **Planning mode** | 3.5, 4.9 | L | Multi-step plan → execute tools → verify. Loop-control + cost caps. |
| 4.11 | **Multi-agent workflows** | 3.5, 4.10 | XL | Orchestrator + specialized agents; message passing; cost/latency explosion risk — gate hard. |

---

# Prioritized Roadmap (highest → lowest ROI)

**Tier 0 — Do immediately (security/correctness, low effort, high risk-reduction):**
1. Env validation + JWT secret fix (1.5, 1.6-secret) — *tiny effort, closes a critical hole.*
2. Server-side media validation + consistent body limits (1.1, 1.2) — *closes bypass, fixes 413 pain.*
3. Rate-limit coverage + shared store (1.3, 1.4) — *auth brute-force + serverless correctness.*
4. Mongo-injection, Helmet, request-id/error handling (1.10, 1.7, 1.12) — *broad, cheap hardening.*
5. Dead-code cleanup (1.11) — *reduces surface, clears the path for the provider layer.*

**Tier 1 — Highest architectural ROI (unlocks everything else):**
6. **Provider abstraction layer (2.1/3.4)** — *the keystone; every AI improvement depends on it.*
7. **Storage redesign + indexing (3.8, 2.13, 2.16/2.17)** — *unlocks pagination, token accounting, memory.*
8. Token accounting + observability/health (2.12, 2.8–2.11) — *visibility before optimization.*
9. Signed direct uploads (3.6) — *removes the body-size bottleneck; big UX + cost win.*

**Tier 2 — Intelligence layer (the ChatGPT-level jump):**
10. Prompt builder + context management (3.3, 3.1) — *the biggest perceived quality gain.*
11. Model routing / cost optimization (3.7) — *quality + cost simultaneously.*
12. Standardized SSE streaming (2.3) + retry/fallback (2.2).
13. Memory system (3.2, 4.1) — *high value, high effort/risk; needs privacy controls.*

**Tier 3 — Extensibility & advanced features:**
14. Tool framework (3.5) → web search (4.2), real image gen (4.4), vision standardization (4.3).
15. Caching + queue/workers (2.6, 2.4/2.5) — *introduce when long jobs actually appear.*
16. Citations, reasoning/planning modes (4.8–4.10).
17. Voice, canvas/artifacts (4.5, 4.6).
18. Code execution sandbox, multi-agent (4.7, 4.11) — *highest risk/effort; do last, behind strong isolation.*

**Rationale for the ordering:** security fixes are cheap and non-negotiable, so they go first. The **provider abstraction** and **storage redesign** are the two structural keystones — nearly every Phase 3/4 item depends on one or both, so they precede all intelligence work even though they're not user-visible. Context/prompt-builder deliver the largest *felt* quality jump per unit effort once the keystones exist. Memory, tools, and sandboxed execution are the highest-value long-term differentiators but also the highest effort/risk, so they trail. Queues/workers are deliberately demand-gated — don't build the infra split until a real long-running job (embeddings at scale, real image gen, code exec) justifies leaving serverless.

**Recommended big decisions to make early:**
- **Redis yes/no** (affects rate-limit store, cache, queue). Deferring keeps everything on Mongo but limits queue quality.
- **Serverless-only vs add a worker service** (forced by queues/voice/code-exec/embeddings at scale).
- **Vector store** = Atlas Vector Search now, Qdrant as the growth path.

---

## Progress Tracker (resume here)

- [ ] Phase 1 — Production Hardening (1.1–1.12)
- [ ] Phase 2 — Scalable Backend (2.1–2.17)
- [ ] Phase 3 — AI Architecture (3.1–3.8)
- [ ] Phase 4 — Future Features (4.1–4.11)

**Next action when resuming:** begin Tier 0 (1.5 env validation + 1.6 JWT secret), then confirm the three "big decisions" above with the user before starting Tier 1 (provider layer + storage redesign).

*No implementation has begun. Awaiting go-ahead.*
