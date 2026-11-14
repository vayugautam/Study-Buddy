from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import logging
import os

from app.services.llm_service import generate_answer
from app.api.routes.auth import router as auth_router
from app.api.routes.documents import router as documents_router
from app.api.routes.conversations import router as conversations_router
from app.api.dependencies import get_current_user
from app.models import User
from app.api.dependencies import get_db
from app.schemas import CitationResponse
from app.services.retrieval_service import retrieve_for_conversation
from sqlalchemy.orm import Session
from sqlalchemy import text
import uuid

EVALUATION_MODE = os.getenv("EVAL_FIXTURE_MODE") == "1"
if EVALUATION_MODE:
    evaluation_database = os.getenv("DATABASE_URL", "").casefold()
    evaluation_collection = os.getenv("QDRANT_COLLECTION_NAME", "")
    evaluation_storage = os.getenv("DOCUMENT_STORAGE_DIR", "").replace("\\", "/").casefold()
    if not evaluation_database.startswith("sqlite:") or "evaluation" not in evaluation_database:
        raise RuntimeError("EVAL_FIXTURE_MODE requires an evaluation-named SQLite DATABASE_URL")
    if not evaluation_collection.startswith("study_buddy_eval_"):
        raise RuntimeError("EVAL_FIXTURE_MODE requires a dedicated QDRANT_COLLECTION_NAME")
    if "evaluation_uploads" not in evaluation_storage:
        raise RuntimeError("EVAL_FIXTURE_MODE requires DOCUMENT_STORAGE_DIR under evaluation_uploads")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "dist"

app = FastAPI(
    title="Study-Buddy AI",
    description="A PDF-based Retrieval-Augmented Generation API",
    version="1.0.0",
)
cors_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        ),
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(conversations_router)


class QuestionRequest(BaseModel):
    conversation_id: uuid.UUID
    question: str = Field(
        min_length=1,
        max_length=2000,
        description="Question to ask about the PDF"
    )


class SourceResponse(BaseModel):
    chunk_id: int | str
    source: str
    score: float
    document_id: uuid.UUID
    page_number: int | None = None


class AskResponse(BaseModel):
    question: str
    answer: str
    retrieved_chunks: int
    citations: list[CitationResponse]
    sources: list[SourceResponse]


@app.get("/", include_in_schema=False)
def home():
    index_file = FRONTEND_DIST / "index.html"

    if index_file.is_file():
        return FileResponse(index_file)

    return {
        "message": "Study-Buddy AI API is running",
        "environment": "evaluation" if EVALUATION_MODE else "application",
    }


@app.get("/health")
def health(db: Session = Depends(get_db)):
    """Readiness check for the API and its required PostgreSQL connection."""
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        logger.warning("Health check database query failed: %s", type(exc).__name__)
        raise HTTPException(status_code=503, detail="Database is not ready") from exc
    return {"status": "ok"}


@app.post("/ask", response_model=AskResponse)
def ask_question(
    request: QuestionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        question = request.question.strip()

        if not question:
            raise HTTPException(
                status_code=422,
                detail="Question cannot be empty."
            )

        try:
            chunks = retrieve_for_conversation(
                db,
                conversation_id=request.conversation_id,
                user_id=current_user.id,
                query=question,
                limit=5,
                score_threshold=0.50,
            )
        except LookupError:
            raise HTTPException(status_code=404, detail="Conversation not found")

        if not chunks:
            return AskResponse(
                question=question,
                answer="I couldn't find sufficiently relevant information in the PDF to answer that question.",
                retrieved_chunks=0,
                citations=[],
                sources=[],
            )

        result = generate_answer(question, chunks)

        sources = [
            SourceResponse(
                chunk_id=chunk["chunk_id"],
                source=chunk["source"],
                score=chunk["score"],
                document_id=chunk["document_id"],
                page_number=chunk.get("page_number"),
            )
            for chunk in chunks
        ]

        return AskResponse(
            question=question,
            answer=result.answer,
            retrieved_chunks=len(chunks),
            citations=[
                CitationResponse.model_validate(citation.model_dump())
                for citation in result.citations
            ],
            sources=sources,
        )

    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to process question")
        raise HTTPException(
            status_code=500,
            detail="Failed to process the question. Check the server logs."
        )


@app.get("/{full_path:path}", include_in_schema=False)
def frontend_fallback(full_path: str):
    reserved_paths = {
        "auth",
        "documents",
        "conversations",
        "ask",
        "health",
    }

    first_segment = full_path.split("/", 1)[0]

    # Unknown API paths should remain API 404s, not return React HTML.
    if first_segment in reserved_paths:
        raise HTTPException(status_code=404, detail="Not found")

    dist_root = FRONTEND_DIST.resolve()
    requested_file = (dist_root / full_path).resolve()

    # Serve an existing frontend file, such as a JS or CSS asset.
    if requested_file.is_relative_to(dist_root) and requested_file.is_file():
        return FileResponse(requested_file)

    # Missing files with extensions should return 404.
    if Path(full_path).suffix:
        raise HTTPException(status_code=404, detail="Not found")

    # React Router paths should return the frontend entry point.
    index_file = dist_root / "index.html"

    if index_file.is_file():
        return FileResponse(index_file)

    raise HTTPException(status_code=404, detail="Not found")
