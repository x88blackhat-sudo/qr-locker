import type { DatabaseSync } from 'node:sqlite';
import { SEED_SUBJECTS, type SeedSubject } from './seed-data';

const SESSION_LABEL = { principale: 'الدورة العادية', rattrapage: 'دورة الاستدراك' } as const;
const YEARS = [2021, 2022, 2023, 2024, 2025];

function seedSubject(db: DatabaseSync, subject: SeedSubject, subjectIndex: number): void {
  db.prepare(
    `INSERT OR IGNORE INTO subjects
       (id, slug, name, short_name, description, color, icon, coefficient, sort_index)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    subject.id,
    subject.slug,
    subject.name,
    subject.shortName,
    subject.description,
    subject.color,
    subject.icon,
    subject.coefficient,
    subjectIndex,
  );

  subject.units.forEach((unit, unitIndex) => {
    db.prepare(
      `INSERT OR IGNORE INTO units (id, subject_id, title, description, sort_index)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(unit.id, subject.id, unit.title, unit.description, unitIndex);

    unit.exercises.forEach((exercise, index) => {
      db.prepare(
        `INSERT OR IGNORE INTO exercises (id, unit_id, title, difficulty, est_minutes, sort_index)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        `${unit.id}-e${index + 1}`,
        unit.id,
        exercise.title,
        exercise.difficulty,
        exercise.minutes,
        index,
      );
    });

    unit.cards.forEach((card, index) => {
      db.prepare(
        `INSERT OR IGNORE INTO flashcards (id, subject_id, unit_id, front, back, hint, sort_index)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        `${unit.id}-c${index + 1}`,
        subject.id,
        unit.id,
        card.front,
        card.back,
        card.hint ?? null,
        index,
      );
    });
  });

  subject.series.forEach((series, index) => {
    db.prepare(
      `INSERT OR IGNORE INTO study_series
         (id, subject_id, unit_id, title, description, item_count, est_minutes, sort_index)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      `${subject.id}-series-${index + 1}`,
      subject.id,
      series.unitId ?? null,
      series.title,
      series.description,
      series.items,
      series.minutes,
      index,
    );
  });

  let paperIndex = 0;
  const paperDefs: { year: number; session: 'principale' | 'rattrapage' | 'blanc' }[] = [];
  for (const year of YEARS) {
    paperDefs.push({ year, session: 'principale' });
    paperDefs.push({ year, session: 'rattrapage' });
  }
  // A forward-looking mock exam for the main subjects of the science stream.
  if (['math', 'physics', 'svt'].includes(subject.id)) {
    paperDefs.push({ year: 2026, session: 'blanc' });
  }

  for (const { year, session } of paperDefs) {
    const paperId = `${subject.id}-${year}-${session}`;
    const title =
      session === 'blanc'
        ? `${subject.name} — بكالوريا بيضاء 2026`
        : `${subject.name} — دورة ${year} (${SESSION_LABEL[session]})`;
    const inserted = db
      .prepare(
        `INSERT OR IGNORE INTO exam_papers
           (id, subject_id, year, session, title, duration_minutes, total_points, sort_index)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        paperId,
        subject.id,
        year,
        session,
        title,
        subject.durationMinutes,
        20,
        paperIndex,
      );
    paperIndex += 1;

    if (inserted.changes > 0) {
      const topics = subject.topics.slice(0, session === 'blanc' ? 4 : 3);
      topics.forEach((topic, i) => {
        db.prepare(
          `INSERT OR IGNORE INTO exam_topics (id, paper_id, title, sort_index) VALUES (?, ?, ?, ?)`,
        ).run(`${paperId}-t${i + 1}`, paperId, topic, i);
      });
    }
  }
}

/** Idempotent curriculum seed. Student progress tables are never touched. */
export function seedCurriculum(db: DatabaseSync): void {
  const existing = db.prepare('SELECT COUNT(*) AS count FROM subjects').get() as { count: number };
  if (existing.count >= SEED_SUBJECTS.length) return;
  db.exec('BEGIN');
  try {
    SEED_SUBJECTS.forEach((subject, index) => seedSubject(db, subject, index));
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
