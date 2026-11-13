
from app.services.chunk_service import chunk_text

def main() -> None:
    sample_text = "A" * 2500
    chunks = chunk_text(sample_text)
    print("Total chunks:", len(chunks))
    for index, chunk in enumerate(chunks):
        print(f"Chunk {index + 1}: {len(chunk)} characters")


if __name__ == "__main__":
    main()
