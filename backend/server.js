// ProjectFlow dummy API: Express + in-memory data. NOT for production (no real security, no persistence).
const express = require('express');
const cors = require('cors');
const db = require('./data');
const { id, now } = db;

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const PROJECT_STATUSES = ['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'];
const ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER'];

const pub = ({ password, ...u }) => u;
const err = (res, code, message) => res.status(code).json({ error: message });
const log = (userId, text) => db.activity.unshift({ id: id(), userId, text, createdAt: now() });
const name = (uid) => (db.users.find((u) => u.id === uid)?.firstName) || 'Someone';

// ---- dummy auth: opaque random tokens kept in memory, no JWT ----
const issue = (user) => {
  const accessToken = 'dummy-access-' + id();
  const refreshToken = 'dummy-refresh-' + id();
  db.sessions.set(accessToken, user.id);
  db.sessions.set(refreshToken, user.id);
  return { accessToken, refreshToken, expiresIn: 3600, user: pub(user) };
};
const auth = (req, res, next) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const user = db.users.find((u) => u.id === db.sessions.get(token));
  if (!user) return err(res, 401, 'Missing or invalid token');
  req.user = user;
  next();
};
const requireRole = (...roles) => (req, res, next) => roles.includes(req.user.role) ? next() : err(res, 403, 'Insufficient role');

const A = express.Router();
A.post('/register', (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  if (!firstName || !email || !password || password.length < 8) return err(res, 400, 'firstName, email and password (min 8 chars) are required');
  if (db.users.some((u) => u.email === email)) return err(res, 409, 'Email already registered');
  const user = { id: id(), firstName, lastName: lastName || '', email, password, role: 'MEMBER', status: 'ACTIVE', emailVerified: false, createdAt: now() };
  db.users.push(user);
  db.workspaceMembers.push({ workspaceId: 'w1', userId: user.id, role: 'MEMBER' });
  res.status(201).json(issue(user));
});
A.post('/login', (req, res) => {
  const user = db.users.find((u) => u.email === req.body.email && u.password === req.body.password);
  return user ? res.json(issue(user)) : err(res, 401, 'Invalid email or password');
});
A.post('/refresh', (req, res) => {
  const user = db.users.find((u) => u.id === db.sessions.get(req.body.refreshToken));
  return user ? res.json(issue(user)) : err(res, 401, 'Invalid refresh token');
});
A.post('/logout', auth, (req, res) => res.status(204).end());
A.post('/forgot-password', (req, res) => res.json({ message: 'If that email exists, a reset link was sent (dummy).' }));
A.post('/reset-password', (req, res) => res.json({ message: 'Password reset (dummy).' }));
A.post('/verify-email', (req, res) => res.json({ message: 'Email verified (dummy).' }));
A.get('/me', auth, (req, res) => res.json(pub(req.user)));
app.use('/api/auth', A);

// everything below needs a token
app.use('/api', auth);

// ---- workspaces ----
app.get('/api/workspaces', (req, res) => res.json(db.workspaces));
app.get('/api/workspaces/:id', (req, res) => db.workspaces.find((w) => w.id === req.params.id) ? res.json(db.workspaces.find((w) => w.id === req.params.id)) : err(res, 404, 'Workspace not found'));
app.post('/api/workspaces', (req, res) => {
  if (!req.body.name) return err(res, 400, 'name is required');
  const w = { id: id(), name: req.body.name, ownerId: req.user.id, plan: 'FREE', createdAt: now() };
  db.workspaces.push(w);
  res.status(201).json(w);
});
app.patch('/api/workspaces/:id', requireRole('OWNER', 'ADMIN'), (req, res) => {
  const w = db.workspaces.find((x) => x.id === req.params.id);
  if (!w) return err(res, 404, 'Workspace not found');
  if (req.body.name) w.name = req.body.name;
  res.json(w);
});

// ---- team / members ----
app.get('/api/members', (req, res) => res.json(db.users.map((u) => ({ ...pub(u), openTasks: db.tasks.filter((t) => t.assigneeId === u.id && t.status !== 'DONE').length }))));
app.post('/api/members/invite', requireRole('OWNER', 'ADMIN'), (req, res) => {
  const { email, role = 'MEMBER' } = req.body;
  if (!email || !ROLES.includes(role)) return err(res, 400, 'Valid email and role are required');
  if (db.users.some((u) => u.email === email)) return err(res, 409, 'Already a member');
  const u = { id: id(), firstName: email.split('@')[0], lastName: '', email, password: 'password1234', role, status: 'INVITED', emailVerified: false, createdAt: now() };
  db.users.push(u);
  log(req.user.id, `${name(req.user.id)} invited ${email}`);
  res.status(201).json(pub(u));
});
app.patch('/api/members/:id/role', requireRole('OWNER', 'ADMIN'), (req, res) => {
  const u = db.users.find((x) => x.id === req.params.id);
  if (!u) return err(res, 404, 'Member not found');
  if (!ROLES.includes(req.body.role)) return err(res, 400, 'Invalid role');
  u.role = req.body.role;
  res.json(pub(u));
});
app.delete('/api/members/:id', requireRole('OWNER', 'ADMIN'), (req, res) => {
  const i = db.users.findIndex((x) => x.id === req.params.id);
  if (i < 0) return err(res, 404, 'Member not found');
  if (db.users[i].role === 'OWNER') return err(res, 400, 'The owner cannot be removed');
  db.users.splice(i, 1);
  res.status(204).end();
});

// ---- projects ----
const withProgress = (p) => {
  const ts = db.tasks.filter((t) => t.projectId === p.id);
  return { ...p, taskCount: ts.length, doneCount: ts.filter((t) => t.status === 'DONE').length };
};
app.get('/api/projects', (req, res) => res.json(db.projects.filter((p) => !req.query.status || p.status === req.query.status).map(withProgress)));
app.get('/api/projects/:id', (req, res) => {
  const p = db.projects.find((x) => x.id === req.params.id);
  return p ? res.json(withProgress(p)) : err(res, 404, 'Project not found');
});
app.post('/api/projects', requireRole('OWNER', 'ADMIN', 'MANAGER'), (req, res) => {
  if (!req.body.name) return err(res, 400, 'name is required');
  const p = { id: id(), workspaceId: 'w1', name: req.body.name, description: req.body.description || '', status: 'PLANNED', startDate: req.body.startDate || null, endDate: req.body.endDate || null, memberIds: [req.user.id] };
  db.projects.push(p);
  log(req.user.id, `${name(req.user.id)} created project ${p.name}`);
  res.status(201).json(withProgress(p));
});
app.patch('/api/projects/:id', requireRole('OWNER', 'ADMIN', 'MANAGER'), (req, res) => {
  const p = db.projects.find((x) => x.id === req.params.id);
  if (!p) return err(res, 404, 'Project not found');
  if (req.body.status && !PROJECT_STATUSES.includes(req.body.status)) return err(res, 400, 'Invalid status');
  const changed = req.body.status && req.body.status !== p.status;
  ['name', 'description', 'status', 'startDate', 'endDate', 'memberIds'].forEach((k) => req.body[k] !== undefined && (p[k] = req.body[k]));
  if (changed) db.notifications.unshift({ id: id(), userId: req.user.id, type: 'PROJECT_STATUS_CHANGED', text: `"${p.name}" is now ${p.status}`, read: false, createdAt: now() });
  res.json(withProgress(p));
});
app.delete('/api/projects/:id', requireRole('OWNER', 'ADMIN'), (req, res) => {
  const i = db.projects.findIndex((x) => x.id === req.params.id);
  if (i < 0) return err(res, 404, 'Project not found');
  db.projects.splice(i, 1);
  res.status(204).end();
});

// ---- tasks (supports ?projectId=&status=&priority=&assigneeId=&q=) ----
const findTask = (req, res) => db.tasks.find((t) => t.id === req.params.id) || (err(res, 404, 'Task not found'), null);
app.get('/api/tasks', (req, res) => {
  const { projectId, status, priority, assigneeId, q } = req.query;
  res.json(db.tasks.filter((t) => (!projectId || t.projectId === projectId) && (!status || t.status === status) && (!priority || t.priority === priority)
    && (!assigneeId || t.assigneeId === assigneeId) && (!q || t.title.toLowerCase().includes(String(q).toLowerCase()))));
});
app.get('/api/tasks/:id', (req, res) => {
  const t = findTask(req, res);
  if (t) res.json({ ...t, comments: db.comments.filter((c) => c.taskId === t.id), timeEntries: db.timeEntries.filter((e) => e.taskId === t.id) });
});
app.post('/api/tasks', (req, res) => {
  const { projectId, title, priority = 'MEDIUM', status = 'TODO' } = req.body;
  if (!projectId || !title) return err(res, 400, 'projectId and title are required');
  if (!PRIORITIES.includes(priority) || !STATUSES.includes(status)) return err(res, 400, 'Invalid status or priority');
  const t = { id: id(), projectId, title, description: req.body.description || '', status, priority, assigneeId: req.body.assigneeId || null, dueDate: req.body.dueDate || null, estimateHours: req.body.estimateHours || 0, checklist: [], createdAt: now(), updatedAt: now() };
  db.tasks.push(t);
  log(req.user.id, `${name(req.user.id)} created task ${t.title}`);
  if (t.assigneeId && t.assigneeId !== req.user.id) db.notifications.unshift({ id: id(), userId: t.assigneeId, type: 'TASK_ASSIGNED', text: `${name(req.user.id)} assigned you "${t.title}"`, read: false, createdAt: now() });
  res.status(201).json(t);
});
app.patch('/api/tasks/:id', (req, res) => {
  const t = findTask(req, res);
  if (!t) return;
  if (req.body.status && !STATUSES.includes(req.body.status)) return err(res, 400, 'Invalid status');
  if (req.body.priority && !PRIORITIES.includes(req.body.priority)) return err(res, 400, 'Invalid priority');
  const prev = t.status;
  ['title', 'description', 'status', 'priority', 'assigneeId', 'dueDate', 'estimateHours', 'checklist'].forEach((k) => req.body[k] !== undefined && (t[k] = req.body[k]));
  t.updatedAt = now();
  if (t.status !== prev) log(req.user.id, `${name(req.user.id)} moved ${t.title} to ${t.status}`);
  res.json(t);
});
app.delete('/api/tasks/:id', (req, res) => {
  const i = db.tasks.findIndex((t) => t.id === req.params.id);
  if (i < 0) return err(res, 404, 'Task not found');
  db.tasks.splice(i, 1);
  res.status(204).end();
});

// ---- comments ----
app.get('/api/tasks/:id/comments', (req, res) => res.json(db.comments.filter((c) => c.taskId === req.params.id)));
app.post('/api/tasks/:id/comments', (req, res) => {
  if (!req.body.text) return err(res, 400, 'text is required');
  const c = { id: id(), taskId: req.params.id, authorId: req.user.id, text: req.body.text, createdAt: now() };
  db.comments.push(c);
  res.status(201).json(c);
});

// ---- time tracking ----
app.get('/api/time-entries', (req, res) => res.json(db.timeEntries.filter((e) => (!req.query.taskId || e.taskId === req.query.taskId))));
app.post('/api/time-entries', (req, res) => {
  const { taskId, minutes, note = '' } = req.body;
  if (!taskId || !(minutes > 0)) return err(res, 400, 'taskId and minutes (> 0) are required');
  const e = { id: id(), taskId, userId: req.user.id, minutes, note, date: new Date().toISOString().slice(0, 10) };
  db.timeEntries.push(e);
  res.status(201).json(e);
});

// ---- notifications & activity ----
app.get('/api/notifications', (req, res) => res.json(db.notifications.filter((n) => n.userId === req.user.id)));
app.post('/api/notifications/read-all', (req, res) => { db.notifications.filter((n) => n.userId === req.user.id).forEach((n) => (n.read = true)); res.status(204).end(); });
app.get('/api/activity', (req, res) => res.json(db.activity.slice(0, Number(req.query.limit) || 20)));

// ---- dashboard + reports ----
app.get('/api/dashboard', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const open = db.tasks.filter((t) => t.status !== 'DONE');
  res.json({
    metrics: { activeProjects: db.projects.filter((p) => p.status === 'ACTIVE').length, openTasks: open.length, completedTasks: db.tasks.length - open.length, overdueTasks: open.filter((t) => t.dueDate && t.dueDate < today).length },
    tasksPerStatus: STATUSES.map((s) => ({ status: s, count: db.tasks.filter((t) => t.status === s).length })),
    productivity: db.users.filter((u) => u.status === 'ACTIVE').map((u) => ({ userId: u.id, name: u.firstName, done: db.tasks.filter((t) => t.assigneeId === u.id && t.status === 'DONE').length })),
    dueSoon: open.filter((t) => t.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5),
  });
});
app.get('/api/reports/projects', (req, res) => res.json(db.projects.map((p) => ({ ...withProgress(p), loggedMinutes: db.timeEntries.filter((e) => db.tasks.find((t) => t.id === e.taskId)?.projectId === p.id).reduce((s, e) => s + e.minutes, 0) }))));

// ---- subscription (dummy billing) ----
const PLANS = [{ id: 'FREE', price: 0, limits: { workspaces: 1, projects: 3, users: 5 } }, { id: 'PRO', price: 12 }, { id: 'BUSINESS', price: 49 }];
app.get('/api/plans', (req, res) => res.json(PLANS));
app.post('/api/subscription', requireRole('OWNER'), (req, res) => {
  const plan = PLANS.find((p) => p.id === req.body.plan);
  if (!plan) return err(res, 400, 'Unknown plan');
  db.workspaces[0].plan = plan.id;
  res.json({ plan: plan.id, status: 'ACTIVE (dummy, no payment taken)' });
});

app.get('/health', (req, res) => res.json({ ok: true }));
app.use((req, res) => err(res, 404, `No route: ${req.method} ${req.path}`));
app.listen(PORT, () => console.log(`ProjectFlow dummy API on http://localhost:${PORT}  (login: alex@projectflow.app / password1234)`));