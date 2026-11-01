import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function initDatabase(dbPath?: string): Database.Database {
  const targetPath = dbPath ?? process.env.DB_PATH ?? path.join(__dirname, '..', 'recruiter_bot.db');
  const db = new Database(targetPath);

  // Enforce foreign key constraints
  db.pragma('foreign_keys = ON');

  // Initialize schema if tables don't exist
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);

  return db;
}

export const db: Database.Database = initDatabase();

