import os
import secrets
import uuid
from datetime import datetime, timezone, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")
os.environ.setdefault("GROQ_API_KEY", "test-groq-key")
os.environ.setdefault("GROQ_MODEL", "openai/gpt-oss-120b")

from app.api.dependencies import get_db
from app.db.base import Base
from app.main import app
from app.models import Conversation, ConversationDocument, Document, Message, MessageCitation, User


@pytest.fixture
def conversation_client(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", secrets.token_urlsafe(48))
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
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


def login_user(client, email):
    response = client.post("/auth/register", json={"email": email, "password": "strong-password-123"})
    assert response.status_code == 201
    response = client.post("/auth/login", json={"email": email, "password": "strong-password-123"})
    assert response.status_code == 200
    return response.json()["access_token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def create_owned_document(testing_session, email, filename="study.pdf"):
    from app.security import hash_password

    with testing_session() as db:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(email=email, password_hash=hash_password("strong-password-123"))
            db.add(user)
            db.commit()
        document = Document(
            user_id=user.id,
            filename=filename,
            storage_path=f"{uuid.uuid4()}.pdf",
            status="completed",
        )
        db.add(document)
        db.commit()
        return document.id


def test_conversation_ownership_and_listing(conversation_client):
    client, _ = conversation_client
    owner = login_user(client, "owner@example.com")
    other = login_user(client, "other@example.com")
    created = client.post("/conversations", headers=auth(owner), json={
        "title": "Biology", "retrieval_scope": "all_documents", "document_ids": []
    })
    assert created.status_code == 201
    conversation_id = created.json()["id"]

    assert client.get("/conversations", headers=auth(other)).json() == []
    assert client.get(f"/conversations/{conversation_id}", headers=auth(other)).status_code == 404
    assert client.patch(f"/conversations/{conversation_id}", headers=auth(other), json={"title": "stolen"}).status_code == 404
    assert client.delete(f"/conversations/{conversation_id}", headers=auth(other)).status_code == 404
    assert client.post(
        f"/conversations/{conversation_id}/messages",
        headers=auth(other),
        json={"content": "hello"},
    ).status_code == 404


def test_selected_documents_are_owned_and_scope_is_persisted(conversation_client):
    client, testing_session = conversation_client
    owner = login_user(client, "owner@example.com")
    login_user(client, "other@example.com")
    own_doc = create_owned_document(testing_session, "owner@example.com")
    other_doc = create_owned_document(testing_session, "other@example.com", "private.pdf")

    accepted = client.post("/conversations", headers=auth(owner), json={
        "retrieval_scope": "selected_documents", "document_ids": [str(own_doc)]
    })
    assert accepted.status_code == 201
    assert accepted.json()["document_ids"] == [str(own_doc)]

    rejected = client.post("/conversations", headers=auth(owner), json={
        "retrieval_scope": "single_document", "document_ids": [str(other_doc)]
    })
    assert rejected.status_code == 404

    conversation_id = accepted.json()["id"]
    changed = client.patch(
        f"/conversations/{conversation_id}",
        headers=auth(owner),
        json={"retrieval_scope": "all_documents"},
    )
    assert changed.status_code == 200
    assert changed.json()["retrieval_scope"] == "all_documents"
    assert changed.json()["document_ids"] == []


def test_messages_persist_in_order_and_update_conversation(conversation_client, monkeypatch):
    client, testing_session = conversation_client
    from app.services import conversation_service

    token = login_user(client, "learner@example.com")
    created = client.post("/conversations", headers=auth(token), json={
        "title": "New topic", "retrieval_scope": "all_documents", "document_ids": []
    })
    conversation_id = created.json()["id"]
    original_updated_at = created.json()["updated_at"]
    from app.services.llm_service import GeneratedAnswer
    monkeypatch.setattr(conversation_service, "generate_answer", lambda content, chunks, history=None: GeneratedAnswer(answer=f"Answer to {content}", citations=[], insufficient_evidence=not chunks))

    first = client.post(f"/conversations/{conversation_id}/messages", headers=auth(token), json={"content": "First question"})
    second = client.post(f"/conversations/{conversation_id}/messages", headers=auth(token), json={"content": "Follow up"})
    assert first.status_code == second.status_code == 200
    assert second.json()["assistant_message"]["content"] == "Answer to Follow up"

    reopened = client.get(f"/conversations/{conversation_id}", headers=auth(token))
    assert reopened.status_code == 200
    assert [message["role"] for message in reopened.json()["messages"]] == [
        "user", "assistant", "user", "assistant"
    ]
    assert [message["content"] for message in reopened.json()["messages"]] == [
        "First question", "Answer to First question", "Follow up", "Answer to Follow up"
    ]
    timestamps = [message["created_at"] for message in reopened.json()["messages"]]
    assert timestamps == sorted(timestamps)
    assert reopened.json()["updated_at"] > original_updated_at

    with testing_session() as db:
        count = db.scalar(select(func.count()).select_from(Message).where(Message.conversation_id == uuid.UUID(conversation_id)))
        assert count == 4


def test_citations_persist_and_are_returned_when_conversation_reopens(conversation_client, monkeypatch):
    client, testing_session = conversation_client
    from app.services import conversation_service
    from app.services.llm_service import Citation, GeneratedAnswer

    token = login_user(client, "citation-owner@example.com")
    document_id = create_owned_document(testing_session, "citation-owner@example.com", "owned-notes.pdf")
    created = client.post("/conversations", headers=auth(token), json={
        "retrieval_scope": "single_document", "document_ids": [str(document_id)]
    })
    conversation_id = created.json()["id"]
    monkeypatch.setattr(conversation_service, "retrieve_for_conversation", lambda *args, **kwargs: [{
        "chunk_id": "owned-chunk-1",
        "text": "The verified source text.",
        "source": "owned-notes.pdf",
        "document_id": str(document_id),
        "page_number": 2,
    }])
    monkeypatch.setattr(conversation_service, "generate_answer", lambda *args, **kwargs: GeneratedAnswer(
        answer="A persisted answer.",
        citations=[Citation(
            chunk_id="owned-chunk-1",
            document_id=document_id,
            source="owned-notes.pdf",
            page_number=2,
        )],
        insufficient_evidence=False,
    ))

    turn = client.post(
        f"/conversations/{conversation_id}/messages",
        headers=auth(token),
        json={"content": "What does it say?"},
    )
    expected = [{
        "chunk_id": "owned-chunk-1",
        "document_id": str(document_id),
        "source": "owned-notes.pdf",
        "page_number": 2,
    }]
    assert turn.status_code == 200
    assert turn.json()["assistant_message"]["citations"] == expected
    reopened = client.get(f"/conversations/{conversation_id}", headers=auth(token))
    assert reopened.status_code == 200
    assistant = next(message for message in reopened.json()["messages"] if message["role"] == "assistant")
    assert assistant["citations"] == expected

    with testing_session() as db:
        assert db.scalar(select(func.count()).select_from(MessageCitation)) == 1


def test_citation_for_another_users_document_is_rejected(conversation_client, monkeypatch):
    client, testing_session = conversation_client
    from app.services import conversation_service
    from app.services.llm_service import Citation, GeneratedAnswer

    token = login_user(client, "citation-reader@example.com")
    login_user(client, "citation-owner@example.com")
    foreign_document_id = create_owned_document(
        testing_session, "citation-owner@example.com", "private-source.pdf"
    )
    created = client.post("/conversations", headers=auth(token), json={
        "retrieval_scope": "all_documents", "document_ids": []
    })
    conversation_id = created.json()["id"]
    monkeypatch.setattr(conversation_service, "retrieve_for_conversation", lambda *args, **kwargs: [{
        "chunk_id": "foreign-chunk",
        "text": "Private source text.",
        "source": "private-source.pdf",
        "document_id": str(foreign_document_id),
        "page_number": 1,
    }])
    monkeypatch.setattr(conversation_service, "generate_answer", lambda *args, **kwargs: GeneratedAnswer(
        answer="Private answer.",
        citations=[Citation(
            chunk_id="foreign-chunk",
            document_id=foreign_document_id,
            source="private-source.pdf",
            page_number=1,
        )],
        insufficient_evidence=False,
    ))

    response = client.post(
        f"/conversations/{conversation_id}/messages",
        headers=auth(token),
        json={"content": "Show that source."},
    )
    assert response.status_code == 502
    assert response.json()["detail"] == "Could not generate a conversation reply"
    assert client.get(f"/conversations/{conversation_id}", headers=auth(token)).json()["messages"] == []


def test_failed_assistant_does_not_persist_partial_turn(conversation_client, monkeypatch):
    client, testing_session = conversation_client
    from app.services import conversation_service

    token = login_user(client, "learner@example.com")
    created = client.post("/conversations", headers=auth(token), json={
        "retrieval_scope": "all_documents", "document_ids": []
    })
    conversation_id = created.json()["id"]

    def fail_generation(*args, **kwargs):
        raise RuntimeError("provider unavailable")

    monkeypatch.setattr(conversation_service, "generate_answer", fail_generation)
    response = client.post(
        f"/conversations/{conversation_id}/messages",
        headers=auth(token),
        json={"content": "This must not persist alone"},
    )
    assert response.status_code == 502
    reopened = client.get(f"/conversations/{conversation_id}", headers=auth(token))
    assert reopened.json()["messages"] == []
    assert reopened.json()["updated_at"] == created.json()["updated_at"]

    with testing_session() as db:
        assert db.scalar(select(func.count()).select_from(Message)) == 0


def test_conversation_deletion_removes_messages_and_document_links(conversation_client, monkeypatch):
    client, testing_session = conversation_client
    from app.services import conversation_service

    token = login_user(client, "learner@example.com")
    document_id = create_owned_document(testing_session, "learner@example.com")
    created = client.post("/conversations", headers=auth(token), json={
        "retrieval_scope": "single_document", "document_ids": [str(document_id)]
    })
    conversation_id = created.json()["id"]
    monkeypatch.setattr(conversation_service, "retrieve_for_conversation", lambda *args, **kwargs: [])
    from app.services.llm_service import GeneratedAnswer
    monkeypatch.setattr(conversation_service, "generate_answer", lambda content, chunks, history=None: GeneratedAnswer(answer="Saved answer", citations=[], insufficient_evidence=True))
    assert client.post(f"/conversations/{conversation_id}/messages", headers=auth(token), json={"content": "Question"}).status_code == 200

    deleted = client.delete(f"/conversations/{conversation_id}", headers=auth(token))
    assert deleted.status_code == 204
    assert client.get(f"/conversations/{conversation_id}", headers=auth(token)).status_code == 404
    with testing_session() as db:
        assert db.scalar(select(func.count()).select_from(Message)) == 0
        assert db.scalar(select(func.count()).select_from(ConversationDocument)) == 0
        assert db.scalar(select(func.count()).select_from(Conversation)) == 0


def test_recent_history_limit_and_conversation_separation(conversation_client, monkeypatch):
    client, testing_session = conversation_client
    from app.services.conversation_service import load_recent_history

    token = login_user(client, "learner@example.com")
    first = client.post("/conversations", headers=auth(token), json={
        "retrieval_scope": "all_documents", "document_ids": []
    }).json()
    second = client.post("/conversations", headers=auth(token), json={
        "retrieval_scope": "all_documents", "document_ids": []
    }).json()
    monkeypatch.setenv("CONVERSATION_HISTORY_LIMIT", "2")
    monkeypatch.setenv("CONVERSATION_HISTORY_MAX_CHARS", "100")
    with testing_session() as db:
        base_time = datetime.now(timezone.utc)
        db.add_all([
            Message(conversation_id=uuid.UUID(first["id"]), role="user", content="old question", created_at=base_time),
            Message(conversation_id=uuid.UUID(first["id"]), role="assistant", content="old answer", created_at=base_time + timedelta(seconds=1)),
            Message(conversation_id=uuid.UUID(first["id"]), role="user", content="recent follow up", created_at=base_time + timedelta(seconds=2)),
            Message(conversation_id=uuid.UUID(second["id"]), role="user", content="other conversation secret", created_at=base_time + timedelta(seconds=3)),
        ])
        db.commit()
        history = load_recent_history(db, uuid.UUID(first["id"]))
    assert [item["content"] for item in history] == ["old answer", "recent follow up"]
    assert "other conversation secret" not in str(history)


def test_follow_up_keeps_original_question_for_scoped_retrieval(conversation_client, monkeypatch):
    client, _ = conversation_client
    from app.services import conversation_service
    from app.services.llm_service import GeneratedAnswer

    token = login_user(client, "learner@example.com")
    created = client.post("/conversations", headers=auth(token), json={
        "retrieval_scope": "all_documents", "document_ids": []
    }).json()
    observed = {}

    def retrieve(db, *, conversation_id, user_id, query, **kwargs):
        observed["query"] = query
        observed["conversation_id"] = conversation_id
        return []

    def answer(query, chunks, history=None):
        observed["history"] = history
        return GeneratedAnswer(answer="A simpler explanation is ...", citations=[], insufficient_evidence=True)

    monkeypatch.setattr(conversation_service, "retrieve_for_conversation", retrieve)
    monkeypatch.setattr(conversation_service, "generate_answer", answer)
    first = client.post(f"/conversations/{created['id']}/messages", headers=auth(token), json={"content": "Explain photosynthesis"})
    followup = client.post(f"/conversations/{created['id']}/messages", headers=auth(token), json={"content": "Explain that in simpler terms."})
    assert first.status_code == followup.status_code == 200
    assert observed["query"] == "Explain that in simpler terms."
    assert observed["conversation_id"] == uuid.UUID(created["id"])
    assert any(item["content"] == "Explain photosynthesis" for item in observed["history"])
