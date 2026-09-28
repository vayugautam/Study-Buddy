# Chapter 12: Cyber Security Masterclass (Hacking & Defense)

Welcome to Chapter 12! Interview mein Backend Developer ki sabse badi pehchan uski Security understanding hoti hai. Ek single security loophole million-dollar company ko dubaa sakta hai. 

Is chapter mein hum har ek attack ko ek "Hacker ki nazar" se dekhenge, aur sikhenge ki AI Study Buddy ne use kaise prevent kiya.

---

## 🦠 1. XSS (Cross-Site Scripting)

- **What is it?** XSS tab hota hai jab hacker aapki website mein apna malicious JavaScript code inject kar deta hai (Jaise Chat mein `<script>alert('Hacked')</script>` type kar dena).
- **How Hackers Attack:** Agar aapka Frontend us code ko directly render kar de bina clean kiye, toh hacker ka JS chal jayega. Wo code browser ke `localStorage` ko read karke aapka **JWT Access Token** chura kar hacker ke server par bhej dega.
- **How to Prevent:** 
  1. **React's built-in defense:** React JSX by default har string ko escape (clean) karta hai. Isliye `<script>` tag plain text ki tarah dikhega, execute nahi hoga.
  2. **HttpOnly Cookies:** Humne Refresh Token ko aisi cookie mein rakha hai jise browser ki JavaScript read hi nahi kar sakti. Token safe hai!

---

## 🎣 2. CSRF (Cross-Site Request Forgery)

- **What is it?** Hacker aapse kisi malicious website par ek button dabwata hai (e.g., "Click to win iPhone"). Us button ke piche ek API request chupi hoti hai jo aapke bank se paise transfer karti hai. 
- **How Hackers Attack:** Kyunki cookies browser automatically attach karta hai har request ke sath, hacker aapki logged-in state ka faida uthata hai.
- **How to Prevent:** 
  1. **SameSite Cookies:** Hum token cookie par `SameSite=Strict` flag lagate hain, iska matlab cookie sirf tabھی send hogi jab request humari apni website (`aistudybuddy.com`) se ja rahi ho.
  2. **Access Tokens in Headers:** Hum state badalne wali APIs (like POST `/api/chat`) ke liye cookie par depend nahi karte. Hum JS memory se Access Token padh kar `Authorization: Bearer` header mein bhejte hain, jo hacker force nahi kar sakta.

---

## 🗄️ 3. NoSQL Injection

- **What is it?** Jaise SQL injection hoti hai `OR 1=1`, waise hi MongoDB mein bhi injection possible hai using query operators.
- **How Hackers Attack:** Hacker login route par email ki jagah yeh JSON bhejta hai: 
  `{ "email": { "$gt": "" }, "password": { "$gt": "" } }`. 
  `$gt` matlab "Greater Than". Database dekhega "password > empty string", jo ki true hai. Hacker kisi random account mein bina password ke login ho jayega!
- **How to Prevent:** 
  1. **Mongoose:** Mongoose schema check karta hai ki email "String" honi chahiye, "Object" (jisme `$gt` hai) nahi.
  2. **Mongo Sanitize:** Backend par ek middleware lagta hai (`express-mongo-sanitize`) jo request body mein se `$` aur `.` jaise characters ko remove (sanitize) kar deta hai.

---

## 🔑 4. Password Hashing & Rainbow Tables

- **What is it?** `bcrypt` use karke password hash karna.
- **How Hackers Attack:** Agar hacker ne database chura liya, toh use hashed passwords milenge (e.g., `ajksdhn238`). Phir hacker "Rainbow Tables" use karta hai (ek pre-calculated list jisme har common password ka hash likha hota hai) unhe reverse karne ke liye.
- **How to Prevent:** `bcrypt` apne aap ek **"Salt"** (random string) generate karke aapke password ke sath jodta hai hash karne se pehle. Isse har user ka hash totally unique ban jata hai, aur hacker ki Rainbow Tables useless ho jati hain.

---

## 🚪 5. CORS (Cross-Origin Resource Sharing)

- **What is it?** Yeh browser ka ek security feature hai jo ek website (e.g., `hacker.com`) ko kisi aur website (`yourapi.com`) ki API se data padhne se rokta hai.
- **Misconfiguration Attack:** Agar aapne backend mein CORS setup mein `Access-Control-Allow-Origin: *` (allow all) kar diya, toh duniya ki koi bhi website aapki APIs access kar sakti hai.
- **How to Prevent:** `cors()` middleware mein specific URL daalo: `origin: "https://aistudybuddy.vercel.app"`. Ab API sirf aapki frontend se baat karegi.

---

## ⏱️ 6. Rate Limiting & API Security

- **What is it?** Ek IP address ko ek fixed time mein limit se zyada API calls karne se rokna.
- **How Hackers Attack:** 
  1. **Brute Force:** Hacker 1 second mein 1000 alag-alag passwords daal kar login try karega.
  2. **DDoS / Billing Attack:** Hacker aapke `/api/chat` route par lagatar 10,000 bots bhej dega. Server crash ho jayega, aur Groq/Gemini API ka bill $5000+ aa jayega.
- **How to Prevent:** Hum `express-rate-limit` lagate hain:
  - Global: 100 requests / 15 mins.
  - Login Route: 5 attempts / 15 mins (Brute force dead).
  - LLM Routes: 10 requests / 1 min (Billing safe).

---

## 📁 7. File Upload Security (Multer)

- **What is it?** User se PDF file receive karna.
- **How Hackers Attack:** Hacker `.pdf` ki jagah ek `.exe` ya `.js` script upload karega jisme virus hoga, ya phir ek 20GB ki file upload karega taaki server ka disk space exhaust ho jaye aur server band pad jaye (Denial of Service).
- **How to Prevent:** 
  1. Multer config mein strict **Size Limit** lagana (`10MB`).
  2. Multer `fileFilter` mein **MIME type** check karna (sirf `application/pdf` allow karna). Extension change karne se mime type bypass nahi hota.

---

## 🤐 8. Environment Variables & Secrets

- **What is it?** API Keys (Gemini, Groq), Database URLs, aur JWT Secrets.
- **How Hackers Attack:** Agar aapne galti se `.env` file ko GitHub par push kar diya, toh Github pe baithe "Scraper Bots" 1 second mein aapki keys chura lenge aur aapke credit card par hazaron dollars ka bill aa jayega.
- **How to Prevent:** 
  1. Hamesha `.env` ko `.gitignore` mein rakho.
  2. **App Crash Protection:** Humne `env.config.js` mein Zod lagaya hai. Agar server boot hote waqt koi zaroori API key `.env` mein missing hui, toh backend immediately crash ho jayega instead of half-running.

---

## 🎯 Generated Interview Questions

**Q: Tumhari API par Brute Force password guessing attack ho raha hai. Tum us hacker ko completely kaise block karoge?**
**A:** "Main login route par `express-rate-limit` middleware lagaunga jo per-IP address sirf 5 login attempts allow karega per 15 minutes. Uske baad agar hacker request karega toh server HTTP `429 Too Many Requests` status code fek dega bina password check kiye, jisse database ka load zero ho jayega."

**Q: `bcrypt` mein "Salting" ka kya matlab hota hai aur yeh kyu zaroori hai?**
**A:** "Agar do users ka password 'admin123' hai, toh unka normal hash bilkul same aayega. Isse hackers easily guess kar sakte hain. Salting ek random string add karti hai password hash hone se pehle. Iska matlab dono users ke passwords same hone ke bawajood unke hashes 100% alag aayenge, making it immune to Rainbow Table attacks."

**Q: CSRF attack JWT tokens ko kyu effect nahi karta agar tokens Headers mein bheje jayein?**
**A:** "CSRF attack isliye kaam karta hai kyunki browser purane Session Cookies automatically har request ke sath attach kar deta hai. Agar hum Authorization state explicitly memory se utha kar Bearer Header (`Authorization: Bearer <token>`) mein bhejte hain, toh browser use automatically attach nahi kar sakta. Hacker jab request trigger karega, usme token hoga hi nahi, aur server use 401 Unauthorized de dega."

**Q: File upload route par sabse badi vulnerability kya hoti hai?**
**A:** "Unrestricted file types aur no size limit. Agar main size limit na lagau, toh ek script 50GB data stream karke server ke storage aur memory ko choke kar degi. Isliye maine Multer mein 10MB limit aur strict `application/pdf` MIME type validation lagaya hai."

---
*If you can defend your application against these threats during a system design interview, the interviewer will instantly know you write Production-Ready code.*
