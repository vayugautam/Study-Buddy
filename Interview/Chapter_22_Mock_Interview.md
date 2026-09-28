# Chapter 22: FAANG Mock Interview

*This chapter simulates a high-pressure, senior-level engineering interview at a top-tier tech company (like Meta, Google, or Amazon). The interviewer aggressively probes the architectural decisions you made in AI Study Buddy.*

---

## 🎭 The Interview Transcript

**Interviewer:** "Hi. I've looked at your resume and the 'AI Study Buddy' project stands out. You mentioned building a custom RAG pipeline and a dual-AI routing architecture. Walk me through the high-level architecture of how a PDF upload becomes an AI chat response."

**You:** "Sure. The user uploads a PDF from the React frontend. The Node/Express backend receives it via Multer. The `pdfService` extracts the text, and the `embeddingsService` chunks it and sends it to Google Gemini to get 768-dimensional vector embeddings. These embeddings are stored locally in a `vectors.json` file. When the user asks a question, we embed the question, run a cosine similarity search against `vectors.json`, retrieve the top 5 chunks, and inject them into a system prompt. Finally, Groq's LLaMA 3 model generates the answer based on that context."

**Interviewer:** "Wait. You stored vector embeddings in a flat `vectors.json` file on the local disk?"

**You:** "Yes, for the MVP it was the fastest way to get semantic search working without setting up external infrastructure."

**Interviewer:** **WHY NOT** use a real vector database like Pinecone or MongoDB Atlas Vector Search from day one?

**You:** "It was a deliberate tradeoff for development velocity. I wanted to prove the RAG pipeline logic—the chunking, the embedding generation, and the prompt construction—before introducing distributed state. But I'm aware it's not production-ready."

**Interviewer:** Okay. Let's talk about why it's not production-ready. **WHAT IF** two users upload PDFs at the exact same millisecond? What happens to your `vectors.json` file?

**You:** "There's a race condition. Since Node is asynchronous, both requests read the file, append their vectors in memory, and write the file back. The second write overwrites the first. The first user's vectors are lost."

**Interviewer:** Right. Data loss. So, **HOW WOULD YOU FIX** that race condition *without* leaving the local file system?

**You:** "I could use a file-locking mechanism, like the `proper-lockfile` npm package, which prevents concurrent writes. Or, I could use `fs.appendFile` in NDJSON (newline-delimited JSON) format so writes don't require reading the entire file first. But ultimately..."

**Interviewer:** (Interrupting) But ultimately, that still doesn't scale. **WHAT IF** you have 100,000 users and your `vectors.json` is 50GB? **HOW** does your similarity search perform?

**You:** "It would crash. Currently, I read the entire JSON file into RAM on every query and do an O(n) linear scan, computing cosine similarity against every single chunk. Node has a default heap limit of about 1.4GB, so it would throw an Out Of Memory (OOM) error long before 50GB."

**Interviewer:** Exactly. So, **HOW WOULD YOU SCALE** the vector search?

**You:** "I would migrate to MongoDB Atlas Vector Search. The data is already in MongoDB, so it keeps the infrastructure simple. Atlas uses an Approximate Nearest Neighbor (ANN) algorithm, specifically HNSW (Hierarchical Navigable Small World), which provides O(log n) search time. It creates a graph where we can navigate to the nearest neighbors without scanning every vector."

**Interviewer:** Let's move to the PDF processing. You said the user uploads the PDF, you extract text, chunk it, embed it via Gemini, and store it. Is this a synchronous API endpoint?

**You:** "Yes, currently the HTTP request stays open while all that happens."

**Interviewer:** **WHY?** Gemini's API takes time. If a user uploads a 50-page PDF, that request might take 45 seconds. **WHAT IF** the client's browser times out at 30 seconds?

**You:** "The client sees a timeout error, but the server keeps processing it and eventually writes it to the database. It's a bad user experience and a waste of server resources if the client already disconnected."

**Interviewer:** **HOW WOULD YOU IMPROVE** this architecture?

**You:** "I need to decouple the upload from the processing. I would return a `202 Accepted` immediately after saving the PDF to a temporary location (like an S3 bucket or local `/uploads` folder) and writing a `Note` record to MongoDB with a `status` of 'processing'."

**Interviewer:** And then? **HOW** does the processing happen?

**You:** "I'd push a job onto a message queue, like BullMQ backed by Redis. A separate worker process pulls the job, runs the text extraction, calls Gemini for embeddings, stores them, and updates the `Note` status to 'ready'."

**Interviewer:** BullMQ and Redis. **WHY NOT** just use `setTimeout` or an async function without `await` in the Express controller?

**You:** "If I just fire-and-forget an async function and the Node server crashes or restarts, that background task is lost forever. BullMQ provides persistence. If the worker crashes mid-embedding, the job goes back on the queue and gets retried. It also allows me to scale workers horizontally independent of the API servers."

**Interviewer:** Good. Now, **HOW** does the frontend know when the PDF is ready?

**You:** "There are three options. First, short polling—the frontend hits a `/api/notes/:id/status` endpoint every 5 seconds. Second, Server-Sent Events (SSE), where the server pushes an event. Third, WebSockets for full bidirectional real-time updates."

**Interviewer:** **WHY NOT** WebSockets? They're real-time.

**You:** "WebSockets are stateful and require persistent connections. If I have a load balancer and multiple Node instances, I'd need sticky sessions or a Redis Pub/Sub backplane to route WebSocket messages correctly. For simple one-way notifications (status updates), SSE is much simpler to implement over standard HTTP/1.1 or HTTP/2 without the infrastructure overhead of WebSockets."

**Interviewer:** Let's talk about your dual-AI strategy. You use Gemini for embeddings and Groq for generation. **WHY?**

**You:** "Gemini's `text-embedding-004` model is highly optimized for semantic retrieval. But for generation—chat, quizzes, flashcards—Groq serves LLaMA 3.3 70B on their custom LPU hardware, which gives incredibly fast token streaming, often over 500 tokens per second. It makes the UI feel instantly responsive."

**Interviewer:** **WHAT IF** Groq's API goes down? Does your whole app crash?

**You:** "Currently, yes. If Groq throws a 500, the user gets an error."

**Interviewer:** **HOW WOULD YOU IMPROVE** resilience?

**You:** "I would implement the Circuit Breaker and Fallback patterns. Since I already have the Gemini SDK installed, I could modify the `ragService`. If the call to Groq fails, or if Groq's latency spikes above a threshold, I can catch the error and fallback to calling `gemini-1.5-flash` to generate the response. The user still gets an answer, just from a different provider."

**Interviewer:** Last question. You used a JWT in a cookie for the refresh token and a JWT in the Authorization header for the access token. **WHY NOT** just put a single JWT in `localStorage` with a 30-day expiry?

**You:** "`localStorage` is accessible to JavaScript, which means it's vulnerable to Cross-Site Scripting (XSS). If an attacker injects a script, they can steal a 30-day token and have full access to the account for a month. By keeping the access token in memory with a short expiry (e.g., 15 minutes) and the 30-day refresh token in an `HttpOnly` cookie, XSS cannot steal the refresh token, and stolen access tokens become useless very quickly."

**Interviewer:** Okay. We're out of time. Good discussion.

---

## 📈 Interviewer Feedback & Ideal Answers

Here is how a senior engineering hiring committee would evaluate your responses.

### 1. The Vector Store Problem
* **Your Answer:** Acknowledged the MVP tradeoff, identified the race condition, and explained why O(n) RAM scanning fails at scale.
* **Ideal Answer:** You nailed it. FAANG interviewers don't mind hacky MVPs as long as you know *why* they are hacky and *exactly how* to fix them. Mentioning **HNSW (Hierarchical Navigable Small World)** and **O(log n)** complexity shows deep understanding of how vector databases actually work under the hood, not just how to use their APIs.

### 2. The PDF Upload Bottleneck
* **Your Answer:** Identified the timeout risk, proposed an async architecture (202 Accepted), and recommended BullMQ.
* **Ideal Answer:** Excellent. The key insight here was answering the "WHY NOT fire-and-forget?" trap. Recognizing that **durability and retry logic** are the reasons message queues exist (as opposed to just doing async work in Express) is a senior-level distinction.

### 3. Client Notification (Polling vs SSE vs WebSockets)
* **Your Answer:** Evaluated three options and rejected the overly complex one (WebSockets).
* **Ideal Answer:** Perfect. Junior engineers often suggest WebSockets for everything because they sound advanced. Senior engineers understand **infrastructure complexity**. Pointing out the need for Redis Pub/Sub backplanes to scale WebSockets across load balancers, and choosing SSE for one-way events, shows maturity.

### 4. Dual-AI Strategy and Fallbacks
* **Your Answer:** Justified the provider split based on specific model/hardware strengths, and proposed a Circuit Breaker fallback.
* **Ideal Answer:** Very strong. In distributed systems, depending on a single external API is a single point of failure. Suggesting a **fallback routing strategy** (Groq -> Gemini) demonstrates that you build for resilience.

### 5. Authentication Security
* **Your Answer:** Explained XSS risks and the `HttpOnly` cookie defense.
* **Ideal Answer:** Spot on. Security questions are often pass/fail in FAANG interviews. Knowing the difference between `localStorage` and `HttpOnly` cookies, and explaining the access/refresh token rotation, proves you understand web security fundamentals.

### Final Verdict: STRONG HIRE 🟢
You didn't get defensive when challenged. You accurately critiqued your own code, anticipated scaling bottlenecks, and proposed industry-standard architectural patterns (Queues, ANN indexes, Circuit Breakers, SSE) to solve them.
