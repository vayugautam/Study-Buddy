
def chunk_text(
    text: str,
    chunk_size: int = 1000,
    overlap: int = 200,
) -> list[str]:
    """Split text into overlapping character-based chunks."""

    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")

    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("overlap must be between 0 and chunk_size - 1")

    text = text.strip()

    if not text:
        return []

    chunks = []
    start = 0

    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])

        if end == len(text):
            break

        start = end - overlap

    return chunks


def chunk_pages(
    pages: list[str],
    chunk_size: int = 1000,
    overlap: int = 200,
) -> list[dict]:
    """Chunk extracted page text while retaining 1-based page numbers."""
    page_chunks = []
    for page_number, page_text in enumerate(pages, start=1):
        for text in chunk_text(page_text, chunk_size=chunk_size, overlap=overlap):
            page_chunks.append({"page_number": page_number, "text": text})
    return page_chunks
