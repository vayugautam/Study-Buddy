"""Retry ingestion for an existing document record.

The former one-off loader recreated the Qdrant collection and wrote unowned
points. All ingestion now runs through the shared document service.
"""

import argparse
from uuid import UUID

from app.db.session import SessionLocal
from app.models import Document
from app.services.document_service import ingest_document


def ingest_pdf(document_id: UUID) -> Document:
    db = SessionLocal()
    try:
        document = db.get(Document, document_id)
        if document is None:
            raise ValueError(f"Document {document_id} was not found")
        return ingest_document(db, document)
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Retry ingestion for a stored document")
    parser.add_argument("document_id", type=UUID)
    args = parser.parse_args()
    document = ingest_pdf(args.document_id)
    print(f"Document {document.id}: {document.status}")
