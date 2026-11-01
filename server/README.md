# ProjectFlow dummy API

Fake Express backend for the UI prototype. Data lives in memory (`data.js`) and resets on restart. Auth is fake: opaque tokens, no JWT, no hashing.

```bash
npm install
npm start        # http://localhost:3000   (PORT env var to change)
```

Demo logins (password `password1234`): `alex@projectflow.app` (OWNER), `sarah@acme.io` (ADMIN), `john@acme.io` (MANAGER), `mia@acme.io` (MEMBER).

Send `Authorization: Bearer <accessToken>` on everything except `/api/auth/*` and `/health`.

| Area | Endpoints |
|---|---|
| Auth | POST `/api/auth/register` `login` `refresh` `logout` `forgot-password` `reset-password` `verify-email`, GET `/api/auth/me` |
| Workspaces | GET/POST `/api/workspaces`, GET/PATCH `/api/workspaces/:id` |
| Members | GET `/api/members`, POST `/api/members/invite`, PATCH `/api/members/:id/role`, DELETE `/api/members/:id` |
| Projects | GET/POST `/api/projects` (`?status=`), GET/PATCH/DELETE `/api/projects/:id` |
| Tasks | GET/POST `/api/tasks` (`?projectId=&status=&priority=&assigneeId=&q=`), GET/PATCH/DELETE `/api/tasks/:id` |
| Comments | GET/POST `/api/tasks/:id/comments` |
| Time | GET/POST `/api/time-entries` (`?taskId=`) |
| Other | GET `/api/notifications`, POST `/api/notifications/read-all`, GET `/api/activity`, GET `/api/dashboard`, GET `/api/reports/projects`, GET `/api/plans`, POST `/api/subscription` |

Enums: task status `TODO | IN_PROGRESS | REVIEW | DONE`, priority `LOW | MEDIUM | HIGH | CRITICAL`, project status `PLANNED | ACTIVE | ON_HOLD | COMPLETED | ARCHIVED`.