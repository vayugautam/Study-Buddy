
import os

from dotenv import load_dotenv
from google import genai

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")

try:
    EMBEDDING_DIMENSIONS = int(os.getenv("GEMINI_EMBEDDING_DIMENSIONS", "3072"))
except ValueError as exc:
    raise ValueError("GEMINI_EMBEDDING_DIMENSIONS must be an integer") from exc

if EMBEDDING_DIMENSIONS != 3072:
    raise ValueError("Study-Buddy AI requires 3072-dimensional Gemini embeddings")

if not api_key:
    raise ValueError("GEMINI_API_KEY is missing from .env")

client = genai.Client(api_key=api_key)


def generate_embedding(text: str) -> list[float]:
    """Convert text into a semantic embedding vector."""

    if not text.strip():
        raise ValueError("Cannot embed empty text")

    response = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config={"output_dimensionality": EMBEDDING_DIMENSIONS},
    )

    values = response.embeddings[0].values
    if len(values) != EMBEDDING_DIMENSIONS:
        raise ValueError(
            f"Embedding provider returned {len(values)} dimensions; "
            f"expected {EMBEDDING_DIMENSIONS}"
        )
    return values
