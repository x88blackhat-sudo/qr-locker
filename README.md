# BacTrack DZ

منصة دراسة عربية للبكالوريا الجزائرية — واجهة RTL كاملة، مواد المنهاج، متابعة مواضيع الامتحانات، تمارين،
بطاقات مراجعة بجدولة ذكية، خطة يومية، وتحليلات مبنية على بيانات الطالب الفعلية. التجربة المجانية 30 يومًا
مُفعّلة ومُحكومة من الخادم وقاعدة البيانات، وليست عدّادًا في المتصفح.

BacTrack DZ is an Arabic-first (RTL) study platform for the Algerian Baccalaureate. It ships a complete
Express + SQLite API, a premium React/Tailwind interface, real study progress, and a server-enforced
30-day trial. Payment processing is intentionally **disabled** in this build; no paid state can be faked
and no prices are invented.

---

## Stack

- **Client**: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, React Router 7, TanStack Query 5,
  lucide-react, hand-built accessible SVG charts, IBM Plex Sans Arabic + Alexandria Variable fonts.
- **Server**: Express 5, Zod 4, `node:sqlite` (`DatabaseSync`), scrypt password hashing, opaque
  HttpOnly session cookies.
- **Tests**: `node:test` through `tsx`, plus a live HTTP smoke script.

No frontend build step injects secrets. The client only talks to `/api` on its own origin.

---

## Quick start

```bash
npm install
cp .env.example .env          # optional; defaults work locally
npm run db:seed               # seed / verify the shared curriculum (safe to re-run)
npm run dev                   # API :3000 + Vite :5173 (proxies /api)
```

Production-style single port:

```bash
npm run build                 # typecheck + build client into dist/client
npm start                     # API + built client on :3000
```

The database defaults to `./data/bactrack.db` and is created automatically. Set `DATABASE_PATH` to use
another file. The schema is applied on boot; seeding uses `INSERT OR IGNORE`, so restarts never duplicate
curriculum rows or delete progress.

### Demo accounts

`npm run db:seed` only seeds the **shared curriculum** (subjects, units, topics, papers, exercises,
flashcards, study series). It never creates fake students or fake progress. Register through the UI to get
an account; the dashboard will show real zeros until you study.

---

## What is included

| Area | Behaviour |
| --- | --- |
| Landing | Arabic hero, real dashboard preview labelled «معاينة», features, 30-day trial offer, plans, footer legal links |
| Dashboard | Greeting, weighted progress, today's plan, subjects needing attention, upcoming reviews, recent activity, weekly chart, single primary CTA |
| Subjects | Nine subjects with coefficient-weighted overall mastery; detail tabs for overview, exams, exercises, study series and flashcards |
| Exam tracker | Filters by subject, year, session and completion; idempotent completion; mobile-friendly toggle |
| Smart revision | SM-2-style scheduling (ratings 1–4), reveal flow, keyboard shortcuts (Space, 1–4), session progress, subject-scoped queues |
| Analytics | 14-day activity, 7-day review forecast, mastery donut, exam completion, per-subject breakdown, daily goal |
| Settings | Profile name, server-persisted theme, daily goal, password change (revokes other sessions), data export, logout-all |
| Trial | Onboarding offer, server dates, remaining days, gentle near-expiry notice, explicit expired state that preserves data |
| Plans | Honest status + planned plan shapes, explicit «الدفع غير مُفعّل» messaging, no buy button |
| Themes | Light / dark / system, persisted locally and, when signed in, on the account |

Progress formula: **exams 40% + exercises 35% + card mastery 25%**, aggregated by subject coefficient.
All figures come from the student's rows; nothing is randomised.

---

## Trial lifecycle (server-enforced)

```
not_started ──POST /api/trial/start──▶ trialing ──30 days──▶ expired
                                           │
                                           └──verified webhook──▶ active_paid
cancelled is displayable; only a verified payment/webhook path may set active_paid.
```

- One `subscriptions` row per user (`PRIMARY KEY (user_id)`), created at registration.
- `trial_started_at` and `trial_ends_at` are written only by the server. `trial_ends_at = trial_started_at + 2,592,000,000 ms` (exactly 30 days).
- Starting uses a conditional `UPDATE ... WHERE trial_used = 0` inside a transaction, then writes a
  `trial_events` audit row. A second attempt returns `409 TRIAL_ALREADY_USED`.
- `GET /api/trial` derives status from stored timestamps; `expired` is also persisted lazily and by a
  periodic sweeper. The client never sends a date or status.
- Logout, a new device, cleared storage or a new session cannot reset the window. There is no HTTP route
  that mutates trial or subscription fields.
- On expiry, reads stay available (subjects, analytics, export, history) while study **writes** return
  `403 TRIAL_EXPIRED`. No flashcard, exam record, note or history row is deleted.
- `active_paid` requires `subscription_provider` and `subscription_reference`; the only code path is
  `applyVerifiedPayment()` in `server/src/services/subscription.ts`, which is not exposed over HTTP.

### Database-level guarantees

- `CHECK` constraints enforce: a used trial always has both timestamps and exactly 30 days; `not_started`
  implies unused; `trialing`/`expired` imply used; `active_paid` implies provider + reference.
- `trg_subscription_trial_immutable` blocks updates to the trial window once used.
- `trg_subscription_trial_no_recreate` blocks invalid trial inserts for used trials.
- `trg_subscription_paid_requires_payment` blocks direct promotion to `active_paid`.
- Foreign keys with `ON DELETE CASCADE` and per-user indexes keep private data isolated.

---

## Security controls (actual, not aspirational)

- **Authentication**: scrypt password hashes with per-user salt; opaque 32-byte session tokens; only the
  SHA-256 of a token is stored; HttpOnly cookie, `SameSite=Lax` in production and `SameSite=None; Secure`
  only for HTTPS development previews (framing is blocked in production).
- **CSRF**: mutations require `X-Requested-With: bactrack-dz`, and a present `Origin` must equal the
  request host, the proxy's `X-Forwarded-Host`, or `APP_ORIGIN`. Simple form posts cannot satisfy either
  check. In development only, `*.e2b.app` is accepted so the sandbox preview can call the API; production
  keeps the strict host check.
- **Validation**: every body/query is parsed with strict Zod schemas; unknown trial/payment fields are
  discarded. SQL uses bound parameters.
- **Authorization**: every progress query is scoped by `req.user.id`. Cross-user plan/exam/exercise ids
  return 404, never another student's row.
- **Abuse limits**: in-memory rate limits on login, registration and trial activation; 429 with
  `Retry-After`. Limits are per process (single instance) — put a shared store in front if you scale out.
- **Trial**: server timestamps, one row per user, DB triggers, write gating middleware, audit events.
- **Headers**: `nosniff`, referrer policy, permissions policy, COOP; `X-Frame-Options`/CSP only in
  production, relaxed for the sandbox preview host in development.

### Known limitations

- No email verification, password reset, 2FA, or admin console.
- Rate limiting is in-memory and resets on restart.
- No payment provider is connected; `PAYMENT_PROVIDER`/`PAYMENT_WEBHOOK_SECRET` are placeholders.
- Trial abuse is mitigated per account, not per person: someone can create multiple accounts with
  different emails. Device fingerprinting is deliberately not used.
- The SQLite file is single-node. For horizontal scaling, move to a server database and shared rate limits.

---

## Adding real payments later

The UI already reads `paymentsConfigured` from `GET /api/public-config` (true only when
`PAYMENT_PROVIDER` and `PAYMENT_WEBHOOK_SECRET` are set) and never invents a paid state. To enable
payments for real:

1. Choose a provider that supports Algeria (e.g. Chargily, SATIM/CIB, or an international processor)
   and create merchant credentials.
2. Add server-only env vars (`PAYMENT_PROVIDER`, `PAYMENT_WEBHOOK_SECRET`, provider API key). Never
   expose them through Vite (`VITE_*`) or any client module.
3. Add a `POST /api/payments/webhook` route that:
   - reads the raw body and verifies the provider signature/timestamp;
   - resolves the user via a server-created checkout reference (store your own `payment_intents` row);
   - is idempotent on the provider event id;
   - calls `applyVerifiedPayment(userId, { provider, reference, periodEnd })`;
   - returns 2xx only after the DB commit, and logs failures.
4. Add an authenticated `POST /api/payments/checkout` that creates a provider session server-side and
   returns the hosted checkout URL. The amount and plan are chosen on the server, never trusted from the
   client.
5. Keep `active_paid` derived from `current_period_end`; a later webhook (refund/chargeback/cancel) should
   move the account to `cancelled` or `expired` without deleting study data.
6. Replace the «قريبًا» plan cards with real prices only after the provider is live, and update the plans
   page copy to state taxes, renewal and cancellation terms.
7. Add tests for signature failure, replay, amount mismatch, cross-user reference and refund handling
   before exposing any purchase button.

Until then the product tells the truth: no card is requested, no charge is made, and the 30-day trial is
the complete way to use BacTrack DZ.

---

## Project layout

```
client/                 React app (RTL), design tokens, pages, charts, providers
  src/lib/              api, auth, theme, query keys, Arabic formatters, labels
  src/components/       ui primitives, charts, layout, marketing, app widgets
  src/pages/            Landing, auth, legal, app screens
server/
  src/routes/           auth, account, study, exams
  src/services/         auth, subscription, progress, plan, revision, analytics, dashboard, account
  src/middleware/       session attach, CSRF/origin guards, rate limiting, study-access gate
  src/db/               schema.sql, idempotent seed, migrations
shared/types.ts         Single API contract shared by client and server
tests/                  node:test suites (API, trial security, isolation)
scripts/api-check.mjs   Live HTTP smoke checks (needs a running server + fresh emails)
scripts/render-check.mjs  Server-render smoke for every page (no browser required)
```

---

## Testing

```bash
npm test              # 22 integration assertions on a throwaway SQLite DB
npm run typecheck     # client + server TypeScript
npm run build         # production client build
node scripts/api-check.mjs    # 47 live checks; server must be on :3000
node scripts/render-check.mjs # server-renders all 16 page states against the live API
```

The automated suites cover:

- registration and real zero-state dashboard;
- trial activation, exact 30-day window, second-claim rejection, persistence across logout/login;
- client tampering with trial/subscription fields (ignored), missing CSRF header, cross-origin calls;
- DB trigger/constraint rejection of trial edits and fake paid status;
- simulated expiry (test DB only): reads/export preserved, writes 403, no reset path;
- per-student isolation and cross-user 404s;
- exam completion idempotency and single stored row;
- exercise/plan/revision persistence, subject-scoped queue, analytics and forecast;
- settings/profile validation, password change + session revocation, logout-all, data export;
- SSR render of landing, auth, legal, dashboard, subjects, exams, revision, analytics, settings,
  trial-offer and expired/active trial states (16 page states, including the required trial copy).

Manual QA path: register → start trial → complete an exam twice → rate a flashcard → refresh → logout →
login → confirm progress/trial unchanged → toggle theme → reload → resize to mobile → check filters and
keyboard shortcuts. No headless browser is bundled, so visual QA is manual.

---

## Environment

See `.env.example`. Important values: `DATABASE_PATH`, `APP_ORIGIN`, `COOKIE_SECURE`, `SESSION_DAYS`,
`TRUST_PROXY`, `SUPPORT_EMAIL`, and the disabled `PAYMENT_*` placeholders. The app runs with zero external
services.
