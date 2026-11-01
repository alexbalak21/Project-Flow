// In-memory seed data. Everything resets when the server restarts.
const { randomUUID: id } = require('crypto');
const now = () => new Date().toISOString();
const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

const users = [
  { id: 'u1', firstName: 'Alex', lastName: 'Balakirev', email: 'alex@projectflow.app', password: 'password1234', role: 'OWNER', status: 'ACTIVE', emailVerified: true },
  { id: 'u2', firstName: 'Sarah', lastName: 'Lee', email: 'sarah@acme.io', password: 'password1234', role: 'ADMIN', status: 'ACTIVE', emailVerified: true },
  { id: 'u3', firstName: 'John', lastName: 'Doe', email: 'john@acme.io', password: 'password1234', role: 'MANAGER', status: 'ACTIVE', emailVerified: true },
  { id: 'u4', firstName: 'Mia', lastName: 'Chen', email: 'mia@acme.io', password: 'password1234', role: 'MEMBER', status: 'ACTIVE', emailVerified: true },
  { id: 'u5', firstName: 'Leo', lastName: 'Martin', email: 'leo@acme.io', password: 'password1234', role: 'MEMBER', status: 'INVITED', emailVerified: false },
].map((u) => ({ ...u, createdAt: now() }));

const workspaces = [{ id: 'w1', name: 'Acme Studio', ownerId: 'u1', plan: 'FREE', createdAt: now() }];
const workspaceMembers = users.map((u) => ({ workspaceId: 'w1', userId: u.id, role: u.role }));

const projects = [
  { id: 'p1', workspaceId: 'w1', name: 'Website redesign', description: 'Responsive marketing site and new pricing page.', status: 'ACTIVE', startDate: day(-14), endDate: day(30), memberIds: ['u1', 'u2', 'u4'] },
  { id: 'p2', workspaceId: 'w1', name: 'Mobile app', description: 'Android client for timers and notifications.', status: 'ACTIVE', startDate: day(-30), endDate: day(75), memberIds: ['u1', 'u3'] },
  { id: 'p3', workspaceId: 'w1', name: 'Launch campaign', description: 'Emails, social posts and beta invitations.', status: 'PLANNED', startDate: day(10), endDate: day(40), memberIds: ['u4'] },
  { id: 'p4', workspaceId: 'w1', name: 'Billing', description: 'Stripe integration and plan limits.', status: 'ON_HOLD', startDate: day(-20), endDate: day(50), memberIds: ['u2', 'u3'] },
  { id: 'p5', workspaceId: 'w1', name: 'Brand refresh', description: 'Logo, colours and style guide.', status: 'COMPLETED', startDate: day(-60), endDate: day(-20), memberIds: ['u2', 'u4'] },
];

const t = (n, projectId, title, status, priority, assigneeId, due, est) => ({
  id: 't' + n, projectId, title, description: `Details for "${title}".`, status, priority, assigneeId,
  dueDate: day(due), estimateHours: est, checklist: [{ id: id(), text: 'Draft', done: true }, { id: id(), text: 'Review', done: false }],
  createdAt: now(), updatedAt: now(),
});
const tasks = [
  t(1, 'p1', 'Write copy for pricing page', 'TODO', 'MEDIUM', 'u4', 8, 3),
  t(2, 'p1', 'Collect client logos', 'TODO', 'LOW', 'u2', 11, 2),
  t(3, 'p1', 'Design homepage', 'IN_PROGRESS', 'HIGH', 'u2', 3, 6),
  t(4, 'p1', 'Build navigation component', 'IN_PROGRESS', 'MEDIUM', 'u1', 5, 4),
  t(5, 'p1', 'Accessibility audit', 'REVIEW', 'CRITICAL', 'u3', 2, 5),
  t(6, 'p1', 'Choose colour palette', 'DONE', 'MEDIUM', 'u2', -4, 2),
  t(7, 'p2', 'Set up CI pipeline', 'REVIEW', 'CRITICAL', 'u3', 4, 6),
  t(8, 'p2', 'Timer screen', 'IN_PROGRESS', 'HIGH', 'u1', 9, 8),
  t(9, 'p2', 'Push notifications', 'TODO', 'MEDIUM', 'u3', 20, 10),
  t(10, 'p4', 'Fix invoice rounding', 'IN_PROGRESS', 'HIGH', 'u1', -1, 3),
];

const comments = [
  { id: id(), taskId: 't3', authorId: 'u2', text: 'Wireframes are ready for review. @Alex can you check the hero?', createdAt: now() },
  { id: id(), taskId: 't3', authorId: 'u1', text: 'Looks good. Let’s shorten the headline.', createdAt: now() },
];
const timeEntries = [{ id: id(), taskId: 't3', userId: 'u2', minutes: 200, note: 'Layout work', date: day(-1) }];
const notifications = [
  { id: id(), userId: 'u1', type: 'TASK_ASSIGNED', text: 'Sarah assigned you "Build navigation component"', read: false, createdAt: now() },
  { id: id(), userId: 'u1', type: 'COMMENT_ADDED', text: 'Sarah commented on "Design homepage"', read: false, createdAt: now() },
  { id: id(), userId: 'u1', type: 'PROJECT_STATUS_CHANGED', text: '"Billing" was put On Hold', read: true, createdAt: now() },
];
const activity = [
  { id: id(), userId: 'u1', text: 'Alex created project Website redesign', createdAt: now() },
  { id: id(), userId: 'u2', text: 'Sarah completed Choose colour palette', createdAt: now() },
];
const sessions = new Map(); // token -> userId

module.exports = { id, now, users, workspaces, workspaceMembers, projects, tasks, comments, timeEntries, notifications, activity, sessions };