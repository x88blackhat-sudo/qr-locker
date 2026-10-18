import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config';
import { HttpError, parseWith } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import {
  buildUserExport,
  getSettings,
  updateProfileName,
  updateSettings,
} from '../services/account';
import {
  deleteOtherSessions,
  getPasswordHash,
  updatePassword,
  verifyPassword,
} from '../services/auth';
import { getSubscriptionInfo, startTrial } from '../services/subscription';

const router = Router();

router.get('/public-config', (_req, res) => {
  res.json({
    paymentsConfigured: config.paymentsConfigured,
    supportEmail: config.supportEmail,
    trialDays: config.trialDays,
  });
});

router.use(requireAuth);

router.get('/trial', (req, res) => {
  if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'يجب تسجيل الدخول للمتابعة.');
  res.json({ subscription: getSubscriptionInfo(req.user.id) });
});

router.post(
  '/trial/start',
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    key: (req) => req.user?.id ?? req.ip ?? 'unknown',
  }),
  (req, res) => {
    if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'يجب تسجيل الدخول للمتابعة.');
    // The client sends no dates or status: the server owns the trial lifecycle.
    const subscription = startTrial(req.user.id, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(201).json({ subscription });
  },
);

const settingsSchema = z
  .object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    dailyGoalMinutes: z
      .number()
      .int('أدخل عددًا صحيحًا من الدقائق.')
      .min(15, 'الحد الأدنى للهدف اليومي 15 دقيقة.')
      .max(480, 'الحد الأقصى للهدف اليومي 480 دقيقة.')
      .optional(),
  })
  .refine((value) => value.theme !== undefined || value.dailyGoalMinutes !== undefined, {
    message: 'لا توجد تغييرات لحفظها.',
  });

router.patch('/settings', (req, res) => {
  if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'يجب تسجيل الدخول للمتابعة.');
  const body = parseWith(settingsSchema, req.body);
  const settings = updateSettings(req.user.id, body);
  res.json({ settings });
});

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'الاسم قصير جدًا.')
    .max(60, 'الاسم طويل جدًا.')
    .regex(/^[\p{L}\p{M}\s'’.-]+$/u, 'أدخل اسمًا صالحًا.'),
});

router.patch('/profile', (req, res) => {
  if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'يجب تسجيل الدخول للمتابعة.');
  const body = parseWith(profileSchema, req.body);
  const user = updateProfileName(req.user.id, body.name);
  res.json({ user });
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'أدخل كلمة المرور الحالية.').max(128),
    newPassword: z
      .string()
      .min(8, 'يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل.')
      .max(128, 'كلمة المرور طويلة جدًا.')
      .regex(/[A-Za-z]/, 'يجب أن تحتوي كلمة المرور على حرف واحد على الأقل.')
      .regex(/\d/, 'يجب أن تحتوي كلمة المرور على رقم واحد على الأقل.'),
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: 'كلمة المرور الجديدة يجب أن تختلف عن الحالية.',
    path: ['newPassword'],
  });

router.post('/profile/password', (req, res) => {
  if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'يجب تسجيل الدخول للمتابعة.');
  const body = parseWith(passwordSchema, req.body);
  const hash = getPasswordHash(req.user.id);
  if (!hash || !verifyPassword(body.currentPassword, hash)) {
    throw new HttpError(422, 'INVALID_PASSWORD', 'كلمة المرور الحالية غير صحيحة.', {
      currentPassword: 'كلمة المرور الحالية غير صحيحة.',
    });
  }
  updatePassword(req.user.id, body.newPassword);
  if (req.sessionId) deleteOtherSessions(req.user.id, req.sessionId);
  res.json({ ok: true, message: 'تم تحديث كلمة المرور وتسجيل الخروج من الأجهزة الأخرى.' });
});

router.get('/profile/export', (req, res) => {
  if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'يجب تسجيل الدخول للمتابعة.');
  const payload = buildUserExport(req.user.id);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="bactrack-dz-export.json"');
  res.setHeader('Cache-Control', 'no-store');
  res.send(JSON.stringify(payload, null, 2));
});

// Small endpoint to keep the settings type discoverable by the client.
router.get('/settings', (req, res) => {
  if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'يجب تسجيل الدخول للمتابعة.');
  res.json({ settings: getSettings(req.user.id) });
});

export default router;
