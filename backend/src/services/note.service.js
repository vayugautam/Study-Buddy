/**
 * @module services/note
 * @description Service layer for note (uploaded PDF) CRUD operations.
 */

import Note from '../models/Note.model.js';
import DocumentChunk from '../models/DocumentChunk.model.js';
import { NotFoundError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

const noteService = {
  async createNote({ ownerId, title, originalFilename, storedFilename, filePath, fileSizeKb }) {
    const note = await Note.create({
      ownerId,
      title,
      originalFilename,
      storedFilename,
      filePath,
      fileSizeKb,
      status: 'processing',
    });
    logger.info('Note created', { noteId: note._id, ownerId });
    return note;
  },

  async getUserNotes(ownerId, { page = 1, limit = 20 } = {}) {
    const safePage = Number.isInteger(Number(page)) && Number(page) >= 1 ? Number(page) : 1;
    const safeLimit = Number.isInteger(Number(limit)) && Number(limit) >= 1
      ? Math.min(Number(limit), 100)
      : 20;
    const skip = (safePage - 1) * safeLimit;

    const [notes, totalRecords] = await Promise.all([
      Note.find({ ownerId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit),
      Note.countDocuments({ ownerId }),
    ]);

    return {
      notes,
      pagination: {
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(totalRecords / safeLimit) || 1,
        totalRecords,
      },
    };
  },

  async getNoteById(noteId, ownerId) {
    const note = await Note.findOne({ _id: noteId, ownerId });
    if (!note) throw new NotFoundError('Note');
    return note;
  },

  async deleteNote(noteId, ownerId) {
    const note = await Note.findOneAndDelete({ _id: noteId, ownerId });
    if (!note) throw new NotFoundError('Note');

    try {
      await DocumentChunk.deleteMany({ noteId });
    } catch (chunkErr) {
      logger.warn('Failed to delete DocumentChunk records for deleted note', {
        noteId,
        error: chunkErr.message,
      });
    }

    logger.info('Note deleted', { noteId, ownerId });
    return note;
  },

  async updateNote(noteId, ownerId, updates) {
    // Only expose fields that a normal user is allowed to edit. In particular,
    // status/ownerId/filePath must not be client-controlled.
    const allowedUpdates = {};
    if (typeof updates?.title === 'string') allowedUpdates.title = updates.title;

    const note = await Note.findOneAndUpdate(
      { _id: noteId, ownerId },
      { $set: allowedUpdates },
      { new: true, runValidators: true },
    );
    if (!note) throw new NotFoundError('Note');
    return note;
  },

  async updateNoteStatus(noteId, status, extraFields = {}) {
    const note = await Note.findByIdAndUpdate(
      noteId,
      { $set: { status, ...extraFields } },
      { new: true, runValidators: true },
    );

    if (!note) throw new NotFoundError('Note');
    logger.info('Note status updated', { noteId, status });
    return note;
  },
};

export default noteService;
