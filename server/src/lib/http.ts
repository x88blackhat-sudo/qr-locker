import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError, type ZodType } from 'zod';

export class HttpError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function parseWith<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.length ? issue.path.join('.') : '_';
      if (!fields[key]) fields[key] = issue.message;
    }
    throw new HttpError(422, 'VALIDATION_ERROR', 'يرجى التحقق من الحقول المدخلة.', fields);
  }
  return result.data;
}

export function notFound(message = 'المورد المطلوب غير موجود.'): HttpError {
  return new HttpError(404, 'NOT_FOUND', message);
}

export function forbidden(message = 'لا تملك صلاحية للقيام بهذا الإجراء.'): HttpError {
  return new HttpError(403, 'FORBIDDEN', message);
}

export function unauthorized(message = 'يجب تسجيل الدخول للمتابعة.'): HttpError {
  return new HttpError(401, 'UNAUTHORIZED', message);
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'المسار المطلوب غير موجود.' } });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.fields ? { fields: err.fields } : {}) },
    });
    return;
  }
  if (err instanceof ZodError) {
    res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'يرجى التحقق من الحقول المدخلة.' },
    });
    return;
  }
  // SQLite constraint failures are logged without leaking internals to the client.
  const message = err instanceof Error ? err.message : 'Unknown error';
  if (message.includes('UNIQUE constraint failed')) {
    res.status(409).json({ error: { code: 'DUPLICATE', message: 'هذه البيانات موجودة مسبقًا.' } });
    return;
  }
  if (message.includes('immutable') || message.includes('constraint')) {
    res.status(409).json({
      error: { code: 'CONSTRAINT_VIOLATION', message: 'تعذّر تنفيذ العملية بسبب قيود البيانات.' },
    });
    return;
  }
  console.error(`[${req.method} ${req.originalUrl}]`, err);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'حدث خطأ غير متوقع. يرجى المحاولة لاحقًا.' },
  });
};
