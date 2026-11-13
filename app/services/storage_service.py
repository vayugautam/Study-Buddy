"""Storage abstraction for original PDF files."""

import os
from pathlib import Path
from typing import BinaryIO, Protocol
from uuid import UUID


class FileTooLargeError(ValueError):
    pass


class DocumentStorage(Protocol):
    def save_upload(self, document_id: UUID, source: BinaryIO, max_bytes: int) -> str: ...
    def resolve(self, storage_key: str) -> Path: ...
    def delete(self, storage_key: str) -> None: ...


class LocalFileStorage:
    """Local disk implementation; storage keys are opaque DB references."""

    def __init__(self, root: str | Path | None = None):
        self.root = Path(root or os.getenv("DOCUMENT_STORAGE_DIR", "data/uploads"))
        self.root.mkdir(parents=True, exist_ok=True)

    def save_upload(self, document_id: UUID, source: BinaryIO, max_bytes: int) -> str:
        key = f"{document_id}.pdf"
        destination = self.root / key
        temporary = self.root / f".{document_id}.uploading"
        total = 0
        try:
            with temporary.open("wb") as target:
                while block := source.read(1024 * 1024):
                    total += len(block)
                    if total > max_bytes:
                        raise FileTooLargeError("PDF exceeds the maximum upload size")
                    target.write(block)
            if total == 0:
                raise ValueError("Uploaded PDF is empty")
            with temporary.open("rb") as saved:
                if b"%PDF-" not in saved.read(1024):
                    raise ValueError("File does not contain a PDF header")
            os.replace(temporary, destination)
            return key
        except Exception:
            temporary.unlink(missing_ok=True)
            destination.unlink(missing_ok=True)
            raise

    def resolve(self, storage_key: str) -> Path:
        # Prevent path traversal if a DB value is ever corrupted.
        path = (self.root / storage_key).resolve()
        if path.parent != self.root.resolve():
            raise ValueError("Invalid storage reference")
        return path

    def delete(self, storage_key: str) -> None:
        self.resolve(storage_key).unlink(missing_ok=True)


def get_document_storage() -> DocumentStorage:
    """Factory seam for replacing local storage with an object store."""
    return LocalFileStorage()
