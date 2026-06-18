/**
 * @module services/gemini
 * @description Anti-corruption layer wrapping the new Google Gen AI SDK.
 */

import { GoogleGenAI } from '@google/genai';
import config from '../config/env.config.js';
import { GeminiApiError, LlmQuotaExceededError } from '../utils/AppError.js';
import logger from '../utils/logger.js';


class GeminiService {
  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: config.gemini.apiKey,
    });
  }

  _handleApiError(error, contextMessage) {
    if (error instanceof GeminiApiError || error instanceof LlmQuotaExceededError) {
      throw error;
    }

    const isQuotaError = 
      error.status === 429 || 
      (error.message && error.message.includes('429')) ||
      (error.message && error.message.includes('RESOURCE_EXHAUSTED'));

    if (isQuotaError) {
      logger.warn(`LLM Quota Exceeded: ${contextMessage}`, { originalError: error.message });
      throw new LlmQuotaExceededError('Google Gemini API quota exceeded. Please try again later or upgrade your plan.');
    }

    logger.error(`Gemini API failed: ${contextMessage}`, { error: error.message });
    throw new GeminiApiError(`${contextMessage}: ${error.message}`);
  }

  /* ---------------------------------------------------------------- */
  /*  Embeddings                                                      */
  /* ---------------------------------------------------------------- */

  async generateEmbeddings(texts) {
    try {
      const results = await Promise.all(
        texts.map(async (text) => {
          try {
            const response = await this.ai.models.embedContent({
              model: 'gemini-embedding-2',
              contents: text,
            });
            return response.embeddings[0].values;
          } catch (e) {
            logger.error('text-embedding-004 failed natively', { originalError: e.message });
            throw e;
          }
        }),
      );
      return results;
    } catch (error) {
      this._handleApiError(error, 'Failed to generate embeddings');
    }
  }

  /* ---------------------------------------------------------------- */
  /*  File Processing (OCR)                                           */
  /* ---------------------------------------------------------------- */

  async extractTextFromPdf(filePath) {
    let uploadResult = null;
    try {
      logger.info('Uploading PDF to Gemini for extraction...', { filePath });
      uploadResult = await this.ai.files.upload({
        file: filePath,
        mimeType: 'application/pdf',
      });

      logger.info('PDF uploaded, starting Gemini extraction...', { fileName: uploadResult.name });
      const response = await this.ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          {
            fileData: {
              fileUri: uploadResult.uri,
              mimeType: uploadResult.mimeType,
            }
          },
          { text: 'Extract all the text from this document exactly as it is written. Maintain layout, tables, and paragraphs. Do not summarize or omit anything. Just output the raw text.' }
        ]
      });

      return response.text;
    } catch (error) {
      this._handleApiError(error, 'Failed to extract text from PDF');
    } finally {
      // Always clean up the file from Google's servers
      if (uploadResult && uploadResult.name) {
        try {
          await this.ai.files.delete({ name: uploadResult.name });
          logger.info('Cleaned up PDF from Gemini servers.', { fileName: uploadResult.name });
        } catch (cleanupError) {
          logger.warn('Failed to delete PDF from Gemini servers', { error: cleanupError.message });
        }
      }
    }
  }
}

/** Singleton instance — one set of model handles for the entire process. */
export default new GeminiService();
