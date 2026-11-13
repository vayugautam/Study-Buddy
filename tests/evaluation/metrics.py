"""Deterministic evaluation metrics; unlabelled cases stay unavailable."""

import re
from collections.abc import Iterable


def retrieval_metrics(retrieved_ids: list[str], relevant_ids: list[str] | None, k: int = 5) -> dict:
    """Precision@K divides by K (missing results count as non-relevant)."""
    if k <= 0:
        raise ValueError("k must be positive")
    if relevant_ids is None:
        return {"status": "unavailable", "reason": "relevance_labels_missing"}
    relevant = set(relevant_ids)
    if not relevant:
        return {"status": "not_applicable", "reason": "no_relevant_items_expected"}
    top = retrieved_ids[:k]
    hits = [item for item in top if item in relevant]
    reciprocal_rank = next((1.0 / rank for rank, item in enumerate(top, 1) if item in relevant), 0.0)
    return {
        "status": "measured",
        f"recall@{k}": len(set(hits)) / len(relevant),
        f"precision@{k}": len(set(hits)) / k,
        "reciprocal_rank": reciprocal_rank,
    }


def contains_expected_facts(answer: str, facts: Iterable[str]) -> bool | None:
    facts = list(facts)
    if not facts:
        return None
    normalized = re.sub(r"\s+", " ", answer.casefold())
    for fact in facts:
        phrase = re.escape(re.sub(r"\s+", " ", fact.casefold()))
        # Word boundaries prevent e.g. "Java" matching only "JavaScript".
        match = re.search(rf"(?<!\w){phrase}(?!\w)", normalized)
        if not match:
            return False
        prefix = normalized[max(0, match.start() - 48):match.start()]
        suffix = normalized[match.end():match.end() + 48]
        negation = r"\b(?:not|never|no|without|isn't|wasn't|doesn't|didn't|cannot|can't)\b"
        if re.search(negation + r"(?:\s+\w+){0,3}\s*$", prefix) or re.match(r"\s*(?:\w+\s+){0,2}" + negation + r"\b", suffix):
            return False
    return True


def citation_metrics(citations: list[dict], retrieved: list[dict], allowed_document_ids: list[str] | None) -> dict:
    def reference(item: dict) -> tuple:
        return (
            str(item.get("chunk_id")),
            str(item.get("document_id")),
            item.get("source"),
            item.get("page_number"),
        )

    retrieved_refs = {reference(item) for item in retrieved}
    citation_refs = [reference(item) for item in citations]
    valid_references = []
    seen = set()
    for ref in citation_refs:
        valid = ref in retrieved_refs and ref not in seen
        valid_references.append(valid)
        seen.add(ref)
    allowed = set(allowed_document_ids or [])
    in_scope = [ref[1] in allowed for ref in citation_refs] if allowed_document_ids is not None else None
    status = "measured" if citation_refs else "not_applicable" if not retrieved else "measured"
    return {
        "status": status,
        "citation_precision": sum(valid_references) / len(valid_references) if valid_references else (1.0 if not retrieved else 0.0),
        "all_citations_retrieved": all(valid_references),
        "all_citations_in_scope": all(in_scope) if in_scope is not None else None,
        "scope_check_status": "measured" if in_scope is not None else "unavailable",
    }


def percentile(values: list[float], p: float) -> float | None:
    """Linear interpolation using the (n - 1) * p position (Hyndman-Fan type 7)."""
    if not values:
        return None
    ordered = sorted(values)
    position = (len(ordered) - 1) * p
    lower = int(position)
    upper = min(lower + 1, len(ordered) - 1)
    fraction = position - lower
    return ordered[lower] * (1 - fraction) + ordered[upper] * fraction
