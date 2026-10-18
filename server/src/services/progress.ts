import type { SubjectProgress } from '../../../shared/types';
import { db } from '../db';
import { dateKey, dateKeyToStartTs, DAY_MS } from '../lib/time';

type SqlRow = Record<string, string | number | null>;

export function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/**
 * Subject progress blends three real, stored signals:
 *   exams completed (40%), exercises done (35%), card mastery (25%).
 */
export function blendProgress(examPct: number, exercisePct: number, masteryPct: number): number {
  return clampPct(examPct * 0.4 + exercisePct * 0.35 + masteryPct * 0.25);
}

const SUBJECT_PROGRESS_SQL = `
  SELECT
    s.id, s.slug, s.name, s.short_name, s.description, s.color, s.icon, s.coefficient,
    (SELECT COUNT(*) FROM exam_papers p WHERE p.subject_id = s.id) AS papers,
    (SELECT COUNT(*) FROM exam_completions ec
       JOIN exam_papers p ON p.id = ec.paper_id
       WHERE ec.user_id = ? AND p.subject_id = s.id) AS completed_papers,
    (SELECT COUNT(*) FROM exercises e JOIN units u ON u.id = e.unit_id
       WHERE u.subject_id = s.id) AS exercises,
    (SELECT COUNT(*) FROM exercise_progress ep
       JOIN exercises e ON e.id = ep.exercise_id
       JOIN units u ON u.id = e.unit_id
       WHERE ep.user_id = ? AND ep.status = 'done' AND u.subject_id = s.id) AS done_exercises,
    (SELECT COUNT(*) FROM flashcards f WHERE f.subject_id = s.id) AS cards,
    (SELECT COUNT(*) FROM card_reviews cr
       JOIN flashcards f ON f.id = cr.card_id
       WHERE cr.user_id = ? AND cr.repetitions >= 2 AND f.subject_id = s.id) AS mastered_cards,
    (SELECT COUNT(*) FROM card_reviews cr
       JOIN flashcards f ON f.id = cr.card_id
       WHERE cr.user_id = ? AND cr.due_at <= ? AND f.subject_id = s.id) AS due_cards,
    (SELECT COUNT(*) FROM units u WHERE u.subject_id = s.id) AS units
  FROM subjects s
  ORDER BY s.sort_index
`;

function pct(part: number, total: number): number {
  return total > 0 ? clampPct((part / total) * 100) : 0;
}

function mapSubjectRow(row: SqlRow): SubjectProgress {
  const papers = Number(row.papers ?? 0);
  const completedPapers = Number(row.completed_papers ?? 0);
  const exercises = Number(row.exercises ?? 0);
  const doneExercises = Number(row.done_exercises ?? 0);
  const cards = Number(row.cards ?? 0);
  const masteredCards = Number(row.mastered_cards ?? 0);
  const examPct = pct(completedPapers, papers);
  const exercisePct = pct(doneExercises, exercises);
  const masteryPct = pct(masteredCards, cards);

  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    shortName: String(row.short_name),
    description: String(row.description),
    color: String(row.color),
    icon: String(row.icon),
    coefficient: Number(row.coefficient),
    progress: blendProgress(examPct, exercisePct, masteryPct),
    examPct,
    exercisePct,
    masteryPct,
    totals: {
      papers,
      completedPapers,
      exercises,
      doneExercises,
      cards,
      masteredCards,
      dueCards: Number(row.due_cards ?? 0),
      units: Number(row.units ?? 0),
    },
  };
}

export function getSubjectsProgress(userId: string, now: number = Date.now()): SubjectProgress[] {
  const rows = db
    .prepare(SUBJECT_PROGRESS_SQL)
    .all(userId, userId, userId, userId, now) as SqlRow[];
  return rows.map(mapSubjectRow);
}

export function getSubjectProgress(
  userId: string,
  slug: string,
  now: number = Date.now(),
): SubjectProgress | null {
  return getSubjectsProgress(userId, now).find((subject) => subject.slug === slug) ?? null;
}

export interface OverallStats {
  progress: number;
  subjectCount: number;
  masteredCards: number;
  totalCards: number;
  dueNow: number;
  completedExams: number;
  totalExams: number;
}

export function getOverallStats(userId: string, now: number = Date.now()): OverallStats {
  const subjects = getSubjectsProgress(userId, now);
  const coefficients = subjects.reduce((sum, subject) => sum + subject.coefficient, 0);
  const weighted = subjects.reduce(
    (sum, subject) => sum + subject.progress * subject.coefficient,
    0,
  );
  return {
    progress: coefficients > 0 ? clampPct(weighted / coefficients) : 0,
    subjectCount: subjects.length,
    masteredCards: subjects.reduce((sum, subject) => sum + subject.totals.masteredCards, 0),
    totalCards: subjects.reduce((sum, subject) => sum + subject.totals.cards, 0),
    dueNow: subjects.reduce((sum, subject) => sum + subject.totals.dueCards, 0),
    completedExams: subjects.reduce((sum, subject) => sum + subject.totals.completedPapers, 0),
    totalExams: subjects.reduce((sum, subject) => sum + subject.totals.papers, 0),
  };
}

export interface ReviewCounts {
  dueNow: number;
  dueToday: number;
  next7Days: number;
  nextDueAt: number | null;
  newCards: number;
  totalCards: number;
}

export function getReviewCounts(userId: string, now: number = Date.now()): ReviewCounts {
  const todayKey = dateKey(now);
  const endOfToday = dateKeyToStartTs(todayKey) + DAY_MS;
  const in7Days = now + 7 * DAY_MS;
  const row = db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM card_reviews WHERE user_id = ? AND due_at <= ?) AS due_now,
         (SELECT COUNT(*) FROM card_reviews WHERE user_id = ? AND due_at <= ?) AS due_today,
         (SELECT COUNT(*) FROM card_reviews WHERE user_id = ? AND due_at <= ?) AS next7,
         (SELECT MIN(due_at) FROM card_reviews WHERE user_id = ?) AS next_due,
         (SELECT COUNT(*) FROM flashcards f
            WHERE NOT EXISTS (SELECT 1 FROM card_reviews cr WHERE cr.user_id = ? AND cr.card_id = f.id)) AS new_cards,
         (SELECT COUNT(*) FROM flashcards) AS total_cards`,
    )
    .get(userId, now, userId, endOfToday, userId, in7Days, userId, userId) as SqlRow;
  return {
    dueNow: Number(row.due_now ?? 0),
    dueToday: Number(row.due_today ?? 0),
    next7Days: Number(row.next7 ?? 0),
    nextDueAt: row.next_due === null ? null : Number(row.next_due),
    newCards: Number(row.new_cards ?? 0),
    totalCards: Number(row.total_cards ?? 0),
  };
}

export function getMastery(userId: string): { fresh: number; learning: number; mastered: number } {
  const row = db
    .prepare(
      `SELECT
         SUM(CASE WHEN cr.user_id IS NULL THEN 1 ELSE 0 END) AS fresh,
         SUM(CASE WHEN cr.user_id IS NOT NULL AND cr.repetitions < 2 THEN 1 ELSE 0 END) AS learning,
         SUM(CASE WHEN cr.repetitions >= 2 THEN 1 ELSE 0 END) AS mastered
       FROM flashcards f
       LEFT JOIN card_reviews cr ON cr.card_id = f.id AND cr.user_id = ?`,
    )
    .get(userId) as SqlRow;
  return {
    fresh: Number(row.fresh ?? 0),
    learning: Number(row.learning ?? 0),
    mastered: Number(row.mastered ?? 0),
  };
}

export function getSubjectReviewCounts(
  userId: string,
  subjectId: string,
  now: number = Date.now(),
): { due: number; fresh: number } {
  const row = db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM card_reviews cr JOIN flashcards f ON f.id = cr.card_id
            WHERE cr.user_id = ? AND cr.due_at <= ? AND f.subject_id = ?) AS due,
         (SELECT COUNT(*) FROM flashcards f
            WHERE f.subject_id = ?
              AND NOT EXISTS (SELECT 1 FROM card_reviews cr WHERE cr.user_id = ? AND cr.card_id = f.id)) AS fresh`,
    )
    .get(userId, now, subjectId, subjectId, userId) as SqlRow;
  return { due: Number(row.due ?? 0), fresh: Number(row.fresh ?? 0) };
}
