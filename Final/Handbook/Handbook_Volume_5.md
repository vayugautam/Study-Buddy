# AI Study Buddy — Complete Interview Handbook (Volume 5)

*The Ultimate Question Bank. Ye questions aur inke answers tumhari FAANG interview clear karwa sakte hain.*

---

# CHAPTER 17: INTERVIEW QUESTIONS

Is chapter mein hum har category ke top questions discuss karenge. Har answer ka format "Ideal Interview Answer" aur "Common Mistake" par based hoga.

## 17.1 AI & RAG Questions

---------------------------------------------------
### Q1. What is RAG and why did you use it instead of Fine-tuning?

**Ideal Interview Answer:**
> "RAG (Retrieval-Augmented Generation) is a technique where we dynamically inject relevant documents into the LLM's prompt at runtime. I chose RAG over fine-tuning because my app requires the AI to answer based on a specific student's uploaded PDF. Fine-tuning bakes knowledge into the model's weights, which is expensive and static—you can't fine-tune a model every time a user uploads a new note. RAG allows for cheap, instant knowledge updates, and most importantly, it drastically reduces hallucination because the model is constrained by the retrieved context."

**Common Mistakes:**
- Bolna ki "RAG model ko train karta hai". (Galat. RAG prompt ko bada karta hai, training nahi karta).

---------------------------------------------------
### Q2. How exactly does your chunking strategy work?

**Ideal Interview Answer:**
> "I used LangChain's `RecursiveCharacterTextSplitter`. I set the chunk size to 1000 characters with a 200-character overlap. The overlap is critical because if a semantic concept (like a definition) is cut exactly at the 1000-character mark, its meaning gets destroyed. The 200-character overlap ensures that context bleeds into the next chunk, so the embedding model accurately captures the meaning of the transition."

**Common Mistakes:**
- Overlap ka logic explain na kar pana.

---------------------------------------------------
### Q3. Why did you use Gemini for embeddings but Groq for generation?

**Ideal Interview Answer:**
> "I optimized for two different metrics: retrieval quality and generation latency. Gemini's `text-embedding-004` model is highly ranked for semantic understanding, which ensures my cosine similarity search finds the right chunks. However, for generating the actual chat response, Groq serves the LLaMA 3 model using LPU hardware, resulting in extremely fast token streaming (often >500 tokens/sec). Using them together gave me the best of both worlds."

**Common Mistakes:**
- Bolna ki "Bas free tha isliye use kar liya." (Even if true, frame it as an engineering tradeoff).

---

## 17.2 Backend & Architecture Questions

---------------------------------------------------
### Q4. Why is Node.js considered single-threaded, and how does it handle concurrent requests?

**Ideal Interview Answer:**
> "Node.js executes JavaScript on a single thread. However, it handles concurrency using the Event Loop and non-blocking I/O. When a Node server receives a request that requires a database query or an external API call (like my Groq API call), it doesn't wait for the response. It delegates that task to the underlying C++ Libuv library and immediately moves on to process the next user's request. When the API call finishes, a callback is placed in the event queue and executed."

**Common Mistakes:**
- Ye samajhna ki har user request par naya thread banta hai (Wo Java/Spring mein hota hai, Node mein nahi).

---------------------------------------------------
### Q5. Explain how you handled errors globally in Express.

**Ideal Interview Answer:**
> "I created a custom `AppError` class that extends the base Error class, adding a `statusCode` and an `isOperational` boolean. Every async controller is wrapped in a `catchAsync` higher-order function that catches rejected promises and passes them to `next(err)`. Finally, I have a global error handling middleware at the end of `app.js`. If the error is operational (like 'Invalid Password'), it sends a friendly JSON response. If it's a programming bug, it sends a generic 500 error in production to avoid leaking stack traces."

**Common Mistakes:**
- `catchAsync` ya global middleware ka concept clear na hona. Try-catch block har controller mein likhna ek bad practice hai.

---

## 17.3 Database Questions

---------------------------------------------------
### Q6. What is an Index in MongoDB and why do you need it?

**Ideal Interview Answer:**
> "An index is a data structure, typically a B-tree, that stores a small portion of the collection's data set in an easy-to-traverse form. Without an index, MongoDB must perform a Collection Scan (COLLSCAN), looking at every single document to find matches. For example, in my `Chat` collection, I query by `ownerId`. By placing an index on `ownerId`, the query changes to an Index Scan (IXSCAN), which is O(log n) and stays fast even if I have 10 million chats in the database."

**Common Mistakes:**
- Indexing ke bina production app deploy karna. Interviewer puchega "O(n) scan production me kitna time lega?"

---------------------------------------------------
### Q7. Explain how tenant isolation works in your queries.

**Ideal Interview Answer:**
> "Tenant isolation ensures users can only see their own data. In a NoSQL database like MongoDB, I enforce this at the service layer by always appending the user's ID to every query. For example, `Note.findById(noteId)` is insecure because anyone with the ID can access it. Instead, I use `Note.findOne({ _id: noteId, ownerId: req.user._id })`. This guarantees that even if an attacker guesses a valid `noteId`, the query will return null because the `ownerId` won't match."

---

## 17.4 Security Questions

---------------------------------------------------
### Q8. Why did you use HttpOnly cookies for your Refresh Token?

**Ideal Interview Answer:**
> "Putting any sensitive token in `localStorage` makes it vulnerable to Cross-Site Scripting (XSS). If an attacker manages to run malicious JavaScript on my page, they can easily read `localStorage` and steal the token. An `HttpOnly` cookie is inaccessible to JavaScript. The browser automatically attaches it to outgoing requests. So even if there is an XSS vulnerability, the refresh token remains safe."

**Common Mistakes:**
- Cookie ko `HttpOnly` ki jagah sirf normal cookie samajhna.

---------------------------------------------------
### Q9. How did you protect against NoSQL Injection?

**Ideal Interview Answer:**
> "In NoSQL databases, attackers can inject query operators via JSON. For example, passing `{"$gt": ""}` as a password might bypass authentication because the query evaluates to 'password greater than empty string'. I protected against this using the `express-mongo-sanitize` middleware, which recursively strips any keys starting with `$` or `.` from `req.body`, `req.query`, and `req.params` before they reach my controllers."

---

## 17.5 Frontend Questions

---------------------------------------------------
### Q10. Why did you choose Zustand over Context API or Redux?

**Ideal Interview Answer:**
> "The Context API is great for low-frequency updates (like light/dark theme), but it causes the entire component tree to re-render whenever the context value changes, which is bad for performance. Redux solves this but introduces a massive amount of boilerplate code. Zustand provides the best of both worlds: it creates a global store outside the React tree, allows components to select only the specific state they need, and triggers re-renders only when that specific slice of state changes—all with zero boilerplate."

---------------------------------------------------
### Q11. Explain React's Virtual DOM.

**Ideal Interview Answer:**
> "The Virtual DOM is a lightweight JavaScript representation of the actual DOM. Direct DOM manipulation is slow. When state changes in React, it creates a new Virtual DOM, compares it to the previous one using a diffing algorithm (reconciliation), and calculates the exact minimal set of changes needed. It then batches these changes and updates the real DOM in one go, which is highly efficient."

---

## 17.6 HR & Behavioral Questions

---------------------------------------------------
### Q12. "Tell me about a time you made a technical mistake in this project."

**Ideal Interview Answer:**
> "When I first built the RAG pipeline, I set the Cosine Similarity relevance threshold to `0.99`. I thought a higher number meant it was 'working'. But cosine distance is a sensitive metric—`0.99` basically allowed almost every chunk to pass the filter. My AI was getting flooded with irrelevant context and was hallucinating. I had to read up on embedding vector math to realize I needed a much stricter threshold (like `0.45`). It taught me not to treat AI tools as black boxes and to actually understand the underlying math."

---------------------------------------------------
### Q13. "Why should we hire you?"

**Ideal Interview Answer:**
> "Because I don't just write code; I understand systems. Building AI Study Buddy forced me to learn the entire stack—from React state management to Express middleware, JWT security, NoSQL indexing, and LLM orchestration. I understand the trade-offs of storing vectors locally vs in a database, and the security implications of token storage. I'm ready to bring that level of architectural thinking to your team."

---
✅ **Quick Revision (Vol 5)**
*   **RAG vs Fine-Tuning:** RAG is dynamic and prevents hallucinations.
*   **Event Loop:** Node's secret to handling concurrency on a single thread.
*   **HttpOnly Cookies:** The only way to beat XSS for tokens.
*   **Zustand:** Redux power without the boilerplate.
*   **Tenant Isolation:** Always query with `ownerId: req.user._id`.

---

*(Volume 5 Complete. Moving to task update...)*
