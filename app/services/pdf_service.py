from pathlib import Path
from pypdf import PdfReader


def extract_text_from_pdf(file_path: str) -> dict:
    """Extract text and page count from a PDF."""

    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {path}")

    reader = PdfReader(str(path))

    pages = [page.extract_text() or "" for page in reader.pages]

    return {
        "text": "\n".join(pages),
        "page_count": len(reader.pages),
        "pages": pages,
    }
