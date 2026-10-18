import type { RequestHandler } from 'express';
import { config } from '../config';
import { HttpError } from '../lib/http';

export const API_CLIENT_HEADER = 'bactrack-dz';

export const securityHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Production stays clickjacking-safe. Development additionally allows the
  // sandbox preview host so the live preview can embed the app in an iframe.
  if (config.isProd) {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
  } else {
    res.setHeader(
      'Content-Security-Policy',
      "frame-ancestors 'self' https://*.e2b.app https://*.arena.ai",
    );
  }
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (config.isProd && config.cookieSecure) {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
};

/**
 * CSRF defence in depth for the cookie-authenticated API:
 *  1. Mutations must carry a custom header (simple HTML form posts cannot).
 *  2. When an Origin header is present it must match the request host or APP_ORIGIN.
 * Cookies themselves are HttpOnly + SameSite=Lax.
 */
export const apiGuards: RequestHandler = (req, _res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next();
    return;
  }
  if (req.get('x-requested-with') !== API_CLIENT_HEADER) {
    throw new HttpError(
      403,
      'CLIENT_HEADER_REQUIRED',
      'طلب غير صالح. يرجى تحديث الصفحة والمحاولة مجددًا.',
    );
  }
  const origin = req.get('origin');
  if (origin) {
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      throw new HttpError(403, 'ORIGIN_REJECTED', 'مصدر الطلب غير مسموح.');
    }
    // Behind the preview/reverse proxy the public host may arrive in
    // X-Forwarded-Host while the raw Host header is internal.
    const forwardedHost = req.get('x-forwarded-host')?.split(',')[0]?.trim();
    let sameHost =
      originHost === req.get('host') || (Boolean(forwardedHost) && originHost === forwardedHost);
    if (!sameHost && !config.isProd) {
      // Development-only: the sandbox preview is embedded from *.e2b.app.
      sameHost = /(^|\.)e2b\.app$/.test(new URL(origin).hostname);
    }
    const allowlisted = config.appOrigin ? origin === config.appOrigin : false;
    if (!sameHost && !allowlisted) {
      throw new HttpError(403, 'ORIGIN_REJECTED', 'مصدر الطلب غير مسموح.');
    }
  }
  next();
};
