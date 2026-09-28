# Chapter 21 (Part 1 of 3): Interview Questions — Beginner & Intermediate

---

## 🟢 100 Beginner Questions & Answers

### JavaScript & Node.js Basics

**Q1. What is Node.js?**
> Node.js is a JavaScript runtime built on Chrome's V8 engine that allows JavaScript to run outside the browser — on a server. It uses a non-blocking, event-driven I/O model making it ideal for I/O-heavy applications like our Express backend.

**Q2. What is `async/await` and why do we use it?**
> `async/await` is syntactic sugar over Promises that allows writing asynchronous code in a synchronous style. In AI Study Buddy, every database call and AI API call is async. Using `await` makes the code readable rather than chaining `.then()` callbacks.

**Q3. What is `npm` and what is `package.json`?**
> `npm` is the Node Package Manager. `package.json` is the project manifest that declares the project's name, version, scripts, and all dependencies. Both the frontend and backend have their own `package.json`.

**Q4. What does `export default` and `export { }` mean in JavaScript?**
> `export default` exports a single value as the module's main export. Named exports (`export { }`) let you export multiple values. In AI Study Buddy services (e.g. `chatService`), we use `export default` since there's one service object per file.

**Q5. What is REST and what are the main HTTP methods?**
> REST (Representational State Transfer) is an architectural style for APIs. Key HTTP methods: `GET` (read), `POST` (create), `PUT`/`PATCH` (update), `DELETE` (delete). Our Express backend uses all of these across chat, notes, quiz, and flashcard routes.

**Q6. What is JSON?**
> JSON (JavaScript Object Notation) is a text-based data format used to exchange data between client and server. All our API responses are JSON.

**Q7. What is an API?**
> An Application Programming Interface defines how software components communicate. Our Express backend exposes a REST API that the React frontend consumes to fetch data and trigger AI operations.

**Q8. What is Express.js?**
> Express is a minimal and flexible Node.js web framework that provides routing, middleware, and request/response handling. Our entire backend is built on Express.

**Q9. What is middleware in Express?**
> Middleware is a function with access to `req`, `res`, and `next`. It runs between receiving a request and sending a response. Examples in our project: `protect` (auth), `validate` (Zod), `globalLimiter` (rate limiting).

**Q10. What is CORS?**
> Cross-Origin Resource Sharing is a browser security mechanism that blocks requests from a different origin unless the server explicitly allows it. In `app.js`, we configure `cors({ origin: config.cors.origin })` so our React frontend can call the Express backend.

**Q11. What is `.env` and why should it not be committed to Git?**
> `.env` files contain environment-specific secrets like API keys and database URIs. Committing them to Git exposes them publicly. Both frontend and backend `.env` files are in `.gitignore`.

**Q12. What is a Promise in JavaScript?**
> A Promise represents the eventual result of an asynchronous operation. It can be pending, fulfilled, or rejected. Node.js database queries and AI API calls all return Promises.

**Q13. What is `try/catch` used for?**
> `try/catch` handles runtime errors gracefully. If the code in the `try` block throws, the `catch` block handles it. The `catchAsync` utility in our project wraps async handlers so errors are forwarded to the Express error handler instead of crashing.

**Q14. What is a callback function?**
> A function passed as an argument to another function and invoked after an operation completes. The `next` parameter in Express middleware is a callback that passes control to the next middleware.

**Q15. What is `process.env`?**
> `process.env` is a Node.js global object containing all environment variables. We use Zod validation in `env.config.js` to parse and validate these before the server starts.

---

### React Basics

**Q16. What is React?**
> React is a JavaScript library for building user interfaces using a component-based architecture. Our frontend is a React application built with Vite.

**Q17. What is JSX?**
> JSX is a syntax extension that allows writing HTML-like code inside JavaScript. Vite's `@vitejs/plugin-react` transpiles JSX to regular JavaScript function calls.

**Q18. What is a React component?**
> A reusable, self-contained piece of UI. Components receive props as input and return JSX as output. Our frontend is made entirely of React components (pages, cards, forms, etc.).

**Q19. What is `useState`?**
> A React Hook that lets functional components hold and update local state. When state changes, the component re-renders with the new value.

**Q20. What is `useEffect`?**
> A React Hook for handling side effects like data fetching, subscriptions, or DOM manipulation. It runs after render and can be configured to run only when specific values change.

**Q21. What are props in React?**
> Props (properties) are read-only data passed from a parent component to a child component. They allow components to be dynamic and reusable.

**Q22. What is Zustand?**
> Zustand is a minimal state management library for React. It replaces the need for complex Redux setups. Our frontend uses Zustand to manage global state like the authenticated user and chat sessions.

**Q23. What is Vite?**
> Vite is a fast build tool for modern web projects. It uses native ES modules during development for near-instant hot module replacement and Rollup for optimized production builds.

**Q24. What is Tailwind CSS?**
> Tailwind CSS is a utility-first CSS framework that provides low-level CSS classes. Our frontend uses Tailwind for styling components directly in JSX.

**Q25. What is `react-router-dom`?**
> A library for client-side routing in React applications. It maps URL paths to React components, enabling navigation without a full page reload.

**Q26. What is a React Hook?**
> A function prefixed with `use` that lets you add React features (state, effects, context, etc.) to functional components. All modern React code uses Hooks instead of class components.

**Q27. What does `key` prop do in React lists?**
> The `key` prop helps React identify which items in a list have changed, been added, or removed — enabling efficient DOM reconciliation (the diffing algorithm).

**Q28. What is conditional rendering?**
> Rendering different UI based on a condition. In React: `{isLoggedIn ? <Dashboard /> : <Login />}`.

**Q29. What is Framer Motion?**
> A React animation library that provides declarative animations via props like `initial`, `animate`, and `exit`. Used in AI Study Buddy for smooth page transitions and micro-animations.

**Q30. What is `react-hook-form`?**
> A library for managing form state and validation in React. It uses uncontrolled components for performance and integrates well with Zod for schema validation.

---

### MongoDB & Database Basics

**Q31. What is MongoDB?**
> MongoDB is a NoSQL document database that stores data as JSON-like BSON documents. It's schema-flexible, making it ideal for our varied data types (users, chats, notes, flashcards).

**Q32. What is Mongoose?**
> Mongoose is an ODM (Object Data Modeling) library for MongoDB and Node.js. It provides schema definitions, model methods, and query helpers on top of the MongoDB driver.

**Q33. What is a MongoDB document?**
> A record in MongoDB — equivalent to a row in SQL. It's a JSON-like object with field-value pairs. A `Chat` document contains `ownerId`, `title`, `noteIds`, and `lastActivityAt`.

**Q34. What is a MongoDB collection?**
> A group of documents — equivalent to a SQL table. We have collections for Users, Chats, Messages, Notes, Flashcards, and Quiz Attempts.

**Q35. What is a Schema in Mongoose?**
> A blueprint that defines the structure, data types, and validation rules for documents in a MongoDB collection. All our Mongoose models start with a Schema definition.

**Q36. What is an ObjectId in MongoDB?**
> A 12-byte unique identifier automatically assigned to every MongoDB document as its `_id`. Used to reference documents across collections (e.g., `Chat.ownerId` references `User._id`).

**Q37. What does `.find()` do in Mongoose?**
> Returns all documents matching a query from a collection. `Chat.find({ ownerId })` returns all chats belonging to a specific user.

**Q38. What does `.findById()` do?**
> Finds a single document by its `_id` field. `User.findById(decoded.id)` is used in the auth middleware to verify a JWT token's user exists.

**Q39. What is `async/await` with Mongoose?**
> All Mongoose operations are asynchronous and return Promises, so they must be `await`ed. `const user = await User.findOne({ email })` waits for the database to respond before continuing.

**Q40. What is indexing in MongoDB?**
> An index is a data structure that improves query speed by allowing MongoDB to find documents without scanning every record. Fields like `userId` and `createdAt` should be indexed in production.

---

### Authentication Basics

**Q41. What is JWT?**
> JSON Web Token — a compact, URL-safe token that encodes a JSON payload and signs it with a secret. Used to authenticate API requests without storing session state on the server.

**Q42. What are the three parts of a JWT?**
> Header (algorithm), Payload (data like userId), and Signature (HMAC of header + payload using the secret). Separated by dots: `xxxxx.yyyyy.zzzzz`.

**Q43. What is `bcrypt`?**
> A password hashing library. It hashes passwords with a salt factor, making brute-force attacks extremely slow. `bcryptjs` is used in our User model to hash passwords before saving.

**Q44. Why should passwords never be stored in plain text?**
> If the database is compromised, plain-text passwords expose every user account. Hashing ensures even the database owner cannot read passwords.

**Q45. What is an HttpOnly cookie?**
> A cookie flag that prevents JavaScript from accessing the cookie. Our refresh token is stored as an HttpOnly cookie, protecting it from XSS attacks.

**Q46. What is the difference between authentication and authorization?**
> Authentication verifies *who you are* (login). Authorization verifies *what you're allowed to do* (can this user access this resource?). The `protect` middleware handles authentication; ownership checks in services handle authorization.

**Q47. What is `jwt.sign()`?**
> Creates a new JWT. `jwt.sign({ id: userId }, config.jwt.secret, { expiresIn: '7d' })` creates a token with the user's ID that expires in 7 days.

**Q48. What is `jwt.verify()`?**
> Decodes and verifies a JWT's signature. If the token is tampered with or expired, it throws an error. Used in `auth.middleware.js` to validate incoming requests.

**Q49. What is a refresh token?**
> A long-lived token used to obtain a new access token when the short-lived one expires. Stored in an HttpOnly cookie for security. Our system uses `JWT_REFRESH_SECRET` to sign it.

**Q50. What is an access token?**
> A short-lived token included in the `Authorization: Bearer <token>` header of API requests. It grants access to protected endpoints.

---

### General Web Concepts

**Q51–Q100** cover HTTP status codes, frontend-backend interaction, file uploads, APIs, and basic security.

**Q51. What does HTTP status 200 mean?** → OK. Request succeeded.
**Q52. What does HTTP status 201 mean?** → Created. A new resource was successfully created (e.g., creating a new chat session returns 201).
**Q53. What does HTTP status 400 mean?** → Bad Request. The server couldn't process the request due to client error (validation failure).
**Q54. What does HTTP status 401 mean?** → Unauthorized. Authentication failed or was not provided (missing/invalid JWT).
**Q55. What does HTTP status 403 mean?** → Forbidden. Authentication succeeded but the user doesn't have permission for this resource.
**Q56. What does HTTP status 404 mean?** → Not Found. The requested resource doesn't exist (NotFoundError in our project).
**Q57. What does HTTP status 409 mean?** → Conflict. The resource already exists (ConflictError for duplicate email).
**Q58. What does HTTP status 429 mean?** → Too Many Requests. Rate limit exceeded (RateLimitError).
**Q59. What does HTTP status 500 mean?** → Internal Server Error. An unexpected error occurred on the server.
**Q60. What does HTTP status 502 mean?** → Bad Gateway. An upstream service (like the Gemini API) returned an invalid response.
**Q61. What is a query parameter?** → Key-value pairs appended to a URL after `?`. Example: `/api/chats?limit=10&page=2`.
**Q62. What is a route parameter?** → Dynamic segment of a URL path. Example: `/api/chats/:id` — the `:id` is a route parameter.
**Q63. What is `req.body`?** → The parsed JSON body of an HTTP POST/PATCH request. Requires `express.json()` middleware.
**Q64. What is `req.params`?** → An object containing route parameters extracted from the URL path.
**Q65. What is `req.query`?** → An object containing query string parameters from the URL.
**Q66. What is `req.user`?** → Not a default Express property — we attach the authenticated user to `req.user` in `auth.middleware.js` so downstream controllers know who made the request.
**Q67. What is Multer?** → A Node.js middleware for handling `multipart/form-data` — used in our project for PDF file uploads.
**Q68. What is a rate limiter?** → Middleware that limits the number of requests a client can make in a time window. Prevents brute-force attacks and API abuse.
**Q69. What is Helmet?** → A collection of Express middleware functions that set HTTP response headers to improve security (X-Content-Type-Options, X-Frame-Options, etc.).
**Q70. What is `express-mongo-sanitize`?** → Strips `$` and `.` from user input to prevent MongoDB operator injection attacks.
**Q71. What is Zod?** → A TypeScript-first schema validation library. Used in our project to validate environment variables and API request bodies.
**Q72. What is Morgan?** → HTTP request logger middleware for Express. We use it in development to log every incoming request to the console.
**Q73. What is dotenv?** → A package that loads environment variables from a `.env` file into `process.env`.
**Q74. What is `nodemon`?** → A development tool that automatically restarts the Node.js server when file changes are detected. Used via `npm run dev`.
**Q75. What is HTTPS?** → HTTP over TLS/SSL. Encrypts traffic between the client and server. Mandatory in production to protect tokens and user data.
**Q76. What is a CDN?** → Content Delivery Network. Distributes static assets from servers geographically close to the user for faster load times.
**Q77. What is Axios?** → A promise-based HTTP client for the browser and Node.js. The frontend uses Axios to make all API calls to the backend.
**Q78. What is a React Router?** → Client-side routing library that maps URLs to React components without full page reloads.
**Q79. What is localStorage?** → Browser storage that persists data across sessions (survives page refresh). Often used for access tokens, though HttpOnly cookies are more secure.
**Q80. What is sessionStorage?** → Similar to localStorage but data is cleared when the browser tab is closed.
**Q81. What is XSS?** → Cross-Site Scripting. An attacker injects malicious JavaScript into a web page. HttpOnly cookies and CSP headers protect against it.
**Q82. What is CSRF?** → Cross-Site Request Forgery. Tricks a user's browser into making unauthorized requests. Prevented with CSRF tokens or `SameSite` cookie attributes.
**Q83. What is an embedding?** → A numerical vector representation of text. Semantically similar texts have mathematically close embeddings. Used in our RAG pipeline for semantic search.
**Q84. What is a vector?** → A list of numbers. Text embeddings are vectors with hundreds or thousands of dimensions.
**Q85. What is cosine similarity?** → A metric measuring the angle between two vectors. A score of 1 means identical direction (very similar), 0 means perpendicular (unrelated).
**Q86. What is chunking in a RAG system?** → Splitting a large document into smaller, overlapping segments so embeddings represent focused ideas rather than entire documents.
**Q87. What is a LLM?** → Large Language Model. AI models like Gemini and LLaMA 3 trained on vast amounts of text data to understand and generate natural language.
**Q88. What is a system prompt?** → Instructions given to an LLM before the user's message that defines its persona and behavior. In `rag.service.js`, the system prompt instructs the AI to answer only from the provided context.
**Q89. What is prompt engineering?** → Crafting the input text (prompt) given to an LLM to get the desired output quality and format.
**Q90. What is a hallucination in AI?** → When an LLM generates confident but factually incorrect information. RAG reduces hallucinations by grounding responses in retrieved source documents.
**Q91. What is RAG?** → Retrieval-Augmented Generation. Combines a vector search retrieval step with LLM generation so the AI answers based on specific documents, not just training data.
**Q92. What is Docker?** → A platform for running applications in isolated containers. Ensures consistent environments across development, staging, and production.
**Q93. What is `docker-compose.yml`?** → A configuration file that defines multi-container Docker applications. Our project has one for running the backend alongside services.
**Q94. What is a `.gitignore` file?** → Lists files and directories that Git should not track. `.env` files, `node_modules`, and `uploads/` are excluded.
**Q95. What is `npm install`?** → Installs all packages listed in `package.json` into the `node_modules` directory.
**Q96. What is `npm run dev`?** → Executes the `dev` script defined in `package.json`. For the frontend, it starts Vite. For the backend, it starts nodemon.
**Q97. What is ES Modules (`type: "module"`)?** → A modern JavaScript module system using `import`/`export` instead of CommonJS's `require`. Both frontend and backend use ES Modules.
**Q98. What is `Object.freeze()`?** → Makes an object immutable. Used in `env.config.js` to prevent accidental modification of the configuration object at runtime.
**Q99. What is `Promise.all()`?** → Runs multiple Promises in parallel and waits for all to resolve. More efficient than awaiting them sequentially when they are independent.
**Q100. What is the difference between `==` and `===`?** → `==` performs type coercion before comparison; `===` checks value AND type. Always use `===` in JavaScript to avoid unexpected behavior.

---

## 🟡 100 Intermediate Questions & Answers

### Backend Architecture

**Q1. What is the difference between a controller and a service?**
> A controller handles HTTP concerns (parsing `req`, forming `res`). A service contains business logic and interacts with the database. This separation ensures controllers are thin and business logic is independently testable. In our project, `chat.controller.js` delegates to `chatService` for all meaningful work.

**Q2. Why do we use `catchAsync` instead of try/catch in every controller?**
> `catchAsync` wraps async handlers and forwards any rejected Promise to `next(err)`, which routes it to the global error handler. This removes repetitive try/catch boilerplate from every controller and ensures no async error is ever silently swallowed.

**Q3. What is the purpose of the `AppError` class hierarchy?**
> It lets us distinguish operational errors (expected failures like invalid login) from programmer errors (unexpected bugs). The `isOperational` flag on `AppError` subclasses tells the global error handler whether to send a friendly JSON response or log a generic 500 error.

**Q4. What is tenant isolation and how is it enforced?**
> Tenant isolation ensures users can only access their own data. In every Mongoose query that fetches user data, we include `ownerId: req.user._id` as a filter condition. This means even if an attacker sends someone else's `chatId`, the query returns null because the ownerId doesn't match.

**Q5. What is the purpose of `express-mongo-sanitize`?**
> It strips MongoDB operators (`$gt`, `$where`, etc.) from request bodies and query strings, preventing NoSQL injection attacks where an attacker manipulates query logic by passing objects instead of strings.

**Q6. How does `helmet` improve security?**
> Helmet sets HTTP response headers like `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Strict-Transport-Security`. These prevent MIME-type sniffing, clickjacking, and insecure redirects at the browser level.

**Q7. What is the difference between `findOne()` and `findById()`?**
> `findById(id)` is syntactic sugar for `findOne({ _id: id })`. Functionally identical, but `findById` is more expressive when you're searching by the primary key.

**Q8. What is `findOneAndUpdate()` and what does `{ new: true }` do?**
> `findOneAndUpdate` atomically finds a document, updates it, and returns it. `{ new: true }` returns the *updated* document rather than the original pre-update version. Used in `chatService.updateChat()`.

**Q9. What is `runValidators: true` in Mongoose?**
> By default, `update` operations bypass Mongoose schema validators. `runValidators: true` forces them to run, ensuring data integrity even during updates.

**Q10. What is the difference between `deleteOne` and `deleteMany`?**
> `deleteOne` removes the first matching document. `deleteMany` removes all matching documents. In `chatService.deleteChat()`, we use `deleteOne` for the chat and `deleteMany` for cascading message deletion.

**Q11. Why do we check `result.deletedCount === 0` after a delete?**
> `deleteOne` doesn't throw an error if no document matches — it simply returns `{ deletedCount: 0 }`. Checking this value allows us to throw a `NotFoundError` if the document didn't exist or didn't belong to the user.

**Q12. What is the difference between `PUT` and `PATCH`?**
> `PUT` replaces the entire resource with the request payload. `PATCH` applies a partial update. We use `PATCH /api/chats/:id` since we only update the title, not the entire chat document.

**Q13. What does `router.use(protect)` do vs applying `protect` per-route?**
> `router.use(protect)` applies the middleware to every route defined *after* it in that router file. It's cleaner and less error-prone than manually adding `protect` to each route definition.

**Q14. How does Zod schema validation work as middleware?**
> The `validate(schema)` middleware runs Zod's `schema.safeParse({ body: req.body })`. If validation fails, it extracts the error messages and throws a `ValidationError`. If it passes, it calls `next()` to proceed to the controller.

**Q15. What is the difference between `lean()` and not using it in Mongoose?**
> By default, Mongoose returns full document objects with methods like `.save()`. `.lean()` returns plain JavaScript objects, which are smaller and faster to work with when you only need to read data. Used in `chatService.sendMessage()` for fetching history.

**Q16. What is the purpose of `Error.captureStackTrace(this, this.constructor)` in AppError?**
> It removes the `AppError` constructor call itself from the stack trace, making error stacks cleaner and pointing directly to where the error was *thrown*, not where the error class was defined.

**Q17. What is the difference between `logger.error()` and `console.error()`?**
> `console.error` writes to stderr in an unstructured way. A logger like Winston/Pino produces structured JSON logs with timestamps, log levels, and metadata — making logs parseable by log aggregation tools in production.

**Q18. How does the global error handler decide between `sendOperationalError` and `sendProdError`?**
> It checks `error.isOperational`. If `true`, it's an expected `AppError` and sends a structured JSON response. If `false`, it's an unexpected bug — it logs the full details server-side and sends a generic 500 response to the client to avoid leaking implementation details.

**Q19. What does `morgan` log in development mode?**
> Method, URL, status code, response time, and content length for every request. Helps developers see exactly which endpoints are being hit and how fast they respond.

**Q20. Why is `contentSecurityPolicy: false` a security risk?**
> CSP prevents loading of scripts, styles, and other resources from unauthorized origins. Disabling it entirely removes a major browser-level XSS defense mechanism.

---

### Authentication Deep Dive

**Q21. Why use two separate secrets for access and refresh tokens?**
> Using different secrets (`JWT_SECRET` vs `JWT_REFRESH_SECRET`) means that compromising one doesn't compromise the other. An attacker who steals a refresh token secret cannot forge access tokens, and vice versa.

**Q22. What happens when an access token expires?**
> `jwt.verify()` throws a `TokenExpiredError`. In `auth.middleware.js`, this is caught and re-thrown as an `UnauthorizedError` with a "session expired" message. The frontend should then silently use the refresh token to get a new access token.

**Q23. Why is the refresh token stored in a cookie and not localStorage?**
> HttpOnly cookies are not accessible to JavaScript, making them immune to XSS attacks. A refresh token in localStorage can be stolen if an attacker manages to run arbitrary JavaScript on the page.

**Q24. What is `User.findOne({ email }).select('+passwordHash')`?**
> The `passwordHash` field is excluded from query results by default (via `select: false` in the schema). The `+` prefix in `.select('+passwordHash')` explicitly re-includes it for the login operation where we need to compare the submitted password.

**Q25. Why do we throw the same error for both "user not found" and "wrong password" during login?**
> To prevent username enumeration attacks — if we return different errors for each case, an attacker can determine which email addresses are registered by observing the error message.

---

### RAG & AI Architecture

**Q26. What is the difference between Gemini and Groq in our project?**
> Gemini (`@google/genai`) is used for generating high-quality vector embeddings (`text-embedding-004`). Groq (`groq-sdk`) runs LLaMA 3.3 70B for chat responses, quiz generation, and flashcard creation — chosen for its speed and generous free-tier for generation tasks.

**Q27. What does `RecursiveCharacterTextSplitter` do?**
> Splits text into chunks of a target size (1000 characters) with an overlap (200 characters). The overlap ensures context isn't lost at chunk boundaries — important for coherent retrieval.

**Q28. What is cosine distance vs cosine similarity?**
> Cosine similarity is a score from -1 to 1 (higher = more similar). Cosine distance is `1 - cosine_similarity` (lower = more similar). ChromaDB returns distances, which is why we compare `distance < RELEVANCE_THRESHOLD` to filter relevant chunks.

**Q29. What is the `topK` parameter in `queryRelevantChunks`?**
> Specifies how many of the most similar chunks to return. We use `topK: 5` meaning we retrieve the 5 most semantically relevant chunks to include in the AI's context window.

**Q30. What is the system prompt in `rag.service.js` designed to do?**
> It instructs the AI to: (1) only answer from the provided context, (2) say "I cannot find that" if the answer isn't in the notes, and (3) cite its sources. This dramatically reduces hallucinations and makes answers trustworthy.

**Q31. Why do we retrieve the last 6 messages for chat history context?**
> LLMs have token limits. Sending the entire conversation history would exceed the context window and be expensive. 6 messages (3 exchanges) provides enough conversational context for follow-up questions without token bloat.

**Q32. What would happen if `RELEVANCE_THRESHOLD` were set to 1.0?**
> No chunks would pass the filter (cosine distance is never exactly 1.0 for meaningful text). The context would be empty and the AI would always respond with "I cannot find that information in your notes."

**Q33. What is the difference between `embedAndStore` and `queryRelevantChunks`?**
> `embedAndStore` is called once when a PDF is uploaded — it converts text chunks to embedding vectors and stores them. `queryRelevantChunks` is called on every chat message — it converts the user's query to a vector and finds the stored chunks with the highest similarity.

**Q34. Why do we use `noteIds` filtering in `queryRelevantChunks`?**
> To scope the vector search to only the documents the user has linked to the current chat session. Without this, questions could retrieve chunks from any note the user has ever uploaded, regardless of topic.

**Q35. What is a `chatHistory` in the context of LLM calls?**
> A list of previous conversation turns (role + content pairs) sent to the LLM so it understands the context of the current question. Without it, every message would be treated as an isolated question with no memory.

---

### React & Frontend Architecture

**Q36. What is the difference between controlled and uncontrolled components?**
> Controlled components have their value managed by React state (via `useState`). Uncontrolled components use refs to read DOM values directly. `react-hook-form` uses uncontrolled components for performance.

**Q37. What is code splitting in React?**
> Splitting the JavaScript bundle into smaller chunks that load on demand using `React.lazy()` and `Suspense`. This reduces the initial page load time.

**Q38. What is the virtual DOM?**
> React's in-memory representation of the actual DOM. When state changes, React re-renders the virtual DOM, diffs it against the previous version, and applies only the minimal real DOM changes needed.

**Q39. What is Zustand's `create` function?**
> `create()` defines a store with state and actions. Zustand uses React's `useSyncExternalStore` internally to subscribe components to the store.

**Q40. What is `recharts` used for in AI Study Buddy?**
> For rendering the study analytics charts on the dashboard — quiz scores, study streaks, and performance trends presented as line charts or bar charts.

**Q41. What does `framer-motion`'s `AnimatePresence` do?**
> Allows components that are being removed from the React tree to animate out before being unmounted. Used for smooth page transitions and modal exits.

**Q42. What is the purpose of `react-markdown`?**
> Renders Markdown strings as formatted HTML in the browser. AI responses from the LLM often contain Markdown (headers, bold, code blocks) that needs to be rendered properly in the chat UI.

**Q43. What is the difference between `useCallback` and `useMemo`?**
> `useCallback` memoizes a function reference. `useMemo` memoizes a computed value. Both prevent unnecessary recalculations or re-creations on every render.

**Q44. What is prop drilling and how does Zustand solve it?**
> Prop drilling is passing props through many layers of components. Zustand's global store allows any component to access global state directly without passing it through intermediary components.

**Q45. What is lazy loading in React?**
> `React.lazy(() => import('./SomeComponent'))` defers loading a component's JavaScript until it's first rendered. Combined with `Suspense`, it shows a fallback while loading.

---

### Database & Security Intermediate

**Q46. What is a MongoDB index and why does it matter for performance?**
> An index is a B-tree data structure that allows MongoDB to find documents without scanning the entire collection. Without an index on `ownerId`, every chat query scans all chats in the database.

**Q47. What is the MongoDB `$set` operator?**
> `$set` updates only the specified fields without overwriting the entire document. `{ $set: { title } }` updates just the title field of a chat.

**Q48. What is a unique index in MongoDB?**
> Enforces uniqueness on a field across all documents. The `email` field in the User model should have a unique index so duplicate registrations throw a `MongoServerError` with code `11000`.

**Q49. What is `mongoose.Types.ObjectId.isValid()`?**
> Checks whether a string is a valid 24-character hexadecimal ObjectId. Used in `chatService.createChat()` to filter out invalid IDs before querying, preventing Mongoose `CastError`.

**Q50. What is the difference between SQL and NoSQL?**
> SQL databases use structured tables with fixed schemas and support JOINs. NoSQL databases (like MongoDB) use flexible documents, scale horizontally more easily, and avoid the overhead of rigid schemas — ideal for our varied document shapes.

**Q51–Q100** cover rate limiting mechanics, error handling, API design, deployment concepts, and testing.

**Q51. What is a window in rate limiting?** → A fixed time period during which requests are counted. Our `globalLimiter` uses a 15-minute window.
**Q52. What is `standardHeaders: true` in express-rate-limit?** → Sends `RateLimit-*` headers in responses so clients know their current limit and reset time.
**Q53. How does `skip: () => config.env === 'development'` work?** → The `skip` function runs for every request; if it returns `true`, rate limiting is bypassed for that request.
**Q54. What is the difference between `authLimiter` and `llmLimiter`?** → `authLimiter` protects login/register (5 req/15 min) to prevent brute force. `llmLimiter` protects AI endpoints (10 req/min) to control API costs.
**Q55. What is the `windowMs: 60 * 1000` calculation?** → 60 seconds × 1000 milliseconds = 1 minute window for the LLM rate limiter.
**Q56. What is `handleCastError` in the error middleware?** → Converts Mongoose's `CastError` (invalid ObjectId format) into a user-friendly 404 AppError.
**Q57. What is MongoDB error code 11000?** → Duplicate key error — thrown when inserting a document that violates a unique index (e.g., registering with an already-used email).
**Q58. What does `sendDevError` include that `sendOperationalError` doesn't?** → The full `stack` trace, which is never sent in production to avoid leaking implementation details to attackers.
**Q59. What is `multer.MulterError`?** → A specific error class thrown by Multer for upload issues (file too large, wrong field name, too many files).
**Q60. Why is `LIMIT_FILE_SIZE` a `MulterError` code important?** → It prevents users from uploading massive files that could exhaust server memory or disk space.
**Q61. What is the purpose of `req.headers.authorization.startsWith('Bearer')`?** → Validates the authorization header format before attempting to split and extract the token.
**Q62. What is a salt in bcrypt?** → A random string added to a password before hashing. Ensures two identical passwords produce different hashes, defeating rainbow table attacks.
**Q63. What does `select: false` on a Mongoose field do?** → Excludes the field from all query results by default. Used on `passwordHash` to prevent it from being accidentally leaked in API responses.
**Q64. What is a pre-save hook in Mongoose?** → Middleware that runs automatically before a document is saved. Used on the User model to hash `passwordHash` before it's stored.
**Q65. What is `comparePassword` in the User model?** → An instance method that uses `bcrypt.compare()` to check whether a plain-text password matches the stored hash.
**Q66. What is `sanitiseUser()` in `auth.service.js`?** → A helper that removes sensitive fields (like `passwordHash`) from the user object before sending it to the frontend.
**Q67. What is the difference between `throw` and `next(err)` in Express?** → In an `async` function wrapped by `catchAsync`, throwing an error is caught and passed to `next(err)` automatically. In synchronous middleware, you must call `next(err)` directly.
**Q68. What is `path.resolve()` used for?** → Resolves a sequence of paths into an absolute path. Used in `embeddings.service.js` to locate the `vectors.json` file regardless of the working directory.
**Q69. What is `fs/promises`?** → The Promise-based file system module from Node.js. Used in `embeddings.service.js` for async file reads/writes without callbacks.
**Q70. What is `JSON.parse()` and what error can it throw?** → Parses a JSON string into a JavaScript object. Throws `SyntaxError` if the input is not valid JSON — a potential crash point if `vectors.json` becomes corrupted.
**Q71. What is `JSON.stringify()`?** → Converts a JavaScript value to a JSON string. Used to serialize the vector array back to `vectors.json` after modifications.
**Q72. What is `fs.readFile()` vs `fs.readFileSync()`?** → `readFile` is asynchronous (non-blocking). `readFileSync` is synchronous (blocks the event loop). Always use async versions in Express handlers.
**Q73. What is `path.dirname()`?** → Returns the directory portion of a path. Used to ensure the `data/` directory exists before writing `vectors.json`.
**Q74. What is `recursive: true` in `fs.mkdir()`?** → Creates all intermediate directories in the path if they don't exist (equivalent to `mkdir -p` in Unix).
**Q75. What is a middleware chain?** → The sequence of middleware functions Express calls for a request. Each calls `next()` to pass to the next function, or throws to skip to the error handler.
**Q76. What is `app.use()` vs `router.use()`?** → `app.use()` applies middleware globally to the Express app. `router.use()` applies it only within that specific router's routes.
**Q77. What is `mountRoutes(app)` in `app.js`?** → A function that registers all route modules (`authRouter`, `chatRouter`, etc.) on the app with their base paths (`/api/auth`, `/api/chat`, etc.).
**Q78. What is `express.json({ limit: '100kb' })`?** → Parses JSON request bodies and limits the payload size to 100KB, preventing memory exhaustion from extremely large request bodies.
**Q79. What is `cookieParser()`?** → Middleware that parses the `Cookie` header and populates `req.cookies`. Needed to read the `refreshToken` HttpOnly cookie in auth routes.
**Q80. What is `config.env === 'production'` used for in `app.js`?** → Conditionally serves the static React frontend build from the `dist/` folder when running in production, enabling a single-server deployment where Express serves both the API and the frontend.
**Q81. What is a catch-all route `app.get('*')`?** → Matches any URL not matched by previous routes. Used to serve `index.html` for all frontend routes, letting React Router handle client-side navigation.
**Q82. What is `Object.freeze()` used for in config?** → Creates an immutable object. Prevents accidental mutation of the configuration object anywhere in the codebase.
**Q83. What is `z.coerce.number()` in Zod?** → Automatically converts string environment variable values (all env vars are strings) to numbers before validation. `PORT="5000"` becomes the number `5000`.
**Q84. What is `z.enum()`?** → Validates that a value is one of a predefined set. `NODE_ENV` must be one of `'development'`, `'production'`, or `'test'`.
**Q85. What is `parsed.error.format()` in Zod?** → Formats Zod validation errors into a readable nested object showing which fields failed and why. Used in `env.config.js` to print helpful startup errors.
**Q86. What is `process.exit(1)`?** → Terminates the Node.js process with an exit code of 1 (indicating failure). Called when environment variable validation fails so the server never starts in a misconfigured state.
**Q87. What is `fileURLToPath(import.meta.url)`?** → Converts the ES Module `import.meta.url` (a file URL string) to a regular file system path. Needed to calculate `__dirname` in ES Module files.
**Q88. What is the `uuid` package used for?** → Generates universally unique identifiers. Likely used for creating unique IDs for uploaded file storage to prevent filename collisions.
**Q89. What is `morgan('dev')` format?** → Logs colored, concise request info: `GET /api/chats 200 12.345 ms - 482`.
**Q90. What is the `langchain` package used for?** → LangChain is an AI orchestration framework. In our project, `RecursiveCharacterTextSplitter` from LangChain is used for text chunking during PDF embedding.
**Q91. What is `pdf-parse`?** → A Node.js library that extracts raw text content from PDF files. Used in `pdf.service.js` to get the text we then embed into vectors.
**Q92. What is `groq-sdk`?** → The official Groq JavaScript SDK for calling the Groq inference API, which serves LLaMA 3.3 70B with extremely low latency.
**Q93. What is `@google/genai`?** → Google's official Generative AI JavaScript SDK for calling Gemini models, including `text-embedding-004` for generating vector embeddings.
**Q94. What is `chromadb`?** → The JavaScript client for ChromaDB, a purpose-built open-source vector database. Referenced in `chroma.config.js` but the current embeddings implementation uses a local JSON fallback.
**Q95. What is `canvas-confetti`?** → A lightweight JavaScript library for confetti animations. Likely triggered in the frontend after completing a quiz or achieving a study streak milestone.
**Q96. What is `clsx`?** → A utility for conditionally joining CSS class names. Makes it cleaner to apply Tailwind classes conditionally: `clsx('base-class', { 'active-class': isActive })`.
**Q97. What is Recharts?** → A React charting library built on D3. Used in our dashboard to render study performance and streak data as interactive charts.
**Q98. What is `react-hook-form`'s `register` function?** → Registers an input element with the form, attaching validation rules and connecting the input to the form's state management.
**Q99. What does the `Zustand` `persist` middleware do?** → Persists the Zustand store to `localStorage` (or another storage) so state survives page refreshes without re-fetching from the server.
**Q100. What does `import.meta.env.VITE_API_BASE_URL` do?** → Accesses build-time environment variables in a Vite/React frontend. Variables prefixed with `VITE_` are exposed to the browser bundle.
