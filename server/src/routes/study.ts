import { Router } from 'express';
import { z } from 'zod';
import { HttpError, parseWith } from '../lib/http';
import { requireStudyAccess } from '../middleware/auth';
import { getAnalytics } from '../services/analytics';
import { getDashboard } from '../services/dashboard';
import { togglePlanItem, ensureTodayPlan } from '../services/plan';
import { getSubjectsProgress } from '../services/progress';
import { getRevisionQueue, submitReview } from '../services/revision';
import { getSubjectDetail, setExerciseStatus, toggleSeries } from '../services/subjects';
import { dateKey } from '../lib/time';

const router = Router();

router.get('/dashboard', (req, res) => {
  if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'يجب تسجيل الدخول للمتابعة.');
  res.json(getDashboard(req.user.id));
});

router.get('/subjects', (req, res) => {
  if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'يجب تسجيل الدخول للمتابعة.');
  res.json({ subjects: getSubjectsProgress(req.user.id) });
});

router.get('/subjects/:slug', (req, res) => {
  if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'يجب تسجيل الدخول للمتابعة.');
  const slug = String(req.params.slug);
  if (!/^[a-z-]{2,40}$/.test(slug)) {
    throw new HttpError(404, 'SUBJECT_NOT_FOUND', 'هذه المادة غير موجودة.');
  }
  res.json(getSubjectDetail(req.user.id, slug));
});

router.patch('/exercises/:id/progress', requireStudyAccess, (req, res) => {
  if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'يجب تسجيل الدخول للمتابعة.');
  const body = parseWith(z.object({ status: z.enum(['todo', 'in_progress', 'done']) }), req.body);
  const exercise = setExerciseStatus(req.user.id, String(req.params.id), body.status);
  res.json({ exercise });
});

router.post('/series/:id/toggle', requireStudyAccess, (req, res) => {
  if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'يجب تسجيل الدخول للمتابعة.');
  const body = parseWith(z.object({ completed: z.boolean() }), req.body);
  const series = toggleSeries(req.user.id, String(req.params.id), body.completed);
  res.json({ series });
});

const queueQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(40).optional(),
  subject: z
    .string()
    .trim()
    .regex(/^[a-z-]{2,40}$/, 'رمز المادة غير صالح.')
    .optional(),
});

router.get('/revision/queue', (req, res) => {
  if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'يجب تسجيل الدخول للمتابعة.');
  const query = parseWith(queueQuerySchema, req.query);
  res.json(getRevisionQueue(req.user.id, query.limit ?? 20, Date.now(), query.subject));
});

router.post('/revision/review', requireStudyAccess, (req, res) => {
  if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'يجب تسجيل الدخول للمتابعة.');
  const body = parseWith(
    z.object({
      cardId: z.string().trim().min(3).max(80),
      rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    }),
    req.body,
  );
  res.json(submitReview(req.user.id, body.cardId, body.rating));
});

router.get('/analytics', (req, res) => {
  if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'يجب تسجيل الدخول للمتابعة.');
  res.json(getAnalytics(req.user.id));
});

router.get('/plan/today', (req, res) => {
  if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'يجب تسجيل الدخول للمتابعة.');
  const items = ensureTodayPlan(req.user.id);
  res.json({ dateKey: dateKey(), items });
});

router.patch('/plan/items/:id', requireStudyAccess, (req, res) => {
  if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'يجب تسجيل الدخول للمتابعة.');
  const body = parseWith(z.object({ completed: z.boolean() }), req.body);
  const item = togglePlanItem(req.user.id, String(req.params.id), body.completed);
  res.json({ item });
});

export default router;
