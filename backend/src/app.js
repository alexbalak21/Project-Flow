import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { authenticate, workspaceScope } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/error.js';
import authRoutes from './modules/auth/routes.js';
import workspaceRoutes from './modules/workspaces/routes.js';
import memberRoutes from './modules/members/routes.js';
import invitationRoutes from './modules/invitations.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/health', (req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);

  // Everything below needs a valid access token.
  app.use('/api', authenticate);
  app.use('/api/workspaces', workspaceRoutes);
  app.use('/api/invitations', invitationRoutes);

  // Everything below is tenant-scoped: it needs X-Workspace-Id and membership in that workspace.
  app.use('/api/members', workspaceScope, memberRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
