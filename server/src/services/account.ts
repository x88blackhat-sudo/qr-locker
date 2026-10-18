import type { MeResponse, ThemePreference, User, UserSettings } from '../../../shared/types';
import { db } from '../db';
import { HttpError } from '../lib/http';
import { getSubscriptionInfo, syncExpiredSubscription } from './subscription';

type SqlRow = Record<string, string | number | null>;

export function getUserById(userId: string): User | null {
  const row = db
    .prepare('SELECT id, name, email, created_at FROM users WHERE id = ?')
    .get(userId) as SqlRow | undefined;
  if (!row) return null;
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    createdAt: Number(row.created_at),
  };
}

export function getSettings(userId: string): UserSettings {
  const row = db
    .prepare('SELECT theme, daily_goal_minutes FROM user_settings WHERE user_id = ?')
    .get(userId) as SqlRow | undefined;
  return {
    theme: (row?.theme as ThemePreference | undefined) ?? 'system',
    dailyGoalMinutes: Number(row?.daily_goal_minutes ?? 120),
  };
}

export function updateSettings(
  userId: string,
  patch: { theme?: ThemePreference; dailyGoalMinutes?: number },
): UserSettings {
  const current = getSettings(userId);
  const next = {
    theme: patch.theme ?? current.theme,
    dailyGoalMinutes: patch.dailyGoalMinutes ?? current.dailyGoalMinutes,
  };
  db.prepare(
    `INSERT INTO user_settings (user_id, theme, daily_goal_minutes, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       theme = excluded.theme,
       daily_goal_minutes = excluded.daily_goal_minutes,
       updated_at = excluded.updated_at`,
  ).run(userId, next.theme, next.dailyGoalMinutes, Date.now());
  return next;
}

export function updateProfileName(userId: string, name: string): User {
  db.prepare('UPDATE users SET name = ?, updated_at = ? WHERE id = ?').run(name, Date.now(), userId);
  const user = getUserById(userId);
  if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'الحساب غير موجود.');
  return user;
}

export function getMe(userId: string): MeResponse {
  syncExpiredSubscription(userId);
  const user = getUserById(userId);
  if (!user) throw new HttpError(401, 'SESSION_INVALID', 'انتهت الجلسة. يرجى تسجيل الدخول من جديد.');
  return {
    user,
    subscription: getSubscriptionInfo(userId),
    settings: getSettings(userId),
  };
}

export interface ExportPayload {
  exportedAt: string;
  account: User;
  subscription: ReturnType<typeof getSubscriptionInfo>;
  settings: UserSettings;
  examCompletions: unknown[];
  exerciseProgress: unknown[];
  cardReviews: unknown[];
  reviewHistory: unknown[];
  planItems: unknown[];
  activity: unknown[];
}

/** A complete, private data export — scoped strictly to the authenticated user. */
export function buildUserExport(userId: string): ExportPayload {
  const me = getMe(userId);
  return {
    exportedAt: new Date().toISOString(),
    account: me.user,
    subscription: me.subscription,
    settings: me.settings,
    examCompletions: db
      .prepare(
        `SELECT ec.paper_id, p.title, ec.completed_at
         FROM exam_completions ec JOIN exam_papers p ON p.id = ec.paper_id
         WHERE ec.user_id = ? ORDER BY ec.completed_at DESC`,
      )
      .all(userId),
    exerciseProgress: db
      .prepare(
        `SELECT ep.exercise_id, e.title, ep.status, ep.updated_at
         FROM exercise_progress ep JOIN exercises e ON e.id = ep.exercise_id
         WHERE ep.user_id = ? ORDER BY ep.updated_at DESC`,
      )
      .all(userId),
    cardReviews: db
      .prepare(
        `SELECT cr.card_id, f.front, cr.ease, cr.interval_days, cr.repetitions, cr.lapses,
                cr.due_at, cr.last_reviewed_at
         FROM card_reviews cr JOIN flashcards f ON f.id = cr.card_id
         WHERE cr.user_id = ? ORDER BY cr.due_at ASC`,
      )
      .all(userId),
    reviewHistory: db
      .prepare(
        `SELECT card_id, rating, reviewed_at, interval_days, ease
         FROM review_log WHERE user_id = ? ORDER BY reviewed_at DESC LIMIT 5000`,
      )
      .all(userId),
    planItems: db
      .prepare(
        `SELECT plan_date, kind, title, minutes, completed_at FROM plan_items
         WHERE user_id = ? ORDER BY created_at DESC`,
      )
      .all(userId),
    activity: db
      .prepare(
        `SELECT type, title, minutes, created_at FROM activity_events
         WHERE user_id = ? ORDER BY created_at DESC LIMIT 2000`,
      )
      .all(userId),
  };
}
