import type { RequestHandler } from 'express';
import { config } from '../config';
import { HttpError, unauthorized } from '../lib/http';
import { getSession, readCookie } from '../services/auth';
import { getSubscriptionInfo, syncExpiredSubscription } from '../services/subscription';

export const attachUser: RequestHandler = (req, _res, next) => {
  const token = readCookie(req.headers.cookie, config.cookieName);
  if (token) {
    const session = getSession(token);
    if (session) {
      req.user = session.user;
      req.sessionId = session.sessionId;
    }
  }
  next();
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) throw unauthorized();
  next();
};

/**
 * Server-side access gate for actions that create learning progress. Expired
 * students keep full read access to their saved data, but cannot create new
 * progress until a real subscription mechanism exists.
 */
export const requireStudyAccess: RequestHandler = (req, _res, next) => {
  if (!req.user) throw unauthorized();
  syncExpiredSubscription(req.user.id);
  const subscription = getSubscriptionInfo(req.user.id);
  if (subscription.access === 'trial' || subscription.access === 'paid') {
    next();
    return;
  }
  if (subscription.access === 'none') {
    throw new HttpError(
      403,
      'TRIAL_NOT_STARTED',
      'ابدأ تجربتك المجانية لمدة 30 يومًا أولًا لتسجيل تقدّمك.',
    );
  }
  throw new HttpError(
    403,
    'TRIAL_EXPIRED',
    'انتهت فترة التجربة المجانية. جميع بياناتك ونتائجك محفوظة، ويمكنك الاطلاع عليها في أي وقت.',
  );
};
