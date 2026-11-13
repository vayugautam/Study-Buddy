import json
import os
import uuid
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

# Provider clients are constructed during application import, but these tests
# replace the relevant service methods/clients and never make network calls.
os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")
os.environ.setdefault("GROQ_API_KEY", "test-groq-key")
os.environ.setdefault("GROQ_MODEL", "openai/gpt-oss-120b")

from app.api.dependencies import get_current_user, get_db
from app.main import app
from app.services import llm_service
from app.services.llm_service import Citation, FALLBACK_ANSWER, GeneratedAnswer


@pytest.fixture
def ask_client():
    user = SimpleNamespace(id=uuid.uuid4())

    def no_database_needed():
        yield None

    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = no_database_needed
    with TestClient(app, raise_server_exceptions=False) as client:
        yield client, user
    app.dependency_overrides.clear()


def retrieved_chunk(document_id: uuid.UUID | None = None, chunk_id: str | None = None) -> dict:
    return {
        "chunk_id": chunk_id or str(uuid.uuid4()),
        "text": "A source document contains a verified fact.",
        "source": "fixture.pdf",
        "score": 0.91,
        "document_id": document_id or uuid.uuid4(),
        "page_number": 2,
    }


def ask(client: TestClient) -> dict:
    return {
        "conversation_id": str(uuid.uuid4()),
        "question": "What does the source document say?",
    }


def fake_provider_client(*responses: dict):
    queued = iter(responses)

    class FakeCompletions:
        def create(self, **kwargs):
            content = json.dumps(next(queued))
            return SimpleNamespace(
                choices=[SimpleNamespace(message=SimpleNamespace(content=content))]
            )

    return SimpleNamespace(
        chat=SimpleNamespace(completions=FakeCompletions())
    )


def test_ask_empty_retrieval_returns_valid_empty_citations(ask_client, monkeypatch):
    client, _ = ask_client
    monkeypatch.setattr("app.main.retrieve_for_conversation", lambda *args, **kwargs: [])
    generator_called = False

    def unexpected_generation(*args, **kwargs):
        nonlocal generator_called
        generator_called = True
        raise AssertionError("LLM must not run without retrieved evidence")

    monkeypatch.setattr("app.main.generate_answer", unexpected_generation)
    response = client.post("/ask", json=ask(client))

    assert response.status_code == 200
    body = response.json()
    assert body["retrieved_chunks"] == 0
    assert body["citations"] == []
    assert body["sources"] == []
    assert "couldn't find sufficiently relevant information" in body["answer"]
    assert generator_called is False


def test_ask_nonempty_retrieval_returns_generated_answer(ask_client, monkeypatch):
    client, _ = ask_client
    chunk = retrieved_chunk()
    citation = Citation(
        chunk_id=chunk["chunk_id"],
        document_id=chunk["document_id"],
        source=chunk["source"],
        page_number=chunk["page_number"],
    )
    monkeypatch.setattr("app.main.retrieve_for_conversation", lambda *args, **kwargs: [chunk])
    monkeypatch.setattr(
        "app.main.generate_answer",
        lambda *args, **kwargs: GeneratedAnswer(
            answer="The document supports this answer.",
            citations=[citation],
            insufficient_evidence=False,
        ),
    )

    response = client.post("/ask", json=ask(client))

    assert response.status_code == 200
    assert response.json()["answer"] == "The document supports this answer."
    assert response.json()["retrieved_chunks"] == 1


def test_ask_serializes_citation_and_source_metadata(ask_client, monkeypatch):
    client, _ = ask_client
    document_id = uuid.uuid4()
    first = retrieved_chunk(document_id, "chunk-one")
    second = retrieved_chunk(document_id, "chunk-two")
    citations = [
        Citation(
            chunk_id=item["chunk_id"],
            document_id=document_id,
            source=item["source"],
            page_number=item["page_number"],
        )
        for item in (first, second)
    ]
    monkeypatch.setattr("app.main.retrieve_for_conversation", lambda *args, **kwargs: [first, second])
    monkeypatch.setattr(
        "app.main.generate_answer",
        lambda *args, **kwargs: GeneratedAnswer(
            answer="Both chunks support this answer.",
            citations=citations,
            insufficient_evidence=False,
        ),
    )

    response = client.post("/ask", json=ask(client))

    assert response.status_code == 200
    body = response.json()
    assert body["citations"] == [
        {
            "chunk_id": item["chunk_id"],
            "document_id": str(document_id),
            "source": "fixture.pdf",
            "page_number": 2,
        }
        for item in (first, second)
    ]
    assert len(body["sources"]) == 2
    assert body["sources"][0]["score"] == pytest.approx(0.91)


@pytest.mark.parametrize(
    "draft",
    [
        {"answer": "Unsupported claim.", "citations": [], "insufficient_evidence": False},
        {
            "answer": "Unsupported claim.",
            "citations": [
                {
                    "chunk_id": "not-retrieved",
                    "document_id": str(uuid.uuid4()),
                    "source": "fixture.pdf",
                    "page_number": 2,
                }
            ],
            "insufficient_evidence": False,
        },
    ],
    ids=["missing-citation", "invalid-citation-reference"],
)
def test_ask_rejects_missing_or_invalid_citations(ask_client, monkeypatch, draft):
    client, _ = ask_client
    chunk = retrieved_chunk()
    monkeypatch.setattr("app.main.retrieve_for_conversation", lambda *args, **kwargs: [chunk])
    monkeypatch.setattr(llm_service, "client", fake_provider_client(draft))

    response = client.post("/ask", json=ask(client))

    assert response.status_code == 500
    assert response.json()["detail"] == "Failed to process the question. Check the server logs."


def test_ask_returns_fallback_when_answer_verification_rejects_draft(ask_client, monkeypatch):
    client, _ = ask_client
    chunk = retrieved_chunk()
    draft = {
        "answer": "A plausible but unsupported answer.",
        "citations": [
            {
                "chunk_id": chunk["chunk_id"],
                "document_id": str(chunk["document_id"]),
                "source": chunk["source"],
                "page_number": chunk["page_number"],
            }
        ],
        "insufficient_evidence": False,
    }
    monkeypatch.setattr("app.main.retrieve_for_conversation", lambda *args, **kwargs: [chunk])
    monkeypatch.setattr(
        llm_service,
        "client",
        fake_provider_client(draft, {"supported": False, "reason": "not supported by context"}),
    )

    response = client.post("/ask", json=ask(client))

    assert response.status_code == 200
    assert response.json()["answer"] == FALLBACK_ANSWER
    assert response.json()["citations"] == []
    assert response.json()["retrieved_chunks"] == 1
