import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/env.config.js';
import { AppError } from '../utils/AppError.js';

// ---------------------------------------------------------------------------
// Storage configuration
// ---------------------------------------------------------------------------

const uploadDir = path.resolve('uploads');

// Ensure the uploads directory exists at startup
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  /**
   * Resolve the destination directory for uploaded files.
   *
   * @param {import('express').Request} _req
   * @param {Express.Multer.File} _file
   * @param {Function} cb
   */
  destination(_req, _file, cb) {
    cb(null, uploadDir);
  },

  /**
   * Generate a unique filename for the uploaded PDF.
   *
   * @param {import('express').Request} _req
   * @param {Express.Multer.File} _file
   * @param {Function} cb
   */
  filename(_req, _file, cb) {
    cb(null, `${uuidv4()}.pdf`);
  },
});

// ---------------------------------------------------------------------------
// File filter – accept only PDF files
// ---------------------------------------------------------------------------

/**
 * Multer file-filter that rejects anything other than `application/pdf`.
 *
 * @param {import('express').Request} _req
 * @param {Express.Multer.File} file
 * @param {Function} cb
 */
const fileFilter = (_req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(
      new AppError('Only PDF files are allowed', 400, 'VALIDATION_FAILED'),
      false
    );
  }
};

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

const limits = {
  fileSize: config.upload.maxSizeMb * 1024 * 1024,
};

// ---------------------------------------------------------------------------
// Configured multer instance
// ---------------------------------------------------------------------------

/**
 * Pre-configured multer middleware for single PDF uploads.
 *
 * Expects the file field to be named `pdf` in the multipart form request.
 *
 * @type {import('express').RequestHandler}
 */
export const uploadPdf = multer({ storage, fileFilter, limits }).single('pdf');
