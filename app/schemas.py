"""Pydantic request and response models for authentication."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _normalize_email(value: str) -> str:
    value = value.strip().lower()
    local, separator, domain = value.partition("@")
    if not separator or not local or "." not in domain or any(ch.isspace() for ch in value):
        raise ValueError("A valid email address is required")
    return value


class UserCreate(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return _normalize_email(value)


class UserLogin(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return _normalize_email(value)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class DocumentResponse(BaseModel):
    id: UUID
    filename: str
    status: str
    created_at: datetime | None = None


RetrievalScope = Literal["single_document", "selected_documents", "all_documents"]


class ConversationCreate(BaseModel):
    title: str = Field(default="New conversation", min_length=1, max_length=255)
    retrieval_scope: RetrievalScope = "single_document"
    document_ids: list[UUID] = Field(default_factory=list)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("title cannot be empty")
        return value.strip()


class ConversationUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    retrieval_scope: RetrievalScope | None = None
    document_ids: list[UUID] | None = None


class ConversationSummary(BaseModel):
    id: UUID
    title: str
    retrieval_scope: RetrievalScope
    document_ids: list[UUID]
    created_at: datetime
    updated_at: datetime


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=10000)

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("message cannot be empty")
        return value.strip()


class MessageResponse(BaseModel):
    id: UUID
    role: Literal["user", "assistant", "system"]
    content: str
    created_at: datetime


class ConversationDetail(ConversationSummary):
    messages: list[MessageResponse]


class ConversationTurnResponse(BaseModel):
    conversation_id: UUID
    user_message: MessageResponse
    assistant_message: MessageResponse
    citations: list["CitationResponse"]


class CitationResponse(BaseModel):
    chunk_id: str
    document_id: UUID
    source: str
    page_number: int | None = None


ConversationTurnResponse.model_rebuild()
