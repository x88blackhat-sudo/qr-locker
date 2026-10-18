-- BacTrack DZ — relational schema (SQLite, server-owned)
-- All private student data carries a user_id and is only ever queried with the
-- authenticated user's id. Curriculum content is shared and read-only for students.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 60),
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  terms_accepted_at INTEGER,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY, -- SHA-256 of the session token, never the token itself
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  user_agent TEXT,
  ip         TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id           TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme             TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  daily_goal_minutes INTEGER NOT NULL DEFAULT 120 CHECK (daily_goal_minutes BETWEEN 15 AND 480),
  updated_at        INTEGER NOT NULL
);

-- One subscription row per account. The trial window is written once by the
-- server and made immutable by a trigger below; a client can never supply dates.
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id               TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  trial_started_at      INTEGER,
  trial_ends_at         INTEGER,
  trial_used            INTEGER NOT NULL DEFAULT 0 CHECK (trial_used IN (0, 1)),
  subscription_status   TEXT NOT NULL DEFAULT 'not_started'
                        CHECK (subscription_status IN ('not_started', 'trialing', 'expired', 'active_paid', 'cancelled')),
  subscription_provider TEXT,
  subscription_reference TEXT,
  current_period_end    INTEGER,
  updated_at            INTEGER NOT NULL,
  CHECK (
    (trial_used = 0 AND trial_started_at IS NULL AND trial_ends_at IS NULL)
    OR
    (trial_used = 1 AND trial_started_at IS NOT NULL AND trial_ends_at IS NOT NULL
      AND trial_ends_at = trial_started_at + 2592000000) -- exactly 30 days
  ),
  CHECK (subscription_status <> 'not_started' OR trial_used = 0),
  CHECK (subscription_status NOT IN ('trialing', 'expired') OR trial_used = 1),
  CHECK (subscription_status <> 'active_paid'
         OR (subscription_provider IS NOT NULL AND subscription_reference IS NOT NULL))
);

CREATE TRIGGER IF NOT EXISTS trg_subscription_trial_immutable
BEFORE UPDATE OF trial_started_at, trial_ends_at, trial_used ON subscriptions
FOR EACH ROW
WHEN OLD.trial_used = 1
  AND (
    NEW.trial_used IS NOT OLD.trial_used
    OR NEW.trial_started_at IS NOT OLD.trial_started_at
    OR NEW.trial_ends_at IS NOT OLD.trial_ends_at
  )
BEGIN
  SELECT RAISE(ABORT, 'trial_window_immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_subscription_trial_no_recreate
BEFORE INSERT ON subscriptions
FOR EACH ROW
WHEN NEW.trial_used = 1
  AND (NEW.trial_started_at IS NULL OR NEW.trial_ends_at IS NULL
       OR NEW.trial_ends_at <> NEW.trial_started_at + 2592000000)
BEGIN
  SELECT RAISE(ABORT, 'invalid_trial_window');
END;

CREATE TRIGGER IF NOT EXISTS trg_subscription_paid_requires_payment
BEFORE UPDATE OF subscription_status ON subscriptions
FOR EACH ROW
WHEN NEW.subscription_status = 'active_paid'
  AND (NEW.subscription_provider IS NULL OR NEW.subscription_reference IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'paid_status_requires_verified_payment');
END;

CREATE TABLE IF NOT EXISTS trial_events (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event   TEXT NOT NULL CHECK (event IN ('started', 'expired', 'paid', 'cancelled')),
  at      INTEGER NOT NULL,
  ip      TEXT,
  meta    TEXT
);
CREATE INDEX IF NOT EXISTS idx_trial_events_user ON trial_events(user_id, at);

-- ── Shared curriculum (read-only for students, seeded by the server) ─────────
CREATE TABLE IF NOT EXISTS subjects (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  short_name  TEXT NOT NULL,
  description TEXT NOT NULL,
  color       TEXT NOT NULL,
  icon        TEXT NOT NULL,
  coefficient INTEGER NOT NULL CHECK (coefficient BETWEEN 1 AND 10),
  sort_index  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS units (
  id          TEXT PRIMARY KEY,
  subject_id  TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_index  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_units_subject ON units(subject_id, sort_index);

CREATE TABLE IF NOT EXISTS exercises (
  id          TEXT PRIMARY KEY,
  unit_id     TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  difficulty  TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  est_minutes INTEGER NOT NULL CHECK (est_minutes BETWEEN 5 AND 240),
  sort_index  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_exercises_unit ON exercises(unit_id, sort_index);

CREATE TABLE IF NOT EXISTS flashcards (
  id         TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  unit_id    TEXT REFERENCES units(id) ON DELETE CASCADE,
  front      TEXT NOT NULL,
  back       TEXT NOT NULL,
  hint       TEXT,
  sort_index INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_flashcards_subject ON flashcards(subject_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_unit ON flashcards(unit_id);

CREATE TABLE IF NOT EXISTS exam_papers (
  id               TEXT PRIMARY KEY,
  subject_id       TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  year             INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  session          TEXT NOT NULL CHECK (session IN ('principale', 'rattrapage', 'blanc')),
  title            TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 30 AND 300),
  total_points     INTEGER NOT NULL CHECK (total_points BETWEEN 20 AND 200),
  sort_index       INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_papers_subject ON exam_papers(subject_id, year DESC);

CREATE TABLE IF NOT EXISTS exam_topics (
  id         TEXT PRIMARY KEY,
  paper_id   TEXT NOT NULL REFERENCES exam_papers(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  sort_index INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_topics_paper ON exam_topics(paper_id);

CREATE TABLE IF NOT EXISTS study_series (
  id          TEXT PRIMARY KEY,
  subject_id  TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  unit_id     TEXT REFERENCES units(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  item_count  INTEGER NOT NULL CHECK (item_count > 0),
  est_minutes INTEGER NOT NULL CHECK (est_minutes > 0),
  sort_index  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_series_subject ON study_series(subject_id);

-- ── Private student progress ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_completions (
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  paper_id     TEXT NOT NULL REFERENCES exam_papers(id) ON DELETE CASCADE,
  completed_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, paper_id)
);
CREATE INDEX IF NOT EXISTS idx_exam_completions_user ON exam_completions(user_id);

CREATE TABLE IF NOT EXISTS exercise_progress (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  status      TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'done')),
  updated_at  INTEGER NOT NULL,
  PRIMARY KEY (user_id, exercise_id)
);

CREATE TABLE IF NOT EXISTS card_reviews (
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id          TEXT NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  ease             REAL NOT NULL DEFAULT 2.5 CHECK (ease BETWEEN 1.3 AND 3.0),
  interval_days    INTEGER NOT NULL DEFAULT 0 CHECK (interval_days >= 0),
  repetitions      INTEGER NOT NULL DEFAULT 0 CHECK (repetitions >= 0),
  lapses           INTEGER NOT NULL DEFAULT 0 CHECK (lapses >= 0),
  due_at           INTEGER NOT NULL,
  last_reviewed_at INTEGER NOT NULL,
  rating_last      INTEGER CHECK (rating_last BETWEEN 1 AND 4),
  PRIMARY KEY (user_id, card_id)
);
CREATE INDEX IF NOT EXISTS idx_card_reviews_due ON card_reviews(user_id, due_at);

CREATE TABLE IF NOT EXISTS review_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id      TEXT NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 4),
  reviewed_at  INTEGER NOT NULL,
  interval_days INTEGER NOT NULL,
  ease         REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_review_log_user_time ON review_log(user_id, reviewed_at);

CREATE TABLE IF NOT EXISTS plan_items (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_date    TEXT NOT NULL, -- YYYY-MM-DD in Africa/Algiers
  kind         TEXT NOT NULL CHECK (kind IN ('review', 'exercise', 'exam', 'series')),
  ref_id       TEXT NOT NULL,
  subject_id   TEXT REFERENCES subjects(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  subtitle     TEXT NOT NULL,
  minutes      INTEGER NOT NULL CHECK (minutes > 0),
  href         TEXT NOT NULL,
  completed_at INTEGER,
  created_at   INTEGER NOT NULL,
  UNIQUE (user_id, plan_date, kind, ref_id)
);
CREATE INDEX IF NOT EXISTS idx_plan_user_date ON plan_items(user_id, plan_date);

CREATE TABLE IF NOT EXISTS activity_events (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
  title      TEXT NOT NULL,
  minutes    INTEGER NOT NULL DEFAULT 0 CHECK (minutes >= 0),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_user_time ON activity_events(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS series_progress (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  series_id  TEXT NOT NULL REFERENCES study_series(id) ON DELETE CASCADE,
  done_items INTEGER NOT NULL DEFAULT 0 CHECK (done_items >= 0),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, series_id)
);
