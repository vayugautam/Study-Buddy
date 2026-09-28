# Chapter 18: Real Challenges, Bugs & Debugging

This chapter is grounded in the **actual source code and real log files** of the AI Study Buddy backend. Every bug mentioned below was found by directly reading your `errors.log`, `last-error.json`, and project source files. This is not a generic guide — it is a forensic examination of your specific application.

---

## 1. Real Bugs Found in the Project

### 🔴 Bug #1: The Bearer Token Blackout (CONFIRMED in `errors.log`)

**Evidence:** The `errors.log` file contains hundreds of entries identical to this one logged at `2026-06-18T12:50:33.986Z`:

```json
{
  "message": "No token provided. Please log in.",
  "path": "/api/notes",
  "cookie": "refreshToken=eyJhbGciOiJIUzI1NiIs..."
}
```

**Root Cause Analysis:**
The browser sends a valid `refreshToken` cookie (visible in the log headers), but the frontend is **not** attaching the `Authorization: Bearer <accessToken>` header. The `protect` middleware in [`auth.middleware.js` (Line 22–27)](file:///e:/AI%20Study%20Buddy/backend/src/middlewares/auth.middleware.js) only looks for a Bearer token in headers, never cookies. This means:

1. The user loads the dashboard.
2. React immediately fires multiple parallel API calls (`/api/notes`, `/api/auth/me`, etc.).
3. The access token stored in JavaScript memory has either expired or was never re-attached after a page refresh (since memory is wiped on refresh, unlike an HttpOnly cookie).
4. All requests fail with `401`. The `refreshToken` cookie sits there unused because no interceptor is silently calling `/api/auth/refresh` first.

**Fix:** Implement an Axios response interceptor on the frontend that catches `401` errors, hits the refresh endpoint, updates the in-memory access token, and retries the original request. Alternatively, store the access token in `localStorage` (with the security tradeoffs noted).

---

### 🔴 Bug #2: The Vector Store Race Condition (in `embeddings.service.js`)

**Location:** [`embeddings.service.js` Lines 80–87](file:///e:/AI%20Study%20Buddy/backend/src/services/embeddings.service.js)

```js
// Line 80-87
const fileContent = await fs.readFile(VECTOR_STORE_PATH, 'utf-8');
const allVectors = JSON.parse(fileContent || '[]');
const filteredVectors = allVectors.filter(...);
filteredVectors.push(...newVectors);
await fs.writeFile(VECTOR_STORE_PATH, JSON.stringify(filteredVectors));
```

**Root Cause Analysis:**
This is a classic **Read-Modify-Write race condition**. If two users simultaneously upload PDFs:
1. User A reads `vectors.json` → gets `[...100 existing vectors]`
2. User B reads `vectors.json` → also gets `[...100 existing vectors]`
3. User A adds their 30 chunks and writes → file now has 130 vectors.
4. User B adds their 30 chunks to their **stale 100-vector copy** and writes → file now has 130 vectors again, **overwriting User A's data**.

This is a real production data-loss bug. **Fix:** Use a file-level locking mechanism (like `proper-lockfile`) or migrate to a real database (like ChromaDB, Redis, or MongoDB) for storing vectors.

---

### 🔴 Bug #3: `deleteAccount` Leaves Orphaned Data (in `auth.service.js`)

**Location:** [`auth.service.js` Lines 161–164](file:///e:/AI%20Study%20Buddy/backend/src/services/auth.service.js)

```js
// Line 161-164
async deleteAccount(userId) {
    const user = await User.findByIdAndDelete(userId);
    if (!user) throw new NotFoundError('User');
},
```

**Root Cause Analysis:**
Deleting the User document removes them from the `users` collection, but their **associated data is never cleaned up**. All their `Chat`, `Message`, `Note`, and `Flashcard` documents remain in the database permanently, becoming orphaned records. At scale, this bloats the database and wastes storage.

**Fix:** Add cascade deletes inside `deleteAccount`. Use `Promise.all` to simultaneously delete all associated resources, or implement MongoDB `pre('deleteOne')` hooks on the User model.

---

## 2. Possible Bugs (Architectural Risks)

### 🟡 Risk #1: LLM Quota Exhaustion Crashes Chat

**Location:** [`rag.service.js` Line 104](file:///e:/AI%20Study%20Buddy/backend/src/services/rag.service.js) calls `groqService.generateChatResponse(...)` — if the Groq API returns a `429 Quota Exceeded` or a network error, the uncaught exception bubbles up and sends a 500 to the user with no graceful degradation.

**Fix:** Wrap LLM calls in a try/catch that throws `GeminiApiError` or `LlmQuotaExceededError` (already defined in `AppError.js`) so the frontend gets a meaningful 429 message rather than a generic server crash.

---

### 🟡 Risk #2: Rate Limiter Bypassed in Development

**Location:** [`rateLimiter.middleware.js` Lines 43 and 66](file:///e:/AI%20Study%20Buddy/backend/src/middlewares/rateLimiter.middleware.js)

```js
// Line 43
skip: () => config.env === 'development',
```

Both the `globalLimiter` and `authLimiter` use `skip: () => config.env === 'development'`. This is a deliberate dev convenience but becomes dangerous if someone accidentally deploys with `NODE_ENV=development` in production. The entire rate-limiting layer is silently disabled, leaving the API open to brute-force attacks.

**Fix:** Add a startup assertion that crashes loudly if `NODE_ENV=development` is detected in a production environment variable context.

---

### 🟡 Risk #3: The `vectors.json` File Is Unbounded

**Location:** [`embeddings.service.js` Line 15](file:///e:/AI%20Study%20Buddy/backend/src/services/embeddings.service.js)

```js
const VECTOR_STORE_PATH = path.resolve(process.cwd(), 'data', 'vectors.json');
```

The entire vector database is a flat JSON file on disk. Every new user, every new note added will grow this file without limit. At scale, `JSON.parse` of a 100MB file on every chat question will be catastrophically slow.

---

## 3. How to Debug Systematically

### Step 1: Read the Logs
Your `errors.log` in `backend/` is invaluable. Every unhandled error is appended there by the `globalErrorHandler` (see [`error.middleware.js` Lines 204–214](file:///e:/AI%20Study%20Buddy/backend/src/middlewares/error.middleware.js)):
```js
// Line 204-214 — the actual log-writing code
import('fs').then(fs => fs.appendFileSync('errors.log', JSON.stringify({...})));
```
> [!TIP]
> Search the log file for unique patterns: `grep "path" errors.log | sort | uniq -c | sort -rn` shows which API endpoints fail most.

### Step 2: Isolate Frontend vs Backend
Use Postman or `cURL` to call the backend API directly **without** the frontend. If it works in Postman but not the browser:
- It's a **CORS** or **missing header** issue (like the Bearer token bug above).

### Step 3: Add Targeted Logging
Insert `logger.debug(...)` at the start of a service function you suspect. The `logger.js` utility is already set up for this. Don't use `console.log` in production code.

### Step 4: Use the VS Code Node.js Debugger
In VS Code, create a `.vscode/launch.json` config with `"runtimeArgs": ["--inspect"]` to set breakpoints directly in your service files and step through code line by line.

---

## 4. Common Errors Reference Table

| Error | HTTP Code | Where It's Thrown | Root Cause |
|---|---|---|---|
| `No token provided` | 401 | `auth.middleware.js:30` | Frontend not sending `Authorization` header |
| `TokenExpiredError` | 401 | `auth.middleware.js:38-40` | Access token lifetime exceeded |
| `Invalid ID format` | 404 | `error.middleware.js:17-22` | Mongoose `CastError` — bad ObjectId |
| `Duplicate value for "email"` | 409 | `error.middleware.js:31-38` | MongoDB unique index violation |
| `File size exceeds limit` | 400 | `error.middleware.js:98` | Multer upload limit hit |
| `RATE_LIMIT_EXCEEDED` | 429 | `rateLimiter.middleware.js` | Too many requests in window |
| `VECTOR_QUERY_ERROR` | 500 | `embeddings.service.js:150` | JSON parse fail or `fs` error |

---

## 5. JWT Issues

The `auth.service.js` uses a two-token system:
- **Access Token** (`config.jwt.secret`, short expiry) — sent in `Authorization: Bearer` header.
- **Refresh Token** (`config.jwt.refreshSecret`, long expiry) — sent via HttpOnly cookie.

**Common JWT pitfalls in this project:**
- **Missing Refresh Endpoint Logic:** The project has `generateTokenPair` but no `/api/auth/refresh` endpoint is visible in the routes. If this endpoint doesn't exist, the silent refresh strategy is impossible.
- **Secret Rotation:** If `JWT_SECRET` in `.env` changes, all existing access tokens become instantly invalid (different from the refresh token secret). All logged-in users are kicked out simultaneously.

---

## 6. AI (LLM) Issues

**The `RELEVANCE_THRESHOLD` Quirk:**

In [`rag.service.js` Line 13](file:///e:/AI%20Study%20Buddy/backend/src/services/rag.service.js):
```js
const RELEVANCE_THRESHOLD = 0.99;
```
ChromaDB uses **cosine distance** (0 = identical, 2 = opposite). A threshold of `0.99` means nearly every chunk passes the relevance filter. This can cause the LLM to receive irrelevant context, leading to poor or hallucinated answers. A better threshold is `0.4`–`0.6` depending on the embedding model.

---

## 7. Deployment Issues

- **`vectors.json` Is Not Committed:** The `data/` directory (which holds the vector store) is likely in `.gitignore`. When you deploy to a server, there are **no embeddings**. Uploads will generate new embeddings, but users will find the AI gives empty responses on a fresh deployment until they re-upload.
- **Port Conflicts:** The backend defaults to `PORT=3000`. If deployed alongside another service, port conflicts cause a silent crash without a clear error.

---

## 8. Debugging Interview Questions

1. **"You see 500 errors in production for `/api/chat/ask` but it works locally. What's your first move?"**
   *(Check production env vars → specifically `GEMINI_API_KEY` and `GROQ_API_KEY`. A missing API key will throw a 500 from the LLM service.)*

2. **"A user reports the AI gives completely wrong answers that have nothing to do with their uploaded notes. How do you debug this?"**
   *(Check the RAG pipeline: First, verify that the note was actually embedded by checking `vectors.json`. Then, test `queryRelevantChunks` in isolation to see what context is being retrieved. Finally, check if `RELEVANCE_THRESHOLD` (0.99) is too permissive, flooding the prompt with unrelated chunks.)*

3. **"The backend crashes after running for 6 hours in production with an out-of-memory error. What could cause this?"**
   *(The `vectors.json` file grows unbounded. The `queryRelevantChunks` function reads and parses the entire file into memory on every chat request. After many PDF uploads, the file becomes too large to parse without OOM errors.)*

4. **"You see in the errors.log that `deleteOne` is called but `deletedCount` is 0 — but you're sure the document exists. What's wrong?"**
   *(The `_id` passed is likely a string but the query expects a Mongoose ObjectId. Mongoose's `deleteOne({ _id: '123abc' })` silently fails if the format doesn't match. Always validate IDs with `mongoose.Types.ObjectId.isValid()` before querying.)*

5. **"You have a bug where two simultaneous PDF uploads from the same user corrupt the `vectors.json` file. How would you fix it without switching databases?"**
   *(Implement a file-level mutex using a library like `proper-lockfile`. Before reading, acquire a lock. After writing, release the lock. Any concurrent writer will wait. Long-term fix: migrate to a real database such as MongoDB with GridFS or a dedicated vector database like Qdrant/ChromaDB.)*
