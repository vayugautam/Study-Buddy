/**
 * @module controllers/chat
 * @description Thin controller layer for AI chat / Q&A endpoints.
 * Extracts request data, delegates to chatService, and sends responses.
 */

import chatService from '../services/chat.service.js';
import catchAsync from '../utils/catchAsync.js';
import { successResponse } from '../utils/apiResponse.js';

/**
 * Sends a question to the AI. If no chatId is provided in the body,
 * a new chat session is created automatically.
 * @type {import('express').RequestHandler}
 */
const ask = catchAsync(async (req, res) => {
  const { query, chatId, noteIds } = req.body;

  let targetChatId = chatId;

  if (!chatId) {
    const chat = await chatService.createChat({
      ownerId: req.user._id,
      title: query.substring(0, 100),
      noteIds,
    });
    targetChatId = chat._id;
  }

  const message = await chatService.sendMessage({
    chatId: targetChatId,
    ownerId: req.user._id,
    query,
    requestNoteIds: noteIds,
  });

  successResponse(res, { chatId: targetChatId, message });
});

/**
 * Lists all chat sessions belonging to the authenticated user.
 * Supports pagination and filtering via query parameters.
 * @type {import('express').RequestHandler}
 */
const getChats = catchAsync(async (req, res) => {
  const result = await chatService.getUserChats(req.user._id, req.query);
  successResponse(res, result);
});

const createChatSession = catchAsync(async (req, res) => {
  const chat = await chatService.createChat({
    ownerId: req.user._id,
    title: req.body.title || 'New Chat',
    noteIds: req.body.noteIds || [],
  });
  successResponse(res, { chat }, 201);
});

/**
 * Retrieves a single chat session with its full message history.
 * Enforces tenant isolation via ownerId.
 * @type {import('express').RequestHandler}
 */
const getChat = catchAsync(async (req, res) => {
  const result = await chatService.getChatById(req.params.id, req.user._id);
  successResponse(res, result);
});

/**
 * Deletes a chat session and all its messages.
 * Enforces tenant isolation via ownerId.
 * @type {import('express').RequestHandler}
 */
const deleteChat = catchAsync(async (req, res) => {
  await chatService.deleteChat(req.params.id, req.user._id);
  successResponse(res, { message: 'Chat successfully deleted.' });
});

/**
 * Updates a chat session (e.g. rename title, pin/unpin).
 * Enforces tenant isolation via ownerId.
 * @type {import('express').RequestHandler}
 */
const updateChat = catchAsync(async (req, res) => {
  const chat = await chatService.updateChat(req.params.id, req.user._id, req.body);
  successResponse(res, { chat });
});

export { ask, getChats, getChat, deleteChat, updateChat, createChatSession };
