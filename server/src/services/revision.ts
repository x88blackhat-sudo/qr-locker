import type { ReviewCard, RevisionQueueResponse, ReviewResult } from '../../../shared/types';
import { db } from '../db';
import { HttpError } from '../lib/http';
import { dateKey, dateKeyToStartTs, DAY_MS } from '../lib/time';
import { addReviewMinute } from './activity';

type SqlRow = Record<string, string | number | null>;

const CARD_SELECT = `
  SELECT f.id, f.front, f.back, f.hint, f.unit_id,
         s.name AS subject_name, s.slug AS subject_slug, s.color AS subject_color,
         u.title AS unit_title,
         cr.due_at, cr.repetitions, cr.interval_days
  FROM flashcards f
  JOIN subjects s ON s.id = f.subject_id
  LEFT JOIN units u ON u.id = f.unit_id
  LEFT JOIN card_reviews cr ON cr.card_id = f.id AND cr.user_id = ?
`;

function mapCard(row: SqlRow): ReviewCard {
  return {
    id: String(row.id),
    front: String(row.front),
    back: String(row.back),
    hint: row.hint === null ? null : String(row.hint),
    subject: {
      name: String(row.subject_name),
      slug: String(row.subject_slug),
      color: String(row.subject_color),
    },
    unitTitle: row.unit_title === null ? null : String(row.unit_title),
    isNew: row.repetitions === null,
    dueAt: row.due_at === null ? null : Number(row.due_at),
    repetitions: Number(row.repetitions ?? 0),
  };
}

export function getRevisionQueue(
  userId: string,
  limit = 20,
  now: number = Date.now(),
  subjectSlug?: string,
): RevisionQueueResponse {
  const safeLimit = Math.min(Math.max(limit, 1), 40);

  const subject = subjectSlug
    ? (db.prepare('SELECT id, name FROM subjects WHERE slug = ?').get(subjectSlug) as
        | { id: string; name: string }
        | undefined)
    : undefined;
  if (subjectSlug && !subject) {
    throw new HttpError(404, 'SUBJECT_NOT_FOUND', 'هذه المادة غير موجودة.');
  }
  const subjectId = subject?.id ?? null;

  const dueRows = db
    .prepare(
      `${CARD_SELECT}
       WHERE cr.user_id IS NOT NULL AND cr.due_at <= ?${subjectId ? ' AND s.id = ?' : ''}
       ORDER BY cr.due_at ASC, s.sort_index, f.sort_index
       LIMIT ?`,
    )
    .all(...[userId, now, ...(subjectId ? [subjectId] : []), safeLimit]) as SqlRow[];

  const remaining = safeLimit - dueRows.length;
  const freshRows =
    remaining > 0
      ? (db
          .prepare(
            `${CARD_SELECT}
             WHERE cr.user_id IS NULL${subjectId ? ' AND s.id = ?' : ''}
             ORDER BY s.sort_index, f.sort_index
             LIMIT ?`,
          )
          .all(...[userId, ...(subjectId ? [subjectId] : []), remaining]) as SqlRow[])
      : [];

  const endOfToday = dateKeyToStartTs(dateKey(now)) + DAY_MS;
  const countSql = `
    SELECT
      (SELECT COUNT(*) FROM card_reviews cr JOIN flashcards f ON f.id = cr.card_id
        WHERE cr.user_id = ? AND cr.due_at <= ?${subjectId ? ' AND f.subject_id = ?' : ''}) AS due_now,
      (SELECT COUNT(*) FROM card_reviews cr JOIN flashcards f ON f.id = cr.card_id
        WHERE cr.user_id = ? AND cr.due_at <= ?${subjectId ? ' AND f.subject_id = ?' : ''}) AS due_today,
      (SELECT COUNT(*) FROM card_reviews cr JOIN flashcards f ON f.id = cr.card_id
        WHERE cr.user_id = ? AND cr.due_at <= ?${subjectId ? ' AND f.subject_id = ?' : ''}) AS next7,
      (SELECT MIN(cr.due_at) FROM card_reviews cr JOIN flashcards f ON f.id = cr.card_id
        WHERE cr.user_id = ?${subjectId ? ' AND f.subject_id = ?' : ''}) AS next_due,
      (SELECT COUNT(*) FROM flashcards f
        WHERE 1 = 1${subjectId ? ' AND f.subject_id = ?' : ''}
          AND NOT EXISTS (SELECT 1 FROM card_reviews cr WHERE cr.user_id = ? AND cr.card_id = f.id)) AS new_cards,
      (SELECT COUNT(*) FROM flashcards f WHERE 1 = 1${subjectId ? ' AND f.subject_id = ?' : ''}) AS total_cards,
      (SELECT COUNT(*) FROM review_log rl JOIN flashcards f ON f.id = rl.card_id
        WHERE rl.user_id = ? AND rl.reviewed_at >= ?${subjectId ? ' AND f.subject_id = ?' : ''}) AS reviewed_today
  `;
  const countParams: (string | number)[] = [];
  countParams.push(userId, now);
  if (subjectId) countParams.push(subjectId);
  countParams.push(userId, endOfToday);
  if (subjectId) countParams.push(subjectId);
  countParams.push(userId, now + 7 * DAY_MS);
  if (subjectId) countParams.push(subjectId);
  countParams.push(userId);
  if (subjectId) countParams.push(subjectId);
  if (subjectId) countParams.push(subjectId);
  countParams.push(userId);
  if (subjectId) countParams.push(subjectId);
  countParams.push(userId, dateKeyToStartTs(dateKey(now)));
  if (subjectId) countParams.push(subjectId);

  const counts = db.prepare(countSql).get(...countParams) as SqlRow;

  return {
    cards: [...dueRows, ...freshRows].map(mapCard),
    dueNow: Number(counts.due_now ?? 0),
    dueToday: Number(counts.due_today ?? 0),
    newCards: Number(counts.new_cards ?? 0),
    totalCards: Number(counts.total_cards ?? 0),
    reviewedToday: Number(counts.reviewed_today ?? 0),
    nextDueAt: counts.next_due === null ? null : Number(counts.next_due),
    subjectName: subject?.name ?? null,
  };
}

const MINUTE = 60 * 1000;

/**
 * SM-2 inspired spaced repetition. Every rating is persisted immediately and the
 * next due date is computed on the server, never accepted from the client.
 */
export function submitReview(
  userId: string,
  cardId: string,
  rating: 1 | 2 | 3 | 4,
  now: number = Date.now(),
): ReviewResult {
  const card = db
    .prepare(
      `SELECT f.id, f.subject_id FROM flashcards f WHERE f.id = ?`,
    )
    .get(cardId) as { id: string; subject_id: string } | undefined;
  if (!card) throw new HttpError(404, 'CARD_NOT_FOUND', 'هذه البطاقة غير موجودة.');

  const existing = db
    .prepare(
      `SELECT ease, interval_days, repetitions, lapses FROM card_reviews
       WHERE user_id = ? AND card_id = ?`,
    )
    .get(userId, cardId) as
    | { ease: number; interval_days: number; repetitions: number; lapses: number }
    | undefined;

  let ease = existing ? Number(existing.ease) : 2.5;
  const previousInterval = existing ? Number(existing.interval_days) : 0;
  let repetitions = existing ? Number(existing.repetitions) : 0;
  let lapses = existing ? Number(existing.lapses) : 0;
  let intervalDays = 0;
  let dueAt = now;

  if (rating === 1) {
    ease = Math.max(1.3, ease - 0.2);
    repetitions = 0;
    lapses += 1;
    intervalDays = 0;
    dueAt = now + 10 * MINUTE;
  } else if (rating === 2) {
    ease = Math.max(1.3, ease - 0.15);
    repetitions += 1;
    intervalDays = previousInterval <= 0 ? 1 : Math.max(1, Math.round(previousInterval * 1.2));
    dueAt = now + intervalDays * DAY_MS;
  } else if (rating === 3) {
    repetitions += 1;
    intervalDays =
      previousInterval <= 0 ? 1 : repetitions <= 2 ? 3 : Math.max(1, Math.round(previousInterval * ease));
    dueAt = now + intervalDays * DAY_MS;
  } else {
    ease = Math.min(3, ease + 0.15);
    repetitions += 1;
    intervalDays =
      previousInterval <= 0 ? 3 : Math.max(1, Math.round(previousInterval * ease * 1.3));
    dueAt = now + intervalDays * DAY_MS;
  }

  intervalDays = Math.min(intervalDays, 365);
  if (rating !== 1) dueAt = now + intervalDays * DAY_MS;

  db.prepare(
    `INSERT INTO card_reviews
       (user_id, card_id, ease, interval_days, repetitions, lapses, due_at, last_reviewed_at, rating_last)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, card_id) DO UPDATE SET
       ease = excluded.ease,
       interval_days = excluded.interval_days,
       repetitions = excluded.repetitions,
       lapses = excluded.lapses,
       due_at = excluded.due_at,
       last_reviewed_at = excluded.last_reviewed_at,
       rating_last = excluded.rating_last`,
  ).run(userId, cardId, ease, intervalDays, repetitions, lapses, dueAt, now, rating);

  db.prepare(
    `INSERT INTO review_log (user_id, card_id, rating, reviewed_at, interval_days, ease)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(userId, cardId, rating, now, intervalDays, ease);

  addReviewMinute(userId, card.subject_id, now);

  // Completing a review automatically ticks today's review plan item.
  db.prepare(
    `UPDATE plan_items SET completed_at = ?
     WHERE user_id = ? AND plan_date = ? AND kind = 'review' AND completed_at IS NULL`,
  ).run(now, userId, dateKey(now));

  const remaining = db
    .prepare('SELECT COUNT(*) AS count FROM card_reviews WHERE user_id = ? AND due_at <= ?')
    .get(userId, now) as { count: number };

  return {
    cardId,
    dueAt,
    intervalDays,
    ease,
    repetitions,
    remainingDue: Number(remaining.count),
  };
}
