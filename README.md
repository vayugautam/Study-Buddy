# Study Buddy AI

Study Buddy AI is a private study workspace for asking questions about course PDFs. Upload learning material, organize it by document, and chat with an AI assistant that retrieves relevant passages and includes citations to the source document and page.

## Features

- PDF upload, processing, and document management
- Retrieval-augmented answers grounded in your uploaded material
- Page-aware citations and source references
- Accounts and persistent conversations
- PostgreSQL for application data and Qdrant for vector search
- React and Vite frontend with a FastAPI backend

## How it works

1. The API extracts text from uploaded PDFs and splits it into searchable chunks.
2. Gemini creates embeddings for those chunks, which are stored in Qdrant.
3. A question retrieves relevant chunks for the signed-in user's documents.
4. Groq generates an answer from the retrieved evidence, with citations returned to the UI.

## Tech stack

**Frontend:** React, Vite, React Router, Markdown, KaTeX  
**Backend:** Python, FastAPI, SQLAlchemy, Alembic, PyPDF  
**Storage and AI:** PostgreSQL, Qdrant, Gemini embeddings, Groq chat completions

## Run locally

### Prerequisites

- Python 3.11 or newer
- Node.js 20 or newer
- PostgreSQL database
- Qdrant collection/service
- Gemini and Groq API credentials

### Backend

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env` with your database, Qdrant, Gemini, and Groq values. Set a unique, random `JWT_SECRET`; never commit `.env` or put provider secrets in frontend variables. Apply migrations and start the API:

```powershell
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend

In another terminal:

```powershell
npm ci
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). The development proxy forwards `/api` requests to `http://127.0.0.1:8000` by default; configure `BACKEND_API_URL` if your API uses another local address.

## Configuration

See [`.env.example`](.env.example) for the available settings. The main production settings are:

- `DATABASE_URL`: PostgreSQL SQLAlchemy URL using `postgresql+psycopg://`
- `QDRANT_URL`, `QDRANT_API_KEY`, `QDRANT_COLLECTION_NAME`: vector search connection
- `GEMINI_API_KEY`, `GEMINI_EMBEDDING_MODEL`: embedding provider
- `GROQ_API_KEY`, `GROQ_MODEL`: answer generation provider
- `JWT_SECRET`: unique production signing secret
- `CORS_ALLOWED_ORIGINS`: exact frontend origin(s), comma-separated
- `DOCUMENT_STORAGE_DIR`: durable location for uploaded PDFs
- `VITE_API_BASE_URL`: public API origin at frontend build time; this value is visible in browser assets and must not contain secrets

## Tests and build

```powershell
pytest
npm run build
```

Some integration and evaluation checks need dedicated database/vector services and provider credentials. Do not point evaluation runs at production resources. Evaluation fixtures under `tests/evaluation/fixtures/` are intentionally versioned; local uploaded study material under `data/` is not.

## GitHub and deployment

Commit application source, migrations, dependency manifests/lockfiles, tests, documentation, and safe configuration templates such as `.env.example`. Keep credentials, local environment files, virtual environments, dependencies, build output, user uploads, personal course PDFs, local databases, and evaluation run output out of Git. The repository's [`.gitignore`](.gitignore) covers these local files.

For deployment architecture, environment variables, persistent file storage, and the release checklist, see [`DEPLOYMENT.md`](DEPLOYMENT.md). Uploaded PDFs require durable storage on the API host; ephemeral filesystems lose them after restart or deploy.
