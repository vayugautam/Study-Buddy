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

  _isRetryableError(error) {
    const msg = (error?.message || '').toLowerCase();
    const code = error?.error?.error?.code || error?.code || '';
    // 404 (model_not_found) is NOT retryable — skip it so we don't loop
    if (error.status === 404 || (error?.error?.error?.code === 'model_not_found')) return false;
    return (
      error.status === 503 ||
      error.status === 429 ||
      error.status === 500 ||
      msg.includes('503') ||
      msg.includes('429') ||
      msg.includes('overloaded') ||
      msg.includes('rate_limit_exceeded') ||
      msg.includes('service unavailable') ||
      msg.includes('high demand') ||
      msg.includes('resource_exhausted') ||
      code === 'rate_limit_exceeded'
    );
  }

  _handleApiError(error, contextMessage) {
    if (error instanceof GroqApiError || error instanceof LlmQuotaExceededError) {
      throw error;
    }

    const isQuotaError =
      error?.status === 429 ||
      (error?.message && error.message.includes('429')) ||
      (error?.error?.error && error.error.error.code === 'rate_limit_exceeded');

    if (isQuotaError) {
      logger.warn(`Groq Quota Exceeded: ${contextMessage}`, { originalError: error?.message });
      throw new LlmQuotaExceededError('Groq API quota exceeded. Please wait a minute and try again.');
    }

    logger.error(`Groq API failed: ${contextMessage}`, { error: error?.message });
    throw new GroqApiError(`${contextMessage}: ${error?.message || 'Upstream provider error'}`);
  }

  async _executeWithFallback(apiFn, contextMessage, models = ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'llama3-8b-8192']) {
    let lastError;

    for (const model of models) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          return await apiFn(model);
        } catch (error) {
          lastError = error;
          const isRetryable = this._isRetryableError(error);

          logger.warn(`Groq request failed with model "${model}" (attempt ${attempt}/2): ${error.message}`);

          if (isRetryable && attempt < 2) {
            await new Promise((res) => setTimeout(res, 1200));
            continue;
          }

          break;
        }
      }
    }

    this._handleApiError(lastError, contextMessage);
  }

  async generateChatResponse(systemPrompt, chatHistory, userQuery) {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.map((msg) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
      { role: 'user', content: userQuery },
    ];

    return this._executeWithFallback(async (model) => {
      const response = await this.groq.chat.completions.create({
        messages,
        model,
        temperature: 0.2,
        max_tokens: 800,
      });

      return response.choices[0].message.content;
    }, 'Failed to generate chat response');
  }

  async generateStructuredData(systemPrompt, context) {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `CONTEXT:\n${context}` },
    ];

    return this._executeWithFallback(async (model) => {
      const response = await this.groq.chat.completions.create({
        messages,
        model,
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      try {
        return JSON.parse(response.choices[0].message.content);
      } catch (parseError) {
        logger.error('JSON parse failed for Groq output', { error: parseError.message });
        throw new GroqApiError('Groq returned invalid JSON.');
      }
    }, 'Failed to generate structured data');
  }
}

export default new GroqService();
