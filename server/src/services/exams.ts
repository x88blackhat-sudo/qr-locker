import type { ExamPaper, ExamSession } from '../../../shared/types';
import { db } from '../db';
import { HttpError } from '../lib/http';
import { logActivity } from './activity';

type SqlRow = Record<string, string | number | null>;

export interface ExamFilters {
  subject?: string;
  year?: number;
  session?: ExamSession;
  status?: 'all' | 'completed' | 'pending';
}

export function listExamPapers(userId: string, filters: ExamFilters = {}): ExamPaper[] {
  const where: string[] = [];
  const params: (string | number)[] = [userId];
  if (filters.subject) {
    where.push('s.slug = ?');
    params.push(filters.subject);
  }
  if (filters.year) {
    where.push('p.year = ?');
    params.push(filters.year);
  }
  if (filters.session) {
    where.push('p.session = ?');
    params.push(filters.session);
  }
  if (filters.status === 'completed') where.push('ec.paper_id IS NOT NULL');
  if (filters.status === 'pending') where.push('ec.paper_id IS NULL');

  const rows = db
    .prepare(
      `SELECT p.id, p.title, p.year, p.session, p.duration_minutes, p.total_points,
              s.id AS subject_id, s.name AS subject_name, s.slug AS subject_slug, s.color AS subject_color,
              ec.completed_at
       FROM exam_papers p
       JOIN subjects s ON s.id = p.subject_id
       LEFT JOIN exam_completions ec ON ec.paper_id = p.id AND ec.user_id = ?
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY s.sort_index, p.year DESC, CASE p.session WHEN 'blanc' THEN 0 WHEN 'principale' THEN 1 ELSE 2 END`,
    )
    .all(...params) as SqlRow[];

  if (rows.length === 0) return [];

  const topics = db
    .prepare(
      `SELECT t.paper_id, t.title FROM exam_topics t
       WHERE t.paper_id IN (${rows.map(() => '?').join(',')})
       ORDER BY t.sort_index`,
    )
    .all(...rows.map((row) => String(row.id))) as { paper_id: string; title: string }[];
  const topicsByPaper = new Map<string, string[]>();
  for (const topic of topics) {
    const list = topicsByPaper.get(topic.paper_id) ?? [];
    list.push(topic.title);
    topicsByPaper.set(topic.paper_id, list);
  }

  return rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    year: Number(row.year),
    session: String(row.session) as ExamSession,
    durationMinutes: Number(row.duration_minutes),
    totalPoints: Number(row.total_points),
    completed: row.completed_at !== null,
    completedAt: row.completed_at === null ? null : Number(row.completed_at),
    topics: topicsByPaper.get(String(row.id)) ?? [],
    subject: {
      id: String(row.subject_id),
      name: String(row.subject_name),
      slug: String(row.subject_slug),
      color: String(row.subject_color),
    },
  }));
}

export function getExamFilterOptions() {
  const years = db
    .prepare('SELECT DISTINCT year FROM exam_papers ORDER BY year DESC')
    .all() as { year: number }[];
  const subjects = db
    .prepare(
      `SELECT s.id, s.name, s.slug, s.color, COUNT(p.id) AS papers
       FROM subjects s JOIN exam_papers p ON p.subject_id = s.id
       GROUP BY s.id ORDER BY s.sort_index`,
    )
    .all() as { id: string; name: string; slug: string; color: string; papers: number }[];
  return {
    years: years.map((row) => Number(row.year)),
    subjects: subjects.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      slug: String(row.slug),
      color: String(row.color),
      papers: Number(row.papers),
    })),
    sessions: ['principale', 'rattrapage', 'blanc'] as ExamSession[],
  };
}

/** Idempotent completion toggle; the composite primary key blocks duplicates. */
export function setExamCompletion(
  userId: string,
  paperId: string,
  completed: boolean,
): { completed: boolean; completedAt: number | null } {
  const paper = db
    .prepare(
      `SELECT p.id, p.title, p.duration_minutes, p.subject_id, s.name AS subject_name
       FROM exam_papers p JOIN subjects s ON s.id = p.subject_id WHERE p.id = ?`,
    )
    .get(paperId) as SqlRow | undefined;
  if (!paper) throw new HttpError(404, 'PAPER_NOT_FOUND', 'موضوع الامتحان غير موجود.');

  const now = Date.now();
  if (completed) {
    const inserted = db
      .prepare(
        `INSERT OR IGNORE INTO exam_completions (user_id, paper_id, completed_at) VALUES (?, ?, ?)`,
      )
      .run(userId, paperId, now);
    if (Number(inserted.changes) > 0) {
      logActivity(userId, {
        id: `exam:${userId}:${paperId}`,
        type: 'exam_completed',
        subjectId: String(paper.subject_id),
        title: `أنجزت موضوع ${String(paper.title)}`,
        minutes: Math.min(Number(paper.duration_minutes), 180),
        createdAt: now,
      });
    }
    const row = db
      .prepare('SELECT completed_at FROM exam_completions WHERE user_id = ? AND paper_id = ?')
      .get(userId, paperId) as { completed_at: number };
    return { completed: true, completedAt: Number(row.completed_at) };
  }

  db.prepare('DELETE FROM exam_completions WHERE user_id = ? AND paper_id = ?').run(
    userId,
    paperId,
  );
  return { completed: false, completedAt: null };
}

export function getExamSummary(
  userId: string,
  filters: Omit<ExamFilters, 'status'> = {},
): { total: number; completed: number } {
  const papers = listExamPapers(userId, { ...filters, status: 'all' });
  return {
    total: papers.length,
    completed: papers.filter((paper) => paper.completed).length,
  };
}
