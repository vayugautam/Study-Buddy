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

  /**
   * Check whether an error is a transient/retryable server error (503, 500, etc.).
   */
  _isRetryableError(error) {
    const msg = error.message || '';
    return (
      error.status === 503 ||
      error.status === 500 ||
      msg.includes('503') ||
      msg.includes('UNAVAILABLE') ||
      msg.includes('high demand') ||
      msg.includes('INTERNAL')
    );
  }

  /**
   * Retry an async function with exponential backoff.
   * @param {Function} fn - Async function to retry.
   * @param {number} maxRetries - Maximum number of retry attempts.
   * @param {number} baseDelayMs - Base delay in ms (doubles each attempt).
   * @param {string} context - Description for logging.
   */
  async _retryWithBackoff(fn, { maxRetries = 2, baseDelayMs = 2000, context = '' } = {}) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries && this._isRetryableError(error)) {
          const delay = baseDelayMs * Math.pow(2, attempt - 1);
          logger.warn(`Retryable error on attempt ${attempt}/${maxRetries} for ${context}. Retrying in ${delay}ms...`, {
            error: error.message,
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
    throw lastError;
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
      const results = [];
      const BATCH_SIZE = 5;
      for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (text) => {
            return this._retryWithBackoff(
              async () => {
                const response = await this.ai.models.embedContent({
                  model: 'gemini-embedding-2',
                  contents: text,
                });
                return response.embeddings[0].values;
              },
              { maxRetries: 2, baseDelayMs: 1000, context: `embedding chunk ${i}` }
            );
          }),
        );
        results.push(...batchResults);
        // Small delay between batches to avoid rate limits
        if (i + BATCH_SIZE < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
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

      // Use retry with backoff for the generateContent call to handle 503 "high demand" errors
      const response = await this._retryWithBackoff(
        () => this.ai.models.generateContent({
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
        }),
        { maxRetries: 2, baseDelayMs: 2000, context: 'Gemini PDF OCR' }
      );

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
