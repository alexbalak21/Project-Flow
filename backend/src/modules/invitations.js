import { Router } from 'express';
import { z } from 'zod';
import { query, tx } from '../db.js';
import { HttpError } from '../errors.js';
import { sha256 } from './auth/tokens.js';

const router = Router();

// The logged-in user accepts an invitation. The token must match, and so must their email.
router.post('/accept', async (req, res) => {
  const { token } = z.object({ token: z.string().min(10) }).parse(req.body);
  const inv = (await query('SELECT * FROM invitations WHERE token_hash=$1 AND accepted_at IS NULL AND expires_at > now()', [sha256(token)])).rows[0];
  if (!inv) throw new HttpError(400, 'This invitation is invalid or has expired');
  const user = (await query('SELECT email FROM users WHERE id=$1', [req.userId])).rows[0];
  if (user.email.toLowerCase() !== inv.email.toLowerCase()) throw new HttpError(403, `This invitation was sent to ${inv.email}`);
  await tx(async (db) => {
    await db.query('INSERT INTO workspace_members (workspace_id,user_id,role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [inv.workspace_id, req.userId, inv.role]);
    await db.query('UPDATE invitations SET accepted_at = now() WHERE id = $1', [inv.id]);
  });
  res.json({ workspaceId: inv.workspace_id });
});

export default router;
