import io
import os
import secrets
import uuid

import pytest
from fastapi.testclient import TestClient
from pypdf import PdfWriter
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# These tests exercise local routes only and must not need live model credentials.
os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")
os.environ.setdefault("GROQ_API_KEY", "test-groq-key")
os.environ.setdefault("GROQ_MODEL", "openai/gpt-oss-120b")

from app.api.dependencies import get_db
from app.db.base import Base
from app.main import app
from app.models import Document


@pytest.fixture
def document_client(monkeypatch, tmp_path):
    monkeypatch.setenv("JWT_SECRET_KEY", secrets.token_urlsafe(48))
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    monkeypatch.setenv("DOCUMENT_STORAGE_DIR", str(tmp_path / "pdfs"))
    monkeypatch.setenv("MAX_PDF_UPLOAD_BYTES", str(2 * 1024 * 1024))
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    testing_session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(engine)

    def override_get_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client, testing_session
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()


def pdf_bytes():
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    output = io.BytesIO()
    writer.write(output)
    return output.getvalue()


def user_token(client, email):
    response = client.post("/auth/register", json={"email": email, "password": "strong-password-123"})
    assert response.status_code == 201
    response = client.post("/auth/login", json={"email": email, "password": "strong-password-123"})
    assert response.status_code == 200
    return response.json()["access_token"]


def upload(client, token, filename="lesson.pdf", content=None, content_type="application/pdf"):
    return client.post(
        "/documents",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": (filename, content if content is not None else pdf_bytes(), content_type)},
    )


def test_valid_pdf_upload(document_client, monkeypatch):
    client, _ = document_client
    from app.api.routes import documents

    token = user_token(client, "one@example.com")

    def complete(db, document):
        document.status = "completed"
        db.commit()
        return document

    monkeypatch.setattr(documents, "ingest_document", complete)
    response = upload(client, token)
    assert response.status_code == 201
    assert response.json()["status"] == "completed"
    assert client.get("/documents", headers={"Authorization": f"Bearer {token}"}).json()[0]["id"] == response.json()["id"]
    assert client.get(f"/documents/{response.json()['id']}", headers={"Authorization": f"Bearer {token}"}).json()["status"] == "completed"


def test_invalid_file_upload(document_client):
    client, _ = document_client
    token = user_token(client, "one@example.com")
    assert upload(client, token, filename="image.png", content=b"not a PDF", content_type="image/png").status_code == 415
    assert upload(client, token, content=b"not a PDF").status_code == 400


def test_oversized_pdf(document_client, monkeypatch):
    client, _ = document_client
    token = user_token(client, "one@example.com")
    monkeypatch.setenv("MAX_PDF_UPLOAD_BYTES", "100")
    response = upload(client, token, content=pdf_bytes() + b"x" * 200)
    assert response.status_code == 413


def test_retry_that_still_fails_is_reported_as_failed(document_client, monkeypatch):
    client, _ = document_client
    from app.api.routes import documents

    token = user_token(client, "retry@example.com")
    monkeypatch.setattr(documents, "ingest_document", lambda db, document: document)
    created = upload(client, token)
    document_id = created.json()["id"]
    assert created.json()["status"] == "pending"

    def fail_again(db, document):
        document.status = "failed"
        db.commit()
        return document

    monkeypatch.setattr(documents, "ingest_document", fail_again)
    retried = client.post(
        f"/documents/{document_id}/retry",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert retried.status_code == 200
    assert retried.json()["status"] == "failed"
    assert retried.json()["status"] != "completed"


def test_duplicate_ingestion_retry_uses_stable_point_ids(document_client, monkeypatch, tmp_path):
    _, testing_session = document_client
    from app.services import document_service
    from app.services.storage_service import LocalFileStorage

    storage = LocalFileStorage()
    document_id = uuid.uuid4()
    storage_key = storage.save_upload(document_id, io.BytesIO(pdf_bytes()), 2 * 1024 * 1024)
    with testing_session() as db:
        from app.models import User
        from app.security import hash_password

        owner = User(email="owner@example.com", password_hash=hash_password("strong-password-123"))
        db.add(owner)
        db.commit()
        document = Document(id=document_id, user_id=owner.id, filename="lesson.pdf", storage_path=storage_key, status="pending")
        db.add(document)
        db.commit()

        class FakeQdrant:
            points = {}

            def close(self):
                pass

        qdrant = FakeQdrant()
        monkeypatch.setattr(
            document_service,
            "extract_text_from_pdf",
            lambda path: {
                "pages": [
                    "First page has stable content for indexing.",
                    "Second page also has extractable study material.",
                ],
                "page_count": 2,
            },
        )
        monkeypatch.setattr(document_service, "generate_embedding", lambda text: [0.1, 0.2])
        monkeypatch.setattr(document_service, "get_qdrant_client", lambda: qdrant)
        monkeypatch.setattr(document_service, "ensure_shared_collection", lambda client: None)
        monkeypatch.setattr(
            document_service,
            "delete_document_chunks",
            lambda client, doc_id, user_id: client.points.clear(),
        )
        monkeypatch.setattr(document_service, "store_chunks", lambda client, records: client.points.update({r["chunk_id"]: r for r in records}))
        monkeypatch.setattr(document_service, "mark_document_chunks_indexed", lambda client, doc_id, user_id: None)

        document_service.ingest_document(db, document)
        first_ids = set(qdrant.points)
        document_service.ingest_document(db, document)
        assert document.status == "completed"
        assert set(qdrant.points) == first_ids
        assert len(qdrant.points) == 2
        record = next(iter(qdrant.points.values()))
        metadata = record["metadata"]
        assert metadata["user_id"] == str(owner.id)
        assert metadata["document_id"] == str(document.id)
        assert record["chunk_id"] in first_ids
        assert metadata["source_filename"] == "lesson.pdf"
        assert metadata["page_number"] == 1
        assert metadata["chunk_index"] == 0
        assert record["text"].startswith("First page")
        assert {item["metadata"]["page_number"] for item in qdrant.points.values()} == {1, 2}


def test_cross_user_access_and_delete(document_client, monkeypatch):
    client, _ = document_client
    from app.api.routes import documents
    from app.services.storage_service import LocalFileStorage

    owner_token = user_token(client, "owner@example.com")
    other_token = user_token(client, "other@example.com")

    def complete(db, document):
        document.status = "completed"
        db.commit()
        return document

    monkeypatch.setattr(documents, "ingest_document", complete)
    created = upload(client, owner_token)
    document_id = created.json()["id"]
    assert client.get(f"/documents/{document_id}", headers={"Authorization": f"Bearer {other_token}"}).status_code == 404
    assert client.delete(f"/documents/{document_id}", headers={"Authorization": f"Bearer {other_token}"}).status_code == 404

    deleted_vectors = []
    monkeypatch.setattr(
        documents,
        "remove_document_vectors",
        lambda document_id, user_id: deleted_vectors.append((document_id, user_id)),
    )
    file_key = None
    with next(app.dependency_overrides[get_db]()) as db:
        file_key = db.get(Document, uuid.UUID(document_id)).storage_path
    path = LocalFileStorage().resolve(file_key)
    response = client.delete(f"/documents/{document_id}", headers={"Authorization": f"Bearer {owner_token}"})
    assert response.status_code == 204
    owner_id = uuid.UUID(
        client.get("/auth/me", headers={"Authorization": f"Bearer {owner_token}"}).json()["id"]
    )
    assert deleted_vectors == [(uuid.UUID(document_id), owner_id)]
    assert not path.exists()
    assert client.get(f"/documents/{document_id}", headers={"Authorization": f"Bearer {owner_token}"}).status_code == 404


def test_delete_cleanup_failure_returns_error_and_keeps_metadata_and_file(document_client, monkeypatch):
    client, _ = document_client
    from app.api.routes import documents
    from app.services.storage_service import LocalFileStorage

    token = user_token(client, "delete-failure@example.com")

    def complete(db, document):
        document.status = "completed"
        db.commit()
        return document

    monkeypatch.setattr(documents, "ingest_document", complete)
    created = upload(client, token)
    document_id = created.json()["id"]
    with next(app.dependency_overrides[get_db]()) as db:
        file_key = db.get(Document, uuid.UUID(document_id)).storage_path
    stored_file = LocalFileStorage().resolve(file_key)
    assert stored_file.exists()

    def fail_vector_cleanup(*args):
        raise RuntimeError("test cleanup failure")

    monkeypatch.setattr(documents, "remove_document_vectors", fail_vector_cleanup)
    response = client.delete(
        f"/documents/{document_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 503
    assert response.json()["detail"] == "Document cleanup failed; retry deletion"
    assert stored_file.exists()
    assert client.get(
        f"/documents/{document_id}",
        headers={"Authorization": f"Bearer {token}"},
    ).status_code == 200


def test_retrieval_is_filtered_to_authenticated_user(monkeypatch):
    from app.services import retrieval_service

    owner_id = uuid.uuid4()
    captured = {}

    class FakeQdrant:
        def query_points(self, **kwargs):
            captured.update(kwargs)
            return type("QueryResult", (), {"points": []})()

        def close(self):
            pass

    monkeypatch.setattr(retrieval_service, "get_qdrant_client", lambda: FakeQdrant())
    monkeypatch.setattr(retrieval_service, "generate_embedding", lambda text: [0.1] * 3072)
    retrieval_service._query_chunks(
        "test query", user_id=owner_id, document_ids=[uuid.uuid4()], limit=5,
        score_threshold=0.5,
    )

    conditions = captured["query_filter"].must
    assert any(condition.key == "user_id" and condition.match.value == str(owner_id) for condition in conditions)
    assert any(condition.key == "indexed" and condition.match.value is True for condition in conditions)


def test_qdrant_point_contains_required_metadata():
    from app.services.qdrant_service import store_chunks

    captured = {}

    class FakeQdrant:
        def upsert(self, **kwargs):
            captured.update(kwargs)

    user_id, document_id, chunk_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    store_chunks(FakeQdrant(), [{
        "chunk_id": str(chunk_id),
        "embedding": [0.0] * 3072,
        "text": "Evidence text",
        "metadata": {
            "user_id": str(user_id),
            "document_id": str(document_id),
            "source_filename": "course.pdf",
            "source": "course.pdf",
            "page_number": 3,
            "chunk_index": 7,
            "indexed": False,
        },
    }])

    payload = captured["points"][0].payload
    assert payload["user_id"] == str(user_id)
    assert payload["document_id"] == str(document_id)
    assert payload["chunk_id"] == str(chunk_id)
    assert payload["source_filename"] == "course.pdf"
    assert payload["page_number"] == 3
    assert payload["chunk_index"] == 7
    assert payload["text"] == "Evidence text"
