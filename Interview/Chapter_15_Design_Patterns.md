# Chapter 15: Design Patterns & Architecture

Software design patterns are proven solutions to common problems in software design. In the **AI Study Buddy** application, these patterns help structure our code, making it maintainable, scalable, and easier to understand. This chapter breaks down core design patterns and SOLID principles, highlighting exactly where they are used in our project.

---

## 1. MVC (Model-View-Controller)

The MVC pattern separates an application into three interconnected components.

- **Explanation:** 
  - **Model:** Manages the data, logic, and rules of the application.
  - **View:** Any output representation of information (the UI).
  - **Controller:** Accepts input and converts it to commands for the model or view.
- **Where it's used in AI Study Buddy:**
  - **Backend:** We use a modified Model-Route-Controller (and Service) architecture. `backend/src/models` defines the Mongoose data structures. `backend/src/controllers` handles HTTP requests and responses. 
  - **Frontend:** React acts as our View layer. The logic inside our React components and hooks acts as the Controller, mediating between the UI and the data (Model).

## 2. Repository Pattern

The Repository pattern mediates between the domain and data mapping layers using a collection-like interface for accessing domain objects.

- **Explanation:** It abstracts the data store, allowing business logic to access data without needing to know whether it comes from a database, an API, or a local cache.
- **Where it's used in AI Study Buddy:**
  - **Mongoose Models:** In `backend/src/models`, Mongoose automatically provides a repository-like interface (`User.find()`, `Note.findById()`). 
  - **Service Layer Abstraction:** Our services (e.g., `backend/src/services/note.service.js`) act as a concrete repository layer, wrapping Mongoose calls so our controllers never interact with the database directly.

## 3. Singleton Pattern

The Singleton pattern ensures a class has only one instance and provides a global point of access to it.

- **Explanation:** Useful when exactly one object is needed to coordinate actions across the system (e.g., database connections, logging).
- **Where it's used in AI Study Buddy:**
  - **Database Connections:** `backend/src/config/db.config.js` and `chroma.config.js` export single, shared connections. Node.js caches module exports, so every file requiring the database configuration receives the exact same connection instance.
  - **Zustand Store:** On the frontend, Zustand creates a singleton store instance that is shared across the entire React component tree.

## 4. Factory Pattern

The Factory Method pattern provides an interface for creating objects in a superclass, but allows subclasses to alter the type of objects that will be created.

- **Explanation:** Instead of calling a constructor directly, you call a factory method to abstract away the complex instantiation logic.
- **Where it's used in AI Study Buddy:**
  - **LLM Instantiation:** When setting up our AI clients (`@google/genai` or `groq-sdk`), we use factory functions to configure them with the correct API keys and default parameters before returning the instance to the services.
  - **Frontend Components:** Reusable UI components (like a generic `Card` or `Modal`) act as factories, taking in props and returning the appropriately structured JSX elements.

## 5. Observer Pattern

The Observer pattern defines a one-to-many dependency between objects so that when one object changes state, all its dependents are notified and updated automatically.

- **Explanation:** It is the foundation of event-driven programming and reactive UIs.
- **Where it's used in AI Study Buddy:**
  - **React State / Zustand:** The entire frontend relies on this. When our Zustand store (the Subject) updates its state, all React components using that state (the Observers) are notified and automatically re-rendered.
  - **Event Emitters:** Node.js inherently uses the Observer pattern via the `EventEmitter` class (e.g., listening for `'data'` or `'end'` events when parsing file uploads in `pdf.service.js`).

## 6. Strategy Pattern

The Strategy pattern defines a family of algorithms, encapsulates each one, and makes them interchangeable.

- **Explanation:** It lets the algorithm vary independently from the clients that use it.
- **Where it's used in AI Study Buddy:**
  - **AI Model Selection:** We have both `gemini.service.js` and `groq.service.js`. By abstracting text generation into a common interface, the `chat.service.js` can dynamically switch strategies—using Groq (Llama 3) for fast, simple routing queries, and Gemini 1.5 Pro for complex document summarization and reasoning.

## 7. Dependency Injection (DI)

Dependency Injection is a technique where an object receives other objects that it depends on, rather than creating them itself.

- **Explanation:** It decouples objects and makes code vastly easier to test by allowing mock dependencies to be injected.
- **Where it's used in AI Study Buddy:**
  - **Frontend Hooks:** Custom React hooks inject data and methods into components.
  - **Backend Middleware:** Express passes the `req`, `res`, and `next` objects into our controllers. Our controllers rely on injected request data rather than fetching external state.
  - *(Note: While traditional OOP DI containers are rare in Node.js, we practice constructor/function injection when testing our services by passing mock database models as arguments).*

---

## 8. SOLID Principles

SOLID is an acronym for five design principles intended to make software designs more understandable, flexible, and maintainable.

### **S**ingle Responsibility Principle (SRP)
- **Concept:** A class/module should have one, and only one, reason to change.
- **In Our Project:** Our backend is strictly divided. `auth.service.js` handles login/registration. `pdf.service.js` parses PDFs. `rag.service.js` handles vector retrieval. No service tries to do everything.

### **O**pen/Closed Principle (OCP)
- **Concept:** Software entities should be open for extension, but closed for modification.
- **In Our Project:** Express Middleware (`backend/src/middlewares`). We can add new features like rate-limiting, error handling, or authentication checks by attaching new middleware to a route *without* changing the core controller code.

### **L**iskov Substitution Principle (LSP)
- **Concept:** Objects of a superclass shall be replaceable with objects of its subclasses without breaking the application.
- **In Our Project:** While JS is dynamically typed, we apply this in our API design. Our `gemini.service.js` and `groq.service.js` both expose a `generateText(prompt)` function. The higher-level orchestrator can swap them interchangeably.

### **I**nterface Segregation Principle (ISP)
- **Concept:** No client should be forced to depend on methods it does not use.
- **In Our Project:** In our React components, we avoid passing massive objects as props. Instead of passing an entire `User` object to a user avatar component, we only pass `avatarUrl` and `username`.

### **D**ependency Inversion Principle (DIP)
- **Concept:** High-level modules should not depend on low-level modules. Both should depend on abstractions.
- **In Our Project:** Our `controllers` (high-level) don't depend directly on Mongoose (low-level). They depend on our `services`. If we swap MongoDB for PostgreSQL tomorrow, our controllers would remain completely untouched, as long as the service layer maintains the same contract.
