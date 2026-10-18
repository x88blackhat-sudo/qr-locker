import { Router } from 'express';
import { z } from 'zod';
import { withTransaction } from '../db';
import { HttpError, parseWith } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import {
  clearSessionCookie,
  createSession,
  createUser,
  deleteAllSessions,
  deleteSession,
  findUserByEmail,
  setSessionCookie,
  verifyPassword,
} from '../services/auth';
import { getMe } from '../services/account';

const router = Router();

const emailSchema = z
  .string()
  .trim()
  .min(5, 'أدخل بريدًا إلكترونيًا صالحًا.')
  .max(254, 'البريد الإلكتروني طويل جدًا.')
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'أدخل بريدًا إلكترونيًا صالحًا.')
  .toLowerCase();

const passwordSchema = z
  .string()
  .min(8, 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.')
  .max(128, 'كلمة المرور طويلة جدًا.')
  .regex(/[A-Za-z]/, 'يجب أن تحتوي كلمة المرور على حرف واحد على الأقل.')
  .regex(/\d/, 'يجب أن تحتوي كلمة المرور على رقم واحد على الأقل.');

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'الاسم قصير جدًا.')
    .max(60, 'الاسم طويل جدًا.')
    .regex(/^[\p{L}\p{M}\s'’.-]+$/u, 'أدخل اسمًا صالحًا.'),
  email: emailSchema,
  password: passwordSchema,
  acceptTerms: z.boolean().refine((value) => value === true, {
    message: 'يجب الموافقة على شروط الاستخدام وسياسة الخصوصية.',
  }),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'أدخل كلمة المرور.').max(128),
});

router.post(
  '/register',
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 8,
    message: 'تم إنشاء محاولات تسجيل كثيرة. يرجى المحاولة بعد قليل.',
  }),
  (req, res) => {
    const body = parseWith(registerSchema, req.body);
    if (findUserByEmail(body.email)) {
      throw new HttpError(409, 'EMAIL_TAKEN', 'هذا البريد الإلكتروني مسجّل مسبقًا.', {
        email: 'هذا البريد الإلكتروني مسجّل مسبقًا.',
      });
    }

    let user;
    try {
      user = withTransaction(() =>
        createUser({
          name: body.name,
          email: body.email,
          password: body.password,
          termsAcceptedAt: Date.now(),
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('UNIQUE constraint failed')) {
        throw new HttpError(409, 'EMAIL_TAKEN', 'هذا البريد الإلكتروني مسجّل مسبقًا.', {
          email: 'هذا البريد الإلكتروني مسجّل مسبقًا.',
        });
      }
      throw error;
    }

    const session = createSession(user.id, { ip: req.ip, userAgent: req.get('user-agent') });
    setSessionCookie(res, session.token, session.expiresAt, req.secure);
    res.status(201).json(getMe(user.id));
  },
);

router.post(
  '/login',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 12,
    key: (req) => `${req.ip ?? 'ip'}:${String(req.body?.email ?? '').toLowerCase().slice(0, 120)}`,
    message: 'محاولات دخول كثيرة. يرجى الانتظار 15 دقيقة ثم المحاولة مجددًا.',
  }),
  (req, res) => {
    const body = parseWith(loginSchema, req.body);
    const user = findUserByEmail(body.email);
    if (!user || !verifyPassword(body.password, user.password_hash)) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
    }
    const session = createSession(user.id, { ip: req.ip, userAgent: req.get('user-agent') });
    setSessionCookie(res, session.token, session.expiresAt, req.secure);
    res.json(getMe(user.id));
  },
);

router.post('/logout', (req, res) => {
  if (req.sessionId) deleteSession(req.sessionId);
  clearSessionCookie(res, req.secure);
  res.json({ ok: true });
});

router.post('/logout-all', requireAuth, (req, res) => {
  if (!req.user) return;
  deleteAllSessions(req.user.id);
  clearSessionCookie(res, req.secure);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  if (!req.user) throw new HttpError(401, 'UNAUTHORIZED', 'يجب تسجيل الدخول للمتابعة.');
  res.json(getMe(req.user.id));
});

export default router;
