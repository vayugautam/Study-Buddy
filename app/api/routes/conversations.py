"""Authenticated persistent conversation and chat endpoints."""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.models import Conversation, User
from app.schemas import (
    ConversationCreate,
    ConversationDetail,
    ConversationSummary,
    ConversationTurnResponse,
    ConversationUpdate,
    MessageCreate,
    MessageResponse,
)
from app.services.conversation_service import (
    ConcurrentConversationUpdate,
    ConversationNotFound,
    InvalidDocumentSelection,
    create_chat_turn,
    create_conversation,
    delete_conversation,
    get_conversation_document_ids,
    get_owned_conversation,
    list_messages,
    list_user_conversations,
    update_conversation,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/conversations", tags=["conversations"])


def _summary(db: Session, conversation: Conversation) -> ConversationSummary:
    return ConversationSummary(
        id=conversation.id,
        title=conversation.title,
        retrieval_scope=conversation.retrieval_scope,
        document_ids=get_conversation_document_ids(db, conversation.id),
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
    )


@router.post("", response_model=ConversationSummary, status_code=status.HTTP_201_CREATED)
def create_conversation_route(
    payload: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationSummary:
    try:
        conversation = create_conversation(
            db,
            current_user.id,
            title=payload.title,
            retrieval_scope=payload.retrieval_scope,
            document_ids=payload.document_ids,
        )
        return _summary(db, conversation)
    except InvalidDocumentSelection as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ConversationNotFound as exc:
        raise HTTPException(status_code=404, detail="Document not found") from exc


@router.get("", response_model=list[ConversationSummary])
def list_conversations_route(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ConversationSummary]:
    return [_summary(db, item) for item in list_user_conversations(db, current_user.id)]


@router.get("/{conversation_id}", response_model=ConversationDetail)
def open_conversation_route(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationDetail:
    try:
        conversation = get_owned_conversation(db, conversation_id, current_user.id)
    except ConversationNotFound as exc:
        raise HTTPException(status_code=404, detail="Conversation not found") from exc
    summary = _summary(db, conversation)
    messages = [MessageResponse.model_validate(item, from_attributes=True) for item in list_messages(db, conversation.id)]
    return ConversationDetail(**summary.model_dump(), messages=messages)


@router.patch("/{conversation_id}", response_model=ConversationSummary)
def update_conversation_route(
    conversation_id: uuid.UUID,
    payload: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationSummary:
    try:
        conversation = get_owned_conversation(db, conversation_id, current_user.id)
        conversation = update_conversation(
            db,
            conversation,
            user_id=current_user.id,
            update_fields=payload.model_fields_set,
            title=payload.title,
            retrieval_scope=payload.retrieval_scope,
            document_ids=payload.document_ids,
        )
        return _summary(db, conversation)
    except ConversationNotFound as exc:
        raise HTTPException(status_code=404, detail="Conversation or document not found") from exc
    except InvalidDocumentSelection as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation_route(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    try:
        conversation = get_owned_conversation(db, conversation_id, current_user.id)
        delete_conversation(db, conversation)
    except ConversationNotFound as exc:
        raise HTTPException(status_code=404, detail="Conversation not found") from exc


@router.post("/{conversation_id}/messages", response_model=ConversationTurnResponse)
def post_message_route(
    conversation_id: uuid.UUID,
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationTurnResponse:
    try:
        user_message, assistant_message, chunks, citations = create_chat_turn(
            db,
            conversation_id,
            current_user.id,
            payload.content.strip(),
        )
    except ConversationNotFound as exc:
        raise HTTPException(status_code=404, detail="Conversation not found") from exc
    except ConcurrentConversationUpdate as exc:
        raise HTTPException(
            status_code=409,
            detail="Conversation changed while generating a reply; retry the message",
        ) from exc
    except Exception as exc:
        logger.exception("Conversation reply generation or persistence failed")
        raise HTTPException(status_code=502, detail="Could not generate a conversation reply") from exc

    return ConversationTurnResponse(
        conversation_id=conversation_id,
        user_message=MessageResponse.model_validate(user_message, from_attributes=True),
        assistant_message=MessageResponse.model_validate(assistant_message, from_attributes=True),
        citations=[citation.model_dump() for citation in citations],
    )
