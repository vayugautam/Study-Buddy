"""Deterministic, original evaluation documents and a tiny stdlib PDF writer.

The writer intentionally supports only plain ASCII text and Helvetica. This
keeps fixture generation deterministic and avoids adding a production package.
"""

from __future__ import annotations

import hashlib
import json
import re
import shutil
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures"
MANIFEST_PATH = FIXTURE_DIR / "manifest.json"

DOCUMENTS = {
    "rest_api_guide.pdf": {
        "title": "Software Engineering: REST APIs and Authentication",
        "paragraphs": [
            "A REST API exposes resources through HTTP. A resource is identified by a URI, and representations are exchanged using request and response messages. A client sends a request to a server; the server validates and processes it, then returns a status code and, when appropriate, a representation such as JSON. REST is an architectural style, not a particular programming language or vendor product.",
            "HTTP methods communicate the requested operation. GET retrieves a representation and should not change server state. POST submits data or requests creation of a subordinate resource. PUT replaces a resource representation and is ordinarily idempotent: repeating the same request has the same intended effect. PATCH applies a partial update. DELETE requests removal. Servers should document method behavior and validate request bodies before changing data.",
            "HTTP status codes report the outcome. The 2xx class indicates success: 200 means a request succeeded, 201 means a resource was created, and 204 means success with no response body. The 4xx class indicates a client-side problem: 400 is a malformed or invalid request, 401 means valid authentication credentials are missing or unacceptable, 403 means the caller is authenticated but lacks permission, and 404 means the resource was not found. The 5xx class indicates that the server failed to fulfill an otherwise valid request. A status code alone does not explain every business rule, so APIs commonly return a structured error body too.",
            "Authentication establishes who a caller is; authorization decides what that caller may do. A JWT access token is a signed set of claims that a server can validate. A typical API verifies its signature, accepted algorithm, expiry, and subject before loading the corresponding account. The subject identifies the authenticated principal; a client-supplied user identifier is not proof of identity. Authorization must still check ownership or permissions for each requested resource. Possessing a valid token does not grant access to every document.",
            "A typical API request and response lifecycle begins when a client sends an HTTP method, URI, headers, and optional body. A router matches the URI and method. Authentication middleware or a dependency validates credentials and establishes the principal. Authorization checks that principal against the target resource. Input validation checks types and constraints. The application executes its service and database work, commits successful changes, and serializes a response with an appropriate status code and headers. Errors should be mapped to clear client responses while sensitive internal details stay in server logs.",
            "For a protected document question endpoint, the authenticated account should be derived from the verified token. The service should first load the conversation and verify its owner, then resolve the conversation's configured document scope. Only after these checks should it query document evidence. This ordering makes identity and authorization independent of the wording of the question and prevents a request from selecting another account's documents by changing a JSON field.",
        ],
    },
    "database_engineering_guide.pdf": {
        "title": "Database Engineering: Keys, Relationships, Indexes, and Transactions",
        "paragraphs": [
            "A relational database stores related facts in tables made of rows and columns. A primary key uniquely identifies each row in its table and must not be null. A foreign key references a candidate key, commonly a primary key, in another table. The database can enforce referential integrity so that a reference cannot point to a row that does not exist. A foreign key does not have to use the same column name as the referenced key, but its values must be compatible.",
            "A one-to-many relationship means one row on the parent side can be related to many rows on the child side, while each child row refers to one parent. The foreign key is normally stored on the many side. For example, one conversation can have many messages, and each message can store the conversation's identifier. A many-to-many relationship allows rows on either side to relate to multiple rows on the other side. It is represented with a junction table containing foreign keys to both participating tables; a uniqueness constraint on the pair can prevent duplicate associations.",
            "An index is an auxiliary data structure that can help a database find rows without scanning every row in a table. An index can improve reads and joins when its columns match useful filters or ordering, but it consumes storage and must be maintained when rows are inserted, updated, or deleted. Indexes do not guarantee a faster query: the optimizer chooses a plan based on the query and available statistics. Frequently filtered ownership identifiers are common index candidates in a multi-user application.",
            "A database transaction groups operations into a unit that is committed or rolled back. ACID describes four transaction properties. Atomicity means all operations in the transaction take effect or none do. Consistency means a committed transaction preserves declared rules and constraints. Isolation controls how concurrent transactions observe one another's work. Durability means committed changes survive a failure according to the database's guarantees. ACID does not automatically include work in an external service such as a vector database; applications need retries, idempotency, or compensating cleanup for cross-system workflows.",
            "SQL joins combine rows from tables using a related condition. An INNER JOIN returns rows that satisfy the join condition on both sides. A LEFT JOIN keeps every row from the left input and adds matching right-side values, using nulls when no right row matches. A join can combine messages with their conversation or a junction table with its documents. The join condition should use the intended key relationship; omitting it can create a Cartesian product with many unintended row combinations.",
            "Schema constraints and application authorization solve different problems. A foreign key can ensure that an association references existing rows, while an application query must still filter by the authenticated user's ownership. For example, a junction table may carry a user identifier and use composite foreign keys to ensure its conversation and document belong to that same user. The API should also validate ownership before creating the association, and retrieval should apply the authenticated user filter every time.",
        ],
    },
}


def _pdf_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _lines_for_document(title: str, paragraphs: list[str]) -> list[list[str]]:
    lines: list[list[str]] = [[]]
    for paragraph in [title, "", *paragraphs]:
        if paragraph:
            lines[-1].extend(textwrap.wrap(paragraph, width=92))
        else:
            lines[-1].append("")
        if len(lines[-1]) >= 50:
            lines.append([])
    return [page for page in lines if page]


def build_pdf(title: str, paragraphs: list[str]) -> bytes:
    """Build a minimal valid, multi-page PDF with deterministic object order."""
    pages = _lines_for_document(title, paragraphs)
    objects: list[bytes] = []
    page_ids = [4 + index * 2 for index in range(len(pages))]
    content_ids = [page_id + 1 for page_id in page_ids]
    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    objects.append(f"<< /Type /Pages /Kids [{kids}] /Count {len(pages)} >>".encode("ascii"))
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    for page_id, content_id, lines in zip(page_ids, content_ids, pages):
        objects.append(
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            f"/Resources << /Font << /F1 3 0 R >> >> /Contents {content_id} 0 R >>".encode("ascii")
        )
        commands = ["BT", "/F1 9 Tf", "40 750 Td", "12 TL"]
        commands.extend(f"({_pdf_escape(line)}) Tj T*" for line in lines)
        commands.append("ET")
        stream = "\n".join(commands).encode("ascii")
        objects.append(b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream")

    output = bytearray(b"%PDF-1.4\n%StudyBuddyEvaluation\n")
    offsets = [0]
    for index, body in enumerate(objects, 1):
        offsets.append(len(output))
        output.extend(f"{index} 0 obj\n".encode("ascii"))
        output.extend(body)
        output.extend(b"\nendobj\n")
    xref_offset = len(output)
    output.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    output.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        output.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    output.extend(
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode("ascii")
    )
    return bytes(output)


def expected_pdf_bytes(name: str) -> bytes:
    spec = DOCUMENTS[name]
    return build_pdf(spec["title"], spec["paragraphs"])


def content_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def prepare_fixture_pdfs(*, copy_resume: bool = True) -> dict[str, Path]:
    """Write deterministic PDFs once; refuse to overwrite changed fixtures."""
    FIXTURE_DIR.mkdir(parents=True, exist_ok=True)
    paths: dict[str, Path] = {}
    expected: dict[str, str] = {}
    if copy_resume:
        source = ROOT / "data" / "source.pdf"
        if not source.is_file():
            raise FileNotFoundError("Expected the existing data/source.pdf resume")
        destination = FIXTURE_DIR / "resume_source.pdf"
        if destination.exists() and destination.read_bytes() != source.read_bytes():
            raise RuntimeError("Preserved resume fixture differs from data/source.pdf; inspect before updating")
        if not destination.exists():
            shutil.copyfile(source, destination)
        paths["resume_source.pdf"] = destination
        expected["resume_source.pdf"] = content_sha256(destination.read_bytes())

    for name in DOCUMENTS:
        destination = FIXTURE_DIR / name
        contents = expected_pdf_bytes(name)
        if destination.exists() and destination.read_bytes() != contents:
            raise RuntimeError(f"Refusing to overwrite modified evaluation PDF: {destination.name}")
        if not destination.exists():
            destination.write_bytes(contents)
        paths[name] = destination
        expected[name] = content_sha256(contents)

    manifest = {"fixture_version": hashlib.sha256(json.dumps(expected, sort_keys=True).encode()).hexdigest(), "documents": expected}
    if MANIFEST_PATH.exists():
        existing = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        if existing != manifest:
            raise RuntimeError("Fixture manifest changed; review and explicitly version the evaluation dataset")
    else:
        MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return paths


def normalize_extracted_text(text: str) -> str:
    """Small helper for deterministic annotation checks on extracted text."""
    return re.sub(r"\s+", " ", text).strip().casefold()


def validate_dataset_fixture_state(dataset: dict, state: dict) -> None:
    """Fail closed when labels, users, scopes, or actual fixture IDs drift."""
    if dataset.get("fixture_version") != state.get("fixture_version"):
        raise RuntimeError("Dataset fixture_version does not match the seeded fixture state")
    documents = state.get("documents", {})
    conversations = state.get("conversations", {})
    conversation_scopes = state.get("retrieval_scopes", {})
    conversation_documents = state.get("conversation_documents", {})
    for case in dataset["cases"]:
        case_id = case["id"]
        conversation_key = case.get("conversation_key")
        if not conversation_key or conversation_key not in conversations:
            raise RuntimeError(f"Missing seeded conversation for {case_id}")
        if conversation_key not in conversation_scopes or conversation_key not in conversation_documents:
            raise RuntimeError(f"Missing scope/association data for {case_id}")
        user_key = case.get("user_key")
        owner = "a" if conversation_key.startswith("a_") else "b" if conversation_key.startswith("b_") else None
        if owner != user_key:
            raise RuntimeError(f"Dataset user and conversation owner differ for {case_id}")
        scope_docs = set(conversation_documents[conversation_key])
        evidence = case.get("expected_evidence") or []
        if not evidence:
            if case.get("relevant_document_ids") != [] or case.get("relevant_chunk_ids") != []:
                raise RuntimeError(f"No-evidence case has unexpected retrieval labels: {case_id}")
            continue

        expected_doc_ids: set[str] = set()
        expected_chunk_ids: set[str] = set()
        for label in evidence:
            fixture = documents.get(label.get("fixture_document"))
            if fixture is None or fixture.get("status") != "completed":
                raise RuntimeError(f"Evidence document is not completed for {case_id}")
            if fixture.get("owner") != user_key:
                raise RuntimeError(f"Expected evidence crosses fixture users for {case_id}")
            if conversation_scopes[conversation_key] != "all_documents" and fixture["id"] not in scope_docs:
                raise RuntimeError(f"Expected evidence is outside the conversation scope for {case_id}")
            expected_doc_ids.add(str(fixture["id"]))
            expected_chunk_ids.update(str(value) for value in fixture.get("chunk_ids", []))
        if set(case.get("relevant_document_ids") or []) != expected_doc_ids:
            raise RuntimeError(f"Relevant document labels drifted for {case_id}")
        labels = set(case.get("relevant_chunk_ids") or [])
        if not labels or not labels.issubset(expected_chunk_ids):
            raise RuntimeError(f"Chunk labels are missing or point outside fixture documents for {case_id}")
