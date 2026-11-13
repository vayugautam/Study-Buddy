"""Authenticated document upload, listing, status, retry, and deletion."""

import logging
import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pypdf import PdfReader
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.models import Document, User
from app.schemas import DocumentResponse
from app.services.document_service import ingest_document, remove_document_vectors
from app.services.storage_service import FileTooLargeError, get_document_storage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])
PDF_MIME_TYPE = "application/pdf"
DEFAULT_MAX_UPLOAD_BYTES = 25 * 1024 * 1024


def _response(document: Document) -> DocumentResponse:
    return DocumentResponse(
        id=document.id,
        filename=document.filename,
        status=document.status,
        created_at=document.created_at,
    )


def _max_upload_bytes() -> int:
    try:
        value = int(os.getenv("MAX_PDF_UPLOAD_BYTES", str(DEFAULT_MAX_UPLOAD_BYTES)))
    except ValueError as exc:
        raise HTTPException(status_code=500, detail="Upload size is misconfigured") from exc
    if value <= 0:
        raise HTTPException(status_code=500, detail="Upload size is misconfigured")
    return value


def _owned_document(db: Session, document_id: uuid.UUID, user_id: uuid.UUID) -> Document:
    document = db.scalar(
        select(Document).where(Document.id == document_id, Document.user_id == user_id)
    )
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    if file.content_type != PDF_MIME_TYPE or not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Only PDF files are accepted")

    document_id = uuid.uuid4()
    storage = get_document_storage()
    try:
        storage_key = storage.save_upload(document_id, file.file, _max_upload_bytes())
    except FileTooLargeError:
        raise HTTPException(status_code=413, detail="PDF exceeds the maximum upload size")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        path = storage.resolve(storage_key)
        reader = PdfReader(str(path), strict=True)
        if reader.is_encrypted:
            raise ValueError("Encrypted PDFs are not supported")
        # Force parsing the page tree now so corrupt/truncated PDFs fail upload.
        len(reader.pages)
    except Exception as exc:
        storage.delete(storage_key)
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid readable PDF") from exc

    document = Document(
        id=document_id,
        user_id=current_user.id,
        filename=os.path.basename(file.filename or "document.pdf")[:255],
        storage_path=storage_key,
        status="pending",
    )
    db.add(document)
    try:
        db.commit()
        db.refresh(document)
    except Exception:
        db.rollback()
        storage.delete(storage_key)
        logger.exception("Could not persist uploaded document metadata")
        raise HTTPException(status_code=500, detail="Could not save uploaded document")

    document = ingest_document(db, document)
    return _response(document)


@router.get("", response_model=list[DocumentResponse])
def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[DocumentResponse]:
    documents = db.scalars(
        select(Document).where(Document.user_id == current_user.id).order_by(Document.created_at.desc())
    ).all()
    return [_response(document) for document in documents]


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    return _response(_owned_document(db, document_id, current_user.id))


@router.post("/{document_id}/retry", response_model=DocumentResponse)
def retry_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    document = _owned_document(db, document_id, current_user.id)
    if document.status == "completed":
        return _response(document)
    if document.status == "processing":
        raise HTTPException(status_code=409, detail="Document is already processing")
    return _response(ingest_document(db, document))


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    document = _owned_document(db, document_id, current_user.id)
    # Keep metadata if either external cleanup fails so this operation can be retried.
    try:
        remove_document_vectors(document.id)
        get_document_storage().delete(document.storage_path)
    except Exception as exc:
        logger.exception("Document cleanup failed: %s", document.id)
        raise HTTPException(status_code=503, detail="Document cleanup failed; retry deletion") from exc
    db.delete(document)
    db.commit()
