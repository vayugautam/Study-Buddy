
import os
import uuid

from dotenv import load_dotenv
from qdrant_client import QdrantClient, models

from app.services.embedding_service import EMBEDDING_DIMENSIONS

load_dotenv()

# Keep existing deployments compatible while allowing a dedicated collection
# for isolated evaluation runs.
COLLECTION_NAME = os.getenv("QDRANT_COLLECTION_NAME", "pdf_knowledge_base")


def get_qdrant_client() -> QdrantClient:
    """Connect to Qdrant Cloud."""

    url = os.getenv("QDRANT_URL")
    api_key = os.getenv("QDRANT_API_KEY")

    if not url or not api_key:
        raise ValueError(
            "QDRANT_URL and QDRANT_API_KEY must be set in .env"
        )

    return QdrantClient(
        url=url,
        api_key=api_key,
        timeout=30,
    )



def ensure_shared_collection(
    client: QdrantClient,
    vector_size: int = EMBEDDING_DIMENSIONS,
) -> None:
    """Create or validate the one shared collection and its filter indexes."""
    if vector_size != EMBEDDING_DIMENSIONS:
        raise ValueError(
            f"Configured vector size must be {EMBEDDING_DIMENSIONS}, got {vector_size}"
        )

    if not client.collection_exists(COLLECTION_NAME):
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=models.VectorParams(
                size=EMBEDDING_DIMENSIONS,
                distance=models.Distance.COSINE,
            ),
        )

    info = client.get_collection(COLLECTION_NAME)
    vector_config = info.config.params.vectors
    if not isinstance(vector_config, models.VectorParams):
        raise ValueError(f"Collection '{COLLECTION_NAME}' must use one unnamed vector")
    if vector_config.size != EMBEDDING_DIMENSIONS:
        raise ValueError(
            f"Collection '{COLLECTION_NAME}' has {vector_config.size} dimensions; "
            f"expected {EMBEDDING_DIMENSIONS}"
        )
    if vector_config.distance != models.Distance.COSINE:
        raise ValueError(
            f"Collection '{COLLECTION_NAME}' must use cosine distance"
        )

    schema = info.payload_schema or {}
    index_fields = {
        "user_id": models.PayloadSchemaType.KEYWORD,
        "document_id": models.PayloadSchemaType.KEYWORD,
        "indexed": models.PayloadSchemaType.BOOL,
        "chunk_index": models.PayloadSchemaType.INTEGER,
    }
    for field_name, field_type in index_fields.items():
        existing_index = schema.get(field_name)
        if existing_index is None:
            client.create_payload_index(
                collection_name=COLLECTION_NAME,
                field_name=field_name,
                field_type=field_type,
                wait=True,
            )
        elif existing_index.data_type != field_type:
            raise ValueError(
                f"Payload index '{field_name}' has type {existing_index.data_type}; "
                f"expected {field_type}"
            )


def recreate_collection(
    client: QdrantClient,
    vector_size: int,
) -> None:
    """Compatibility alias; collection creation is now non-destructive."""
    ensure_shared_collection(client, vector_size)


def store_chunks(
    client: QdrantClient,
    records: list[dict],
) -> None:
    """Store embedded chunks in Qdrant Cloud."""

    required_metadata = {
        "user_id",
        "document_id",
        "source_filename",
        "chunk_index",
        "indexed",
    }
    for record in records:
        missing = required_metadata.difference(record.get("metadata", {}))
        if missing:
            raise ValueError(f"Chunk metadata is missing fields: {sorted(missing)}")
        if len(record.get("embedding", [])) != EMBEDDING_DIMENSIONS:
            raise ValueError(
                f"Chunk embedding must have {EMBEDDING_DIMENSIONS} dimensions"
            )

    points = [
        models.PointStruct(
            id=record["chunk_id"],
            vector=record["embedding"],
            payload={
                "text": record["text"],
                **record["metadata"],
                "chunk_id": record["chunk_id"],
            },
        )
        for record in records
    ]

    if points:
        client.upsert(
            collection_name=COLLECTION_NAME,
            points=points,
            wait=True,
        )


def mark_document_chunks_indexed(
    client: QdrantClient,
    document_id: uuid.UUID,
) -> None:
    """Expose a document's vectors to retrieval only after a complete upsert."""
    client.set_payload(
        collection_name=COLLECTION_NAME,
        payload={"indexed": True},
        points=models.FilterSelector(
            filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="document_id",
                        match=models.MatchValue(value=str(document_id)),
                    )
                ]
            )
        ),
        wait=True,
    )


def delete_document_chunks(client: QdrantClient, document_id: uuid.UUID) -> None:
    """Remove every point owned by one document from the shared collection."""
    if not client.collection_exists(COLLECTION_NAME):
        return
    client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=models.FilterSelector(
            filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="document_id",
                        match=models.MatchValue(value=str(document_id)),
                    )
                ]
            )
        ),
        wait=True,
    )
