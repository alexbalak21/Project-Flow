import { Router } from 'express';
import { z } from 'zod';
import { query, tx } from '../../db.js';
import { config } from '../../config.js';
import { HttpError } from '../../errors.js';
import { requireRole } from '../../middleware/auth.js';
import { randomToken, sha256 } from '../auth/tokens.js';

const router = Router();
const ROLES = ['ADMIN', 'MANAGER', 'MEMBER']; // OWNER is assigned only at workspace creation
const adminOnly = requireRole('OWNER', 'ADMIN');

// Members + pending invitations, all filtered by the scoped workspace.
router.get('/', async (req, res) => {
  const members = (await query(
    `SELECT u.id, u.first_name AS "firstName", u.last_name AS "lastName", u.email, m.role, 'ACTIVE' AS status,
       (SELECT count(*)::int FROM tasks t JOIN projects p ON p.id = t.project_id
         WHERE p.workspace_id = m.workspace_id AND t.assignee_id = u.id AND t.status <> 'DONE') AS "openTasks"
     FROM workspace_members m JOIN users u ON u.id = m.user_id
     WHERE m.workspace_id = $1 ORDER BY m.joined_at`,
    [req.workspaceId],
  )).rows;
  const invited = (await query(
    `SELECT id, email, role, 'INVITED' AS status, 0 AS "openTasks" FROM invitations
     WHERE workspace_id = $1 AND accepted_at IS NULL AND expires_at > now() ORDER BY created_at`,
    [req.workspaceId],
  )).rows;
  res.json([...members, ...invited]);
});

router.post('/invite', adminOnly, async (req, res) => {
  const body = z.object({ email: z.string().trim().toLowerCase().email(), role: z.enum(ROLES).default('MEMBER') }).parse(req.body);
  if (req.role !== 'OWNER' && body.role === 'ADMIN') throw new HttpError(403, 'Only the owner can invite admins');
  const already = await query(
    `SELECT 1 FROM workspace_members m JOIN users u ON u.id = m.user_id WHERE m.workspace_id = $1 AND lower(u.email) = $2`,
    [req.workspaceId, body.email],
  );
  if (already.rowCount) throw new HttpError(409, 'This person is already a member');
  const token = randomToken();
  const inv = (await query(
    `INSERT INTO invitations (workspace_id, email, role, token_hash, invited_by, expires_at)
     VALUES ($1,$2,$3,$4,$5, now() + interval '7 days') RETURNING id, email, role`,
    [req.workspaceId, body.email, body.role, sha256(token), req.userId],
  )).rows[0];
  if (!config.isTest) console.log(`[mail] invitation to=${body.email} link=${config.clientOrigin}/invite?token=${token}`);
  res.status(201).json({ ...inv, status: 'INVITED', openTasks: 0, ...(config.isTest ? { _token: token } : {}) });
});

router.patch('/:id/role', adminOnly, async (req, res) => {
  const { role } = z.object({ role: z.enum(ROLES) }).parse(req.body);
  const target = (await query('SELECT role FROM workspace_members WHERE workspace_id=$1 AND user_id=$2', [req.workspaceId, req.params.id])).rows[0];
  if (!target) throw new HttpError(404, 'Member not found');
  if (target.role === 'OWNER') throw new HttpError(400, "The owner's role cannot be changed");
  if (req.role !== 'OWNER' && (role === 'ADMIN' || target.role === 'ADMIN')) throw new HttpError(403, 'Only the owner can change admin roles');
  await query('UPDATE workspace_members SET role=$1 WHERE workspace_id=$2 AND user_id=$3', [role, req.workspaceId, req.params.id]);
  res.json({ id: req.params.id, role });
});

router.delete('/:id', adminOnly, async (req, res) => {
  const target = (await query('SELECT role FROM workspace_members WHERE workspace_id=$1 AND user_id=$2', [req.workspaceId, req.params.id])).rows[0];
  if (target) {
    if (target.role === 'OWNER') throw new HttpError(400, 'The owner cannot be removed');
    if (req.role !== 'OWNER' && target.role === 'ADMIN') throw new HttpError(403, 'Only the owner can remove admins');
    await tx(async (db) => {
      await db.query('DELETE FROM workspace_members WHERE workspace_id=$1 AND user_id=$2', [req.workspaceId, req.params.id]);
      await db.query('UPDATE tasks SET assignee_id = NULL WHERE assignee_id = $1 AND project_id IN (SELECT id FROM projects WHERE workspace_id = $2)', [req.params.id, req.workspaceId]);
    });
  } else {
    // Not a member: it may be a pending invitation being revoked.
    const del = await query('DELETE FROM invitations WHERE id=$1 AND workspace_id=$2 AND accepted_at IS NULL', [req.params.id, req.workspaceId]);
    if (!del.rowCount) throw new HttpError(404, 'Member not found');
  }
  res.status(204).end();
});

export default router;
