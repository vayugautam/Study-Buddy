/**
 * @module services/note
 * @description Service layer for note (uploaded PDF) CRUD operations.
 * Every query enforces tenant isolation through the ownerId parameter.
 */

import Note from '../models/Note.model.js';
import { NotFoundError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

const noteService = {
  /**
   * Create a new note record in "processing" state.
   * Called immediately after a file upload succeeds, before text extraction.
   * @param {{ ownerId: string, title: string, originalFilename: string, storedFilename: string, filePath: string, fileSizeKb: number }} params
   * @returns {Promise<import('mongoose').Document>} The created note.
   */
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

  /**
   * List all notes belonging to a user with cursor-free pagination.
   * @param {string} ownerId
   * @param {{ page?: number, limit?: number }} options
   * @returns {Promise<{ notes: object[], pagination: object }>}
   */
  async getUserNotes(ownerId, { page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;

    const [notes, totalRecords] = await Promise.all([
      Note.find({ ownerId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Note.countDocuments({ ownerId }),
    ]);

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    return {
      notes,
      pagination: {
        page,
        limit,
        totalPages,
        totalRecords,
      },
    };
  },

  /**
   * Retrieve a single note by ID, scoped to the owner.
   * @param {string} noteId
   * @param {string} ownerId
   * @returns {Promise<import('mongoose').Document>}
   * @throws {NotFoundError} If the note does not exist or belongs to another user.
   */
  async getNoteById(noteId, ownerId) {
    const note = await Note.findOne({ _id: noteId, ownerId });
    if (!note) {
      throw new NotFoundError('Note');
    }
    return note;
  },

  /**
   * Delete a note by ID, scoped to the owner.
   * @param {string} noteId
   * @param {string} ownerId
   * @returns {Promise<import('mongoose').Document>} The deleted note.
   * @throws {NotFoundError} If the note does not exist or belongs to another user.
   */
  async deleteNote(noteId, ownerId) {
    const note = await Note.findOneAndDelete({ _id: noteId, ownerId });
    if (!note) {
      throw new NotFoundError('Note');
    }

    logger.info('Note deleted', { noteId, ownerId });
    return note;
  },

  /**
   * Update a note (e.g. title) by ID, scoped to the owner.
   */
  async updateNote(noteId, ownerId, updates) {
    const note = await Note.findOneAndUpdate(
      { _id: noteId, ownerId },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!note) {
      throw new NotFoundError('Note');
    }
    return note;
  },

  /**
   * Update a note's processing status and optionally merge additional fields
   * (e.g. pageCount, excerpt, extractedText after PDF parsing).
   * @param {string} noteId
   * @param {'processing'|'ready'|'error'} status
   * @param {object} [extraFields={}] - Additional fields to set alongside status.
   * @returns {Promise<import('mongoose').Document|null>} The updated note.
   */
  async updateNoteStatus(noteId, status, extraFields = {}) {
    const note = await Note.findByIdAndUpdate(
      noteId,
      { status, ...extraFields },
      { new: true },
    );

    logger.info('Note status updated', { noteId, status });
    return note;
  },
};

export default noteService;
