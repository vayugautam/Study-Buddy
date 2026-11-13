"""Run labelled cases against an authenticated Study-Buddy API instance."""

import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from metrics import citation_metrics, contains_expected_facts, percentile, retrieval_metrics
try:
    from .fixtures import validate_dataset_fixture_state
except ImportError:  # Running as a script from tests/evaluation.
    from fixtures import validate_dataset_fixture_state

ROOT = Path(__file__).resolve().parents[2]
DATASET_PATH = Path(__file__).with_name("dataset.json")
STATE_PATH = Path(__file__).with_name("fixture-state.json")


def post_json(url: str, token: str, payload: dict) -> tuple[int, dict, float]:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            body = json.loads(response.read())
            return response.status, body, time.perf_counter() - started
    except urllib.error.HTTPError as exc:
        try:
            body = json.loads(exc.read())
        except Exception:
            body = {"detail": "non-JSON HTTP error"}
        return exc.code, body, time.perf_counter() - started
    except Exception as exc:
        return 0, {"detail": type(exc).__name__}, time.perf_counter() - started


def get_json(url: str, token: str) -> tuple[int, dict]:
    request = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"}, method="GET")
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, json.loads(response.read())
    except urllib.error.HTTPError as exc:
        return exc.code, {}
    except Exception:
        return 0, {}


def _identity_tokens(api_url: str, state: dict | None) -> tuple[dict[str, str], dict[str, str]]:
    """Verify configured JWTs against /auth/me and fixture-owned account IDs."""
    raw = os.environ.get("EVAL_ACCESS_TOKENS")
    if raw:
        try:
            tokens = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise SystemExit("EVAL_ACCESS_TOKENS must be a JSON object keyed by evaluation user") from exc
    else:
        one = os.environ.get("EVAL_ACCESS_TOKEN")
        user_key = os.environ.get("EVAL_SINGLE_USER_KEY")
        tokens = {user_key: one} if one and user_key else {}

    if not isinstance(tokens, dict):
        raise SystemExit("EVAL_ACCESS_TOKENS must be a JSON object")
    expected_users = (state or {}).get("users", {})
    valid: dict[str, str] = {}
    failures: dict[str, str] = {}
    for user_key, token in tokens.items():
        if user_key not in {"a", "b"} or not isinstance(token, str) or not token:
            failures[str(user_key)] = "invalid_token_configuration"
            continue
        status_code, current_user = get_json(f"{api_url}/auth/me", token)
        if status_code != 200:
            failures[user_key] = "authentication_error"
            continue
        expected = expected_users.get(user_key, {}).get("id")
        if expected and str(current_user.get("id")) != str(expected):
            failures[user_key] = "token_does_not_match_fixture_user"
            continue
        valid[user_key] = token
    return valid, failures


def _authorized_document_ids(case: dict, state: dict) -> list[str]:
    conversation_key = case["conversation_key"]
    scope = state["retrieval_scopes"][conversation_key]
    if scope == "all_documents":
        return sorted(
            str(document["id"])
            for document in state["documents"].values()
            if document["owner"] == case["user_key"] and document["status"] == "completed"
        )
    return sorted(str(value) for value in state["conversation_documents"][conversation_key])


def run() -> dict:
    dataset = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    api_url = os.environ.get("EVAL_API_URL", "http://127.0.0.1:8000").rstrip("/")
    state = json.loads(STATE_PATH.read_text(encoding="utf-8")) if STATE_PATH.exists() else None
    fixture_error = None
    if state is None:
        fixture_error = "evaluation_fixture_state_missing"
    else:
        try:
            validate_dataset_fixture_state(dataset, state)
        except RuntimeError:
            fixture_error = "dataset_fixture_state_mismatch"
    token_map, token_failures = _identity_tokens(api_url, state)
    conversation_overrides = json.loads(os.environ.get("EVAL_CONVERSATION_IDS", "{}"))
    state_conversations = (state or {}).get("conversations", {})

    cases = []
    latencies = []
    api_errors = 0
    token_usage = []
    for item in dataset["cases"]:
        case = {"id": item["id"], "category": item["category"], "annotation_status": item["annotation_status"]}
        if fixture_error:
            case.update(status="blocked", reason=fixture_error)
            cases.append(case)
            continue
        conversation_id = conversation_overrides.get(item["id"]) or state_conversations.get(item.get("conversation_key"))
        user_key = item.get("user_key")
        token = token_map.get(user_key)
        if not token:
            case.update(status="blocked", reason=token_failures.get(user_key, "evaluation_user_token_not_configured"))
            cases.append(case)
            continue
        if not conversation_id:
            case.update(status="blocked", reason="evaluation_conversation_id_not_configured")
            cases.append(case)
            continue

        status_code, result, elapsed = post_json(
            f"{api_url}/ask", token, {"conversation_id": conversation_id, "question": item["question"]}
        )
        latencies.append(elapsed)
        case["latency_seconds"] = elapsed
        if status_code != 200:
            api_errors += 1
            error_type = "authentication_error" if status_code == 401 else "authorization_error" if status_code == 403 else "http_error" if status_code else "connection_error"
            # Keep reports safe if a provider or application error echoes details.
            case.update(status=error_type, http_status=status_code or None, error="request_failed")
            cases.append(case)
            continue

        answer = result.get("answer", "")
        sources = result.get("sources", [])
        citations = result.get("citations", [])
        retrieved_ids = [str(source.get("chunk_id")) for source in sources]
        retrieved_docs = [str(source.get("document_id")) for source in sources]
        relevant_ids = item.get("relevant_chunk_ids")
        if relevant_ids is None and item.get("relevant_document_ids") is not None:
            retrieval_ids = retrieved_docs
            relevant_ids = item["relevant_document_ids"]
        elif relevant_ids is None and item.get("relevant_sources") is not None:
            retrieval_ids = [f"{source.get('source')}|{source.get('page_number')}" for source in sources]
            relevant_ids = [f"{source}|{page}" for source in item["relevant_sources"] for page in item.get("relevant_page_numbers", [])]
        else:
            retrieval_ids = retrieved_ids

        case.update(
            status="evaluated",
            answer_correct=contains_expected_facts(answer, item.get("expected_facts", [])),
            retrieval=retrieval_metrics(retrieval_ids, relevant_ids, k=5),
            citations=citation_metrics(citations, sources, _authorized_document_ids(item, state)),
            abstention_correct=(
                not citations
                and ("couldn't find" in answer.casefold() or "not enough information" in answer.casefold())
            ) if not item["is_answerable"] else None,
            faithfulness={"status": "unavailable", "reason": "API does not expose retrieved chunk text for independent deterministic comparison"},
            token_usage={"status": "unavailable", "reason": "API response does not expose provider token usage"},
        )
        cases.append(case)

    measured = [case for case in cases if case.get("status") == "evaluated"]
    fields = [name for name in ("answer_correct", "abstention_correct") if any(case.get(name) is not None for case in measured)]
    answer_metrics = {
        name: sum(case[name] is True for case in measured if case.get(name) is not None) / sum(case.get(name) is not None for case in measured)
        for name in fields
    }
    retrieval_cases = [case["retrieval"] for case in measured if case["retrieval"]["status"] == "measured"]
    retrieval_summary = {
        metric: (sum(case[metric] for case in retrieval_cases) / len(retrieval_cases) if retrieval_cases else None)
        for metric in ("recall@5", "precision@5", "reciprocal_rank")
    }
    return {
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "dataset_version": dataset["version"],
        "fixture_version": dataset.get("fixture_version"),
        "dataset_size": len(dataset["cases"]),
        "evaluated_questions": len(measured),
        "provider_configuration": {
            "embedding_model": os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001"),
            "generation_model": os.getenv("GROQ_MODEL", "unavailable"),
            "retrieval_threshold": 0.50,
            "top_k": 5,
            "evaluator_model": None,
        },
        "retrieval_metrics": retrieval_summary,
        "answer_metrics": answer_metrics,
        "fixture_state": {"status": "seeded" if state and not fixture_error else "blocked", "reason": fixture_error},
        "security_scope_tests": {"status": "blocked", "reason": "Phase 9D must independently validate cross-user and scope isolation; evaluation fixtures alone are not a security test"},
        "latency_seconds": {"total_api_p50": percentile(latencies, 0.50), "total_api_p95": percentile(latencies, 0.95), "embedding": None, "retrieval": None, "generation": None},
        "token_usage": {"status": "unavailable", "values": token_usage},
        "api_errors": api_errors,
        "provider_errors": {"status": "unavailable", "reason": "the API does not expose provider-specific error classification"},
        "cases": cases,
    }


if __name__ == "__main__":
    report = run()
    output = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "evaluation-report.json"
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Wrote evaluation report to {output}")
