"""Seed dedicated users/documents/conversations through the real local API.

This script is deliberately guarded. It never accepts user IDs from the dataset
and refuses a non-local API, a non-SQLite declared evaluation DB, or the default
application Qdrant collection. Secrets come only from process environment.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.parse
from pathlib import Path
from typing import Any

import requests
from pypdf import PdfReader
from qdrant_client import QdrantClient, models

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.chunk_service import chunk_pages
try:
    from .fixtures import DOCUMENTS, MANIFEST_PATH, content_sha256, prepare_fixture_pdfs, validate_dataset_fixture_state
except ImportError:  # Running this module as a script from the evaluation directory.
    from fixtures import DOCUMENTS, MANIFEST_PATH, content_sha256, prepare_fixture_pdfs, validate_dataset_fixture_state

DATASET_PATH = Path(__file__).with_name("dataset.json")
STATE_PATH = Path(__file__).with_name("fixture-state.json")
DEFAULT_COLLECTION = "pdf_knowledge_base"
FIXTURE_FILENAMES = {
    "resume": "resume_source.pdf",
    "rest": "rest_api_guide.pdf",
    "database": "database_engineering_guide.pdf",
}
CONVERSATIONS = {
    "a_resume_single": ("User A - Resume only", "single_document", ["resume"]),
    "a_rest_single": ("User A - REST guide only", "single_document", ["rest"]),
    "a_selected_resume_rest": ("User A - Resume and REST", "selected_documents", ["resume", "rest"]),
    "a_all": ("User A - All documents", "all_documents", []),
    "b_database_single": ("User B - Database guide only", "single_document", ["database"]),
    "b_all": ("User B - All documents", "all_documents", []),
}


def _required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Set required environment variable {name}")
    return value


def _assert_isolated_configuration() -> tuple[str, str]:
    if os.getenv("EVAL_ALLOW_FIXTURE_SEED") != "YES":
        raise RuntimeError("Set EVAL_ALLOW_FIXTURE_SEED=YES after reviewing the isolated setup")
    if os.getenv("EVAL_FIXTURE_MODE") != "1":
        raise RuntimeError("Start the API with EVAL_FIXTURE_MODE=1 to enable isolated evaluation seeding")
    db_url = _required("DATABASE_URL")
    if not db_url.lower().startswith("sqlite:") or "evaluation" not in db_url.casefold():
        raise RuntimeError("Seeder requires DATABASE_URL to be an evaluation-named SQLite database")
    collection = _required("QDRANT_COLLECTION_NAME")
    if collection == DEFAULT_COLLECTION or not collection.startswith("study_buddy_eval_"):
        raise RuntimeError("Use a dedicated QDRANT_COLLECTION_NAME beginning study_buddy_eval_")
    api_url = os.getenv("EVAL_API_URL", "http://127.0.0.1:8000").rstrip("/")
    parsed = urllib.parse.urlparse(api_url)
    if parsed.scheme != "http" or parsed.hostname not in {"127.0.0.1", "localhost", "::1"}:
        raise RuntimeError("Fixture seeding only supports a local HTTP FastAPI instance")
    return api_url, collection


def _request(session: requests.Session, method: str, path: str, **kwargs: Any) -> Any:
    response = session.request(method, path, timeout=180, **kwargs)
    if not response.ok:
        raise RuntimeError(f"API {method} {path} returned HTTP {response.status_code}")
    return response.json() if response.content else None


def _access_token(api_url: str, email_env: str, password_env: str) -> tuple[requests.Session, str]:
    email = _required(email_env).lower()
    password = _required(password_env)
    if not email.endswith("@example.invalid"):
        raise RuntimeError(f"{email_env} must use the reserved @example.invalid domain")
    session = requests.Session()
    response = session.post(
        f"{api_url}/auth/register",
        json={"email": email, "password": password},
        timeout=30,
    )
    if response.status_code not in {201, 409}:
        raise RuntimeError(f"Evaluation account registration returned HTTP {response.status_code}")
    token_body = _request(
        session,
        "POST",
        f"{api_url}/auth/login",
        json={"email": email, "password": password},
    )
    session.headers.update({"Authorization": f"Bearer {token_body['access_token']}"})
    me = _request(session, "GET", f"{api_url}/auth/me")
    # Do not return or print the JWT/password. This UUID came from /auth/me.
    return session, str(me["id"])


def _pdf_chunks(path: Path) -> list[dict[str, Any]]:
    pages = []
    for page_num, page in enumerate(PdfReader(str(path), strict=True).pages, 1):
        pages.append({"page_number": page_num, "text": page.extract_text() or ""})
    return chunk_pages([page["text"] for page in pages])


def _scroll_chunks(client: QdrantClient, collection: str, user_id: str, document_id: str) -> list[dict[str, Any]]:
    records, _ = client.scroll(
        collection_name=collection,
        scroll_filter=models.Filter(
            must=[
                models.FieldCondition(key="user_id", match=models.MatchValue(value=user_id)),
                models.FieldCondition(key="document_id", match=models.MatchValue(value=document_id)),
                models.FieldCondition(key="indexed", match=models.MatchValue(value=True)),
            ]
        ),
        with_payload=True,
        with_vectors=False,
        limit=1000,
    )
    return [
        {
            "chunk_id": str(point.payload.get("chunk_id", point.id)),
            "text": point.payload.get("text", ""),
            "page_number": point.payload.get("page_number"),
            "chunk_index": point.payload.get("chunk_index"),
            "source_filename": point.payload.get("source_filename"),
            "user_id": point.payload.get("user_id"),
            "document_id": point.payload.get("document_id"),
        }
        for point in records
    ]


def _verify_indexed_chunks(
    key: str,
    path: Path,
    owner_id: str,
    document: dict[str, Any],
    actual: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    expected = _pdf_chunks(path)
    ordered = sorted(actual, key=lambda row: row["chunk_index"])
    if len(ordered) != len(expected) or not ordered:
        raise RuntimeError(f"Indexed chunk count for {key} does not match the fixture PDF")
    if len({row["chunk_id"] for row in ordered}) != len(ordered):
        raise RuntimeError(f"Duplicate indexed chunk IDs found for {key}")
    for index, (point, source_chunk) in enumerate(zip(ordered, expected)):
        if point["chunk_index"] != index:
            raise RuntimeError(f"Indexed chunk ordering is not stable for {key}")
        if point["text"] != source_chunk["text"]:
            raise RuntimeError(f"Indexed chunk text for {key} differs from the fixture PDF")
        if point["page_number"] != source_chunk["page_number"]:
            raise RuntimeError(f"Indexed page metadata differs from the fixture PDF for {key}")
        if point["source_filename"] != path.name:
            raise RuntimeError(f"Indexed source filename is incorrect for {key}")
        if point["user_id"] != owner_id or point["document_id"] != str(document["id"]):
            raise RuntimeError(f"Indexed ownership metadata is incorrect for {key}")
    return ordered


def _ensure_document(session: requests.Session, api_url: str, path: Path) -> dict[str, Any]:
    existing = _request(session, "GET", f"{api_url}/documents")
    matches = [item for item in existing if item["filename"] == path.name]
    if len(matches) > 1:
        raise RuntimeError(f"Multiple evaluation documents have fixture filename {path.name}")
    if matches:
        document = matches[0]
        if document["status"] == "failed":
            document = _request(session, "POST", f"{api_url}/documents/{document['id']}/retry")
        if document["status"] != "completed":
            raise RuntimeError(f"Fixture document {path.name} is not completed")
        return document

    with path.open("rb") as file:
        response = session.post(
            f"{api_url}/documents",
            files={"file": (path.name, file, "application/pdf")},
            timeout=600,
        )
    if not response.ok:
        raise RuntimeError(f"Upload for fixture {path.name} returned HTTP {response.status_code}")
    document = response.json()
    if document["status"] != "completed":
        raise RuntimeError(f"Ingestion for fixture {path.name} ended with {document['status']}")
    return document


def verify_fixture_ownership_and_associations(
    users: dict[str, dict],
    documents: dict[str, dict],
    conversations: dict[str, dict],
) -> None:
    """Check real API response ownership and exact scope associations."""
    if users.get("a", {}).get("id") == users.get("b", {}).get("id"):
        raise RuntimeError("Evaluation fixture accounts are not distinct")
    for document_key, owner_key in (("resume", "a"), ("rest", "a"), ("database", "b")):
        if documents.get(document_key, {}).get("owner") != owner_key:
            raise RuntimeError(f"Incorrect fixture document owner: {document_key}")
        if documents[document_key].get("status") != "completed":
            raise RuntimeError(f"Fixture document is not completed: {document_key}")
    for key, (_, expected_scope, expected_docs) in CONVERSATIONS.items():
        record = conversations.get(key)
        if record is None or record.get("retrieval_scope") != expected_scope:
            raise RuntimeError(f"Fixture conversation scope is incorrect: {key}")
        actual_ids = sorted(str(item) for item in record.get("document_ids", []))
        expected_owner = "a" if key.startswith("a_") else "b"
        if any(documents[name].get("owner") != expected_owner for name in expected_docs):
            raise RuntimeError(f"Fixture conversation would cross user ownership: {key}")
        if key.startswith("a_"):
            expected_ids = sorted(str(documents[name]["id"]) for name in expected_docs)
        else:
            expected_ids = sorted(str(documents[name]["id"]) for name in expected_docs)
        if actual_ids != expected_ids:
            raise RuntimeError(f"Fixture conversation associations are incorrect: {key}")


def _ensure_conversation(
    session: requests.Session,
    api_url: str,
    key: str,
    document_ids: dict[str, str],
) -> str:
    title, scope, doc_keys = CONVERSATIONS[key]
    requested = [document_ids[item] for item in doc_keys]
    conversations = _request(session, "GET", f"{api_url}/conversations")
    same_title = [item for item in conversations if item["title"] == title]
    if same_title:
        existing = same_title[0]
        if existing["retrieval_scope"] != scope or {str(x) for x in existing["document_ids"]} != set(requested):
            raise RuntimeError(f"Existing evaluation conversation {key} differs from its fixture definition")
        return {
            "id": str(existing["id"]),
            "retrieval_scope": existing["retrieval_scope"],
            "document_ids": sorted(str(value) for value in existing["document_ids"]),
        }
    created = _request(
        session,
        "POST",
        f"{api_url}/conversations",
        json={"title": title, "retrieval_scope": scope, "document_ids": requested},
    )
    return {
        "id": str(created["id"]),
        "retrieval_scope": created["retrieval_scope"],
        "document_ids": sorted(str(value) for value in created["document_ids"]),
    }


def _resolve_labels(dataset: dict[str, Any], docs: dict[str, dict], chunks: dict[str, list[dict]]) -> None:
    for case in dataset["cases"]:
        evidence = case.get("expected_evidence")
        if evidence is None:
            case["annotation_status"] = "verified_no_relevant_evidence"
            case["relevant_document_ids"] = []
            case["relevant_chunk_ids"] = []
            continue
        matching_documents: set[str] = set()
        matching_chunks: set[str] = set()
        for label in evidence:
            key = label["fixture_document"]
            document = docs[key]
            matching_documents.add(str(document["id"]))
            needle = " ".join(label["text_contains"].casefold().split())
            actual = [
                item for item in chunks[key]
                if needle in " ".join(item["text"].casefold().split())
            ]
            if not actual:
                raise RuntimeError(f"No actual indexed chunk matched evidence label for case {case['id']}")
            matching_chunks.update(item["chunk_id"] for item in actual)
        case["relevant_document_ids"] = sorted(matching_documents)
        case["relevant_chunk_ids"] = sorted(matching_chunks)
        case["relevant_sources"] = sorted({docs[label["fixture_document"]]["filename"] for label in evidence})
        case["relevant_page_numbers"] = sorted({
            item["page_number"]
            for label in evidence
            for item in chunks[label["fixture_document"]]
            if " ".join(label["text_contains"].casefold().split()) in " ".join(item["text"].casefold().split())
            and item["page_number"] is not None
        })
        case["annotation_status"] = "manually_verified_facts_actual_chunk_ids_resolved"


def seed() -> dict[str, Any]:
    api_url, collection = _assert_isolated_configuration()
    health = requests.get(f"{api_url}/", timeout=15)
    if not health.ok or health.json().get("environment") != "evaluation":
        raise RuntimeError("API does not confirm its isolated evaluation mode; no fixture data was sent")
    paths = prepare_fixture_pdfs()
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    for name, path in paths.items():
        if content_sha256(path.read_bytes()) != manifest["documents"][name]:
            raise RuntimeError(f"Fixture content hash mismatch: {name}")

    a_session, a_id = _access_token(api_url, "EVAL_USER_A_EMAIL", "EVAL_USER_A_PASSWORD")
    b_session, b_id = _access_token(api_url, "EVAL_USER_B_EMAIL", "EVAL_USER_B_PASSWORD")
    if a_id == b_id:
        raise RuntimeError("Evaluation users A and B must be distinct accounts")

    docs: dict[str, dict[str, Any]] = {}
    for key, user_session, filename in (
        ("resume", a_session, FIXTURE_FILENAMES["resume"]),
        ("rest", a_session, FIXTURE_FILENAMES["rest"]),
        ("database", b_session, FIXTURE_FILENAMES["database"]),
    ):
        docs[key] = _ensure_document(user_session, api_url, paths[filename])
        if docs[key]["status"] != "completed":
            raise RuntimeError(f"Document {key} has not completed ingestion")

    qdrant_url = _required("QDRANT_URL")
    qdrant_key = _required("QDRANT_API_KEY")
    client = QdrantClient(url=qdrant_url, api_key=qdrant_key, timeout=60)
    try:
        if not client.collection_exists(collection):
            raise RuntimeError("Dedicated evaluation collection does not exist; start the API and upload fixtures")
        chunks = {}
        owner_ids = {"resume": a_id, "rest": a_id, "database": b_id}
        for key, document in docs.items():
            actual = _scroll_chunks(client, collection, owner_ids[key], str(document["id"]))
            chunks[key] = _verify_indexed_chunks(
                key, paths[FIXTURE_FILENAMES[key]], owner_ids[key], document, actual
            )
    finally:
        client.close()

    conversation_records = {}
    for key, (title, scope, doc_keys) in CONVERSATIONS.items():
        session = a_session if key.startswith("a_") else b_session
        conversation_records[key] = _ensure_conversation(
            session, api_url, key, {name: str(item["id"]) for name, item in docs.items()}
        )

    dataset = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    _resolve_labels(dataset, docs, chunks)
    dataset["fixture_version"] = manifest["fixture_version"]

    user_records = {"a": {"id": a_id}, "b": {"id": b_id}}
    document_records = {
        key: {
            "id": str(value["id"]),
            "owner": "a" if key in {"resume", "rest"} else "b",
            "filename": value["filename"],
            "status": value["status"],
            "chunk_count": len(chunks[key]),
            "chunk_ids": sorted(item["chunk_id"] for item in chunks[key]),
        }
        for key, value in docs.items()
    }
    verify_fixture_ownership_and_associations(user_records, document_records, conversation_records)
    state = {
        "fixture_version": manifest["fixture_version"],
        "users": user_records,
        "documents": document_records,
        "conversations": {key: value["id"] for key, value in conversation_records.items()},
        "retrieval_scopes": {key: value["retrieval_scope"] for key, value in conversation_records.items()},
        "conversation_documents": {key: value["document_ids"] for key, value in conversation_records.items()},
    }
    validate_dataset_fixture_state(dataset, state)
    DATASET_PATH.write_text(json.dumps(dataset, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    STATE_PATH.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")
    return state


if __name__ == "__main__":
    try:
        seeded = seed()
    except Exception as exc:
        print(f"Fixture seeding stopped: {type(exc).__name__}: {exc}", file=sys.stderr)
        raise SystemExit(1)
    print(f"Seeded/reused {len(seeded['documents'])} documents and {len(seeded['conversations'])} conversations.")
    for key, item in seeded["documents"].items():
        print(f"{key}: document_id={item['id']} chunks={item['chunk_count']} status={item['status']}")
