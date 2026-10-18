import type { RequestHandler } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 10 * 60 * 1000).unref();

export function rateLimit(options: {
  windowMs: number;
  max: number;
  key?: (req: Parameters<RequestHandler>[0]) => string;
  message?: string;
}): RequestHandler {
  return (req, res, next) => {
    const identity = options.key ? options.key(req) : (req.ip ?? 'unknown');
    const key = `${req.baseUrl}${req.path}:${identity}`;
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + options.windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > options.max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message:
            options.message ?? 'محاولات كثيرة في وقت قصير. يرجى الانتظار قليلًا ثم المحاولة مجددًا.',
        },
      });
      return;
    }
    next();
  };
}
