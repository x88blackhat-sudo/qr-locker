import type { ApiErrorBody } from '@shared/types';

const CLIENT_HEADER = 'bactrack-dz';

export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': CLIENT_HEADER,
  };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    credentials: 'same-origin',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  if (!response.ok) {
    let payload: ApiErrorBody | null = null;
    try {
      payload = (await response.json()) as ApiErrorBody;
    } catch {
      /* non-JSON error */
    }
    throw new ApiError(
      response.status,
      payload?.error?.code ?? 'REQUEST_FAILED',
      payload?.error?.message ?? 'تعذّر إكمال الطلب. يرجى المحاولة مجددًا.',
      payload?.error?.fields,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function downloadDataExport(): Promise<void> {
  const response = await fetch('/api/profile/export', {
    headers: { Accept: 'application/json', 'X-Requested-With': CLIENT_HEADER },
    credentials: 'same-origin',
  });
  if (!response.ok) {
    throw new ApiError(response.status, 'EXPORT_FAILED', 'تعذّر تصدير بياناتك. يرجى المحاولة لاحقًا.');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bactrack-dz-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}
