from tests.evaluation.metrics import citation_metrics, contains_expected_facts, percentile, retrieval_metrics


def test_retrieval_metrics_and_rank():
    metrics = retrieval_metrics(["x", "b", "a"], ["a", "b"], k=3)
    assert metrics["recall@3"] == 1.0
    assert metrics["precision@3"] == 2 / 3
    assert metrics["reciprocal_rank"] == 0.5


def test_missing_and_empty_relevance_labels_are_not_zero():
    assert retrieval_metrics(["a"], None)["status"] == "unavailable"
    assert retrieval_metrics(["a"], [])["status"] == "not_applicable"


def test_answer_facts_and_percentiles():
    assert contains_expected_facts("Python and SQL", ["python", "SQL"])
    assert contains_expected_facts("Python only", ["Python", "Java"]) is False
    assert contains_expected_facts("anything", []) is None
    assert percentile([1.0, 3.0], 0.5) == 2.0
    assert percentile([], 0.95) is None


def test_citation_validation_against_retrieved_context():
    source = [{"chunk_id": "c1", "document_id": "d1", "source": "a.pdf", "page_number": 2}]
    citations = [{"chunk_id": "c1", "document_id": "d1", "source": "a.pdf", "page_number": 2}]
    result = citation_metrics(citations, source, ["d1"])
    assert result["all_citations_retrieved"] is True
    assert result["all_citations_in_scope"] is True

    invalid = citation_metrics([{"chunk_id": "c2", "document_id": "d2"}], source, ["d1"])
    assert invalid["citation_precision"] == 0.0
    assert invalid["all_citations_in_scope"] is False


def test_precision_denominator_duplicate_ids_negation_and_citation_metadata():
    assert retrieval_metrics(["a", "a"], ["a"], k=5)["precision@5"] == 0.2
    assert retrieval_metrics(["a", "a"], ["a"], k=5)["recall@5"] == 1.0
    assert contains_expected_facts("The experience does not include Python.", ["Python"]) is False
    assert contains_expected_facts("Python is not listed among the languages.", ["Python"]) is False
    assert contains_expected_facts("JavaScript is used.", ["Java"]) is False
    retrieved = [{"chunk_id": "c", "document_id": "d", "source": "x.pdf", "page_number": 1}]
    wrong_page = [{"chunk_id": "c", "document_id": "d", "source": "x.pdf", "page_number": 2}]
    assert citation_metrics(wrong_page, retrieved, ["d"])["citation_precision"] == 0.0
    assert citation_metrics([retrieved[0], retrieved[0]], retrieved, ["d"])["citation_precision"] == 0.5
