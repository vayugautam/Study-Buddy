import json
from pathlib import Path
from io import BytesIO

import pytest
from pypdf import PdfReader

from tests.evaluation import fixtures
from tests.evaluation import seed_fixtures
from app.services.chunk_service import chunk_pages


def test_technical_fixture_pdfs_are_deterministic_and_extractable():
    for name, spec in fixtures.DOCUMENTS.items():
        pdf = fixtures.expected_pdf_bytes(name)
        assert pdf == fixtures.expected_pdf_bytes(name)
        reader = PdfReader(BytesIO(pdf), strict=True)
        text = "\n".join(page.extract_text() or "" for page in reader.pages).casefold()
        assert len(reader.pages) >= 1
        for phrase in (spec["title"], *[paragraph[:35] for paragraph in spec["paragraphs"]]):
            assert phrase.casefold() in text
        assert len(fixtures.DOCUMENTS[name]["paragraphs"]) > 3


def test_every_expected_evidence_phrase_exists_in_a_real_fixture_chunk():
    paths = fixtures.prepare_fixture_pdfs()
    dataset = json.loads(Path("tests/evaluation/dataset.json").read_text(encoding="utf-8"))
    extracted_chunks = {}
    for key, filename in (("resume", "resume_source.pdf"), ("rest", "rest_api_guide.pdf"), ("database", "database_engineering_guide.pdf")):
        text_pages = [page.extract_text() or "" for page in PdfReader(str(paths[filename]), strict=True).pages]
        extracted_chunks[key] = chunk_pages(text_pages)
    for case in dataset["cases"]:
        for evidence in case["expected_evidence"] or []:
            expected = " ".join(evidence["text_contains"].casefold().split())
            assert any(
                expected in " ".join(chunk["text"].casefold().split())
                for chunk in extracted_chunks[evidence["fixture_document"]]
            ), case["id"]


def test_fixture_preparation_is_idempotent_and_refuses_overwrite(tmp_path, monkeypatch):
    source_dir = tmp_path / "source"
    source_dir.mkdir()
    source_pdf = fixtures.expected_pdf_bytes("rest_api_guide.pdf")
    (source_dir / "source.pdf").write_bytes(source_pdf)
    destination = tmp_path / "fixtures"
    manifest = destination / "manifest.json"
    monkeypatch.setattr(fixtures, "ROOT", source_dir)
    monkeypatch.setattr(fixtures, "FIXTURE_DIR", destination)
    monkeypatch.setattr(fixtures, "MANIFEST_PATH", manifest)

    first = fixtures.prepare_fixture_pdfs(copy_resume=False)
    first_hashes = {name: path.read_bytes() for name, path in first.items()}
    second = fixtures.prepare_fixture_pdfs(copy_resume=False)
    assert {name: path.read_bytes() for name, path in second.items()} == first_hashes
    assert set(json.loads(manifest.read_text())["documents"]) == set(first_hashes)

    (destination / "rest_api_guide.pdf").write_bytes(b"changed")
    with pytest.raises(RuntimeError, match="Refusing to overwrite"):
        fixtures.prepare_fixture_pdfs(copy_resume=False)


def test_seeder_requires_explicit_isolated_local_configuration(monkeypatch):
    monkeypatch.delenv("EVAL_ALLOW_FIXTURE_SEED", raising=False)
    with pytest.raises(RuntimeError, match="EVAL_ALLOW_FIXTURE_SEED"):
        seed_fixtures._assert_isolated_configuration()

    monkeypatch.setenv("EVAL_ALLOW_FIXTURE_SEED", "YES")
    monkeypatch.setenv("EVAL_FIXTURE_MODE", "1")
    monkeypatch.setenv("DATABASE_URL", "postgresql://remote/app")
    monkeypatch.setenv("QDRANT_COLLECTION_NAME", "study_buddy_eval_local")
    monkeypatch.setenv("EVAL_API_URL", "http://127.0.0.1:8000")
    with pytest.raises(RuntimeError, match="SQLite"):
        seed_fixtures._assert_isolated_configuration()

    monkeypatch.setenv("DATABASE_URL", "sqlite:///./data/evaluation.sqlite3")
    monkeypatch.setenv("DOCUMENT_STORAGE_DIR", "data/evaluation_uploads")
    monkeypatch.setenv("QDRANT_COLLECTION_NAME", "pdf_knowledge_base")
    with pytest.raises(RuntimeError, match="dedicated QDRANT_COLLECTION_NAME"):
        seed_fixtures._assert_isolated_configuration()


def test_dataset_expected_evidence_uses_only_declared_fixture_documents():
    dataset = json.loads(Path("tests/evaluation/dataset.json").read_text(encoding="utf-8"))
    assert len(dataset["cases"]) >= 15
    for case in dataset["cases"]:
        assert case["user_key"] in {"a", "b"}
        assert case["conversation_key"].startswith(case["user_key"] + "_")
        for evidence in case["expected_evidence"] or []:
            assert evidence["fixture_document"] in {"resume", "rest", "database"}
            assert evidence["text_contains"]
        if case["expected_evidence"] and case["relevant_chunk_ids"] is None:
            assert case["annotation_status"].endswith("pending") or "ids_pending" in case["annotation_status"]


def test_dataset_labels_remain_pending_until_actual_ingestion():
    dataset = json.loads(Path("tests/evaluation/dataset.json").read_text(encoding="utf-8"))
    assert dataset["fixture_version"] is None
    evidence_cases = [case for case in dataset["cases"] if case["expected_evidence"]]
    assert evidence_cases
    for case in evidence_cases:
        assert case["relevant_document_ids"] is None
        assert case["relevant_chunk_ids"] is None
        assert "pending" in case["annotation_status"]
    for case in dataset["cases"]:
        if not case["expected_evidence"]:
            assert case["relevant_document_ids"] is None
            assert case["relevant_chunk_ids"] is None


def test_conversation_fixture_definitions_cover_scopes_and_associations():
    definitions = seed_fixtures.CONVERSATIONS
    assert len(definitions) == 6
    assert definitions["a_resume_single"][1:] == ("single_document", ["resume"])
    assert definitions["a_rest_single"][1:] == ("single_document", ["rest"])
    assert definitions["a_selected_resume_rest"][1:] == ("selected_documents", ["resume", "rest"])
    assert definitions["a_all"][1:] == ("all_documents", [])
    assert definitions["b_database_single"][1:] == ("single_document", ["database"])
    assert definitions["b_all"][1:] == ("all_documents", [])


def test_document_upload_retry_is_reused_instead_of_created_again(tmp_path, monkeypatch):
    path = tmp_path / "rest_api_guide.pdf"
    path.write_bytes(fixtures.expected_pdf_bytes(path.name))
    requests_made = []

    class Session:
        def request(self, method, url, **kwargs):
            requests_made.append((method, url))
            raise AssertionError("Completed document should not be uploaded again")

    monkeypatch.setattr(
        seed_fixtures,
        "_request",
        lambda session, method, url, **kwargs: [{"id": "persisted-document", "filename": path.name, "status": "completed"}],
    )
    document = seed_fixtures._ensure_document(Session(), "http://127.0.0.1:8000", path)
    assert document["status"] == "completed"
    assert requests_made == []


def test_indexed_chunk_verification_checks_actual_metadata_and_ids():
    path = fixtures.prepare_fixture_pdfs()["rest_api_guide.pdf"]
    expected = seed_fixtures._pdf_chunks(path)
    document = {"id": "document-from-api"}
    points = [
        {
            "chunk_id": f"point-{index}",
            "text": chunk["text"],
            "page_number": chunk["page_number"],
            "chunk_index": index,
            "source_filename": path.name,
            "user_id": "owner-from-auth-me",
            "document_id": document["id"],
        }
        for index, chunk in enumerate(expected)
    ]
    verified = seed_fixtures._verify_indexed_chunks("rest", path, "owner-from-auth-me", document, points)
    assert [point["chunk_id"] for point in verified] == [point["chunk_id"] for point in points]
    points[0]["user_id"] = "different-user"
    with pytest.raises(RuntimeError, match="ownership metadata"):
        seed_fixtures._verify_indexed_chunks("rest", path, "owner-from-auth-me", document, points)


def test_dataset_fixture_consistency_rejects_chunk_or_document_drift():
    dataset = {
        "fixture_version": "v1",
        "cases": [{
            "id": "case",
            "user_key": "a",
            "conversation_key": "a_resume_single",
            "expected_evidence": [{"fixture_document": "resume", "text_contains": "fact"}],
            "relevant_document_ids": ["doc-resume"],
            "relevant_chunk_ids": ["chunk-resume"],
        }],
    }
    state = {
        "fixture_version": "v1",
        "documents": {"resume": {"id": "doc-resume", "status": "completed", "chunk_ids": ["chunk-resume"]}},
        "conversations": {"a_resume_single": "conversation"},
        "retrieval_scopes": {"a_resume_single": "single_document"},
        "conversation_documents": {"a_resume_single": ["doc-resume"]},
    }
    state["documents"]["resume"]["owner"] = "a"
    fixtures.validate_dataset_fixture_state(dataset, state)
    dataset["cases"][0]["relevant_chunk_ids"] = ["chunk-from-other-document"]
    with pytest.raises(RuntimeError, match="Chunk labels"):
        fixtures.validate_dataset_fixture_state(dataset, state)


def test_seed_ownership_and_association_contract_rejects_cross_owner_document():
    users = {"a": {"id": "user-a"}, "b": {"id": "user-b"}}
    docs = {
        "resume": {"id": "doc-resume", "owner": "a", "status": "completed"},
        "rest": {"id": "doc-rest", "owner": "a", "status": "completed"},
        "database": {"id": "doc-database", "owner": "b", "status": "completed"},
    }
    convs = {
        key: {"retrieval_scope": scope, "document_ids": [docs[name]["id"] for name in document_keys]}
        for key, (_, scope, document_keys) in seed_fixtures.CONVERSATIONS.items()
    }
    seed_fixtures.verify_fixture_ownership_and_associations(users, docs, convs)
    convs["a_selected_resume_rest"]["document_ids"].append("doc-database")
    with pytest.raises(RuntimeError, match="associations"):
        seed_fixtures.verify_fixture_ownership_and_associations(users, docs, convs)
