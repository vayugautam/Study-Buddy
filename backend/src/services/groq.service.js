import Groq from 'groq-sdk';
import config from '../config/env.config.js';
import { LlmQuotaExceededError, AppError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

class GroqApiError extends AppError {
  constructor(message) {
    super(message, 502, 'GROQ_UPSTREAM_FAIL');
  }
}

class GroqService {
  constructor() {
    this.groq = new Groq({
      apiKey: config.groq.apiKey || 'missing-key',
    });
  }

  _handleApiError(error, contextMessage) {
    if (error instanceof GroqApiError || error instanceof LlmQuotaExceededError) {
      throw error;
    }

    const isQuotaError =
      error.status === 429 ||
      (error.message && error.message.includes('429')) ||
      (error.error && error.error.error && error.error.error.code === 'rate_limit_exceeded');

    if (isQuotaError) {
      logger.warn(`Groq Quota Exceeded: ${contextMessage}`, { originalError: error.message });
      throw new LlmQuotaExceededError('Groq API quota exceeded. Please wait a minute and try again.');
    }

    logger.error(`Groq API failed: ${contextMessage}`, { error: error.message });
    throw new GroqApiError(`${contextMessage}: ${error.message}`);
  }

  async generateChatResponse(systemPrompt, chatHistory, userQuery) {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.map((msg) => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        })),
        { role: 'user', content: userQuery },
      ];

      const response = await this.groq.chat.completions.create({
        messages,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 800,
      });

      return response.choices[0].message.content;
    } catch (error) {
      this._handleApiError(error, 'Failed to generate chat response');
    }
  }

  async generateStructuredData(systemPrompt, context) {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `CONTEXT:\n${context}` },
      ];

      const response = await this.groq.chat.completions.create({
        messages,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      // Groq might throw a parsing error if JSON is malformed, but JSON mode usually prevents it.
      if (error instanceof SyntaxError) {
        logger.error('JSON parse failed for Groq output', { error: error.message });
        throw new GroqApiError('Groq returned invalid JSON.');
      }
      this._handleApiError(error, 'Failed to generate structured data');
    }
  }
}

export default new GroqService();
