
from app.services.qdrant_service import get_qdrant_client

def main() -> None:
    client = get_qdrant_client()
    try:
        print("Connected to Qdrant Cloud!")
        collections = client.get_collections()
        print("\nAvailable collections:")
        for collection in collections.collections:
            print("-", collection.name)
    finally:
        client.close()


if __name__ == "__main__":
    main()
