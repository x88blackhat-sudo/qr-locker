/**
 * Renders every page with React's server renderer against a live API.
 * This is a fast way to catch missing exports, bad hooks and data-shape
 * crashes without a headless browser. It requires `npm start` (or the API) to
 * be running on PORT (default 3000) and writes a throwaway account.
 *
 * Usage: node scripts/render-check.mjs
 */
import { createServer } from 'vite';

const base = `http://127.0.0.1:${process.env.PORT ?? 3000}/api`;
let cookie = '';

async function api(path, options = {}) {
  const res = await fetch(base + path, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'bactrack-dz',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(';');
    if (pair.startsWith('bactrack_session=')) cookie = pair;
  }
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

const email = `render.${Date.now()}@test.dz`;
const registration = await api('/auth/register', {
  method: 'POST',
  body: { name: 'طالب عرض', email, password: 'Test1234', acceptTerms: true },
});
if (registration.status !== 201) throw new Error(`register failed: ${registration.status}`);
await api('/trial/start', { method: 'POST', body: {} });

const exams = await api('/exams?subject=math');
await api(`/exams/${exams.json.papers[0].id}/completion`, {
  method: 'POST',
  body: { completed: true },
});
const queue = await api('/revision/queue?subject=math');
await api('/revision/review', {
  method: 'POST',
  body: { cardId: queue.json.cards[0].id, rating: 3 },
});

const fixtures = {
  me: (await api('/auth/me')).json,
  dashboard: (await api('/dashboard')).json,
  analytics: (await api('/analytics')).json,
  subjects: (await api('/subjects')).json,
  subject: (await api('/subjects/math')).json,
  revision: (await api('/revision/queue')).json,
  plan: (await api('/plan/today')).json,
};

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
const load = (modulePath) => vite.ssrLoadModule(modulePath);
const React = (await import('react')).default;
const { renderToString } = await import('react-dom/server');
const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
const { MemoryRouter, Routes, Route } = await import('react-router-dom');
const { ThemeProvider } = await load('/src/lib/theme.tsx');
const { AuthProvider } = await load('/src/lib/auth.tsx');
const { ToastProvider } = await load('/src/components/ui/Toast.tsx');
const { queryKeys } = await load('/src/lib/query.ts');

const pages = [
  ['Landing', '/src/pages/Landing.tsx', '/'],
  ['Login', '/src/pages/Login.tsx', '/login'],
  ['Register', '/src/pages/Register.tsx', '/register'],
  ['Privacy', '/src/pages/Legal.tsx', '/privacy', { kind: 'privacy' }],
  ['Terms', '/src/pages/Legal.tsx', '/terms', { kind: 'terms' }],
  ['NotFound', '/src/pages/NotFound.tsx', '/nope'],
  ['Dashboard', '/src/pages/app/Dashboard.tsx', '/app/dashboard'],
  ['Subjects', '/src/pages/app/Subjects.tsx', '/app/subjects'],
  ['SubjectDetail', '/src/pages/app/SubjectDetail.tsx', '/app/subjects/math'],
  ['Exams', '/src/pages/app/Exams.tsx', '/app/exams'],
  ['Revision', '/src/pages/app/Revision.tsx', '/app/revision'],
  ['Analytics', '/src/pages/app/Analytics.tsx', '/app/analytics'],
  ['Settings', '/src/pages/app/Settings.tsx', '/app/settings'],
  ['Trial', '/src/pages/app/Trial.tsx', '/app/trial'],
  [
    'TrialOffer',
    '/src/pages/app/Trial.tsx',
    '/app/trial',
    null,
    { ...fixtures.me, subscription: { ...fixtures.me.subscription, status: 'not_started', access: 'none', trialUsed: false, trialStartedAt: null, trialEndsAt: null, daysRemaining: null, hoursRemaining: null, endingSoon: false } },
  ],
  ['Plans', '/src/pages/app/Plans.tsx', '/app/plans'],
];

const failures = [];
for (const [name, modulePath, route, props, meOverride] of pages) {
  let page;
  try {
    page = await load(modulePath);
  } catch (error) {
    failures.push(`${name} import: ${error.message}`);
    console.log(`FAIL ${name} import: ${error.message}`);
    continue;
  }

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
  });
  client.setQueryData(queryKeys.me, meOverride ?? fixtures.me);
  client.setQueryData(queryKeys.dashboard, fixtures.dashboard);
  client.setQueryData(queryKeys.analytics, fixtures.analytics);
  client.setQueryData(queryKeys.subjects, fixtures.subjects);
  client.setQueryData(queryKeys.subject('math'), fixtures.subject);
  client.setQueryData(queryKeys.revisionQueue(), fixtures.revision);
  client.setQueryData(queryKeys.plan, fixtures.plan);

  const tree = React.createElement(
    ThemeProvider,
    null,
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(
        AuthProvider,
        null,
        React.createElement(
          ToastProvider,
          null,
          React.createElement(
            MemoryRouter,
            { initialEntries: [route] },
            React.createElement(
              Routes,
              null,
              React.createElement(Route, {
                path: name === 'SubjectDetail' ? '/app/subjects/:slug' : route,
                element: React.createElement(page.default, props ?? null),
              }),
            ),
          ),
        ),
      ),
    ),
  );

  try {
    const html = renderToString(tree);
    console.log(`PASS ${name} (${html.length} chars)`);
  } catch (error) {
    failures.push(`${name} render: ${error.message}`);
    console.log(`FAIL ${name}: ${error.message}`);
  }
}

await vite.close();
if (failures.length) {
  console.error(`\n${failures.length} RENDER CHECK(S) FAILED\n${failures.join('\n')}`);
  process.exit(1);
}
console.log('\nALL PAGE RENDER CHECKS PASSED');
