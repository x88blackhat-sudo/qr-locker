import type {
  ExerciseInfo,
  StudySeries,
  SubjectDetailResponse,
  UnitInfo,
} from '../../../shared/types';
import { db } from '../db';
import { HttpError } from '../lib/http';
import { logActivity } from './activity';
import { listExamPapers } from './exams';
import {
  blendProgress,
  clampPct,
  getSubjectProgress,
  getSubjectReviewCounts,
} from './progress';

type SqlRow = Record<string, string | number | null>;

function subjectExists(slug: string): { id: string } | null {
  const row = db.prepare('SELECT id FROM subjects WHERE slug = ?').get(slug) as
    | { id: string }
    | undefined;
  return row ?? null;
}

export function getSubjectDetail(
  userId: string,
  slug: string,
  now: number = Date.now(),
): SubjectDetailResponse {
  const subject = getSubjectProgress(userId, slug, now);
  const ref = subjectExists(slug);
  if (!subject || !ref) {
    throw new HttpError(404, 'SUBJECT_NOT_FOUND', 'هذه المادة غير موجودة.');
  }

  const unitRows = db
    .prepare(
      `SELECT u.id, u.title, u.description,
         (SELECT COUNT(*) FROM exercises e WHERE e.unit_id = u.id) AS exercise_count,
         (SELECT COUNT(*) FROM exercise_progress ep
            JOIN exercises e ON e.id = ep.exercise_id
            WHERE ep.user_id = ? AND ep.status = 'done' AND e.unit_id = u.id) AS done_exercises,
         (SELECT COUNT(*) FROM flashcards f WHERE f.unit_id = u.id) AS card_count,
         (SELECT COUNT(*) FROM card_reviews cr
            JOIN flashcards f ON f.id = cr.card_id
            WHERE cr.user_id = ? AND cr.repetitions >= 2 AND f.unit_id = u.id) AS mastered_cards,
         (SELECT COUNT(*) FROM study_series ss WHERE ss.unit_id = u.id) AS series_count
       FROM units u WHERE u.subject_id = ? ORDER BY u.sort_index`,
    )
    .all(userId, userId, ref.id) as SqlRow[];

  const units: UnitInfo[] = unitRows.map((row) => {
    const exerciseCount = Number(row.exercise_count);
    const doneExercises = Number(row.done_exercises);
    const cardCount = Number(row.card_count);
    const masteredCards = Number(row.mastered_cards);
    const exercisePct = exerciseCount ? clampPct((doneExercises / exerciseCount) * 100) : 0;
    const masteryPct = cardCount ? clampPct((masteredCards / cardCount) * 100) : 0;
    return {
      id: String(row.id),
      title: String(row.title),
      description: String(row.description),
      progress: blendProgress(0, exercisePct, masteryPct),
      exerciseCount,
      doneExercises,
      cardCount,
      masteredCards,
      seriesCount: Number(row.series_count),
    };
  });

  const seriesRows = db
    .prepare(
      `SELECT ss.id, ss.title, ss.description, ss.item_count, ss.est_minutes,
              u.title AS unit_title, COALESCE(sp.done_items, 0) AS done_items
       FROM study_series ss
       LEFT JOIN units u ON u.id = ss.unit_id
       LEFT JOIN series_progress sp ON sp.series_id = ss.id AND sp.user_id = ?
       WHERE ss.subject_id = ? ORDER BY ss.sort_index`,
    )
    .all(userId, ref.id) as SqlRow[];

  const series: StudySeries[] = seriesRows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    description: String(row.description),
    itemCount: Number(row.item_count),
    estMinutes: Number(row.est_minutes),
    doneItems: Number(row.done_items),
    unitTitle: row.unit_title === null ? null : String(row.unit_title),
  }));

  const exerciseRows = db
    .prepare(
      `SELECT e.id, e.title, e.difficulty, e.est_minutes, u.title AS unit_title,
              COALESCE(ep.status, 'todo') AS status
       FROM exercises e
       JOIN units u ON u.id = e.unit_id
       LEFT JOIN exercise_progress ep ON ep.exercise_id = e.id AND ep.user_id = ?
       WHERE u.subject_id = ? ORDER BY u.sort_index, e.sort_index`,
    )
    .all(userId, ref.id) as SqlRow[];

  const exercises: ExerciseInfo[] = exerciseRows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    difficulty: String(row.difficulty) as ExerciseInfo['difficulty'],
    estMinutes: Number(row.est_minutes),
    status: String(row.status) as ExerciseInfo['status'],
    unitTitle: String(row.unit_title),
  }));

  const reviews = getSubjectReviewCounts(userId, ref.id, now);
  const exams = listExamPapers(userId, { subject: slug });

  return {
    subject,
    units,
    exams,
    series,
    exercises,
    dueCards: reviews.due,
    newCards: reviews.fresh,
  };
}

export function setExerciseStatus(
  userId: string,
  exerciseId: string,
  status: ExerciseInfo['status'],
): ExerciseInfo {
  const row = db
    .prepare(
      `SELECT e.id, e.title, e.est_minutes, e.difficulty, u.title AS unit_title, s.id AS subject_id
       FROM exercises e JOIN units u ON u.id = e.unit_id JOIN subjects s ON s.id = u.subject_id
       WHERE e.id = ?`,
    )
    .get(exerciseId) as SqlRow | undefined;
  if (!row) throw new HttpError(404, 'EXERCISE_NOT_FOUND', 'هذا التمرين غير موجود.');

  const now = Date.now();
  if (status === 'todo') {
    db.prepare('DELETE FROM exercise_progress WHERE user_id = ? AND exercise_id = ?').run(
      userId,
      exerciseId,
    );
  } else {
    db.prepare(
      `INSERT INTO exercise_progress (user_id, exercise_id, status, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, exercise_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`,
    ).run(userId, exerciseId, status, now);
  }

  if (status === 'done') {
    logActivity(userId, {
      id: `exercise:${userId}:${exerciseId}`,
      type: 'exercise_completed',
      subjectId: String(row.subject_id),
      title: `أنجزت تمرين «${String(row.title)}»`,
      minutes: Number(row.est_minutes),
      createdAt: now,
    });
  }

  return {
    id: String(row.id),
    title: String(row.title),
    difficulty: String(row.difficulty) as ExerciseInfo['difficulty'],
    estMinutes: Number(row.est_minutes),
    status,
    unitTitle: String(row.unit_title),
  };
}

export function toggleSeries(
  userId: string,
  seriesId: string,
  completed: boolean,
): StudySeries {
  const row = db
    .prepare(
      `SELECT ss.id, ss.title, ss.description, ss.item_count, ss.est_minutes,
              ss.subject_id, u.title AS unit_title
       FROM study_series ss LEFT JOIN units u ON u.id = ss.unit_id WHERE ss.id = ?`,
    )
    .get(seriesId) as SqlRow | undefined;
  if (!row) throw new HttpError(404, 'SERIES_NOT_FOUND', 'هذه السلسلة غير موجودة.');

  const now = Date.now();
  if (completed) {
    db.prepare(
      `INSERT INTO series_progress (user_id, series_id, done_items, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, series_id) DO UPDATE SET done_items = excluded.done_items, updated_at = excluded.updated_at`,
    ).run(userId, seriesId, Number(row.item_count), now);
    logActivity(userId, {
      id: `series:${userId}:${seriesId}`,
      type: 'series_completed',
      subjectId: String(row.subject_id),
      title: `أنجزت سلسلة «${String(row.title)}»`,
      minutes: Number(row.est_minutes),
      createdAt: now,
    });
  } else {
    db.prepare('DELETE FROM series_progress WHERE user_id = ? AND series_id = ?').run(
      userId,
      seriesId,
    );
  }

  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description),
    itemCount: Number(row.item_count),
    estMinutes: Number(row.est_minutes),
    doneItems: completed ? Number(row.item_count) : 0,
    unitTitle: row.unit_title === null ? null : String(row.unit_title),
  };
}
