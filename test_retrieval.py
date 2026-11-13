
from app.services.retrieval_service import retrieve_chunks


def main() -> None:
    query = input("Ask a question about your PDF: ")
    try:
        chunks = retrieve_chunks(query)
        if not chunks:
            print("No relevant chunks found.")
        else:
            print(f"\nRetrieved {len(chunks)} chunks:\n")
            for chunk in chunks:
                print(f"Chunk ID: {chunk['chunk_id']}")
                print(f"Source: {chunk['source']}")
                print(f"Score: {chunk['score']:.4f}")
                print(f"Text:\n{chunk['text']}")
                print("-" * 50)
    except Exception as error:
        print(f"Retrieval failed: {error}")


if __name__ == "__main__":
    main()
