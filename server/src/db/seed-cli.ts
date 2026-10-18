import { db } from './index';
import { seedCurriculum } from './seed';

seedCurriculum(db);
const subjects = db.prepare('SELECT COUNT(*) AS c FROM subjects').get() as { c: number };
const papers = db.prepare('SELECT COUNT(*) AS c FROM exam_papers').get() as { c: number };
const cards = db.prepare('SELECT COUNT(*) AS c FROM flashcards').get() as { c: number };
console.log(
  `تم تجهيز المنهاج: ${subjects.c} مواد، ${papers.c} موضوع امتحان، ${cards.c} بطاقة مراجعة.`,
);
