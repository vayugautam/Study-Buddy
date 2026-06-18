/**
 * @module utils/logger
 * @description Lightweight structured JSON logger with production secret redaction.
 * No external dependencies.
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'secret',
  'authorization',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'cookie',
  'creditCard',
  'credit_card',
  'ssn',
]);

const isProduction = () => process.env.NODE_ENV === 'production';

/**
 * Recursively redacts values whose keys match known sensitive field names.
 * Only applied in production to keep dev/test logs fully transparent.
 * @param {*} obj - Object to redact.
 * @returns {*} A shallow-cloned object with sensitive values replaced by '[REDACTED]'.
 */
const redact = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redact);

  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key)) {
      cleaned[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = redact(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

/**
 * Builds a structured log entry and writes it to the console.
 * @param {'info'|'warn'|'error'} level - Log severity.
 * @param {string} message - Human-readable log message.
 * @param {object} [meta={}] - Optional structured metadata.
 */
const log = (level, message, meta = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(Object.keys(meta).length > 0
      ? { meta: isProduction() ? redact(meta) : meta }
      : {}),
  };

  const serialised = JSON.stringify(entry);

  switch (level) {
    case 'error':
      console.error(serialised);
      break;
    case 'warn':
      console.warn(serialised);
      break;
    default:
      console.log(serialised);
  }
};

/**
 * Structured logger instance.
 * @type {{ info: (message: string, meta?: object) => void, warn: (message: string, meta?: object) => void, error: (message: string, meta?: object) => void }}
 */
const logger = {
  /**
   * Log an informational message.
   * @param {string} message - Log message.
   * @param {object} [meta] - Additional structured data.
   */
  info: (message, meta) => log('info', message, meta),

  /**
   * Log a warning.
   * @param {string} message - Log message.
   * @param {object} [meta] - Additional structured data.
   */
  warn: (message, meta) => log('warn', message, meta),

  /**
   * Log an error.
   * @param {string} message - Log message.
   * @param {object} [meta] - Additional structured data.
   */
  error: (message, meta) => log('error', message, meta),
};

export default logger;
