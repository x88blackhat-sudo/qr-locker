import path from 'node:path';

try {
  // Optional .env support without extra dependencies (Node >= 20.12).
  process.loadEnvFile();
} catch {
  /* no .env file present */
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProd = nodeEnv === 'production';
const appOrigin = process.env.APP_ORIGIN?.trim() || null;

export const config = {
  nodeEnv,
  isProd,
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
  databasePath: process.env.DATABASE_PATH ?? path.resolve(process.cwd(), 'data', 'bactrack.db'),
  sessionDays: Math.min(Math.max(Number(process.env.SESSION_DAYS ?? 30), 1), 365),
  cookieName: 'bactrack_session',
  cookieSecure:
    process.env.COOKIE_SECURE === 'true' ||
    (isProd && process.env.COOKIE_SECURE !== 'false' && Boolean(appOrigin?.startsWith('https://'))),
  appOrigin,
  trustProxy: process.env.TRUST_PROXY !== 'false',
  supportEmail: process.env.SUPPORT_EMAIL?.trim() || 'support@bactrack.dz',
  /**
   * Payment processing is deliberately OFF until a provider is configured
   * server-side. The UI reads this flag and never invents a paid state.
   */
  paymentsConfigured: Boolean(
    process.env.PAYMENT_PROVIDER?.trim() && process.env.PAYMENT_WEBHOOK_SECRET?.trim(),
  ),
  paymentProvider: process.env.PAYMENT_PROVIDER?.trim() || null,
  trialDays: 30,
  clientDist: path.resolve(process.cwd(), 'dist', 'client'),
} as const;

export const TRIAL_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
