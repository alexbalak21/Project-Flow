import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../../config.js';
import { query } from '../../db.js';

export const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
export const randomToken = () => crypto.randomBytes(32).toString('base64url');

export const signAccessToken = (userId) =>
  jwt.sign({}, config.jwtSecret, { subject: userId, expiresIn: config.accessTtl });

const REFRESH_COOKIE = 'pf_refresh';
const cookieOpts = () => ({
  httpOnly: true,
  secure: config.isProd,
  sameSite: 'lax',
  path: '/api/auth',
  maxAge: config.refreshDays * 24 * 60 * 60 * 1000,
});

/** Creates a refresh token row and sets the httpOnly cookie. */
export async function issueRefreshCookie(res, userId, db = { query }) {
  const token = randomToken();
  await db.query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, now() + ($3 || ' days')::interval)",
    [userId, sha256(token), String(config.refreshDays)],
  );
  res.cookie(REFRESH_COOKIE, token, cookieOpts());
}

export const clearRefreshCookie = (res) => res.clearCookie(REFRESH_COOKIE, { ...cookieOpts(), maxAge: undefined });
export const readRefreshCookie = (req) => req.cookies?.[REFRESH_COOKIE];
