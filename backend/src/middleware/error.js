import { ZodError } from 'zod';
import { HttpError } from '../errors.js';
import { config } from '../config.js';

export function notFound(req, res) {
  res.status(404).json({ error: `No route: ${req.method} ${req.path}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err.code === '23505') return res.status(409).json({ error: 'Already exists' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  if (!config.isTest) console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
