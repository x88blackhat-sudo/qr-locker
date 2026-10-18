import type { PlanItem } from '../../../shared/types';
import { db, newId, withTransaction } from '../db';
import { HttpError } from '../lib/http';
import { dateKey } from '../lib/time';
import { logActivity } from './activity';
import { getReviewCounts, getSubjectsProgress } from './progress';

type SqlRow = Record<string, string | number | null>;

const PLAN_SELECT = `
  SELECT pi.id, pi.kind, pi.title, pi.subtitle, pi.minutes, pi.completed_at, pi.href, pi.ref_id,
         s.name AS subject_name, s.slug AS subject_slug, s.color AS subject_color
  FROM plan_items pi
  LEFT JOIN subjects s ON s.id = pi.subject_id
`;

function mapPlanItem(row: SqlRow): PlanItem {
  return {
    id: String(row.id),
    kind: String(row.kind) as PlanItem['kind'],
    title: String(row.title),
    subtitle: String(row.subtitle),
    minutes: Number(row.minutes),
    completed: row.completed_at !== null,
    href: String(row.href),
    subjectSlug: row.subject_slug === null ? null : String(row.subject_slug),
    subjectName: row.subject_name === null ? null : String(row.subject_name),
    subjectColor: row.subject_color === null ? null : String(row.subject_color),
  };
}

export function getPlanItems(userId: string, planDate: string): PlanItem[] {
  const rows = db
    .prepare(`${PLAN_SELECT} WHERE pi.user_id = ? AND pi.plan_date = ? ORDER BY pi.created_at`)
    .all(userId, planDate) as SqlRow[];
  return rows.map(mapPlanItem);
}

interface NewPlanItem {
  kind: PlanItem['kind'];
  refId: string;
  title: string;
  subtitle: string;
  minutes: number;
  href: string;
  subjectId: string | null;
}

function buildPlan(userId: string, planDate: string, now: number): NewPlanItem[] {
  const items: NewPlanItem[] = [];
  const counts = getReviewCounts(userId, now);
  if (counts.dueNow + counts.newCards > 0) {
    const total = counts.dueNow + counts.newCards;
    const parts: string[] = [];
    if (counts.dueNow > 0) parts.push(`${counts.dueNow} مستحقة`);
    if (counts.newCards > 0) parts.push(`${counts.newCards} جديدة`);
    items.push({
      kind: 'review',
      refId: 'queue',
      title: 'مراجعة البطاقات الذكية',
      subtitle: parts.join(' · '),
      minutes: Math.min(30, Math.max(10, Math.round(total * 1.5))),
      href: '/app/revision',
      subjectId: null,
    });
  }

  const ranked = [...getSubjectsProgress(userId, now)].sort((a, b) => a.progress - b.progress);

  const usedSubjects = new Set<string>();
  for (const subject of ranked) {
    if (items.filter((item) => item.kind === 'exercise').length >= 2) break;
    if (usedSubjects.has(subject.id)) continue;
    const exercise = db
      .prepare(
        `SELECT e.id, e.title, e.est_minutes, u.title AS unit_title, s.id AS subject_id
         FROM exercises e
         JOIN units u ON u.id = e.unit_id
         JOIN subjects s ON s.id = u.subject_id
         LEFT JOIN exercise_progress ep ON ep.exercise_id = e.id AND ep.user_id = ?
         WHERE u.subject_id = ? AND COALESCE(ep.status, 'todo') <> 'done'
         ORDER BY u.sort_index, e.sort_index LIMIT 1`,
      )
      .get(userId, subject.id) as SqlRow | undefined;
    if (exercise) {
      items.push({
        kind: 'exercise',
        refId: String(exercise.id),
        title: String(exercise.title),
        subtitle: `${subject.name} · ${String(exercise.unit_title)}`,
        minutes: Number(exercise.est_minutes),
        href: `/app/subjects/${subject.slug}?tab=exercises`,
        subjectId: subject.id,
      });
      usedSubjects.add(subject.id);
    }
  }

  for (const subject of ranked) {
    if (items.some((item) => item.kind === 'exam')) break;
    if (usedSubjects.has(subject.id)) continue;
    const paper = db
      .prepare(
        `SELECT p.id, p.title, p.year, p.session
         FROM exam_papers p
         WHERE p.subject_id = ?
           AND NOT EXISTS (SELECT 1 FROM exam_completions ec WHERE ec.user_id = ? AND ec.paper_id = p.id)
         ORDER BY CASE p.session WHEN 'blanc' THEN 0 WHEN 'principale' THEN 1 ELSE 2 END, p.year DESC
         LIMIT 1`,
      )
      .get(subject.id, userId) as SqlRow | undefined;
    if (paper) {
      items.push({
        kind: 'exam',
        refId: String(paper.id),
        title: `موضوع امتحان — ${subject.name}`,
        subtitle: `${String(paper.year)} · ${paper.session === 'blanc' ? 'بكالوريا بيضاء' : paper.session === 'rattrapage' ? 'دورة استدراكية' : 'دورة عادية'}`,
        minutes: 45,
        href: `/app/exams?subject=${subject.slug}`,
        subjectId: subject.id,
      });
      usedSubjects.add(subject.id);
    }
  }

  for (const subject of ranked) {
    if (items.some((item) => item.kind === 'series')) break;
    if (usedSubjects.has(subject.id)) continue;
    const series = db
      .prepare(
        `SELECT ss.id, ss.title, ss.est_minutes
         FROM study_series ss
         WHERE ss.subject_id = ?
           AND NOT EXISTS (SELECT 1 FROM series_progress sp WHERE sp.user_id = ? AND sp.series_id = ss.id)
         ORDER BY ss.sort_index LIMIT 1`,
      )
      .get(subject.id, userId) as SqlRow | undefined;
    if (series) {
      items.push({
        kind: 'series',
        refId: String(series.id),
        title: String(series.title),
        subtitle: `${subject.name} · سلسلة تمارين`,
        minutes: Math.min(60, Number(series.est_minutes)),
        href: `/app/subjects/${subject.slug}?tab=series`,
        subjectId: subject.id,
      });
    }
  }

  return items.slice(0, 4);
}

/** Creates today's plan once per day, atomically and idempotently. */
export function ensureTodayPlan(userId: string, now: number = Date.now()): PlanItem[] {
  const planDate = dateKey(now);
  const existing = db
    .prepare('SELECT COUNT(*) AS count FROM plan_items WHERE user_id = ? AND plan_date = ?')
    .get(userId, planDate) as { count: number };
  if (Number(existing.count) > 0) return getPlanItems(userId, planDate);

  withTransaction(() => {
    const recheck = db
      .prepare('SELECT COUNT(*) AS count FROM plan_items WHERE user_id = ? AND plan_date = ?')
      .get(userId, planDate) as { count: number };
    if (Number(recheck.count) > 0) return;
    const items = buildPlan(userId, planDate, now);
    const insert = db.prepare(
      `INSERT OR IGNORE INTO plan_items
         (id, user_id, plan_date, kind, ref_id, subject_id, title, subtitle, minutes, href, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    items.forEach((item, index) => {
      insert.run(
        newId('plan'),
        userId,
        planDate,
        item.kind,
        item.refId,
        item.subjectId,
        item.title,
        item.subtitle,
        item.minutes,
        item.href,
        now + index,
      );
    });
  });

  return getPlanItems(userId, planDate);
}

/** Toggle a plan item; side effects are idempotent and respect ownership. */
export function togglePlanItem(
  userId: string,
  itemId: string,
  completed: boolean,
  now: number = Date.now(),
): PlanItem {
  const item = db
    .prepare(
      `SELECT id, kind, ref_id, subject_id, title, minutes, plan_date
       FROM plan_items WHERE id = ? AND user_id = ?`,
    )
    .get(itemId, userId) as SqlRow | undefined;
  if (!item) throw new HttpError(404, 'PLAN_ITEM_NOT_FOUND', 'عنصر الخطة غير موجود.');

  const kind = String(item.kind);
  const refId = String(item.ref_id);
  const subjectId = item.subject_id === null ? null : String(item.subject_id);

  withTransaction(() => {
    if (completed) {
      db.prepare('UPDATE plan_items SET completed_at = ? WHERE id = ? AND user_id = ?').run(
        now,
        itemId,
        userId,
      );
      if (kind === 'exercise') {
        db.prepare(
          `INSERT INTO exercise_progress (user_id, exercise_id, status, updated_at)
           VALUES (?, ?, 'done', ?)
           ON CONFLICT(user_id, exercise_id) DO UPDATE SET status = 'done', updated_at = excluded.updated_at`,
        ).run(userId, refId, now);
        const exercise = db
          .prepare('SELECT title, est_minutes FROM exercises WHERE id = ?')
          .get(refId) as { title: string; est_minutes: number } | undefined;
        if (exercise) {
          logActivity(userId, {
            id: `exercise:${userId}:${refId}`,
            type: 'exercise_completed',
            subjectId,
            title: `أنجزت تمرين «${exercise.title}»`,
            minutes: Number(exercise.est_minutes),
            createdAt: now,
          });
        }
      } else if (kind === 'exam') {
        const inserted = db
          .prepare(
            `INSERT OR IGNORE INTO exam_completions (user_id, paper_id, completed_at) VALUES (?, ?, ?)`,
          )
          .run(userId, refId, now);
        if (Number(inserted.changes) > 0) {
          const paper = db
            .prepare(
              `SELECT p.title, p.duration_minutes, s.name AS subject_name
               FROM exam_papers p JOIN subjects s ON s.id = p.subject_id WHERE p.id = ?`,
            )
            .get(refId) as { title: string; duration_minutes: number; subject_name: string } | undefined;
          if (paper) {
            logActivity(userId, {
              id: `exam:${userId}:${refId}`,
              type: 'exam_completed',
              subjectId,
              title: `أنجزت موضوع ${paper.title}`,
              minutes: Math.min(Number(paper.duration_minutes), 180),
              createdAt: now,
            });
          }
        }
      } else if (kind === 'series') {
        const series = db
          .prepare('SELECT title, item_count, est_minutes FROM study_series WHERE id = ?')
          .get(refId) as { title: string; item_count: number; est_minutes: number } | undefined;
        if (series) {
          db.prepare(
            `INSERT INTO series_progress (user_id, series_id, done_items, updated_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(user_id, series_id) DO UPDATE SET done_items = excluded.done_items, updated_at = excluded.updated_at`,
          ).run(userId, refId, Number(series.item_count), now);
          logActivity(userId, {
            id: `series:${userId}:${refId}`,
            type: 'series_completed',
            subjectId,
            title: `أنجزت سلسلة «${series.title}»`,
            minutes: Number(series.est_minutes),
            createdAt: now,
          });
        }
      }
      // Review sessions accrue minutes card-by-card; no extra minutes here.
    } else {
      db.prepare('UPDATE plan_items SET completed_at = NULL WHERE id = ? AND user_id = ?').run(
        itemId,
        userId,
      );
      if (kind === 'exercise') {
        db.prepare('DELETE FROM exercise_progress WHERE user_id = ? AND exercise_id = ?').run(
          userId,
          refId,
        );
      } else if (kind === 'exam') {
        db.prepare('DELETE FROM exam_completions WHERE user_id = ? AND paper_id = ?').run(
          userId,
          refId,
        );
      } else if (kind === 'series') {
        db.prepare('DELETE FROM series_progress WHERE user_id = ? AND series_id = ?').run(
          userId,
          refId,
        );
      }
    }
  });

  const row = db
    .prepare(`${PLAN_SELECT} WHERE pi.id = ? AND pi.user_id = ?`)
    .get(itemId, userId) as SqlRow;
  return mapPlanItem(row);
}
