import { Router } from 'express';
import { z } from 'zod';
import { query, tx } from '../../db.js';
import { requireRole, workspaceScope } from '../../middleware/auth.js';

const router = Router();
const name = z.string().trim().min(1).max(80);

// Workspaces the current user belongs to (no X-Workspace-Id needed).
router.get('/', async (req, res) => {
  const { rows } = await query(
    `SELECT w.id, w.name, m.role, w.created_at AS "createdAt" FROM workspace_members m
     JOIN workspaces w ON w.id = m.workspace_id WHERE m.user_id = $1 ORDER BY w.created_at`,
    [req.userId],
  );
  res.status(200).json(rows);
});

router.post('/', async (req, res) => {
  const { name: wsName } = z.object({ name }).parse(req.body);
  const ws = await tx(async (db) => {
    const w = (await db.query('INSERT INTO workspaces (name, owner_id) VALUES ($1,$2) RETURNING id, name', [wsName, req.userId])).rows[0];
    await db.query("INSERT INTO workspace_members (workspace_id,user_id,role) VALUES ($1,$2,'OWNER')", [w.id, req.userId]);
    return { ...w, role: 'OWNER' };
  });
  res.status(201).json(ws);
});

router.get('/current', workspaceScope, async (req, res) => {
  const w = (await query('SELECT id, name, owner_id AS "ownerId", created_at AS "createdAt" FROM workspaces WHERE id = $1', [req.workspaceId])).rows[0];
  res.json({ ...w, role: req.role });
});

router.patch('/current', workspaceScope, requireRole('OWNER', 'ADMIN'), async (req, res) => {
  const body = z.object({ name }).parse(req.body);
  const w = (await query('UPDATE workspaces SET name = $1 WHERE id = $2 RETURNING id, name', [body.name, req.workspaceId])).rows[0];
  res.json(w);
});

export default router;
