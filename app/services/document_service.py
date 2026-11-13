"""Document ingestion and lifecycle operations."""

import logging
import uuid

from sqlalchemy.orm import Session

from app.models import Document
from app.services.chunk_service import chunk_pages
from app.services.embedding_service import generate_embedding
from app.services.qdrant_service import (
    delete_document_chunks,
    ensure_shared_collection,
    get_qdrant_client,
    mark_document_chunks_indexed,
    store_chunks,
)
from app.services.pdf_service import extract_text_from_pdf
from app.services.storage_service import get_document_storage

logger = logging.getLogger(__name__)


def ingest_document(db: Session, document: Document) -> Document:
    """Ingest one stored PDF and publish its vectors only after a full upsert."""
    document.status = "processing"
    db.commit()
    client = None
    try:
        storage = get_document_storage()
        extracted = extract_text_from_pdf(str(storage.resolve(document.storage_path)))
        chunks = chunk_pages(extracted["pages"])
        if not chunks:
            raise ValueError("PDF contains no extractable text")

        records = []
        for index, chunk in enumerate(chunks):
            point_id = uuid.uuid5(document.id, str(index))
            records.append({
                "chunk_id": str(point_id),
                "embedding": generate_embedding(chunk["text"]),
                "text": chunk["text"],
                "metadata": {
                    "user_id": str(document.user_id),
                    "document_id": str(document.id),
                    "source_filename": document.filename,
                    "source": document.filename,
                    "page_number": chunk["page_number"],
                    "chunk_index": index,
                    "indexed": False,
                },
            })

        client = get_qdrant_client()
        ensure_shared_collection(client)
        # Remove stale or partial points before writing deterministic replacements.
        delete_document_chunks(client, document.id, document.user_id)
        store_chunks(client, records)

        document.status = "completed"
        db.commit()
        # Retrieval filters on indexed=True, so partial vectors stay invisible.
        mark_document_chunks_indexed(client, document.id, document.user_id)
    except Exception:
        db.rollback()
        failed = db.get(Document, document.id)
        if failed is not None:
            failed.status = "failed"
            db.commit()
            document = failed
        if client is not None:
            try:
                delete_document_chunks(client, document.id, document.user_id)
            except Exception:
                logger.exception("Could not clean partial vectors for document %s", document.id)
        logger.exception("Document ingestion failed: %s", document.id)
    finally:
        if client is not None:
            client.close()
    return document


def remove_document_vectors(document_id: uuid.UUID, user_id: uuid.UUID) -> None:
    client = get_qdrant_client()
    try:
        delete_document_chunks(client, document_id, user_id)
    finally:
        client.close()
