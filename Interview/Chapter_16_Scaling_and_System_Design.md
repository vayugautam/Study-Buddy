# Chapter 16: System Design & Scaling (100 to 10 Million Users)

Building the **AI Study Buddy** application to work for you locally is one thing; architecting it to serve millions of concurrent users globally is an entirely different engineering challenge. This chapter maps out our scaling journey, identifying bottlenecks at each tier of user growth and introducing the architectural concepts required to solve them.

---

## 1. The Scaling Journey: Identifying Bottlenecks & Solutions

### 100 Users
- **Architecture:** A single Node.js instance on a basic VPS (e.g., $5 DigitalOcean Droplet). Both the frontend and backend live here. A free-tier MongoDB Atlas cluster.
- **Bottlenecks:** None at this scale. Occasional slow responses if two users upload heavy PDFs simultaneously.
- **Solution:** Focus on product-market fit. No complex scaling needed.

### 1K Users
- **Bottlenecks:** Database queries slow down slightly as chat histories grow. High memory usage during peak study times when multiple PDFs are processed. Perceived latency if users are far from the server.
- **Solution:** 
  - **Vertical Scaling:** Upgrade the VPS to a machine with more RAM and CPU.
  - **CDN:** Move the React frontend to a CDN (Vercel/CloudFront) so static assets load instantly worldwide.

### 10K Users
- **Bottlenecks:** The single Node.js backend server crashes due to event-loop blocking or running out of memory. 
- **Solution:** 
  - **Horizontal Scaling & Load Balancing:** Spin up 3-5 backend servers. Place a Load Balancer (like NGINX or AWS ALB) in front of them to distribute traffic evenly.
  - **Database Indexing:** Ensure MongoDB fields (`userId`, `createdAt`) are heavily optimized with indexes.

### 100K Users
- **Bottlenecks:** The database is hammered with read requests (e.g., users fetching their chat history). Background tasks (PDF parsing, LLM embeddings) timeout HTTP requests.
- **Solution:** 
  - **Redis Cache:** Implement Redis to cache frequent reads and API rate limits.
  - **Message Queues:** Introduce RabbitMQ or AWS SQS. Instead of parsing PDFs in the HTTP request cycle, put the job on a queue for background workers to process asynchronously.

### 1 Million Users
- **Bottlenecks:** The single primary MongoDB database is overloaded with concurrent reads and writes. High latency in vector searches (ChromaDB) due to massive dataset sizes.
- **Solution:** 
  - **Database Replication:** Set up MongoDB replica sets (1 Primary for writes, multiple Secondaries for reads).
  - **Microservices:** Begin splitting the monolithic Node.js backend. Separate the `Auth Service`, `AI Chat Service`, and `Document Processing Service` so they can scale independently.

### 10 Million Users
- **Bottlenecks:** Storage limits are hit on a single database cluster. Global users experience lag if all servers are in one region.
- **Solution:** 
  - **Database Sharding:** Partition the database horizontally across multiple clusters based on geographic region or a hash of the `userId`.
  - **Multi-Region Deployment:** Deploy backend microservices and database shards in multiple AWS regions (e.g., US-East, Europe, Asia) and route traffic using DNS geo-routing.

---

## 2. Core Scaling Concepts Explained

> [!TIP]
> Understanding these concepts is fundamental to mastering System Design.

### CDN (Content Delivery Network)
A network of distributed servers that cache static assets (HTML, CSS, JS, images) close to the user's geographic location. When a user in Tokyo requests the AI Study Buddy app, they get the assets from a server in Tokyo, not New York.

### Vertical Scaling (Scaling Up)
Adding more power (CPU, RAM) to an existing machine. It's simple but has a hard physical limit and introduces a single point of failure.

### Horizontal Scaling (Scaling Out)
Adding more machines to a resource pool. Instead of one massive server, you have ten smaller ones. This provides redundancy and theoretically infinite scaling.

### Load Balancer
A traffic cop sitting in front of your servers. When an HTTP request arrives, the Load Balancer forwards it to the server with the most available capacity (often using algorithms like Round-Robin or Least Connections).

### Redis (Distributed Cache)
An in-memory, key-value data store. It is magnitudes faster than a traditional database (sub-millisecond latency). Used to store frequently accessed data (like user sessions or recent flashcards) to prevent hammering the primary database.

### Queues (Message Brokers)
Systems like RabbitMQ, Kafka, or BullMQ that manage asynchronous tasks. If a user uploads a 500-page textbook, the backend shouldn't wait for parsing to finish. It drops a message in the queue and immediately returns a "Processing" status to the user. Background worker servers consume the queue at their own pace.

### Database Replication
Creating exact copies of a database. The **Primary** node handles all `INSERT`, `UPDATE`, and `DELETE` commands. The changes are synchronized to **Secondary** (Replica) nodes. All `SELECT` (read) queries are routed to the Secondaries, massively increasing read capacity.

### Database Sharding
Splitting a massive table across multiple separate databases. For example, users with IDs starting with A-M are stored on Database Server 1, and N-Z on Database Server 2. This increases both read and write capacity but drastically increases architectural complexity.

### Microservices
Breaking a large, monolithic backend down into small, independent services that communicate via APIs or Queues. If the PDF parsing service crashes, the Authentication and Chat services remain online.

---

## 3. System Design Interview Questions

Use these questions to test your understanding of how AI Study Buddy scales under pressure.

1. **"Walk me through what happens when a user uploads a 1,000-page PDF to AI Study Buddy. How do you prevent the API from timing out?"**
   *(Expected to discuss Message Queues, background workers, and WebSockets/Polling for status updates).*

2. **"Our application is growing fast and users complain that loading their past chat history is taking 5 seconds. How do you fix this?"**
   *(Expected to discuss MongoDB indexing, pagination, and caching frequent queries in Redis).*

3. **"We just hit 1 million users. Our single MongoDB instance is at 100% CPU. How do we scale the database layer without losing data?"**
   *(Expected to discuss Master-Slave Replication, offloading read queries to replicas, and potentially sharding if write-heavy).*

4. **"If the LLM provider (e.g., Groq or Gemini) goes down or throttles our requests, how does our system handle it gracefully?"**
   *(Expected to discuss circuit breakers, fallback strategies (switching from Groq to an OpenAI fallback), and semantic caching for duplicate questions).*

5. **"Why did you choose a monolithic Express architecture initially, and at what point would you transition to Microservices?"**
   *(Expected to discuss the speed of development for a monolith, and transitioning to microservices only when team size or independent scaling requirements dictate it).*
