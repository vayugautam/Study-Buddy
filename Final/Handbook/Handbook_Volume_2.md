# AI Study Buddy — Complete Interview Handbook (Volume 2)

*Frontend se lekar Database tak ki complete mastery.*

---

# CHAPTER 5: FRONTEND (REACT & ZUSTAND)

## 5.1 React & Component Architecture

---------------------------------------------------
### What is it?
React ek JavaScript library hai UI banane ke liye. Yeh Component-based architecture par chalti hai jahan har chiz ek reusable block (component) hoti hai.

---------------------------------------------------
### Why is it used in this project?
Humara chat interface, quiz taker, aur flashcards sab highly interactive hain. Vanilla JS se DOM manipulate karna slow aur messy hota. React ka Virtual DOM in frequent updates ko bahut smoothly handle karta hai.

---------------------------------------------------
### Internal Working
React `Virtual DOM` use karta hai. Jab bhi `useState` se state update hoti hai, React naya Virtual DOM banata hai. Phir purane aur naye Virtual DOM ko compare karta hai (is process ko **Reconciliation** ya **Diffing Algorithm** kehte hain). Jo parts change hue hain, sirf unhi ko real DOM (browser) mein update karta hai. Isiliye React fast hai.

---------------------------------------------------
### Real Life Analogy
Socho ek badi si painting (Real DOM) mein tumhe ek phool (flower) ka color change karna hai.
- **Vanilla JS Approach:** Poori painting mitakar dobara banao naye phool ke sath. (Slow)
- **React Approach:** Ek rough sketch (Virtual DOM) pe color change karke dekho. Compare karo original se. Phir sirf us ek phool par naya color paint kar do. (Extremely fast).

---------------------------------------------------
### Example from THIS PROJECT
- Humne UI ko chhote components mein toda hai: `<Navbar />`, `<ChatWindow />`, `<QuizCard />`.

---------------------------------------------------
### Why not Alternatives?
**React vs Angular:** Angular ek poora framework hai. Bahut heavy hota hai aur sikhne mein time lagta hai. React lightweight hai aur sirf UI par focus karta hai.
**React vs Next.js:** Next.js Server-Side Rendering (SSR) deta hai jo SEO ke liye achha hai. Lekin AI Study Buddy ek dashboard app hai jise Google pe index nahi karwana (har user ka data private hai). Isiliye Client-Side Rendering (React + Vite) fast aur sufficient hai.

---

## 5.2 State Management: Zustand

---------------------------------------------------
### What is it?
Zustand ek choti si library hai React mein "global state" manage karne ke liye. Global state wo data hai jo app mein kahin bhi access karna pad sakta hai (jaise logged-in user ki details).

---------------------------------------------------
### Why is it used in this project?
Jab state ko kisi chhote component se dusre chote component mein pass karna hota hai, toh beech ke saare parents se hote hue props bhejne padte hain. Isko **Prop Drilling** kehte hain. Zustand isko solve karta hai ek global "Store" banakar.

---------------------------------------------------
### Example from THIS PROJECT
Humne `useAuthStore` banaya hai. Jab user login karta hai, uska data wahan save hota hai. Ab chahe `<Navbar />` ko user ka naam dikhana ho, ya `<ChatWindow />` ko API call karna ho, dono direct `useAuthStore()` call kar sakte hain bina parent se props manage kiye.
Aur `persist` middleware ka use kiya hai jisse page refresh hone par bhi login state delete nahi hoti (localStorage mein save ho jati hai).

---------------------------------------------------
### Why not Alternatives (Redux)?
Redux bohot purana aur standard hai, par usme bohot sara "boilerplate" code likhna padta hai (actions, reducers, dispatch). Zustand 10x simple hai, seedha hook return karta hai jisko directly use kar sakte hain.

---

## 5.3 Frontend Interview Questions

1. **"What is the difference between Virtual DOM and Shadow DOM?"**
> **Ideal Answer:** "Virtual DOM is a React concept—it's an in-memory representation of the UI used to optimize updates via diffing. Shadow DOM is a browser standard used in Web Components to encapsulate CSS and markup so they don't leak out to the rest of the page."

2. **"Why do we need the `key` prop in React lists?"**
> **Ideal Answer:** "The `key` prop helps React's diffing algorithm identify which items have changed, been added, or removed. If you use the array index as a key and reorder the list, React gets confused and might render the wrong data or destroy component state. Keys should be unique and stable, like database IDs."

3. **"Explain `useEffect` and its dependency array."**
> **Ideal Answer:** "`useEffect` is for handling side effects like API calls. The dependency array controls when the effect runs. If it's empty `[]`, it runs once on mount. If it contains variables `[userId]`, it runs whenever `userId` changes. If you omit the array completely, it runs after every single render, which usually causes infinite loops if you're updating state inside it."

---------------------------------------------------
### Common Mistakes
- **Mistake:** State variables ko seedhe mutate karna (e.g. `user.name = "John"`). React ko pata hi nahi chalega change hua hai. Hamesha naya object banake setter call karo: `setUser({ ...user, name: "John" })`.

---
✅ **Quick Revision: Chapter 5**
*   **React:** UI library, Component based, Virtual DOM for fast updates.
*   **Vite:** Fast build tool, better HMR than Create-React-App.
*   **Zustand:** Solves prop drilling. Simple global state.
*   **Tailwind:** Utility-first CSS, keeps CSS bundle tiny.

---

# CHAPTER 6: BACKEND (NODE.JS & EXPRESS)

## 6.1 Node.js Architecture

---------------------------------------------------
### What is it?
Node.js Chrome ke V8 engine par bana ek JavaScript runtime hai. Yeh JS ko browser ke bahar (server par) run karne ki power deta hai. 

---------------------------------------------------
### Why is it used in this project?
Humara project I/O intensive hai (Database se baat karna, AI API se baat karna). Node.js apni **Non-blocking, Asynchronous, Single-threaded** nature ki wajah se I/O heavy tasks ke liye best hai.

---------------------------------------------------
### Internal Working (The Event Loop)
Node.js single-threaded hai. Agar wo ek request ko process karne ruk gaya, toh baaki saare users wait karenge.
Par aisa nahi hota. Jab Node.js ko koi slow I/O task milta hai (jaise Mongoose se data lana ya Groq API ko call karna), wo usko background C++ threads (Libuv) ko pass kar deta hai aur khud doosre users ki requests lene chala jata hai. Jab C++ thread apna kaam khatam kar leta hai, wo Event Loop ke queue mein result daal deta hai, aur Node us result ko user tak bhej deta hai. Isko Non-blocking I/O kehte hain.

---------------------------------------------------
### Real Life Analogy
Coffee shop ka example:
- **Synchronous (Java/Python without async):** Ek waiter (thread) ek customer ka order leta hai, kitchen jata hai, aur jab tak coffee ban ke nahi aati wahi khada rehta hai. Doosre customers wait karte hain.
- **Node.js (Asynchronous):** Waiter order leta hai, ticket kitchen (Libuv) mein deta hai, aur turant doosre customer ka order lene chala jata hai. Jab pehli coffee ban jati hai, kitchen bell bajata hai (Event Loop), aur waiter coffee serve kar deta hai. Ek hi waiter 100 customers handle kar leta hai.

---------------------------------------------------
### Why not Alternatives?
**Node vs Spring Boot (Java):** Spring Boot multi-threaded hai. Har request ke liye naya thread banata hai. Compute-heavy tasks (jaise video encoding) mein Java better hai, par hamare jaise API-calling tasks mein Node kam RAM me zyada requests handle kar leta hai. Aur frontend/backend dono mein JS use hone se development speed fast hoti hai.

---

## 6.2 Error Handling & Middleware

---------------------------------------------------
### Example from THIS PROJECT
Humne `AppError` naam ki custom class banayi hai. 
Jab user galat password daalta hai, hum throw karte hain: `new UnauthorizedError("Invalid credentials")`.
Humne har controller route ko `catchAsync` function se wrap kiya hai. Agar controller mein koi bhi error aaye, toh `catchAsync` us error ko Express ke `next(err)` mein bhej deta hai.
Phir `globalErrorHandler` middleware (jo `app.js` ke end mein hai) us error ko catch karta hai aur ek properly formatted JSON error client ko bhejta hai.

---------------------------------------------------
### Backend Interview Questions

1. **"What happens if you run a CPU-intensive task like calculating Fibonacci sequence or parsing a massive PDF synchronously in Node.js?"**
> **Ideal Answer:** "It blocks the Event Loop. Because Node is single-threaded for executing JavaScript, blocking the event loop means the server becomes completely unresponsive to all other users until that calculation finishes. This is why CPU-intensive tasks should be offloaded to Worker Threads or external background queues."

2. **"What is Express middleware?"**
> **Ideal Answer:** "Middleware is a function that has access to the request object, the response object, and the `next` function in the application's request-response cycle. It can execute code, modify the request, end the response, or pass control to the next middleware. We use it for authentication (`protect`), rate limiting, and global error handling."

---
✅ **Quick Revision: Chapter 6**
*   **Node.js:** Single-threaded, Non-blocking I/O, Event Loop.
*   **Express:** Framework to manage routes and middleware easily.
*   **catchAsync:** Wrapper to send unhandled promise rejections to the global error handler.

---

# CHAPTER 7: DATABASE (MONGODB & MONGOOSE)

## 7.1 NoSQL & Document Structure

---------------------------------------------------
### What is it?
MongoDB ek NoSQL database hai. SQL ki tarah isme Tables aur Rows nahi hote. Isme Collections (tables) aur Documents (rows) hote hain. Data JSON-like format (BSON) mein save hota hai.

---------------------------------------------------
### Why is it used in this project?
Humara data ka structure fixed nahi hai. Ek AI flashcard ka format alag hota hai, chat message ka alag. NoSQL flexible schemas allow karta hai. Mongoose hume ek thin layer of structure (Schema validators) deta hai taaki kachra data database mein na chala jaye.

---------------------------------------------------
### Real Life Analogy
- **SQL (MySQL):** Ek strict Excel sheet. Agar tumhe naya column add karna hai, toh poore database ka structure change (migration) karna padega. 
- **NoSQL (MongoDB):** Ek folder jisme text files (JSON) rakhi hain. Har file apne aap mein puri kahani hai.

---------------------------------------------------
### Example from THIS PROJECT
`User` model dekho. Humne references use kiye hain. Ek `Chat` document mein `ownerId` hota hai jo `User` ko point karta hai.
Jab hume user ke chats fetch karne hote hain, toh Controller query karta hai: `Chat.find({ ownerId: req.user._id })`. Yeh **Tenant Isolation** hai. Matlab database hamesha check karta hai ki jis user ki request aayi hai, sirf usi ka data return ho.

---

## 7.2 Mongoose Hooks & Aggregation

---------------------------------------------------
### What is a Pre-Save Hook?
Data MongoDB mein save hone se thik pehle Mongoose ek function run kar sakta hai. Humne `User` model mein pre-save hook lagaya hai. Agar user ne naya password daala hai, toh save hone se pehle Mongoose usko bcrypt se hash kar deta hai. Isse kabhi bhi plain-text password DB mein nahi jata.

---------------------------------------------------
### Database Interview Questions

1. **"What is an index in MongoDB and why is it important?"**
> **Ideal Answer:** "An index is a data structure (like a B-tree) that allows MongoDB to find documents without scanning the entire collection. In our project, I would place an index on the `ownerId` field in the Chats collection. Without it, finding a user's chats requires a Collection Scan (O(n) time). With an index, it's an Index Scan, which is near instantaneous even with millions of records."

2. **"Explain the difference between embedding and referencing documents."**
> **Ideal Answer:** "Embedding stores related data inside a single document (like putting an array of Flashcards inside the Note document). Referencing stores only the ID (like having a separate Flashcards collection that points to NoteId). Embedding is faster for reading everything at once, but risks hitting the 16MB document size limit. Referencing is better for large or growing data, which is why we used references for our Notes and Chats."

---
✅ **Quick Revision: Chapter 7**
*   **MongoDB:** NoSQL, stores data as BSON documents.
*   **Mongoose:** ODM that provides Schema validation and hooks.
*   **Tenant Isolation:** Always filter queries by `ownerId`.
*   **Indexes:** Make queries extremely fast (prevents COLLSCAN).

---

# CHAPTER 8: AUTHENTICATION (JWT & SECURITY)

Authentication interviewers ka sabse favourite topic hai kyunki ye security se juda hai. 

## 8.1 JWT (JSON Web Token)

---------------------------------------------------
### What is it?
JWT ek stateless authentication mechanism hai. Stateless matlab backend ko server ki memory (RAM) mein ya database mein session store karke nahi rakhna padta ki "kaun login hai".

---------------------------------------------------
### Why is it used in this project?
Kyunki humara backend stateless hai. Agar hum backend ko scale karte hain (3 servers chalate hain), toh agar user ne Server A par login kiya, Server B ko kaise pata chalega? JWT token dono servers verify kar sakte hain kyunki dono ke paas same `JWT_SECRET` key hai.

---------------------------------------------------
### Internal Working
1. **Header:** Batata hai konsa algorithm use hua (HS256).
2. **Payload:** Data jisme user ka ID aur expiry time hota hai.
3. **Signature:** Yeh sabse important hai. Server secret key use karke header aur payload ko lock kar deta hai.

Agar koi hacker payload mein `userId` change karke kisi aur ka account kholne ki koshish karega, toh Token ki Signature mismatch ho jayegi aur token Invalid ho jayega.

---------------------------------------------------
### Real Life Analogy
Jaise movie theater ki Ticket.
Ticket pe likha hota hai Movie (Payload) aur PVR ka stamp laga hota hai (Signature).
Guard ko check karne ke liye apne manager ko call nahi karna padta (Database check nahi karna padta), wo bas stamp dekh ke samajh jata hai ki ticket asli hai (Stateless verification). Lekin agar tum pen se movie ka naam badal do, toh ticket pakdi jayegi kyunki stamp verify nahi hoga.

---

## 8.2 The Dual-Token Strategy (Access + Refresh)

---------------------------------------------------
### Why is it used in this project?
Sirf ek token use karna dangerous hai. Agar tum token browser ke `localStorage` mein save karte ho, toh XSS (Cross Site Scripting) attack se hacker usko read kar sakta hai.

Humne 2 tokens use kiye hain:
1. **Access Token:** Short lifespan (e.g., 15 mins). Memory mein rehta hai. Ise har API request ke header `Authorization: Bearer <token>` mein bheja jata hai.
2. **Refresh Token:** Long lifespan (e.g., 30 days). Yeh `HttpOnly` Cookie ban ke browser mein save hota hai. Javascript is cookie ko touch bhi nahi kar sakti. 

Jab Access token expire ho jata hai, Frontend chupke se Refresh Token wali cookie backend ko bhejta hai `/api/auth/refresh` endpoint par. Backend usko verify karta hai aur naya Access Token de deta hai. 

---------------------------------------------------
### Security Interview Questions

1. **"Why should you never store a JWT in localStorage?"**
> **Ideal Answer:** "Anything in `localStorage` is accessible via JavaScript. If your site has a single XSS vulnerability—for instance, if a user uploads a note with a malicious script in the title and React accidentally renders it—the attacker can steal the JWT and hijack the session. `HttpOnly` cookies are immune to XSS because the browser blocks JavaScript from reading them."

2. **"What is bcrypt and why do we use salt?"**
> **Ideal Answer:** "Bcrypt is a slow hashing algorithm designed specifically for passwords. Hashing is a one-way function—you can't decrypt it. The 'salt' is a random string added to the password before hashing. Salting ensures that even if two users have the exact same password ('password123'), their final hashes in the database will look completely different. This defeats Rainbow Table attacks where hackers pre-compute hashes for common passwords."

---
✅ **Quick Revision: Chapter 8**
*   **JWT:** Stateless auth. Header + Payload + Signature.
*   **Access Token:** Short-lived, sent in headers.
*   **Refresh Token:** Long-lived, stored in HttpOnly cookie to stop XSS.
*   **Bcrypt:** Slow, one-way hash with salt to defeat rainbow tables.

---

*(Volume 2 Complete. Moving to task update...)*
