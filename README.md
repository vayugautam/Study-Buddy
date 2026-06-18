# AI Study Buddy 🎯

AI Study Buddy is an intelligent, RAG-powered application designed to help students study smarter, not harder. You can upload PDF notes, and the application will use artificial intelligence to let you chat with your documents, automatically generate interactive quizzes, and create study flashcards—all backed by a custom Retrieval-Augmented Generation pipeline.

## 🌟 Features

- **Document Management**: Upload PDF notes (up to 10MB) to your personal library.
- **RAG-Powered Chat**: Ask questions about your notes and get accurate, context-aware answers with citations indicating exactly which chunk of your document the AI used.
- **Auto-Generated Quizzes**: Dynamically generate multiple-choice quizzes with explanations based purely on the content of your PDFs.
- **Flashcard Decks**: Automatically extract key concepts from your notes to generate ready-to-study flashcard decks.
- **Dynamic Dashboard**: Track your study streak, total quizzes taken, and average scores natively calculated from your attempts.
- **Split AI Architecture**: Leverages **Google Gemini** for lightning-fast OCR and document embeddings, while utilizing **Groq** (LLaMA 3.3 70B Versatile) for high-frequency chat and generation tasks, effectively eliminating standard AI free-tier quota limits.

## 🚀 Tech Stack

### Frontend
- **React.js** (Vite)
- **Tailwind CSS** (for styling)
- **Zustand** (for state management)
- **Framer Motion** (for micro-animations)

### Backend
- **Node.js** & **Express**
- **MongoDB** with Mongoose (Database)
- **Google Gen AI SDK** (for Embeddings and PDF processing)
- **Groq SDK** (for Chat, Quiz, and Flashcard generation)
- Local Vector similarity chunking implementation

## ⚙️ Local Setup

### Prerequisites
- Node.js (v18+)
- MongoDB instance (local or Atlas)
- [Google Gemini API Key](https://aistudio.google.com/app/apikey)
- [Groq API Key](https://console.groq.com/keys)

### 1. Clone the repository
```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
cd "AI Study Buddy"
```

### 2. Backend Setup
Navigate to the backend directory and install dependencies:
```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:
```env
# Server
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb+srv://<username>:<password>@cluster...

# JWT Secrets (replace with strong random strings for production)
JWT_SECRET=super_secret_jwt_key
JWT_REFRESH_SECRET=super_secret_jwt_refresh_key
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# AI API Keys
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here

# Settings
MAX_UPLOAD_SIZE_MB=10
CORS_ORIGIN=http://localhost:5173
```

Start the backend development server:
```bash
npm run dev
```

### 3. Frontend Setup
Open a new terminal window, navigate to the root directory, and install dependencies:
```bash
npm install
```

Create a `.env` file in the root directory:
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_USE_MOCK=false
```

Start the frontend development server:
```bash
npm run dev
```

### 4. Open the App
Navigate to `http://localhost:5173` in your browser. Create an account and upload your first PDF!

## 📄 License
MIT License
