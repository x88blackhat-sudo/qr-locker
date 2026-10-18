import test from 'node:test';
import assert from 'node:assert/strict';
import { PASSWORD, freshEmail, register, startTestServer } from './helpers';

const server = await startTestServer();
const db = server.db;

test.after(async () => {
  await server.close();
});

async function activeStudent() {
  const client = server.client();
  const { email } = await register(client);
  const trial = await client.req('/trial/start', { method: 'POST', body: {} });
  assert.equal(trial.status, 201);
  return { client, email };
}

test('a fresh account shows real zero progress and the full curriculum', async () => {
  const client = server.client();
  await register(client);

  const dashboard = await client.req('/dashboard');
  assert.equal(dashboard.status, 200);
  assert.equal(dashboard.body.overall.progress, 0);
  assert.equal(dashboard.body.overall.completedExams, 0);
  assert.equal(dashboard.body.overall.masteredCards, 0);
  assert.equal(dashboard.body.overall.subjectCount, 9);
  assert.equal(dashboard.body.overall.dailyGoalMinutes, 120);
  assert.ok(Array.isArray(dashboard.body.attention));
  assert.equal(dashboard.body.weekly.length, 7);
  assert.equal(dashboard.body.reviews.dueNow, 0);
  assert.ok(dashboard.body.plan.items.length > 0);
  assert.equal(dashboard.body.trial.status, 'not_started');

  const subjects = await client.req('/subjects');
  assert.equal(subjects.status, 200);
  assert.equal(subjects.body.subjects.length, 9);
  const math = subjects.body.subjects.find((subject: any) => subject.slug === 'math');
  assert.ok(math.totals.papers >= 10);
  assert.ok(math.totals.cards > 0);

  const settings = await client.req('/settings');
  assert.equal(settings.body.settings.theme, 'system');
  assert.equal(settings.body.settings.dailyGoalMinutes, 120);
});

test('exam completion is persisted once and is idempotent', async () => {
  const { client } = await activeStudent();

  const exams = await client.req('/exams?subject=math');
  const paper = exams.body.papers[0];
  const first = await client.req(`/exams/${paper.id}/completion`, {
    method: 'POST',
    body: { completed: true },
  });
  assert.equal(first.status, 200);
  assert.equal(first.body.completed, true);

  const second = await client.req(`/exams/${paper.id}/completion`, {
    method: 'POST',
    body: { completed: true },
  });
  assert.equal(second.status, 200);
  assert.equal(second.body.completed, true);

  const summary = await client.req('/exams?subject=math');
  assert.equal(summary.body.summary.completed, 1);

  const me = await client.req('/auth/me');
  const userId = me.body.user.id;
  const stored = db
    .prepare('SELECT COUNT(*) AS count FROM exam_completions WHERE user_id = ? AND paper_id = ?')
    .get(userId, paper.id);
  assert.equal(stored.count, 1);

  const dashboard = await client.req('/dashboard');
  assert.equal(dashboard.body.overall.completedExams, 1);
  assert.ok(dashboard.body.overall.progress > 0);

  // Toggling back removes the record rather than duplicating it.
  const undo = await client.req(`/exams/${paper.id}/completion`, {
    method: 'POST',
    body: { completed: false },
  });
  assert.equal(undo.body.completed, false);
  const afterUndo = db
    .prepare('SELECT COUNT(*) AS count FROM exam_completions WHERE user_id = ? AND paper_id = ?')
    .get(userId, paper.id);
  assert.equal(afterUndo.count, 0);
});

test('exam filters accept year, session and completion status', async () => {
  const { client } = await activeStudent();
  const all = await client.req('/exams');
  const year = all.body.filters.years[0];
  const session = all.body.filters.sessions[0];

  const filtered = await client.req(`/exams?year=${year}&session=${session}&status=pending`);
  assert.equal(filtered.status, 200);
  assert.ok(filtered.body.papers.every((paper: any) => paper.year === year && paper.session === session));
  assert.ok(filtered.body.papers.every((paper: any) => paper.completed === false));

  const invalid = await client.req('/exams?status=whatever');
  assert.equal(invalid.status, 422);
});

test('exercise progress persists across logout and login', async () => {
  const { client, email } = await activeStudent();

  const detail = await client.req('/subjects/math');
  const exercise = detail.body.exercises[0];
  assert.ok(exercise);
  const update = await client.req(`/exercises/${exercise.id}/progress`, {
    method: 'PATCH',
    body: { status: 'done' },
  });
  assert.equal(update.status, 200);
  assert.equal(update.body.exercise.status, 'done');

  await client.req('/auth/logout', { method: 'POST', body: {} });
  const login = await client.req('/auth/login', { method: 'POST', body: { email, password: PASSWORD } });
  assert.equal(login.status, 200);

  const after = await client.req('/subjects/math');
  assert.equal(after.body.exercises.find((item: any) => item.id === exercise.id).status, 'done');
  assert.ok(after.body.subject.exercisePct >= 0);

  const invalid = await client.req(`/exercises/${exercise.id}/progress`, {
    method: 'PATCH',
    body: { status: 'finished' },
  });
  assert.equal(invalid.status, 422);
});

test('revision queue supports subject scoping and reviews update analytics', async () => {
  const { client } = await activeStudent();

  const mathQueue = await client.req('/revision/queue?subject=math&limit=5');
  assert.equal(mathQueue.status, 200);
  assert.equal(mathQueue.body.subjectName, 'الرياضيات');
  assert.ok(mathQueue.body.cards.length > 0);
  assert.ok(mathQueue.body.cards.length <= 5);
  assert.ok(mathQueue.body.cards.every((card: any) => card.subject.slug === 'math'));

  const card = mathQueue.body.cards[0];
  const review = await client.req('/revision/review', {
    method: 'POST',
    body: { cardId: card.id, rating: 3 },
  });
  assert.equal(review.status, 200);
  assert.equal(review.body.intervalDays, 1);
  assert.ok(review.body.dueAt > Date.now());

  const analytics = await client.req('/analytics');
  assert.equal(analytics.status, 200);
  assert.equal(analytics.body.mastery.learning, 1);
  assert.equal(analytics.body.activity.length, 14);
  assert.equal(analytics.body.forecast.length, 7);
  assert.ok(analytics.body.forecast.reduce((sum: number, day: any) => sum + day.count, 0) >= 1);

  const queue = await client.req('/revision/queue?subject=english');
  assert.equal(queue.body.subjectName, 'اللغة الإنجليزية');
  assert.ok(queue.body.cards.every((item: any) => item.subject.slug === 'english'));

  const badSubject = await client.req('/revision/queue?subject=math%20drop');
  assert.equal(badSubject.status, 422);

  const unknown = await client.req('/revision/queue?subject=space');
  assert.equal(unknown.status, 404);
});

test('the daily plan mirrors exercise progress and is user-scoped', async () => {
  const { client } = await activeStudent();
  const plan = await client.req('/plan/today');
  assert.ok(plan.body.items.length > 0);

  const reviewItem = plan.body.items.find((item: any) => item.kind === 'review' || item.kind === 'revision');
  if (reviewItem) {
    assert.ok(reviewItem.href.startsWith('/app/'));
  }

  const exerciseItem = plan.body.items.find((item: any) => item.kind === 'exercise');
  assert.ok(exerciseItem);
  const toggle = await client.req(`/plan/items/${exerciseItem.id}`, {
    method: 'PATCH',
    body: { completed: true },
  });
  assert.equal(toggle.status, 200);
  assert.equal(toggle.body.item.completed, true);

  const detail = await client.req(`/subjects/${exerciseItem.subjectSlug ?? 'math'}`);
  const storedExercise = detail.body.exercises.find((item: any) => item.id === exerciseItem.referenceId);
  if (storedExercise) assert.equal(storedExercise.status, 'done');

  const planAfter = await client.req('/plan/today');
  const sameItem = planAfter.body.items.find((item: any) => item.id === exerciseItem.id);
  assert.equal(sameItem.completed, true);

  // A malformed id is a 404, never another user's row.
  const missing = await client.req('/plan/items/plan_missing', {
    method: 'PATCH',
    body: { completed: true },
  });
  assert.equal(missing.status, 404);
});

test('settings and profile writes persist and are validated', async () => {
  const { client } = await activeStudent();

  const settings = await client.req('/settings', {
    method: 'PATCH',
    body: { theme: 'dark', dailyGoalMinutes: 90 },
  });
  assert.equal(settings.status, 200);
  assert.equal(settings.body.settings.theme, 'dark');
  assert.equal(settings.body.settings.dailyGoalMinutes, 90);

  const invalid = await client.req('/settings', {
    method: 'PATCH',
    body: { dailyGoalMinutes: 5 },
  });
  assert.equal(invalid.status, 422);

  const profile = await client.req('/profile', { method: 'PATCH', body: { name: 'أمين بن علي' } });
  assert.equal(profile.status, 200);
  assert.equal(profile.body.user.name, 'أمين بن علي');

  const invalidName = await client.req('/profile', { method: 'PATCH', body: { name: 'A' } });
  assert.equal(invalidName.status, 422);

  const me = await client.req('/auth/me');
  assert.equal(me.body.settings.theme, 'dark');
  assert.equal(me.body.settings.dailyGoalMinutes, 90);
  assert.equal(me.body.user.name, 'أمين بن علي');
});

test('changing the password verifies the old one and revokes other sessions', async () => {
  const { client, email } = await activeStudent();
  const secondDevice = server.client();
  const login = await secondDevice.req('/auth/login', { method: 'POST', body: { email, password: PASSWORD } });
  assert.equal(login.status, 200);
  assert.equal((await secondDevice.req('/dashboard')).status, 200);

  const wrong = await client.req('/profile/password', {
    method: 'POST',
    body: { currentPassword: 'Wrong1234', newPassword: 'NewPass123' },
  });
  assert.equal(wrong.status, 422);
  assert.equal(wrong.body.error.fields.currentPassword, 'كلمة المرور الحالية غير صحيحة.');

  const changed = await client.req('/profile/password', {
    method: 'POST',
    body: { currentPassword: PASSWORD, newPassword: 'NewPass123' },
  });
  assert.equal(changed.status, 200);

  // The device that changed the password stays signed in; the other is revoked.
  assert.equal((await client.req('/auth/me')).status, 200);
  assert.equal((await secondDevice.req('/auth/me')).status, 401);

  await client.req('/auth/logout', { method: 'POST', body: {} });
  const oldLogin = await client.req('/auth/login', { method: 'POST', body: { email, password: PASSWORD } });
  assert.equal(oldLogin.status, 401);
  const newLogin = await client.req('/auth/login', { method: 'POST', body: { email, password: 'NewPass123' } });
  assert.equal(newLogin.status, 200);
});

test('logout-all ends every session for the account', async () => {
  const { client, email } = await activeStudent();
  const other = server.client();
  await other.req('/auth/login', { method: 'POST', body: { email, password: PASSWORD } });

  const all = await client.req('/auth/logout-all', { method: 'POST', body: {} });
  assert.equal(all.status, 200);
  assert.equal((await client.req('/auth/me')).status, 401);
  assert.equal((await other.req('/auth/me')).status, 401);
});

test('export contains the account, progress and review history', async () => {
  const { client, email } = await activeStudent();
  const exams = await client.req('/exams?subject=physics');
  const paper = exams.body.papers[0];
  await client.req(`/exams/${paper.id}/completion`, { method: 'POST', body: { completed: true } });
  const queue = await client.req('/revision/queue?subject=physics');
  await client.req('/revision/review', {
    method: 'POST',
    body: { cardId: queue.body.cards[0].id, rating: 2 },
  });

  const exported = await client.req('/profile/export');
  assert.equal(exported.status, 200);
  assert.equal(exported.body.account.email, email);
  assert.equal(exported.body.examCompletions.length, 1);
  assert.ok(exported.body.reviewHistory.length >= 1);
  assert.ok(exported.body.subscription);
  assert.ok(Array.isArray(exported.body.planItems));
});

test('unknown API routes return a structured 404 and invalid bodies a 422', async () => {
  const { client } = await activeStudent();
  const missing = await client.req('/does-not-exist');
  assert.equal(missing.status, 404);
  assert.equal(missing.body.error.code, 'NOT_FOUND');

  const badLogin = await server.client().req('/auth/login', { method: 'POST', body: { email: 'nope' } });
  assert.equal(badLogin.status, 422);
  assert.ok(badLogin.body.error.fields);

  const shortPassword = await server.client().req('/auth/register', {
    method: 'POST',
    body: { name: 'طالب', email: freshEmail(), password: 'short', acceptTerms: true },
  });
  assert.equal(shortPassword.status, 422);
});
