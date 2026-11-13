from app.services.retrieval_service import retrieve_chunks
from app.services.llm_service import generate_answer


TEST_CASES = [
    {
        "question": "Who is Divya Ratna Gautam?",
        "should_find_context": True,
        "expected_answer_contains": ["Divya Ratna Gautam", "Harcourt Butler"],
    },
    {
        "question": "What is Divya's CGPA?",
        "should_find_context": True,
        "expected_answer_contains": ["7.01"],
    },
    {
        "question": "What is the capital of Japan?",
        "should_find_context": False,
        "expected_answer_contains": [],
    },
]


def run_evaluation():
    passed = 0

    for index, test in enumerate(TEST_CASES, start=1):
        question = test["question"]
        expected_context = test["should_find_context"]

        print("\n" + "=" * 60)
        print(f"Test {index}: {question}")

        try:
            chunks = retrieve_chunks(
                question,
                limit=5,
                score_threshold=0.50,
            )
            found_context = len(chunks) > 0
            context_passed = found_context == expected_context

            print(f"Retrieved chunks: {len(chunks)}")
            print(f"Context expectation: {expected_context}")
            print(f"Context test: {'PASS' if context_passed else 'FAIL'}")

            if found_context:
                answer = generate_answer(question, chunks)
                print(f"Answer: {answer}")
            else:
                print("Answer: No sufficiently relevant context found.")

            if context_passed:
                passed += 1

        except Exception as error:
            print(f"Test failed with error: {error}")

    print("\n" + "=" * 60)
    print(f"Context retrieval score: {passed}/{len(TEST_CASES)}")
    print(
        "Note: This measures context-presence expectations, "
        "not answer factual accuracy."
    )


if __name__ == "__main__":
    run_evaluation()
