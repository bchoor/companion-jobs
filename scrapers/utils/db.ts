import { createClient, type Client } from "@libsql/client";
import { resolve } from "path";
import type { Job } from "./types";

const DB_PATH = resolve(import.meta.dir, "..", "scraper-jobs.db");

let client: Client | null = null;
let fkEnabled = false;

export function getDb(): Client {
  if (!client) {
    client = createClient({ url: `file:${DB_PATH}` });
  }
  return client;
}

async function enableForeignKeys(): Promise<void> {
  if (!fkEnabled) {
    const db = getDb();
    await db.execute("PRAGMA foreign_keys = ON");
    fkEnabled = true;
  }
}

export async function initDb(): Promise<void> {
  await enableForeignKeys();
  const db = getDb();
  await db.executeMultiple(`

    CREATE TABLE IF NOT EXISTS jobs (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT NOT NULL UNIQUE,
      url             TEXT NOT NULL,
      frequency_hours REAL NOT NULL DEFAULT 4,
      enabled         INTEGER NOT NULL DEFAULT 1,
      config          TEXT NOT NULL DEFAULT '{}',
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS runs (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id          INTEGER NOT NULL REFERENCES jobs(id),
      started_at      TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at    TEXT,
      status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'running', 'success', 'failed')),
      output_file     TEXT,
      screenshot_file TEXT,
      error_message   TEXT,
      products_found  INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_runs_job_id ON runs(job_id);
    CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
    CREATE INDEX IF NOT EXISTS idx_runs_job_started ON runs(job_id, started_at DESC);

    CREATE TABLE IF NOT EXISTS files (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      hash          TEXT NOT NULL UNIQUE,
      original_name TEXT NOT NULL,
      mime_type     TEXT NOT NULL,
      size_bytes    INTEGER NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash);

    CREATE TABLE IF NOT EXISTS results (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id     INTEGER NOT NULL REFERENCES runs(id),
      data       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_results_run_id ON results(run_id);
  `);
}

export async function ensureJob(def: {
  name: string;
  url: string;
  frequencyHours: number;
  enabled?: boolean;
  config?: Record<string, unknown>;
}): Promise<Job> {
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO jobs (name, url, frequency_hours, enabled, config)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(name) DO UPDATE SET
            url = excluded.url,
            frequency_hours = excluded.frequency_hours,
            config = excluded.config,
            updated_at = datetime('now')`,
    args: [
      def.name,
      def.url,
      def.frequencyHours,
      def.enabled !== false ? 1 : 0,
      JSON.stringify(def.config ?? {}),
    ],
  });
  const result = await db.execute({
    sql: "SELECT * FROM jobs WHERE name = ?",
    args: [def.name],
  });
  return result.rows[0] as unknown as Job;
}

export async function closeDb(): Promise<void> {
  if (client) {
    client.close();
    client = null;
  }
}
