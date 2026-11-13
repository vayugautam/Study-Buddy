
from app.services.embedding_service import generate_embedding

def main() -> None:
    text = "Machine learning enables computers to learn from data."
    vector = generate_embedding(text)
    print("Embedding generated successfully!")
    print("Vector dimensions:", len(vector))
    print("First 10 values:", vector[:10])


if __name__ == "__main__":
    main()
