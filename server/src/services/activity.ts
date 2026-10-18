import { db } from '../db';
import { dateKey } from '../lib/time';

export interface ActivityInput {
  id?: string;
  type: string;
  subjectId?: string | null;
  title: string;
  minutes?: number;
  createdAt?: number;
}

/** Deterministic ids make repeated actions idempotent (no duplicate activity rows). */
export function logActivity(userId: string, input: ActivityInput): void {
  const id = input.id ?? `${input.type}:${userId}:${Math.random().toString(36).slice(2)}`;
  db.prepare(
    `INSERT OR IGNORE INTO activity_events (id, user_id, type, subject_id, title, minutes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    userId,
    input.type,
    input.subjectId ?? null,
    input.title,
    Math.max(0, Math.round(input.minutes ?? 0)),
    input.createdAt ?? Date.now(),
  );
}

/**
 * Card reviews contribute an estimated minute each to the same day's activity
 * bucket. The upsert keeps a single row per user/day and never double counts.
 */
export function addReviewMinute(
  userId: string,
  subjectId: string | null,
  now: number = Date.now(),
): void {
  const day = dateKey(now);
  db.prepare(
    `INSERT INTO activity_events (id, user_id, type, subject_id, title, minutes, created_at)
     VALUES (?, ?, 'review_minutes', ?, 'مراجعة بطاقات ذكية', 1, ?)
     ON CONFLICT(id) DO UPDATE SET minutes = activity_events.minutes + 1`,
  ).run(`review-minutes:${userId}:${day}`, userId, subjectId, now);
}

export function getMinutesByDay(
  userId: string,
  sinceTs: number,
): Map<string, number> {
  const rows = db
    .prepare(
      `SELECT created_at, minutes FROM activity_events WHERE user_id = ? AND created_at >= ?`,
    )
    .all(userId, sinceTs) as { created_at: number; minutes: number }[];
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = dateKey(Number(row.created_at));
    map.set(key, (map.get(key) ?? 0) + Number(row.minutes));
  }
  return map;
}

export function getCardsByDay(userId: string, sinceTs: number): Map<string, number> {
  const rows = db
    .prepare(`SELECT reviewed_at FROM review_log WHERE user_id = ? AND reviewed_at >= ?`)
    .all(userId, sinceTs) as { reviewed_at: number }[];
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = dateKey(Number(row.reviewed_at));
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

import { lastNDateKeys, weekdayShort, dateKeyToStartTs } from '../lib/time';

export interface DayActivity {
  date: string;
  label: string;
  minutes: number;
  cards: number;
  isToday: boolean;
}

/** Aggregated, real activity for charts. Review minutes are stored as activity too. */
export function getActivitySeries(
  userId: string,
  days: number,
  now: number = Date.now(),
): DayActivity[] {
  const keys = lastNDateKeys(days, now);
  const since = dateKeyToStartTs(keys[0]);
  const minutes = getMinutesByDay(userId, since);
  const cards = getCardsByDay(userId, since);
  const todayKey = keys[keys.length - 1];
  return keys.map((key) => ({
    date: key,
    label: weekdayShort(dateKeyToStartTs(key)),
    minutes: minutes.get(key) ?? 0,
    cards: cards.get(key) ?? 0,
    isToday: key === todayKey,
  }));
}

/** Consecutive active days, allowing today to still be empty. */
export function getStreak(userId: string, now: number = Date.now()): number {
  const since = now - 120 * 24 * 60 * 60 * 1000;
  const rows = db
    .prepare(
      `SELECT created_at AS ts FROM activity_events WHERE user_id = ? AND created_at >= ?
       UNION
       SELECT reviewed_at AS ts FROM review_log WHERE user_id = ? AND reviewed_at >= ?`,
    )
    .all(userId, since, userId, since) as { ts: number }[];
  if (rows.length === 0) return 0;
  const active = new Set(rows.map((row) => dateKey(Number(row.ts))));
  const today = dateKey(now);
  let cursor = active.has(today) ? today : dateKey(now - 24 * 60 * 60 * 1000);
  let streak = 0;
  while (active.has(cursor) && streak < 365) {
    streak += 1;
    const prev = new Date(dateKeyToStartTs(cursor) - 24 * 60 * 60 * 1000);
    cursor = dateKey(prev.getTime());
  }
  return streak;
}

export function getMinutesToday(userId: string, now: number = Date.now()): number {
  const todayStart = dateKeyToStartTs(dateKey(now));
  const row = db
    .prepare(
      'SELECT COALESCE(SUM(minutes), 0) AS total FROM activity_events WHERE user_id = ? AND created_at >= ?',
    )
    .get(userId, todayStart) as { total: number };
  return Number(row.total);
}
