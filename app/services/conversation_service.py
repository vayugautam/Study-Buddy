"""PostgreSQL-backed conversation, document-scope, and chat-turn workflows."""

from datetime import datetime, timedelta, timezone
import os
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import Conversation, ConversationDocument, Document, Message
from app.services.llm_service import generate_answer
from app.services.retrieval_service import retrieve_for_conversation


class ConversationNotFound(LookupError):
    pass


class InvalidDocumentSelection(ValueError):
    pass


class ConcurrentConversationUpdate(RuntimeError):
    pass


def get_owned_conversation(db: Session, conversation_id: UUID, user_id: UUID) -> Conversation:
    conversation = db.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        )
    )
    if conversation is None:
        raise ConversationNotFound
    return conversation


def get_conversation_document_ids(
    db: Session,
    conversation_id: UUID,
) -> list[UUID]:
    return list(db.scalars(
        select(ConversationDocument.document_id)
        .where(ConversationDocument.conversation_id == conversation_id)
        .order_by(ConversationDocument.document_id)
    ).all())


def validate_document_selection(
    db: Session,
    user_id: UUID,
    scope: str,
    document_ids: list[UUID],
) -> list[UUID]:
    ids = list(dict.fromkeys(document_ids))
    if scope == "all_documents":
        if ids:
            raise InvalidDocumentSelection("all_documents scope cannot include document_ids")
        return []
    if scope == "single_document" and len(ids) != 1:
        raise InvalidDocumentSelection("single_document scope requires exactly one document")
    if scope == "selected_documents" and not ids:
        raise InvalidDocumentSelection("selected_documents scope requires at least one document")

    owned_ids = set(db.scalars(
        select(Document.id).where(
            Document.id.in_(ids),
            Document.user_id == user_id,
        )
    ).all())
    if owned_ids != set(ids):
        # Do not reveal whether an unowned identifier exists.
        raise ConversationNotFound
    return ids


def create_conversation(
    db: Session,
    user_id: UUID,
    *,
    title: str,
    retrieval_scope: str,
    document_ids: list[UUID],
) -> Conversation:
    selected_ids = validate_document_selection(db, user_id, retrieval_scope, document_ids)
    conversation = Conversation(
        user_id=user_id,
        title=title.strip(),
        retrieval_scope=retrieval_scope,
    )
    try:
        db.add(conversation)
        db.flush()
        db.add_all([
            ConversationDocument(
                conversation_id=conversation.id,
                document_id=document_id,
                user_id=user_id,
            )
            for document_id in selected_ids
        ])
        db.commit()
        db.refresh(conversation)
    except Exception:
        db.rollback()
        raise
    return conversation


def update_conversation(
    db: Session,
    conversation: Conversation,
    *,
    user_id: UUID,
    update_fields: set[str],
    title: str | None,
    retrieval_scope: str | None,
    document_ids: list[UUID] | None,
) -> Conversation:
    try:
        if "title" in update_fields:
            if title is None or not title.strip():
                raise ValueError("title cannot be empty")
            conversation.title = title.strip()

        changes_scope = "retrieval_scope" in update_fields or "document_ids" in update_fields
        if changes_scope:
            scope = retrieval_scope or conversation.retrieval_scope
            current_ids = get_conversation_document_ids(db, conversation.id)
            if scope == "all_documents" and "document_ids" not in update_fields:
                selected_ids = []
            else:
                selected_ids = document_ids if "document_ids" in update_fields else current_ids
            if selected_ids is None:
                selected_ids = []
            selected_ids = validate_document_selection(db, user_id, scope, selected_ids)
            conversation.retrieval_scope = scope
            db.execute(delete(ConversationDocument).where(
                ConversationDocument.conversation_id == conversation.id
            ))
            db.add_all([
                ConversationDocument(
                    conversation_id=conversation.id,
                    document_id=document_id,
                    user_id=user_id,
                )
                for document_id in selected_ids
            ])
        db.commit()
        db.refresh(conversation)
    except Exception:
        db.rollback()
        raise
    return conversation


def list_user_conversations(db: Session, user_id: UUID) -> list[Conversation]:
    return list(db.scalars(
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc(), Conversation.id)
    ).all())


def list_messages(db: Session, conversation_id: UUID) -> list[Message]:
    return list(db.scalars(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at, Message.id)
    ).all())


def _history_limits() -> tuple[int, int]:
    try:
        message_limit = int(os.getenv("CONVERSATION_HISTORY_LIMIT", "12"))
        character_limit = int(os.getenv("CONVERSATION_HISTORY_MAX_CHARS", "12000"))
    except ValueError as exc:
        raise RuntimeError("Conversation history limits must be integers") from exc
    if message_limit < 0 or character_limit < 0:
        raise RuntimeError("Conversation history limits cannot be negative")
    return message_limit, character_limit


def load_recent_history(db: Session, conversation_id: UUID) -> list[dict[str, str]]:
    """Return a bounded recent window; persisted messages are never truncated."""
    message_limit, character_limit = _history_limits()
    if not message_limit or not character_limit:
        return []
    recent_rows = list(db.scalars(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc(), Message.id.desc())
        .limit(message_limit)
    ).all())
    recent_rows.reverse()
    history = [{"role": row.role, "content": row.content} for row in recent_rows]
    while history and sum(len(item["content"]) for item in history) > character_limit:
        excess = sum(len(item["content"]) for item in history) - character_limit
        if len(history[0]["content"]) <= excess:
            history.pop(0)
        else:
            history[0]["content"] = history[0]["content"][excess:]
    return history


def delete_conversation(db: Session, conversation: Conversation) -> None:
    try:
        db.execute(delete(ConversationDocument).where(
            ConversationDocument.conversation_id == conversation.id
        ))
        db.execute(delete(Message).where(Message.conversation_id == conversation.id))
        db.delete(conversation)
        db.commit()
    except Exception:
        db.rollback()
        raise


def _scope_document_ids(db: Session, conversation: Conversation, user_id: UUID) -> list[UUID]:
    if conversation.retrieval_scope == "all_documents":
        return list(db.scalars(
            select(Document.id).where(
                Document.user_id == user_id,
                Document.status == "completed",
            )
        ).all())
    return list(db.scalars(
        select(Document.id)
        .join(ConversationDocument, ConversationDocument.document_id == Document.id)
        .where(
            ConversationDocument.conversation_id == conversation.id,
            ConversationDocument.user_id == user_id,
            Document.user_id == user_id,
            Document.status == "completed",
        )
    ).all())


def create_chat_turn(
    db: Session,
    conversation_id: UUID,
    user_id: UUID,
    content: str,
) -> tuple[Message, Message, list[dict]]:
    """Generate first, then atomically persist both messages and updated_at."""
    conversation = get_owned_conversation(db, conversation_id, user_id)
    version = conversation.updated_at
    history_rows = list_messages(db, conversation.id)
    history = load_recent_history(db, conversation.id)
    previous_message_time = history_rows[-1].created_at if history_rows else None

    # Release the read transaction before retrieval and remote model calls.
    db.rollback()

    chunks = retrieve_for_conversation(
        db,
        conversation_id=conversation_id,
        user_id=user_id,
        query=content,
    )
    db.rollback()
    answer = generate_answer(content, chunks, history=history)
    if not answer.answer or not answer.answer.strip():
        raise RuntimeError("The assistant returned an empty answer")

    try:
        locked_conversation = db.scalar(
            select(Conversation)
            .where(
                Conversation.id == conversation_id,
                Conversation.user_id == user_id,
            )
            .with_for_update()
        )
        if locked_conversation is None:
            raise ConversationNotFound
        if locked_conversation.updated_at != version:
            raise ConcurrentConversationUpdate

        now = datetime.now(timezone.utc)
        for prior_time in (previous_message_time, version):
            if prior_time is not None:
                if prior_time.tzinfo is None:
                    prior_time = prior_time.replace(tzinfo=timezone.utc)
                now = max(now, prior_time + timedelta(microseconds=1))
        assistant_time = now + timedelta(microseconds=1)
        user_message = Message(
            conversation_id=conversation_id,
            role="user",
            content=content,
            created_at=now,
        )
        assistant_message = Message(
            conversation_id=conversation_id,
            role="assistant",
            content=answer.answer.strip(),
            created_at=assistant_time,
        )
        locked_conversation.updated_at = assistant_time
        db.add_all([user_message, assistant_message])
        db.commit()
        db.refresh(user_message)
        db.refresh(assistant_message)
        return user_message, assistant_message, chunks, answer.citations
    except Exception:
        db.rollback()
        raise
