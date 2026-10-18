import test from 'node:test';
import assert from 'node:assert/strict';
import { PASSWORD, register, startTestServer } from './helpers';

const TRIAL_MS = 30 * 24 * 60 * 60 * 1000;
const server = await startTestServer();
const db = server.db;

test.after(async () => {
  await server.close();
});

test('registration creates a server-side not_started subscription', async () => {
  const client = server.client();
  const { response } = await register(client);
  assert.equal(response.status, 201);
  assert.equal(response.body.subscription.status, 'not_started');
  assert.equal(response.body.subscription.trialUsed, false);
  assert.equal(response.body.subscription.trialEndsAt, null);
  assert.equal(response.body.subscription.access, 'none');

  const trial = await client.req('/trial');
  assert.equal(trial.status, 200);
  assert.equal(trial.body.subscription.status, 'not_started');
});

test('study writes are blocked before the trial is activated', async () => {
  const client = server.client();
  await register(client);

  const exams = await client.req('/exams?subject=math');
  const paperId = exams.body.papers[0].id;

  const completion = await client.req(`/exams/${paperId}/completion`, {
    method: 'POST',
    body: { completed: true },
  });
  assert.equal(completion.status, 403);
  assert.equal(completion.body.error.code, 'TRIAL_NOT_STARTED');

  const review = await client.req('/revision/review', {
    method: 'POST',
    body: { cardId: 'does-not-matter', rating: 3 },
  });
  assert.equal(review.status, 403);
  assert.equal(review.body.error.code, 'TRIAL_NOT_STARTED');
});

test('trial activation is timed by the server and lasts exactly 30 days', async () => {
  const client = server.client();
  await register(client);

  const before = Date.now();
  const response = await client.req('/trial/start', { method: 'POST', body: {} });
  const after = Date.now();

  assert.equal(response.status, 201);
  const subscription = response.body.subscription;
  assert.equal(subscription.status, 'trialing');
  assert.equal(subscription.trialUsed, true);
  assert.equal(subscription.access, 'trial');
  assert.equal(subscription.daysRemaining, 30);
  assert.equal(subscription.trialEndsAt - subscription.trialStartedAt, TRIAL_MS);
  assert.ok(subscription.trialStartedAt >= before && subscription.trialStartedAt <= after);
});

test('a second activation returns 409 and never extends the window', async () => {
  const client = server.client();
  await register(client);
  const first = await client.req('/trial/start', { method: 'POST', body: {} });
  const endsAt = first.body.subscription.trialEndsAt;

  const second = await client.req('/trial/start', { method: 'POST', body: {} });
  assert.equal(second.status, 409);
  assert.equal(second.body.error.code, 'TRIAL_ALREADY_USED');

  const trial = await client.req('/trial');
  assert.equal(trial.body.subscription.trialEndsAt, endsAt);
  assert.equal(trial.body.subscription.status, 'trialing');
});

test('the trial survives logout and login with the same server timestamps', async () => {
  const client = server.client();
  const { email } = await register(client);
  const started = await client.req('/trial/start', { method: 'POST', body: {} });
  const { trialStartedAt, trialEndsAt } = started.body.subscription;

  const logout = await client.req('/auth/logout', { method: 'POST', body: {} });
  assert.equal(logout.status, 200);

  const blocked = await client.req('/trial');
  assert.equal(blocked.status, 401);

  const login = await client.req('/auth/login', {
    method: 'POST',
    body: { email, password: PASSWORD },
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.subscription.trialStartedAt, trialStartedAt);
  assert.equal(login.body.subscription.trialEndsAt, trialEndsAt);
  assert.equal(login.body.subscription.status, 'trialing');

  // Re-login is not a new trial.
  const restart = await client.req('/trial/start', { method: 'POST', body: {} });
  assert.equal(restart.status, 409);
});

test('client-supplied trial and subscription fields are ignored', async () => {
  const client = server.client();
  await register(client);
  const started = await client.req('/trial/start', { method: 'POST', body: {} });
  const endsAt = started.body.subscription.trialEndsAt;

  const tamper = await client.req('/settings', {
    method: 'PATCH',
    body: {
      theme: 'dark',
      trialEndsAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
      trial_started_at: Date.now() - TRIAL_MS,
      trialUsed: false,
      subscriptionStatus: 'active_paid',
      subscription_status: 'active_paid',
      access: 'paid',
    },
  });
  assert.equal(tamper.status, 200);
  assert.equal(tamper.body.settings.theme, 'dark');

  const trial = await client.req('/trial');
  assert.equal(trial.body.subscription.status, 'trialing');
  assert.equal(trial.body.subscription.access, 'trial');
  assert.equal(trial.body.subscription.trialUsed, true);
  assert.equal(trial.body.subscription.trialEndsAt, endsAt);
  assert.equal(trial.body.subscription.subscriptionProvider, null);

  // There is no HTTP route that can promote an account to paid.
  const paid = await client.req('/subscription', {
    method: 'PATCH',
    body: { status: 'active_paid' },
  });
  assert.equal(paid.status, 404);
});

test('database constraints and triggers reject trial edits and re-creation', async () => {
  const client = server.client();
  const { email } = await register(client);
  await client.req('/trial/start', { method: 'POST', body: {} });
  const row = db.prepare('SELECT * FROM subscriptions WHERE user_id = (SELECT id FROM users WHERE email = ?)').get(email);

  // 1. A used trial window is immutable, even for direct SQL.
  assert.throws(
    () => db.prepare('UPDATE subscriptions SET trial_ends_at = ? WHERE user_id = ?').run(Date.now() + 999999, row.user_id),
    /trial_window_immutable/,
  );

  // 2. A second subscription row (a second trial) cannot be inserted.
  assert.throws(
    () =>
      db
        .prepare(
          `INSERT INTO subscriptions (user_id, trial_started_at, trial_ends_at, trial_used, subscription_status)
           VALUES (?, ?, ?, 1, 'trialing')`,
        )
        .run(row.user_id, Date.now(), Date.now() + TRIAL_MS),
    /UNIQUE|constraint/i,
  );

  // 3. Trial windows must be exactly 30 days and cannot be back-dated.
  const fresh = await register(server.client());
  const freshRow = db
    .prepare('SELECT user_id FROM subscriptions WHERE user_id = (SELECT id FROM users WHERE email = ?)')
    .get(fresh.email);
  assert.throws(
    () =>
      db
        .prepare('UPDATE subscriptions SET trial_used = 1, trial_started_at = ?, trial_ends_at = ? WHERE user_id = ?')
        .run(Date.now(), Date.now() + 1000, freshRow.user_id),
    /invalid_trial_window|CHECK constraint/,
  );

  // 4. A paid status requires a verified provider + reference at DB level.
  assert.throws(
    () => db.prepare("UPDATE subscriptions SET subscription_status = 'active_paid' WHERE user_id = ?").run(freshRow.user_id),
    /paid_status_requires_verified_payment|CHECK constraint/,
  );
  const stored = db.prepare('SELECT subscription_status FROM subscriptions WHERE user_id = ?').get(freshRow.user_id);
  assert.equal(stored.subscription_status, 'not_started');
});

test('expired trials keep all data but block new study writes', async () => {
  const client = server.client();
  const { email } = await register(client);
  await client.req('/trial/start', { method: 'POST', body: {} });

  const exams = await client.req('/exams?subject=math');
  const paperId = exams.body.papers[0].id;
  assert.equal((await client.req(`/exams/${paperId}/completion`, { method: 'POST', body: { completed: true } })).status, 200);

  const queue = await client.req('/revision/queue');
  const cardId = queue.body.cards[0].id;
  assert.equal((await client.req('/revision/review', { method: 'POST', body: { cardId, rating: 3 } })).status, 200);

  const plan = await client.req('/plan/today');
  const allItems = plan.body.items;
  assert.ok(allItems.length > 0);

  const userId = db.prepare('SELECT id FROM users WHERE email = ?').get(email).id;
  const before = db.prepare('SELECT subscription_status, trial_ends_at FROM subscriptions WHERE user_id = ?').get(userId);
  assert.equal(before.subscription_status, 'trialing');

  // Simulate the passage of time. In production this mutation is blocked by the
  // trigger tested above; the test-only DB is migrated directly.
  db.exec('DROP TRIGGER trg_subscription_trial_immutable');
  const expiredEnd = Date.now() - 24 * 60 * 60 * 1000;
  db.prepare('UPDATE subscriptions SET trial_started_at = ?, trial_ends_at = ? WHERE user_id = ?').run(
    expiredEnd - TRIAL_MS,
    expiredEnd,
    userId,
  );

  const trial = await client.req('/trial');
  assert.equal(trial.status, 200);
  assert.equal(trial.body.subscription.status, 'expired');
  assert.equal(trial.body.subscription.access, 'expired');
  assert.equal(trial.body.subscription.daysRemaining, 0);
  assert.equal(trial.body.subscription.trialEndsAt, expiredEnd);

  const restart = await client.req('/trial/start', { method: 'POST', body: {} });
  assert.equal(restart.status, 409);

  const dashboard = await client.req('/dashboard');
  assert.equal(dashboard.status, 200);
  assert.equal(dashboard.body.overall.completedExams, 1);

  const exportResponse = await client.req('/profile/export');
  assert.equal(exportResponse.status, 200);
  assert.equal(exportResponse.body.examCompletions.length, 1);
  assert.ok(exportResponse.body.reviewHistory.length >= 1);

  const blockedCompletion = await client.req(`/exams/${paperId}/completion`, {
    method: 'POST',
    body: { completed: false },
  });
  assert.equal(blockedCompletion.status, 403);
  assert.equal(blockedCompletion.body.error.code, 'TRIAL_EXPIRED');

  const blockedReview = await client.req('/revision/review', {
    method: 'POST',
    body: { cardId, rating: 4 },
  });
  assert.equal(blockedReview.status, 403);

  // Re-login keeps the expired state; there is no reset path.
  await client.req('/auth/logout', { method: 'POST', body: {} });
  const login = await client.req('/auth/login', { method: 'POST', body: { email, password: PASSWORD } });
  assert.equal(login.body.subscription.status, 'expired');
  const reloginStart = await client.req('/trial/start', { method: 'POST', body: {} });
  assert.equal(reloginStart.status, 409);
});

test('per-student isolation: another student cannot modify your progress', async () => {
  const owner = server.client();
  await register(owner);
  await owner.req('/trial/start', { method: 'POST', body: {} });

  const plan = await owner.req('/plan/today');
  const ownerItem = plan.body.items.find((item: any) => item.kind === 'exercise');
  assert.ok(ownerItem);

  const exams = await owner.req('/exams?subject=math');
  const paperId = exams.body.papers[0].id;
  await owner.req(`/exams/${paperId}/completion`, { method: 'POST', body: { completed: true } });

  const intruder = server.client();
  await register(intruder);
  await intruder.req('/trial/start', { method: 'POST', body: {} });

  const hijack = await intruder.req(`/plan/items/${ownerItem.id}`, {
    method: 'PATCH',
    body: { completed: true },
  });
  assert.equal(hijack.status, 404);

  const ownDashboard = await intruder.req('/dashboard');
  assert.equal(ownDashboard.body.overall.completedExams, 0);

  const ownExport = await intruder.req('/profile/export');
  assert.equal(ownExport.body.examCompletions.length, 0);

  const ownerDashboard = await owner.req('/dashboard');
  assert.equal(ownerDashboard.body.overall.completedExams, 1);
});

test('unauthorized and cross-origin trial attempts are rejected', async () => {
  const anonymous = await fetch(server.base + '/trial/start', { method: 'POST' });
  assert.equal(anonymous.status, 403); // missing client header

  const client = server.client();
  const unauth = await client.req('/trial/start', { method: 'POST', body: {} });
  assert.equal(unauth.status, 401);

  await register(client);
  const crossOrigin = await client.req('/trial/start', {
    method: 'POST',
    body: {},
    headers: { Origin: 'https://evil.example' },
  });
  assert.equal(crossOrigin.status, 403);
  assert.equal(crossOrigin.body.error.code, 'ORIGIN_REJECTED');

  const trial = await client.req('/trial');
  assert.equal(trial.body.subscription.status, 'not_started');
});

test('repeated trial activation attempts are rate limited per account', async () => {
  // The limiter is keyed by authenticated user id, so a single account cannot
  // hammer the activation endpoint even after the trial has been claimed.
  const client = server.client();
  await register(client);
  const first = await client.req('/trial/start', { method: 'POST', body: {} });
  assert.equal(first.status, 201);

  let limited = null;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const response = await client.req('/trial/start', { method: 'POST', body: {} });
    if (response.status === 429) {
      limited = response;
      break;
    }
    assert.equal(response.status, 409);
  }
  assert.ok(limited, 'expected a 429 after repeated activation attempts');
  assert.equal(limited.body.error.code, 'RATE_LIMITED');
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
});
