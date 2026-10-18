import { Router } from 'express';
import { z } from 'zod';
import type { ExamSession } from '../../../shared/types';
import { HttpError, parseWith } from '../lib/http';
import { requireStudyAccess } from '../middleware/auth';
import {
  getExamFilterOptions,
  listExamPapers,
  setExamCompletion,
} from '../services/exams';

const router = Router();

const filterSchema = z.object({
  subject: z.string().trim().min(1).max(40).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  session: z.enum(['principale', 'rattrapage', 'blanc']).optional(),
  status: z.enum(['all', 'completed', 'pending']).optional(),
});

router.get('/', (req, res) => {
  if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'يجب تسجيل الدخول للمتابعة.');
  const query = parseWith(filterSchema, req.query);
  const filters = {
    subject: query.subject,
    year: query.year,
    session: query.session as ExamSession | undefined,
    status: query.status ?? 'all',
  };
  const papers = listExamPapers(req.user.id, filters);
  const options = getExamFilterOptions();
  res.json({
    papers,
    filters: { years: options.years, subjects: options.subjects, sessions: options.sessions },
    summary: { total: papers.length, completed: papers.filter((paper) => paper.completed).length },
  });
});

router.post('/:id/completion', requireStudyAccess, (req, res) => {
  if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'يجب تسجيل الدخول للمتابعة.');
  const body = parseWith(z.object({ completed: z.boolean() }), req.body);
  const result = setExamCompletion(req.user.id, String(req.params.id), body.completed);
  res.json(result);
});

export default router;
