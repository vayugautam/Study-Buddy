
from app.services.retrieval_service import retrieve_chunks
from app.services.llm_service import generate_answer


def answer_question(query: str) -> str:
    chunks = retrieve_chunks(query, limit=5)
    return generate_answer(query, chunks)


if __name__ == "__main__":
    query = input("Ask a question about your PDF: ")

    try:
        answer = answer_question(query)
        print("\nAnswer:\n")
        print(answer)

    except Exception as error:
        print(f"\nRAG pipeline failed: {error}")
