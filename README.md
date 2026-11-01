# ProjectFlow

Project management SaaS for freelancers, small agencies and startups.
Stack: Node.js + Express + PostgreSQL (backend), Vue 3 + Tailwind CSS (frontend).

## Run it locally

```bash
docker compose up -d                # PostgreSQL on :5432

cd backend
cp .env.example .env                # set JWT_SECRET to a long random string
npm install
npm run migrate                     # create tables
npm run seed                        # demo workspace "Acme Studio" (optional)
npm run dev                         # API on http://localhost:3000

cd ../frontend
npm install
npm run dev                         # app on http://localhost:5173 (proxies /api to :3000)
```

Demo logins (after `npm run seed`, password `password1234`):
`alex@projectflow.app` (Owner), `sarah@acme.io` (Admin), `john@acme.io` (Manager), `mia@acme.io` (Member).

Tests: `cd backend && NODE_ENV=test npm test` (uses the same database; test data is cleaned up).

Verification and reset emails are not sent yet: the links are printed in the API console.

## Architecture notes

- **Auth:** 15-minute JWT access token kept in memory on the client; rotating refresh token in an httpOnly cookie (stored hashed). Reusing an old refresh token revokes all sessions for that user.
- **Multi-tenancy:** roles live in `workspace_members`. Every tenant-scoped request sends `X-Workspace-Id`; the `workspaceScope` middleware checks membership and sets `req.workspaceId` / `req.role`. Every query on workspace data must filter by `req.workspaceId`.
- **Migrations:** plain SQL files in `backend/db/migrations`, applied in order by `npm run migrate`. Add a new numbered file for each schema change.

## Status

Done: schema for all MVP tables, registration/login/refresh/logout, email verification and password reset, workspaces, members and invitations with roles, Vue app shell, auth pages and Team page.
Next: projects, tasks and the Kanban board, then comments, activity, notifications (Socket.IO), dashboard, time tracking, Stripe.
