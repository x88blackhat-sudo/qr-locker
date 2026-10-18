import { createApp } from './app';
import { config } from './config';
import { purgeExpiredSessions } from './services/auth';
import { expireDueTrials } from './services/subscription';

const app = createApp();
const server = app.listen(config.port, config.host, () => {
  console.log(`BacTrack DZ API listening on http://${config.host}:${config.port}`);
  console.log(`Environment: ${config.nodeEnv} · payments configured: ${config.paymentsConfigured}`);
  expireDueTrials();
});

const expiryTimer = setInterval(() => {
  const expired = expireDueTrials();
  if (expired > 0) console.log(`[trial] expired ${expired} subscription(s)`);
}, 30 * 60 * 1000);
expiryTimer.unref();

const sessionTimer = setInterval(purgeExpiredSessions, 6 * 60 * 60 * 1000);
sessionTimer.unref();

function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
