# AI Study Buddy — Complete Interview Handbook (Volume 4)

*Senior-level Engineering Concepts: Design Patterns, Scaling, and Code Walkthrough.*

---

# CHAPTER 14: DESIGN PATTERNS

Design patterns software engineering ke "tried and tested" solutions hote hain common problems ke liye. Agar tum interview mein patterns ka naam lete ho, toh interviewer samajh jata hai ki tumhara code mature hai.

## 14.1 MVC (Model-View-Controller) / Service-Repository
- **What is it:** Code ko 3 hisso mein batna. Model (Database), View (UI), Controller (Brain). Lekin hamare backend mein humne isko thoda modify kiya hai (Controller-Service pattern).
- **Why in this project:** Controllers sirf HTTP requests handle karte hain aur Zod validation karte hain. Asli logic Services mein hai. Model sirf database ka schema define karta hai. View React mein alag se hai.
- **Example:** `chat.routes.js` request ko `chat.controller.js` par bhejta hai, jo data nikal kar `chatService.js` ko deta hai.
- **Real Life Analogy:** Restaurant. View = Menu card. Controller = Waiter (order leta hai). Service = Chef (asli kaam karta hai). Model = Fridge (samaan kahan rakha hai).

## 14.2 Singleton Pattern
- **What is it:** Ek aisi class ya object jiska poori app mein sirf *ek hi* instance ho.
- **Why in this project:** Database connection. Hum nahi chahte ki har baar API call hone par naya DB connection khule. `mongoose.connect()` ek baar chalta hai aur wahi connection poori app use karti hai. (Node.js module caching by default singleton jaisa behave karti hai).

## 14.3 Factory Pattern
- **What is it:** Ek function ya method jo dusre objects create karke return kare, bina unka exact class bataye.
- **Why in this project:** AI SDK clients. Jab hume Gemini ya Groq ka client initialize karna hota hai, toh hum configurations (API keys) ek factory method jaisi file mein pass karte hain, jo ready-to-use client object return karti hai.

## 14.4 Middleware / Decorator Pattern
- **What is it:** Ek core function ke aas-paas extra functionality (like security/logging) wrap karna bina us core function ko change kiye.
- **Example:** Express Middlewares (`protect`, `globalLimiter`). Ye request aane par controller execute hone se pehle apna kaam karte hain. Zod validation bhi ek tarah ka decorator hai.

## 14.5 SOLID Principles Applied
- **Single Responsibility Principle (SRP):** Har file ka ek hi kaam hai. `auth.middleware.js` sirf auth check karta hai, login logic nahi likhta.
- **Dependency Inversion:** Controllers directly DB se baat nahi karte, wo Service layer par depend karte hain. Agar kal MongoDB ki jagah Postgres lagana ho, toh Controllers change nahi honge.

---

# CHAPTER 15: SCALABILITY (0 to 10 MILLION USERS)

System design rounds mein interviewer puchega: "Abhi tumhari app tere laptop par chal rahi hai. Agar 10 lakh students aa gaye, toh kya fail hoga aur usko kaise theek karoge?"

## 15.1 Scaling to 10,000 Users (The Current Bottlenecks)
- **Bottleneck 1: `vectors.json` race condition.** Agar 2 bache ek sath PDF upload karein, toh JSON file corrupt ho sakti hai ya overwrite ho sakti hai.
- **Bottleneck 2: Synchronous PDF processing.** PDF upload aur Gemini embedding ek hi API call mein ho rahe hain. Badi PDF Event Loop block kar degi.
- **The Fix:** Move vectors to MongoDB Atlas Vector Search. Move PDF processing to a Background Queue (BullMQ + Redis).

## 15.2 Scaling to 100,000 Users (Horizontal Scaling)
- **Bottleneck:** Ek Node.js server RAM aur CPU limit hit kar dega.
- **The Fix (Horizontal Scaling):** Load Balancer (jaise Nginx ya AWS ALB) lagao aur Node.js ki 5 copies (instances) chala do. Request ayegi toh Load balancer usey free server par bhej dega.
- **Crucial Rule:** Iske liye Backend ka "Stateless" hona zaroori hai. Matlab Access tokens JWT mein hi hone chahiye, RAM mein "session" save nahi hona chahiye, warna user login Server 1 pe karega aur next request Server 2 pe jayegi toh wo logout ho jayega.

## 15.3 Scaling to 1 Million Users (Database & Caching)
- **Bottleneck:** MongoDB par bahut zyada read requests aayengi (jaise har page load par `getUserChats`). MongoDB CPU spike karega.
- **The Fix (Redis Cache):** Redis in-memory store lagao. Jab pehli baar koi chats load kare, DB se padho aur Redis mein 60 seconds ke liye save (cache) kar do. Agli 1000 baar request Redis se serve hogi (jo millisecond mein hoti hai).
- **Rate Limiting Fix:** In-memory rate limiter fail ho jayega (har Node server apni alag counting karega). Rate limiter ko bhi Redis store se connect karna padega.

## 15.4 Scaling to 10 Million Users (Database Sharding & Microservices)
- **Bottleneck:** Ek MongoDB primary server itna data store aur write nahi kar payega.
- **The Fix (Database Sharding):** Database ko multiple servers mein todna (Shard karna). North India ke students ka data DB-1 mein, South India ka DB-2 mein (based on `userId` hash).
- **The Fix (Microservices):** Monolith Express app ko todna. Chat API alag server par, Upload API alag server par, Auth API alag server par. Isse PDF upload ka load badhne par sirf Upload servers badhane padenge, Chat server affect nahi hoga.
- **CDN (Content Delivery Network):** Frontend React bundle aur static PDFs ko CloudFront ya Vercel Edge network par dalna taaki users apni nearest location se files download kar sakein.

---

# CHAPTER 16: CODE WALKTHROUGH (THE CRITICAL FILES)

Yahan hum codebase ki sabse important files ka post-mortem karenge. Interviewer code open karke puch sakta hai: "Explain this line."

## 16.1 `app.js` (The Entry Point)
- **Line 23:** `const app = express();` -> Express app ban rahi hai.
- **Line 30-40:** Middlewares. `helmet()` security headers ke liye. `cors()` cross-origin requests (React se) allow karne ke liye. `express.json()` request body parser.
- **Line 60:** `app.use(globalLimiter)` -> DDoS attacks rokne ke liye global rate limit.
- **Line 82:** `app.all('*', ...)` -> 404 Catcher. Agar koi aisi route par jaye jo define nahi hai, toh NotFoundError throw karo.
- **Line 91:** `app.use(globalErrorHandler)` -> Yeh sabse last mein hona chahiye. Agar upar kisi bhi middleware/route mein error aaye (`next(err)`), toh ye handler usey catch karta hai.

## 16.2 `auth.middleware.js` (The Security Guard)
- **Flow:** 
  1. `req.headers.authorization` se Token nikalta hai (Bearer <token>).
  2. `jwt.verify(token, secret)` chalta hai. Agar token expire ho gaya toh `TokenExpiredError` aayega.
  3. Token se `decoded.id` milta hai.
  4. `User.findById(decoded.id)` DB se user lata hai.
  5. `req.user = user` set karta hai aur `next()` bulata hai.
- **Why Important:** Is ek file ke bina pura API unsecured hai. Yeh `req.user` set karta hai jiska use hum "Tenant Isolation" (kisi aur ka data na dikhe) ke liye karte hain.

## 16.3 `rag.service.js` (The Core AI Engine)
- **Line 13:** `const RELEVANCE_THRESHOLD = 0.99;` -> BATA DENA KI YEH BUGGY HAI MVP MEIN. Isko 0.45 ke aas paas hona chahiye warna kachra chunks bhi AI ko chale jayenge.
- **`buildContext()` function:** Yeh user ke question ko embed karke `queryRelevantChunks` se best chunks mangwata hai. Phir un chunks ka text jodkar ek bada string (context) banata hai.
- **`generateAnswer()` function:** 
  1. Pehle chat history nikalta hai. (Token bachane ke liye sirf pichle 6 message lete hain).
  2. System prompt banata hai: *"Answer only based on the provided context..."*
  3. Groq API ko `system` aur `user` messages ki array bhejta hai.
  4. Jo response aata hai, usme se `[Source: ...]` tags nikal kar frontend ke format (Markdown + citations) mein bhejta hai.

## 16.4 `embeddings.service.js` (The Vector Store Manager)
- **`chunkText()`:** Langchain ka splitter use karta hai. Chunk size = 1000, Overlap = 200. Overlap meaning ko bachane ke liye zaroori hai.
- **`embedAndStore()`:** PDF ka text leta hai, usko chunk karta hai, Gemini se 768-dim vector lata hai, aur `vectors.json` mein push karke `fs.writeFile` kar deta hai. (Race condition warning yahi par hai).
- **`queryRelevantChunks()`:** Mathematical cosine distance check. Har vector ka query vector ke sath dot product jaisa calculation. Jo sabse kam distance wale 5 chunks hain, wo return karta hai.

## 16.5 `AppError.js` (Custom Error Class)
- **Why we built it:** Normal `new Error("msg")` sirf message deta hai, status code (404, 500) nahi. Humne ek class banayi jo `Error` ko extend karti hai.
- **Features:** `this.statusCode = statusCode; this.isOperational = true;`
- **Benefit:** Global error handler `isOperational` check karta hai. Agar true hai, toh matlab humne hi deliberately error throw kiya hai (jaise Wrong Password), toh user ko JSON response jata hai. Agar false hai, matlab koi asli bug/crash hai, toh 500 Internal Server error jata hai.

---
✅ **Quick Revision (Vol 4)**
*   **Patterns:** MVC (Separation), Singleton (DB Connection), Decorator (Middlewares).
*   **Scale to 10M:** Load Balancers (Horizontal), Redis (Cache), BullMQ (Background Jobs), Mongo Atlas Vector Search, Sharding.
*   **`auth.middleware.js`:** The wall that sets `req.user`.
*   **`rag.service.js`:** The brain that connects context to LLM.

---

*(Volume 4 Complete. Moving to task update...)*
