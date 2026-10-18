import crypto from 'node:crypto';
import type { Response } from 'express';
import type { User } from '../../../shared/types';
import { config } from '../config';
import { db, newId } from '../db';
import { DAY_MS } from '../lib/time';

const SCRYPT_KEYLEN = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: string;
  created_at: number;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password.normalize('NFKC'), salt, SCRYPT_KEYLEN, SCRYPT_OPTIONS);
  return `scrypt$${SCRYPT_OPTIONS.N}$${SCRYPT_OPTIONS.r}$${SCRYPT_OPTIONS.p}$${salt}$${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, salt, hashHex] = parts;
  try {
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(password.normalize('NFKC'), salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 64 * 1024 * 1024,
    });
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function toPublicUser(row: UserRow): User {
  return { id: row.id, name: row.name, email: row.email, createdAt: row.created_at };
}

export function createUser(input: {
  name: string;
  email: string;
  password: string;
  termsAcceptedAt: number;
}): User {
  const now = Date.now();
  const id = newId('usr');
  db.prepare(
    `INSERT INTO users (id, email, name, password_hash, role, created_at, updated_at, terms_accepted_at)
     VALUES (?, ?, ?, ?, 'student', ?, ?, ?)`,
  ).run(
    id,
    input.email.toLowerCase(),
    input.name,
    hashPassword(input.password),
    now,
    now,
    input.termsAcceptedAt,
  );
  db.prepare(
    `INSERT INTO user_settings (user_id, theme, daily_goal_minutes, updated_at) VALUES (?, 'system', 120, ?)`,
  ).run(id, now);
  db.prepare(
    `INSERT INTO subscriptions (user_id, trial_used, subscription_status, updated_at)
     VALUES (?, 0, 'not_started', ?)`,
  ).run(id, now);
  return {
    id,
    name: input.name,
    email: input.email.toLowerCase(),
    createdAt: now,
  };
}

export function findUserByEmail(
  email: string,
): (UserRow & { password_hash: string }) | undefined {
  return db
    .prepare(
      'SELECT id, email, name, password_hash, role, created_at FROM users WHERE email = ? COLLATE NOCASE',
    )
    .get(email.trim().toLowerCase()) as (UserRow & { password_hash: string }) | undefined;
}

export function createSession(
  userId: string,
  meta: { ip?: string | null; userAgent?: string | null } = {},
): { token: string; expiresAt: number } {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  const expiresAt = now + config.sessionDays * DAY_MS;
  db.prepare(
    `INSERT INTO sessions (id, user_id, created_at, expires_at, user_agent, ip)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    hashToken(token),
    userId,
    now,
    expiresAt,
    meta.userAgent?.slice(0, 300) ?? null,
    meta.ip ?? null,
  );
  return { token, expiresAt };
}

export function getSession(token: string): { user: User; sessionId: string } | null {
  const sessionId = hashToken(token);
  const row = db
    .prepare(
      `SELECT s.expires_at, u.id, u.email, u.name, u.role, u.created_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
    )
    .get(sessionId) as
    | { expires_at: number; id: string; email: string; name: string; role: string; created_at: number }
    | undefined;
  if (!row) return null;
  if (row.expires_at <= Date.now()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    return null;
  }
  return {
    user: { id: row.id, name: row.name, email: row.email, createdAt: row.created_at },
    sessionId,
  };
}

export function deleteSession(sessionId: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

export function deleteAllSessions(userId: string): void {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

export function purgeExpiredSessions(): void {
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
}

export function setSessionCookie(
  res: Response,
  token: string,
  expiresAt: number,
  requestIsSecure = false,
): void {
  const secure = requestIsSecure || config.cookieSecure;
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    // HTTPS previews are embedded in a third-party iframe, so the cookie must
    // be SameSite=None there. Production keeps Lax and blocks framing instead.
    sameSite: secure && !config.isProd ? 'none' : 'lax',
    secure,
    path: '/',
    expires: new Date(expiresAt),
  });
}

export function clearSessionCookie(res: Response, requestIsSecure = false): void {
  const secure = requestIsSecure || config.cookieSecure;
  res.clearCookie(config.cookieName, {
    httpOnly: true,
    sameSite: secure && !config.isProd ? 'none' : 'lax',
    secure,
    path: '/',
  });
}

export function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}


export function getPasswordHash(userId: string): string | null {
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as
    | { password_hash: string }
    | undefined;
  return row?.password_hash ?? null;
}

export function updatePassword(userId: string, password: string): void {
  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
    hashPassword(password),
    Date.now(),
    userId,
  );
}

export function deleteOtherSessions(userId: string, keepSessionId: string): void {
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND id <> ?').run(userId, keepSessionId);
}
