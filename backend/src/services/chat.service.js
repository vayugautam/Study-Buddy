/**
 * @module services/chat
 * @description Manages chat sessions and messages. Enforces ownership
 * boundaries and interacts with the RAG service to generate AI answers.
 */

import Chat from '../models/Chat.model.js';
import Message from '../models/Message.model.js';
import Note from '../models/Note.model.js';
import mongoose from 'mongoose';
import ragService from './rag.service.js';
import { NotFoundError, ForbiddenError } from '../utils/AppError.js';

const chatService = {
  /**
   * Create a new chat session.
   * @param {{ownerId: string, title: string, noteIds: string[]}} params
   */
  async createChat({ ownerId, title, noteIds = [] }) {
    // Filter out any invalid ObjectId strings to prevent Mongoose cast errors
    const validNoteIds = (noteIds || []).filter(id => mongoose.Types.ObjectId.isValid(id));

    // If notes are specified, verify the user owns ALL of them.
    if (validNoteIds.length > 0) {
      const ownedNotesCount = await Note.countDocuments({
        _id: { $in: validNoteIds },
        ownerId,
      });

      if (ownedNotesCount !== validNoteIds.length) {
        throw new ForbiddenError('One or more notes do not belong to the user.');
      }
    }

    const chat = await Chat.create({
      ownerId,
      title: title || 'New Chat',
      noteIds: validNoteIds,
    });

    return chat;
  },

  /**
   * Add a new message and generate an AI response.
   * @param {{chatId: string, ownerId: string, query: string, requestNoteIds?: string[]}} params
   */
  async sendMessage({ chatId, ownerId, query, requestNoteIds }) {
    // 1. Fetch chat and verify ownership
    const chat = await Chat.findOne({ _id: chatId, ownerId });
    if (!chat) {
      throw new NotFoundError('Chat not found or unauthorized.');
    }

    // 2. Determine grounding notes (prefer request override, fallback to chat default)
    let noteIdsToSearch = requestNoteIds && requestNoteIds.length > 0
      ? requestNoteIds
      : chat.noteIds;

    // Verify ownership of requested note overrides
    if (requestNoteIds && requestNoteIds.length > 0) {
      const ownedNotesCount = await Note.countDocuments({
        _id: { $in: requestNoteIds },
        ownerId,
      });
      if (ownedNotesCount !== requestNoteIds.length) {
        throw new ForbiddenError('One or more override notes do not belong to the user.');
      }
    }

    // 3. Save User Message
    const userMessage = await Message.create({
      chatId,
      ownerId,
      role: 'user',
      content: query,
    });

    // 4. Fetch recent history for context (last 6 messages)
    const recentMessages = await Message.find({ chatId })
      .sort({ timestamp: -1 })
      .limit(6)
      .lean();

    // Reverse to chronological order and exclude the message we just saved
    // so we don't duplicate it in the query.
    const chatHistory = recentMessages
      .reverse()
      .filter((m) => m._id.toString() !== userMessage._id.toString())
      .map((m) => ({ role: m.role, content: m.content }));

    // 5. Generate AI Answer via RAG
    const { answer, citations } = await ragService.generateAnswer({
      query,
      ownerId,
      noteIds: noteIdsToSearch,
      chatHistory,
    });

    // Format citations to match schema
    const formattedCitations = citations.map(c => ({
      sourceFilename: c.split(',')[0].replace('[Source: ', '').trim() || 'Unknown Note',
      chunkIndex: parseInt(c.match(/Chunk (\d+)/)?.[1], 10) || 0,
      pageNumber: null,
    }));

    // 6. Save AI Message
    const aiMessage = await Message.create({
      chatId,
      ownerId,
      role: 'assistant',
      content: answer,
      citations: formattedCitations,
    });

    // 7. Update chat activity
    await Chat.updateOne(
      { _id: chatId },
      { $set: { lastActivityAt: new Date() } }
    );

    return {
      userMessage,
      aiMessage,
    };
  },

  /**
   * Get all chats for a user.
   */
  async getUserChats(ownerId) {
    return await Chat.find({ ownerId })
      .sort({ lastActivityAt: -1 });
  },

  /**
   * Get a specific chat with all its messages.
   */
  async getChatById(chatId, ownerId) {
    const chat = await Chat.findOne({ _id: chatId, ownerId });
    if (!chat) {
      throw new NotFoundError('Chat not found or unauthorized.');
    }

    const messages = await Message.find({ chatId })
      .sort({ timestamp: 1 });

    return {
      ...chat.toJSON(),
      messages,
    };
  },

  /**
   * Rename a chat session.
   */
  async updateChat(chatId, ownerId, title) {
    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, ownerId },
      { $set: { title } },
      { new: true, runValidators: true }
    );

    if (!chat) {
      throw new NotFoundError('Chat not found or unauthorized.');
    }

    return chat;
  },

  /**
   * Delete a chat session and all its messages.
   */
  async deleteChat(chatId, ownerId) {
    // Delete chat first to verify ownership
    const result = await Chat.deleteOne({ _id: chatId, ownerId });
    
    if (result.deletedCount === 0) {
      throw new NotFoundError('Chat not found or unauthorized.');
    }

    // Cascade delete messages
    await Message.deleteMany({ chatId });
  },
};

export default chatService;
