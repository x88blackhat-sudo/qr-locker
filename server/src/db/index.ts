import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config';
import { seedCurriculum } from './seed';

const here = path.dirname(fileURLToPath(import.meta.url));

if (config.databasePath !== ':memory:') {
  fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });
}

export const db = new DatabaseSync(config.databasePath);

db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA busy_timeout = 5000');
if (config.databasePath !== ':memory:') {
  db.exec('PRAGMA journal_mode = WAL');
}

const schemaPath = path.join(here, 'schema.sql');
if (!fs.existsSync(schemaPath)) {
  throw new Error(`Database schema not found at ${schemaPath}`);
}
db.exec(fs.readFileSync(schemaPath, 'utf8'));

/** Small forward-only migrations for databases created by earlier builds. */
function migrate(): void {
  const columns = db.prepare('PRAGMA table_info(users)').all() as { name: string }[];
  if (!columns.some((column) => column.name === 'terms_accepted_at')) {
    db.exec('ALTER TABLE users ADD COLUMN terms_accepted_at INTEGER');
  }
}
migrate();
seedCurriculum(db);

/** Runs a synchronous transaction, rolling back on any failure. */
export function withTransaction<T>(fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const value = fn();
    db.exec('COMMIT');
    return value;
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      /* already rolled back */
    }
    throw error;
  }
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 20)}`;
}
