
import logging
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Conversation, ConversationDocument, Document
from app.services.embedding_service import generate_embedding
from app.services.qdrant_service import COLLECTION_NAME, get_qdrant_client, models

logger = logging.getLogger(__name__)

DEFAULT_SCORE_THRESHOLD = 0.50


def _query_chunks(
    query: str,
    *,
    user_id: uuid.UUID,
    document_ids: list[uuid.UUID],
    limit: int,
    score_threshold: float,
) -> list[dict]:
    if not query.strip():
        raise ValueError("Query cannot be empty.")

    if not 0.0 <= score_threshold <= 1.0:
        raise ValueError("Score threshold must be between 0 and 1.")
    if not document_ids:
        return []

    client = get_qdrant_client()

    try:
        query_embedding = generate_embedding(query)

        query_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="user_id",
                    match=models.MatchValue(value=str(user_id)),
                ),
                models.FieldCondition(
                    key="indexed",
                    match=models.MatchValue(value=True),
                ),
                models.FieldCondition(
                    key="document_id",
                    match=models.MatchAny(any=[str(item) for item in document_ids]),
                ),
            ]
        )

        results = client.query_points(
            collection_name=COLLECTION_NAME,
            query=query_embedding,
            limit=limit,
            with_payload=True,
            query_filter=query_filter,
        )

        retrieved_chunks = []

        for point in results.points:
            if point.score < score_threshold:
                continue

            payload = point.payload or {}

            retrieved_chunks.append({
                "chunk_id": payload["chunk_id"],
                "text": payload["text"],
                "source": payload.get("source", "Unknown"),
                "score": point.score,
                "document_id": payload.get("document_id"),
                "page_number": payload.get("page_number"),
            })

        logger.info(
            "Retrieval completed: returned=%d, retained=%d, threshold=%.2f",
            len(results.points),
            len(retrieved_chunks),
            score_threshold,
        )

        return retrieved_chunks

    finally:
        client.close()


def retrieve_for_conversation(
    db: Session,
    *,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    query: str,
    limit: int = 5,
    score_threshold: float = DEFAULT_SCORE_THRESHOLD,
) -> list[dict]:
    """Authorize the conversation, resolve its scope, then query the shared collection."""
    conversation = db.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        )
    )
    if conversation is None:
        raise LookupError("Conversation not found")

    if conversation.retrieval_scope == "all_documents":
        allowed_document_ids = list(db.scalars(
            select(Document.id).where(
                Document.user_id == user_id,
                Document.status == "completed",
            )
        ).all())
    elif conversation.retrieval_scope in {"single_document", "selected_documents"}:
        allowed_document_ids = list(db.scalars(
            select(Document.id)
            .join(ConversationDocument, ConversationDocument.document_id == Document.id)
            .where(
                ConversationDocument.conversation_id == conversation.id,
                ConversationDocument.user_id == user_id,
                Document.user_id == user_id,
                Document.status == "completed",
            )
        ).all())
        if conversation.retrieval_scope == "single_document" and len(allowed_document_ids) > 1:
            raise ValueError("single_document conversation has invalid document selection")
    else:
        raise ValueError("Conversation has an unsupported retrieval scope")

    # Ownership and scope are fully resolved before embeddings or Qdrant are touched.
    return _query_chunks(
        query,
        user_id=user_id,
        document_ids=allowed_document_ids,
        limit=limit,
        score_threshold=score_threshold,
    )
