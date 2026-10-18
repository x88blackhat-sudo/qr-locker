const base = 'http://127.0.0.1:3000/api';
const H = { 'Content-Type': 'application/json', 'X-Requested-With': 'bactrack-dz' };
let cookie = '';
let failures = 0;
function check(name, cond, extra = '') {
  if (cond) console.log(`PASS  ${name}`);
  else { failures++; console.log(`FAIL  ${name} ${extra}`); }
}
async function req(path, opts = {}) {
  const res = await fetch(base + path, {
    ...opts,
    headers: { ...H, ...(cookie ? { Cookie: cookie } : {}), ...(opts.headers || {}) },
  });
  const set = res.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0];
  let body = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
}
const email = `sara${Date.now()}@test.dz`;
let r = await req('/auth/register', { method: 'POST', body: JSON.stringify({ name: 'سارة', email, password: 'Test1234', acceptTerms: true }) });
check('register 201', r.status === 201, JSON.stringify(r.body));
check('trial not started', r.body?.subscription?.status === 'not_started');
check('access none', r.body?.subscription?.access === 'none');

r = await req('/auth/me');
check('me 200', r.status === 200 && r.body?.user?.email === email);

r = await req('/trial/start', { method: 'POST', body: JSON.stringify({ trial_ends_at: 9999999999999, subscription_status: 'active_paid' }) });
check('trial starts 201', r.status === 201, JSON.stringify(r.body));
check('status trialing', r.body?.subscription?.status === 'trialing');
check('30 days', r.body?.subscription?.daysRemaining === 30, String(r.body?.subscription?.daysRemaining));
check('paid flag ignored', r.body?.subscription?.access === 'trial');

const firstEnds = r.body?.subscription?.trialEndsAt;
r = await req('/trial/start', { method: 'POST', body: '{}' });
check('second trial blocked 409', r.status === 409 && r.body?.error?.code === 'TRIAL_ALREADY_USED', JSON.stringify(r.body));

r = await req('/dashboard');
check('dashboard 200', r.status === 200, JSON.stringify(r.body).slice(0, 200));
check('dashboard has plan', Array.isArray(r.body?.plan?.items));
check('dashboard real zeros', r.body?.overall?.progress === 0);
const planItems = r.body?.plan?.items ?? [];
check('plan non-empty', planItems.length > 0, String(planItems.length));

r = await req('/subjects');
check('subjects 9', r.body?.subjects?.length === 9, String(r.body?.subjects?.length));
const math = r.body?.subjects?.find((s) => s.slug === 'math');
check('math content counts', math?.totals?.papers === 11 && math?.totals?.cards === 12, JSON.stringify(math?.totals));

r = await req('/subjects/math');
check('subject detail 200', r.status === 200);
check('subject units', r.body?.units?.length === 4);
check('subject exams', r.body?.exams?.length === 11);
check('subject exercises', r.body?.exercises?.length === 8);

r = await req('/exams?subject=math&status=pending');
check('exams filtered', r.status === 200 && r.body?.papers?.length === 11);
const paper = r.body?.papers?.[0];
r = await req(`/exams/${paper.id}/completion`, { method: 'POST', body: JSON.stringify({ completed: true }) });
check('exam completed', r.status === 200 && r.body?.completed === true);
r = await req(`/exams/${paper.id}/completion`, { method: 'POST', body: JSON.stringify({ completed: true }) });
check('exam completion idempotent', r.status === 200);
r = await req('/exams?subject=math');
check('completed count is 1', r.body?.summary?.completed === 1, JSON.stringify(r.body?.summary));

r = await req('/revision/queue');
const cards = r.body?.cards ?? [];
check('queue has cards', r.status === 200 && cards.length > 0, String(cards.length));
const card = cards[0];
r = await req('/revision/review', { method: 'POST', body: JSON.stringify({ cardId: card.id, rating: 3 }) });
check('review saved', r.status === 200 && r.body?.intervalDays === 1, JSON.stringify(r.body));

r = await req('/revision/queue?subject=math&limit=5');
check('subject queue 200', r.status === 200 && r.body?.subjectName === 'الرياضيات', JSON.stringify(r.body?.subjectName));
check('subject queue scoped', (r.body?.cards ?? []).length <= 5 && (r.body?.cards ?? []).every((c) => c.subject.slug === 'math'));
check('subject queue counts', typeof r.body?.dueNow === 'number' && Array.isArray(r.body?.cards));
r = await req('/revision/queue?subject=not-a-subject');
check('unknown subject 404', r.status === 404, String(r.status));

r = await req('/analytics');
check('analytics 200', r.status === 200);
check('analytics activity 14', r.body?.activity?.length === 14);
check('mastery learning 1', r.body?.mastery?.learning === 1, JSON.stringify(r.body?.mastery));

r = await req('/settings', { method: 'PATCH', body: JSON.stringify({ theme: 'dark', dailyGoalMinutes: 90 }) });
check('settings saved', r.status === 200 && r.body?.settings?.theme === 'dark' && r.body?.settings?.dailyGoalMinutes === 90);

r = await req('/dashboard');
check('dashboard reflects completed exam', r.body?.overall?.completedExams === 1, JSON.stringify(r.body?.overall));
check('dashboard reflects minutes', r.body?.overall?.studyMinutesToday >= 1, JSON.stringify(r.body?.overall?.studyMinutesToday));

// plan toggle: find an exercise plan item
r = await req('/plan/today');
const exerciseItem = (r.body?.items ?? []).find((i) => i.kind === 'exercise');
if (exerciseItem) {
  r = await req(`/plan/items/${exerciseItem.id}`, { method: 'PATCH', body: JSON.stringify({ completed: true }) });
  check('plan item toggled', r.status === 200 && r.body?.item?.completed === true, JSON.stringify(r.body));
  r = await req('/subjects/math');
  const done = (r.body?.exercises ?? []).filter((e) => e.status === 'done').length;
  check('plan exercise persisted', done >= 1, String(done));
} else {
  check('exercise plan item exists', false);
}

// auth persistence after logout/login
r = await req('/auth/logout', { method: 'POST', body: '{}' });
check('logout 200', r.status === 200);
const oldCookie = cookie;
cookie = '';
r = await req('/dashboard');
check('dashboard blocked after logout', r.status === 401);
r = await req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'Test1234' }) });
check('login works', r.status === 200);
check('trial persisted after relogin', r.body?.subscription?.status === 'trialing' && r.body?.subscription?.trialEndsAt === firstEnds);
check('settings persisted after relogin', r.body?.settings?.theme === 'dark');

// security checks
r = await fetch(base + '/trial/start', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
check('missing client header blocked', r.status === 403);
r = await fetch(base + '/dashboard');
check('unauthenticated dashboard blocked', r.status === 401);

r = await fetch(base + '/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'bactrack-dz', Origin: 'https://evil.example', Cookie: cookie }, body: JSON.stringify({ theme: 'light' }) });
check('cross-origin mutation blocked', r.status === 403);

r = await req('/profile/export');
check('export 200', r.status === 200 && r.body?.account?.email === email);
check('export has progress', Array.isArray(r.body?.examCompletions) && r.body.examCompletions.length === 1);

// non-owner access is impossible because every private query is scoped by user id.
// attempt to toggle a plan item id belonging to another user is tested in the test suite.

console.log(failures === 0 ? '\nALL API CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
