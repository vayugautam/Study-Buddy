# Chapter 17: Codebase Deep Dive & Documentation

To truly master the **AI Study Buddy** application, you must understand how the different architectural layers interact. This chapter provides a deep dive into representative, critical files across the backend infrastructure, explaining every function, class, and API definition with exact line numbers.

---

## 1. Utilities

Utilities provide shared, reusable logic across the application. The most critical utility manages our structured error handling.

### `backend/src/utils/AppError.js`
This file defines a custom error class hierarchy for structured, operational error handling, ensuring consistent JSON responses.

- **`class AppError` (Line 10-23):** The base class extending the native Node.js `Error`. It adds `statusCode`, `errorCode`, and flags the error as `isOperational = true` so the global error handler knows it's an expected application error, not a severe bug.
- **`class ValidationError` (Line 29-37):** Extends `AppError`. Used when Zod payload validation fails (Status 400).
- **`class UnauthorizedError` (Line 43-50):** Extends `AppError`. Thrown when authentication (JWT) fails or is missing (Status 401).
- **`class ForbiddenError` (Line 56-63):** Extends `AppError`. Thrown when an authenticated user tries to access a resource they don't own (Status 403).
- **`class NotFoundError` (Line 69-76):** Extends `AppError`. Thrown when a queried database document does not exist (Status 404).

---

## 2. Middlewares

Middlewares intercept HTTP requests before they reach the controller. They are heavily used for validation and security.

### `backend/src/middlewares/auth.middleware.js`
Protects routes by ensuring the user is logged in.

- **`const protect = catchAsync(...)` (Line 18-54):** 
  - Extracts the Bearer token from the `req.headers.authorization` string (Line 26).
  - Uses `jwt.verify()` to decode the token with the server's secret (Line 36).
  - Fetches the `User` from the database using the decoded token ID (Line 45).
  - Attaches the fetched user to `req.user` (Line 52) so subsequent controllers know *who* made the request.
  - Calls `next()` to proceed. Throws `UnauthorizedError` if any step fails.

---

## 3. API Routes

Routes map HTTP verbs and URLs to specific controllers and inject necessary middlewares.

### `backend/src/routes/chat.routes.js`
Defines the endpoints for the AI Chat feature.

- **Zod Schemas (Lines 19-36):** Defines `askSchema` and `updateChatSchema`. These ensure that the incoming JSON body contains required fields like `query` or `title` before the controller even executes.
- **`router.use(protect)` (Line 45):** Applies the `protect` authentication middleware to *all* routes defined below it.
- **`router.post('/ask', ...)` (Line 47):** 
  - **API:** `POST /api/chat/ask`
  - Injects `llmLimiter` (rate-limiting), `validate(askSchema)`, and maps to the `ask` controller.
- **`router.post('/')` (Line 48):** Maps to `createChatSession`.
- **`router.get('/')` (Line 49):** Maps to `getChats`.
- **`router.get('/:id')` (Line 50):** Maps to `getChat`.
- **`router.patch('/:id')` (Line 51):** Maps to `updateChat`.
- **`router.delete('/:id')` (Line 52):** Maps to `deleteChat`.

---

## 4. Controllers

Controllers are thin layers that extract data from the `req` object, pass it to the service layer, and format the HTTP `res` response.

### `backend/src/controllers/chat.controller.js`
- **`const ask = catchAsync(...)` (Line 16-38):** Extracts `query`, `chatId`, and `noteIds` from `req.body`. If no `chatId` exists, it triggers the service to create a new one. It calls `chatService.sendMessage()` and sends a successful JSON response using the `successResponse` utility.
- **`const getChats` (Line 45-48):** Fetches paginated/filtered chats by passing `req.user._id` (extracted by the `protect` middleware) to `chatService.getUserChats`.
- **`const createChatSession` (Line 50-57):** Extracts title and notes to explicitly create a chat session.
- **`const getChat` (Line 64-67):** Fetches a single chat by passing `req.params.id`.
- **`const deleteChat` (Line 74-77):** Triggers deletion and returns a 200 success message.
- **`const updateChat` (Line 84-87):** Passes `req.body` to update the chat session properties.

---

## 5. Services

Services house the core business logic. They interact with databases and external APIs. Controllers rely on services to do the heavy lifting.

### `backend/src/services/chat.service.js`
Manages chat database operations and orchestrates AI responses.

- **`async createChat(...)` (Line 19-42):** Validates that the provided `noteIds` are valid ObjectIds. Queries the `Note` collection to ensure the `ownerId` actually owns the requested notes (Security check). Creates a new `Chat` document in MongoDB.
- **`async sendMessage(...)` (Line 48-126):** The most complex function in the chat feature.
  1. Validates chat ownership (Line 50).
  2. Saves the user's `query` as a `Message` document in the DB (Line 72).
  3. Fetches the last 6 messages for LLM context (Line 80) and reverses them chronologically.
  4. Calls `ragService.generateAnswer()` (Line 93) passing the query, history, and selected note documents.
  5. Formats the citations returned by the RAG service (Line 101).
  6. Saves the AI's answer as an assistant `Message` document (Line 108).
  7. Updates the chat's `lastActivityAt` timestamp (Line 117).
- **`async getUserChats(...)` (Line 131-134):** Runs a simple Mongoose `.find()` sorted by recent activity.
- **`async getChatById(...)` (Line 139-152):** Fetches a chat and all associated messages.
- **`async updateChat(...)` (Line 157-169):** Uses Mongoose `findOneAndUpdate` to update chat fields (like title).
- **`async deleteChat(...)` (Line 174-185):** Verifies ownership and deletes the Chat document. Crucially, uses a cascade delete (`Message.deleteMany`) to wipe all associated messages to prevent orphaned documents in the database.

---

## 6. System Design Interview Questions

1. **"Why do we extract the JWT verification logic into a `protect` middleware instead of putting it inside the `chat.controller.js`?"**
   *(Expected answer: DRY principle (Don't Repeat Yourself). The `protect` logic is needed across dozens of routes. Middleware allows us to attach `req.user` cleanly before the controller executes.)*

2. **"Looking at `AppError.js`, why do we set `this.isOperational = true` on our custom errors?"**
   *(Expected answer: To distinguish expected errors (like validation failures or bad passwords) from unexpected programming bugs (like a null pointer exception). The global error handler can send friendly messages to the client for operational errors, but log and obscure programming bugs for security.)*

3. **"In `chat.service.js`, during `deleteChat`, we delete the Chat, and then delete the Messages. What happens if the server crashes exactly between those two operations?"**
   *(Expected answer: We would have orphaned messages in the database. In a high-reliability system, this should be wrapped in a MongoDB Transaction session so both operations succeed or fail together.)*

4. **"Why do we validate that a user owns the `noteIds` before creating a chat in `chat.service.js`, rather than just trusting the IDs sent from the frontend?"**
   *(Expected answer: Never trust the client. If we don't validate ownership, a malicious user could pass the `noteId` of another user's private document, forcing the LLM to read it and leak its contents in the chat (Broken Access Control).)*
