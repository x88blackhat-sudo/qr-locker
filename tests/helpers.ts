import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';

export interface ApiResponse<T = any> {
  status: number;
  body: T;
  headers: Headers;
}

export interface TestClient {
  cookie: string;
  req: <T = any>(
    route: string,
    options?: {
      method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
      body?: unknown;
      headers?: Record<string, string>;
      omitClientHeader?: boolean;
    },
  ) => Promise<ApiResponse<T>>;
}

export interface TestServer {
  base: string;
  client: (ip?: string) => TestClient;
  close: () => Promise<void>;
  db: any;
}

function extractCookie(headers: Headers): string {
  const raw = headers.getSetCookie?.() ?? [];
  for (const header of raw) {
    const [pair] = header.split(';');
    const [name, value] = pair.split('=');
    if (name === 'bactrack_session') {
      return value ? `bactrack_session=${value}` : '';
    }
  }
  return '';
}

/**
 * Boots the real Express app against a throwaway SQLite file.
 * DATABASE_PATH must be set before the app (and therefore config/db) is imported.
 */
export async function startTestServer(): Promise<TestServer> {
  const dir = mkdtempSync(path.join(tmpdir(), 'bactrack-test-'));
  process.env.DATABASE_PATH = path.join(dir, 'test.db');
  process.env.NODE_ENV = 'test';
  delete process.env.APP_ORIGIN;
  delete process.env.PAYMENT_PROVIDER;
  delete process.env.PAYMENT_WEBHOOK_SECRET;

  const { createApp } = await import('../server/src/app');
  const { db } = await import('../server/src/db');

  const server: Server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    server.once('listening', () => resolve());
    server.once('error', reject);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test port');
  const base = `http://127.0.0.1:${address.port}/api`;

  let clientSeq = 0;
  const client = (ip?: string): TestClient => {
    clientSeq += 1;
    const clientIp = ip ?? `10.42.${Math.floor(clientSeq / 250)}.${(clientSeq % 250) + 1}`;
    let cookie = '';
    return {
      get cookie() {
        return cookie;
      },
      async req<T = any>(
        route: string,
        options: {
          method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
          body?: unknown;
          headers?: Record<string, string>;
          omitClientHeader?: boolean;
        } = {},
      ): Promise<ApiResponse<T>> {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Forwarded-For': clientIp,
          ...(options.omitClientHeader ? {} : { 'X-Requested-With': 'bactrack-dz' }),
          ...(cookie ? { Cookie: cookie } : {}),
          ...options.headers,
        };
        const response = await fetch(base + route, {
          method: options.method ?? 'GET',
          headers,
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
        });
        const nextCookie = extractCookie(response.headers);
        if (nextCookie || response.headers.has('set-cookie')) cookie = nextCookie;
        let body: unknown = null;
        const text = await response.text();
        if (text) {
          try {
            body = JSON.parse(text);
          } catch {
            body = text;
          }
        }
        return { status: response.status, body: body as T, headers: response.headers };
      },
    };
  };

  return {
    base,
    client,
    db,
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      try {
        db.close();
      } catch {
        /* already closed */
      }
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

let counter = 0;
export function freshEmail(prefix = 'student'): string {
  counter += 1;
  return `${prefix}.${Date.now().toString(36)}.${counter}@test.dz`;
}

export const PASSWORD = 'Test1234';

export async function register(
  client: TestClient,
  options: { name?: string; email?: string; password?: string } = {},
) {
  const email = options.email ?? freshEmail();
  const response = await client.req('/auth/register', {
    method: 'POST',
    body: {
      name: options.name ?? 'طالب تجريبي',
      email,
      password: options.password ?? PASSWORD,
      acceptTerms: true,
    },
  });
  return { email, response };
}
