import { ZodError } from 'zod';
import { ValidationError } from '../utils/AppError.js';

/**
 * Creates an Express middleware that validates `req.body`, `req.query`, and
 * `req.params` against the supplied Zod schema.
 *
 * The schema should expect an object shaped as:
 * ```
 * { body: { ... }, query: { ... }, params: { ... } }
 * ```
 *
 * On validation failure a {@link ValidationError} is thrown containing an
 * array of human-readable detail strings, one per Zod issue.
 *
 * @param {import('zod').ZodSchema} schema - A Zod schema to validate against.
 * @returns {import('express').RequestHandler} Express middleware function.
 *
 * @example
 * import { z } from 'zod';
 * import { validate } from '../middlewares/validate.middleware.js';
 *
 * const createNoteSchema = z.object({
 *   body: z.object({ title: z.string().min(1) }),
 *   query: z.object({}).optional(),
 *   params: z.object({}).optional(),
 * });
 *
 * router.post('/notes', validate(createNoteSchema), createNote);
 */
export const validate = (schema) => (req, _res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.errors.map(
        (e) => `${e.path.join('.')}: ${e.message}`
      );
      throw new ValidationError(details);
    }
    next(err);
  }
};
