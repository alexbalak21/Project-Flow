import 'dotenv/config';

const env = (key, fallback) => process.env[key] ?? fallback;
const DEV_SECRET = 'dev-secret-change-me';

export const config = {
  port: Number(env('PORT', 3000)),
  databaseUrl: env('DATABASE_URL', 'postgres://projectflow:projectflow@localhost:5432/projectflow'),
  jwtSecret: env('JWT_SECRET', DEV_SECRET),
  accessTtl: env('ACCESS_TOKEN_TTL', '15m'),
  refreshDays: Number(env('REFRESH_TOKEN_DAYS', 30)),
  clientOrigin: env('CLIENT_ORIGIN', 'http://localhost:5173'),
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  requireEmailVerification: env('REQUIRE_EMAIL_VERIFICATION', 'false') === 'true',
};

if (config.isProd && config.jwtSecret === DEV_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}
