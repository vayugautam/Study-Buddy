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
  async createChat({ ownerId, title, noteIds = [] }) {
    const validNoteIds = (noteIds || []).filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validNoteIds.length > 0) {
      const ownedNotesCount = await Note.countDocuments({ _id: { $in: validNoteIds }, ownerId });
      if (ownedNotesCount !== validNoteIds.length) {
        throw new ForbiddenError('One or more notes do not belong to the user.');
      }
    }
    return Chat.create({ ownerId, title: title || 'New Chat', noteIds: validNoteIds });
  },

  async sendMessage({ chatId, ownerId, query, requestNoteIds }) {
    const chat = await Chat.findOne({ _id: chatId, ownerId });
    if (!chat) throw new NotFoundError('Chat not found or unauthorized.');

    const noteIdsToSearch = requestNoteIds?.length > 0 ? requestNoteIds : chat.noteIds;

    if (requestNoteIds?.length > 0) {
      const validIds = requestNoteIds.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (validIds.length !== requestNoteIds.length) {
        throw new ForbiddenError('One or more note IDs are invalid.');
      }
      const ownedNotesCount = await Note.countDocuments({ _id: { $in: validIds }, ownerId });
      if (ownedNotesCount !== validIds.length) {
        throw new ForbiddenError('One or more override notes do not belong to the user.');
      }
    }

    const userMessage = await Message.create({ chatId, ownerId, role: 'user', content: query });

    const recentMessages = await Message.find({ chatId, ownerId })
      .sort({ timestamp: -1 })
      .limit(7)
      .lean();

    const chatHistory = recentMessages
      .reverse()
      .filter(m => m._id.toString() !== userMessage._id.toString())
      .slice(-6)
      .map(m => ({ role: m.role, content: m.content }));

    const { answer, citations } = await ragService.generateAnswer({
      query,
      ownerId,
      noteIds: noteIdsToSearch,
      chatHistory,
    });

    const formattedCitations = citations.map(c => ({
      sourceFilename: c.split(',')[0].replace('[Source: ', '').trim() || 'Unknown Note',
      chunkIndex: parseInt(c.match(/Chunk (\d+)/)?.[1], 10) || 0,
      pageNumber: null,
    }));

    const aiMessage = await Message.create({
      chatId,
      ownerId,
      role: 'assistant',
      content: answer,
      citations: formattedCitations,
    });

    await Chat.updateOne({ _id: chatId, ownerId }, { $set: { lastActivityAt: new Date() } });
    return { userMessage, aiMessage };
  },

  async getUserChats(ownerId) {
    return Chat.find({ ownerId }).sort({ lastActivityAt: -1 });
  },

  async getChatById(chatId, ownerId) {
    const chat = await Chat.findOne({ _id: chatId, ownerId });
    if (!chat) throw new NotFoundError('Chat not found or unauthorized.');
    const messages = await Message.find({ chatId, ownerId }).sort({ timestamp: 1 });
    return { ...chat.toJSON(), messages };
  },

  async updateChat(chatId, ownerId, updates) {
    const title = typeof updates === 'string' ? updates : updates?.title;
    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, ownerId },
      { $set: { title } },
      { new: true, runValidators: true },
    );
    if (!chat) throw new NotFoundError('Chat not found or unauthorized.');
    return chat;
  },

  async deleteChat(chatId, ownerId) {
    const result = await Chat.deleteOne({ _id: chatId, ownerId });
    if (result.deletedCount === 0) throw new NotFoundError('Chat not found or unauthorized.');
    await Message.deleteMany({ chatId, ownerId });
  },
};

export default chatService;
