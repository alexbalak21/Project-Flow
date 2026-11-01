import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db.js';

const app = createApp();
const run = Date.now();
const mail = (n) => `${n}-${run}@test.io`;
const pw = 'password1234';

const register = (n, extra = {}) =>
  request(app).post('/api/auth/register').send({ firstName: n, lastName: 'Test', email: mail(n), password: pw, ...extra });

afterAll(async () => {
  await pool.query("DELETE FROM workspaces WHERE owner_id IN (SELECT id FROM users WHERE email LIKE $1)", [`%-${run}@test.io`]);
  await pool.query('DELETE FROM users WHERE email LIKE $1', [`%-${run}@test.io`]);
  await pool.end();
});

describe('auth', () => {
  it('registers, creates an owned workspace and sets a refresh cookie', async () => {
    const res = await register('ann');
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.workspaces[0].role).toBe('OWNER');
    expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/i);
  });

  it('rejects duplicate emails and weak passwords', async () => {
    expect((await register('ann')).status).toBe(409);
    const weak = await request(app).post('/api/auth/register').send({ firstName: 'x', lastName: 'y', email: mail('weak'), password: 'short' });
    expect(weak.status).toBe(400);
  });

  it('logs in and rejects a wrong password', async () => {
    expect((await request(app).post('/api/auth/login').send({ email: mail('ann'), password: pw })).status).toBe(200);
    expect((await request(app).post('/api/auth/login').send({ email: mail('ann'), password: 'wrong-password' })).status).toBe(401);
  });

  it('rotates refresh tokens and detects reuse', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: mail('ann'), password: pw });
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    const ok = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(ok.status).toBe(200);
    expect(ok.body.accessToken).toBeTruthy();
    // The old token is now revoked: replaying it must fail.
    expect((await request(app).post('/api/auth/refresh').set('Cookie', cookie)).status).toBe(401);
  });

  it('protects /me', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    const { body } = await request(app).post('/api/auth/login').send({ email: mail('ann'), password: pw });
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(mail('ann'));
  });
});

describe('workspace scoping and roles', () => {
  it('blocks access to another workspace and enforces roles', async () => {
    const a = (await register('bob', { workspaceName: 'Bob Co' })).body;
    const b = (await register('cara', { workspaceName: 'Cara Co' })).body;
    const auth = (u) => ({ Authorization: `Bearer ${u.accessToken}`, 'X-Workspace-Id': a.workspaces[0].id });

    // Cara is not in Bob's workspace.
    expect((await request(app).get('/api/members').set(auth(b))).status).toBe(403);
    // Missing header.
    expect((await request(app).get('/api/members').set('Authorization', `Bearer ${a.accessToken}`)).status).toBe(400);
    // Owner sees themselves.
    const list = await request(app).get('/api/members').set(auth(a));
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);

    // Invite, accept and role checks.
    const inv = await request(app).post('/api/members/invite').set(auth(a)).send({ email: mail('cara'), role: 'MEMBER' });
    expect(inv.status).toBe(201);
    const accept = await request(app).post('/api/invitations/accept').set('Authorization', `Bearer ${b.accessToken}`).send({ token: inv.body._token });
    expect(accept.status).toBe(200);

    // Cara is now a MEMBER there: can read, cannot invite.
    expect((await request(app).get('/api/members').set(auth(b))).body).toHaveLength(2);
    expect((await request(app).post('/api/members/invite').set(auth(b)).send({ email: mail('zed') })).status).toBe(403);
  });
});
