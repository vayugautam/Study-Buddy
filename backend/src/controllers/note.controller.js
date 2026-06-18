/**
 * @module controllers/note
 * @description Thin controller layer for note (PDF upload) endpoints.
 * Handles file uploads, kicks off background PDF processing, and
 * delegates CRUD operations to noteService.
 */

import noteService from '../services/note.service.js';
import pdfService from '../services/pdf.service.js';
import embeddingsService from '../services/embeddings.service.js';
import catchAsync from '../utils/catchAsync.js';
import { successResponse } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import logger from '../utils/logger.js';
import fs from 'node:fs/promises';

/**
 * Processes a PDF in the background after the upload response has been sent.
 * Extracts text, chunks it, generates embeddings, and updates note status.
 * @param {string} noteId - The Mongo ObjectId of the newly created note.
 * @param {string} filePath - Absolute path to the uploaded PDF file.
 * @param {string} ownerId - The authenticated user's ObjectId.
 * @param {string} originalFilename - The original name of the uploaded file.
 * @returns {Promise<void>}
 */
async function processPdfInBackground(noteId, filePath, ownerId, originalFilename) {
  try {
    const { text, pageCount } = await pdfService.extractText(filePath);

    const chunks = await embeddingsService.chunkText(text);

    await embeddingsService.embedAndStore({
      noteId,
      ownerId,
      chunks,
      originalFilename,
    });

    const excerpt = text.substring(0, 500).trim();
    await noteService.updateNoteStatus(noteId, 'ready', { excerpt, pageCount });

    logger.info('PDF processing completed', { noteId, pageCount, chunkCount: chunks.length });
  } catch (err) {
    logger.error('PDF background processing failed', {
      noteId,
      error: err.message,
    });

    await noteService.updateNoteStatus(noteId, 'error', {
      errorMessage: err.message,
    });
  } finally {
    try {
      await fs.unlink(filePath);
      logger.info('Cleaned up local file', { filePath });
    } catch (cleanupErr) {
      logger.error('Failed to clean up local file', { filePath, error: cleanupErr.message });
    }
  }
}

/**
 * Uploads a PDF note.
 * Creates the note record immediately and returns it, then processes
 * the PDF (extract → chunk → embed) in the background.
 * @type {import('express').RequestHandler}
 */
const uploadNote = catchAsync(async (req, res) => {
  const file = req.file; // populated by multer middleware

  if (!file) {
    throw new AppError('Please upload a PDF file.', 400, 'VALIDATION_FAILED');
  }

  const note = await noteService.createNote({
    ownerId: req.user._id,
    title: req.body.title || file.originalname.replace('.pdf', ''),
    originalFilename: file.originalname,
    storedFilename: file.filename,
    filePath: file.path,
    fileSizeKb: Math.round(file.size / 1024),
  });

  // Fire-and-forget: process PDF without blocking the HTTP response
  processPdfInBackground(note._id, file.path, req.user._id, file.originalname);

  successResponse(res, { note }, 201);
});

/**
 * Lists all notes belonging to the authenticated user.
 * Supports pagination and filtering via query parameters.
 * @type {import('express').RequestHandler}
 */
const getNotes = catchAsync(async (req, res) => {
  const result = await noteService.getUserNotes(req.user._id, req.query);
  successResponse(res, result);
});

/**
 * Retrieves a single note by its ID.
 * Enforces tenant isolation via ownerId.
 * @type {import('express').RequestHandler}
 */
const getNote = catchAsync(async (req, res) => {
  const note = await noteService.getNoteById(req.params.id, req.user._id);
  successResponse(res, { note });
});

/**
 * Deletes a note and its associated resources.
 * Enforces tenant isolation via ownerId.
 * @type {import('express').RequestHandler}
 */
const deleteNote = catchAsync(async (req, res) => {
  await noteService.deleteNote(req.params.id, req.user._id);
  successResponse(res, { message: 'Note successfully deleted.' });
});

/**
 * Updates a note.
 * Enforces tenant isolation via ownerId.
 * @type {import('express').RequestHandler}
 */
const updateNote = catchAsync(async (req, res) => {
  const note = await noteService.updateNote(req.params.id, req.user._id, req.body);
  successResponse(res, { note });
});

export { uploadNote, getNotes, getNote, deleteNote, updateNote };
