# AI Study Buddy — Complete Interview Handbook (Volume 6)

*Final Prep: Mock Interviews and Cheat Sheets.*

---

# CHAPTER 18: THE FAANG MOCK INTERVIEW

*Is chapter mein ek mock interview transcript hai jahan interviewer tumhe lagatar cross-question karta hai.*

**Interviewer:** "Tumhare resume mein AI Study Buddy project hai jahan tumne RAG implement kiya. Tell me, tune vector embeddings kahan store kiye?"
**You:** "Maine MVP (Minimum Viable Product) ke liye unhe ek local `vectors.json` file mein store kiya."

**Interviewer:** "JSON file? **WHY?** Production mein ye toh fail ho jayega."
**You:** "Yes, mujhe pata hai ki JSON file production-ready nahi hai. Isme race conditions hain agar do log sath mein PDF upload karein, aur ye RAM mein read hone ki wajah se O(n) memory scan karti hai. Maine ise temporarily use kiya RAG pipeline test karne ke liye. Production ke liye main isko MongoDB Atlas Vector Search par migrate karunga jahan HNSW algorithm O(log n) search deta hai."

**Interviewer:** "Okay, good that you know the bottleneck. Ab batao, jab PDF upload hoti hai toh kya hota hai? Kya user ko wait karna padta hai?"
**You:** "Abhi ke architecture mein haan, upload API synchronous hai. Gemini embeddings generate hone tak HTTP connection open rehta hai."

**Interviewer:** "**WHAT IF** PDF 50 page ki ho aur Gemini API slow ho? 30 seconds ke baad browser timeout de dega."
**You:** "Exactly. Isiliye architecture change karna padega. Main Upload API ko turant `202 Accepted` return karne ko bolunga aur processing task ko BullMQ (Redis) ke queue mein daal dunga. Ek background worker process use queue se job uthayega aur embeddings generate karega."

**Interviewer:** "**HOW** will the frontend know ki PDF process ho gayi hai?"
**You:** "Mere paas 3 options hain: Long Polling, Server-Sent Events (SSE), ya WebSockets."

**Interviewer:** "**WHY NOT** WebSockets? Wo real-time hote hain."
**You:** "Kyunki WebSockets stateful hote hain. Agar mere paas 5 Node servers hain load balancer ke peeche, toh mujhe Redis Pub/Sub lagana padega taaki pata chale kis server se client connected hai. SSE (Server-Sent Events) sirf one-way communication ke liye bahut simple aur lightweight hai, aur HTTP over kaam karta hai. Mere use case (status update) ke liye SSE best tradeoff hai."

**Interviewer:** "Impressive. Tumne Groq aur Gemini dono use kiye. **WHY NOT** just use OpenAI API for everything?"
**You:** "Main cost aur speed dono optimize karna chahta tha. Gemini ka `text-embedding-004` model embeddings ke liye top-tier hai. Lekin text generation ke liye Groq LPU (Hardware) LLaMA 3 ko itni speed par serve karta hai ki response instant lagta hai (500+ tokens/sec). OpenAI GPT-4 slow hai aur mehnga bhi."

**Interviewer:** "Last question. JWT token browser mein kahan save kiya?"
**You:** "Access token React memory mein, aur Refresh token `HttpOnly` cookie mein."

**Interviewer:** "**WHY NOT** localStorage?"
**You:** "Kyunki `localStorage` JavaScript se read kiya ja sakta hai. Agar koi XSS attack ho, toh hacker token chura lega. `HttpOnly` cookie ko JS access nahi kar sakti, isliye token safe rehta hai."

**Interviewer:** "Excellent. You really know your architecture."

---

# CHAPTER 19: THE FINAL CHEAT SHEETS (1-PAGE REVISION)

Interview se 10 minute pehle bas in points ko padh lena.

## 1. Architecture Cheat Sheet
- **Frontend:** React + Vite + Tailwind + Zustand (Client-side rendering, global state).
- **Backend:** Node.js + Express (REST API, stateless architecture).
- **Database:** MongoDB Atlas (NoSQL, document-based, tenant-isolation).
- **AI/RAG:** Gemini (Embeddings) + Groq (Generation) + Local JSON (Vector store to be upgraded to Mongo Vector).

## 2. Authentication Cheat Sheet
- **Mechanism:** JWT (JSON Web Tokens). Stateless.
- **Security:** Dual-token strategy. Access Token (Memory, 15m expiry). Refresh Token (`HttpOnly` Cookie, 30d expiry).
- **Passwords:** Bcrypt hashing (10 salt rounds) in Mongoose pre-save hook.

## 3. RAG Pipeline Cheat Sheet
1. PDF -> Plain Text (pdf-parse).
2. Text -> 1000-char chunks (200 overlap via LangChain).
3. Chunks -> 768-dim Vectors (Gemini API).
4. Save to DB.
5. User Query -> Query Vector.
6. Vector Math -> Cosine Similarity (Distance < 0.45).
7. Top 5 Chunks + System Prompt -> Groq (LLaMA 3).
8. Return Markdown Answer + Citations.

## 4. Performance Cheat Sheet
- **DB Read:** Use Indexes (`ownerId`) to avoid COLLSCAN.
- **LLM Speed:** Groq LPU > Normal GPU.
- **Frontend:** Zustand prevents full-app re-renders (unlike Context API).
- **Bandwidth:** Compression middleware reduces JSON payload size.

## 5. Security Cheat Sheet
- **XSS:** Mitigated by React encoding and `HttpOnly` cookies.
- **NoSQL Injection:** Mitigated by `express-mongo-sanitize`.
- **Brute Force:** Mitigated by `express-rate-limit` (5 req / 15 min on auth).
- **Data Leaks:** Handled by strict `ownerId` checks (Tenant Isolation) and not sending error stack traces in production.

## 6. Common Mistakes Checklist (Don't say these in interviews)
- ❌ "RAG trains the model." (Correct: RAG injects context into the prompt).
- ❌ "I stored the JWT in localStorage." (Correct: HttpOnly Cookie).
- ❌ "React talks directly to the database." (Correct: React calls Express APIs).
- ❌ "Node creates a new thread for each user." (Correct: Node uses an Event Loop and is single-threaded).

---
*(End of Volume 6)*
