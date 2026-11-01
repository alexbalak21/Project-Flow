import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { HttpError } from '../errors.js';
import { query } from '../db.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Verifies the Bearer access token and sets req.userId. */
export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Missing access token');
  try {
    req.userId = jwt.verify(token, config.jwtSecret).sub;
  } catch {
    throw new HttpError(401, 'Invalid or expired access token');
  }
  next();
}

/**
 * Tenant scoping. Reads X-Workspace-Id, checks the user belongs to it, and sets
 * req.workspaceId + req.role. Every workspace-owned query must filter on req.workspaceId.
 */
export async function workspaceScope(req, res, next) {
  const id = req.headers['x-workspace-id'];
  if (!id || !UUID.test(id)) throw new HttpError(400, 'X-Workspace-Id header is required');
  const { rows } = await query(
    'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [id, req.userId],
  );
  if (!rows[0]) throw new HttpError(403, 'You are not a member of this workspace');
  req.workspaceId = id;
  req.role = rows[0].role;
  next();
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.role)) throw new HttpError(403, 'You do not have permission to do this');
  next();
};
