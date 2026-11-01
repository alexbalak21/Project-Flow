import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query, tx } from '../../db.js';
import { config } from '../../config.js';
import { HttpError } from '../../errors.js';
import { authenticate } from '../../middleware/auth.js';
import {
  sha256, randomToken, signAccessToken, issueRefreshCookie, clearRefreshCookie, readRefreshCookie,
} from './tokens.js';

const router = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.isTest ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, try again in a few minutes' },
});

const email = z.string().trim().toLowerCase().email();
const password = z.string().min(8, 'Password must be at least 8 characters').max(128);

const publicUser = (u) => ({
  id: u.id, firstName: u.first_name, lastName: u.last_name, email: u.email,
  emailVerified: !!u.email_verified_at,
});

async function workspacesFor(userId) {
  const { rows } = await query(
    `SELECT w.id, w.name, m.role FROM workspace_members m
     JOIN workspaces w ON w.id = m.workspace_id
     WHERE m.user_id = $1 ORDER BY w.created_at`,
    [userId],
  );
  return rows;
}

async function session(res, user) {
  await issueRefreshCookie(res, user.id);
  return { accessToken: signAccessToken(user.id), user: publicUser(user), workspaces: await workspacesFor(user.id) };
}

async function createEmailToken(db, userId, type, hours) {
  const token = randomToken();
  await db.query(
    "INSERT INTO email_tokens (user_id, type, token_hash, expires_at) VALUES ($1,$2,$3, now() + ($4 || ' hours')::interval)",
    [userId, type, sha256(token), String(hours)],
  );
  return token;
}

// No mail provider yet: links are logged so the flow can be tested locally.
const sendMail = (to, subject, link) => { if (!config.isTest) console.log(`[mail] to=${to} subject="${subject}" link=${link}`); };

router.post('/register', limiter, async (req, res) => {
  const body = z.object({
    firstName: z.string().trim().min(1).max(60),
    lastName: z.string().trim().min(1).max(60),
    email, password,
    workspaceName: z.string().trim().min(1).max(80).optional(),
  }).parse(req.body);

  const { user, verifyToken } = await tx(async (db) => {
    const exists = await db.query('SELECT 1 FROM users WHERE lower(email) = $1', [body.email]);
    if (exists.rowCount) throw new HttpError(409, 'An account with this email already exists');
    const hash = await bcrypt.hash(body.password, 12);
    const u = (await db.query(
      'INSERT INTO users (first_name,last_name,email,password_hash) VALUES ($1,$2,$3,$4) RETURNING *',
      [body.firstName, body.lastName, body.email, hash],
    )).rows[0];
    const ws = (await db.query(
      'INSERT INTO workspaces (name, owner_id) VALUES ($1,$2) RETURNING id',
      [body.workspaceName || `${body.firstName}'s workspace`, u.id],
    )).rows[0];
    await db.query("INSERT INTO workspace_members (workspace_id,user_id,role) VALUES ($1,$2,'OWNER')", [ws.id, u.id]);
    return { user: u, verifyToken: await createEmailToken(db, u.id, 'VERIFY_EMAIL', 48) };
  });

  sendMail(user.email, 'Verify your email', `${config.clientOrigin}/verify-email?token=${verifyToken}`);
  res.status(201).json(await session(res, user));
});

router.post('/login', limiter, async (req, res) => {
  const body = z.object({ email, password: z.string().min(1) }).parse(req.body);
  const user = (await query('SELECT * FROM users WHERE lower(email) = $1', [body.email])).rows[0];
  // Compare against a hash even when the user is unknown, to keep timing similar.
  const ok = await bcrypt.compare(body.password, user?.password_hash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi');
  if (!user || !ok) throw new HttpError(401, 'Incorrect email or password');
  if (config.requireEmailVerification && !user.email_verified_at) {
    throw new HttpError(403, 'Verify your email before logging in');
  }
  res.json(await session(res, user));
});

// Rotating refresh tokens. Presenting an already-revoked token revokes the whole family (theft signal).
router.post('/refresh', async (req, res) => {
  const token = readRefreshCookie(req);
  if (!token) throw new HttpError(401, 'No refresh token');
  const row = (await query('SELECT * FROM refresh_tokens WHERE token_hash = $1', [sha256(token)])).rows[0];
  if (!row) { clearRefreshCookie(res); throw new HttpError(401, 'Invalid refresh token'); }
  if (row.revoked_at) {
    await query('UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [row.user_id]);
    clearRefreshCookie(res);
    throw new HttpError(401, 'Refresh token was already used');
  }
  if (new Date(row.expires_at) < new Date()) { clearRefreshCookie(res); throw new HttpError(401, 'Refresh token expired'); }
  await query('UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1', [row.id]);
  const user = (await query('SELECT * FROM users WHERE id = $1', [row.user_id])).rows[0];
  res.json(await session(res, user));
});

router.post('/logout', async (req, res) => {
  const token = readRefreshCookie(req);
  if (token) await query('UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL', [sha256(token)]);
  clearRefreshCookie(res);
  res.status(204).end();
});

router.get('/me', authenticate, async (req, res) => {
  const user = (await query('SELECT * FROM users WHERE id = $1', [req.userId])).rows[0];
  if (!user) throw new HttpError(401, 'Account no longer exists');
  res.json({ user: publicUser(user), workspaces: await workspacesFor(user.id) });
});

router.post('/verify-email', async (req, res) => {
  const { token } = z.object({ token: z.string().min(10) }).parse(req.body);
  const row = (await query(
    "SELECT * FROM email_tokens WHERE token_hash=$1 AND type='VERIFY_EMAIL' AND used_at IS NULL AND expires_at > now()",
    [sha256(token)],
  )).rows[0];
  if (!row) throw new HttpError(400, 'This verification link is invalid or has expired');
  await tx(async (db) => {
    await db.query('UPDATE email_tokens SET used_at = now() WHERE id = $1', [row.id]);
    await db.query('UPDATE users SET email_verified_at = now() WHERE id = $1', [row.user_id]);
  });
  res.json({ ok: true });
});

// Always answers 202 so the endpoint cannot be used to discover which emails have accounts.
router.post('/forgot-password', limiter, async (req, res) => {
  const body = z.object({ email }).parse(req.body);
  const user = (await query('SELECT * FROM users WHERE lower(email) = $1', [body.email])).rows[0];
  if (user) {
    const token = await createEmailToken({ query }, user.id, 'RESET_PASSWORD', 1);
    sendMail(user.email, 'Reset your password', `${config.clientOrigin}/reset-password?token=${token}`);
  }
  res.status(202).json({ ok: true });
});

router.post('/reset-password', limiter, async (req, res) => {
  const body = z.object({ token: z.string().min(10), password }).parse(req.body);
  const row = (await query(
    "SELECT * FROM email_tokens WHERE token_hash=$1 AND type='RESET_PASSWORD' AND used_at IS NULL AND expires_at > now()",
    [sha256(body.token)],
  )).rows[0];
  if (!row) throw new HttpError(400, 'This reset link is invalid or has expired');
  const hash = await bcrypt.hash(body.password, 12);
  await tx(async (db) => {
    await db.query('UPDATE email_tokens SET used_at = now() WHERE id = $1', [row.id]);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, row.user_id]);
    await db.query('UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [row.user_id]);
  });
  res.json({ ok: true });
});

export default router;
