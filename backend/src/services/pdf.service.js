/**
 * @module services/pdf
 * @description PDF text extraction service. Wraps the pdf-parse library and
 * provides a clean interface for extracting text content from uploaded PDFs.
 */

import fs from 'fs/promises';
import { AppError } from '../utils/AppError.js';
import logger from '../utils/logger.js';
import geminiService from './gemini.service.js';

const pdfService = {
  /**
   * Extract text content and metadata from a PDF file.
   * @param {string} filePath - Absolute path to the PDF file on disk.
   * @returns {Promise<{ text: string, pageCount: number, info: object }>}
   * @throws {AppError} If the PDF cannot be parsed (encrypted, corrupted, etc.).
   */
  async extractText(filePath) {
    try {
      // Import the inner file directly to avoid the 'isDebugMode' bug in pdf-parse's index.js
      const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;

      const buffer = await fs.readFile(filePath);
      const data = await pdfParse(buffer);

      // Extract text natively via Gemini OCR for maximum accuracy
      const text = await geminiService.extractTextFromPdf(filePath);

      logger.info('PDF text extracted', {
        filePath,
        pageCount: data.numpages,
        textLength: text.length,
      });

      return {
        text: text,
        pageCount: data.numpages,
        info: data.info,
      };
    } catch (error) {
      // Re-throw our own errors as-is (e.g. file-not-found from fs.readFile).
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('PDF parsing failed', {
        filePath,
        error: error.message,
      });

      throw new AppError(
        'Failed to parse PDF. The file may be encrypted or corrupted.',
        400,
        'PDF_PARSE_ERROR',
      );
    }
  },
};

export default pdfService;
