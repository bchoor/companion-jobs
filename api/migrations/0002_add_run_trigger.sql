-- Migration: 0002_add_run_trigger.sql
-- Description: Add trigger column to runs table and remove config column from jobs table

-- 1. Add trigger column to runs table
-- This tracks whether a run was triggered by the scheduler ('scheduled') or manually ('manual')
ALTER TABLE runs ADD COLUMN trigger TEXT NOT NULL DEFAULT 'scheduled' CHECK(trigger IN ('scheduled', 'manual'));

-- 2. Remove config column from jobs table
-- D1/SQLite doesn't support DROP COLUMN, so we use the standard workaround:
-- create new table → copy data → drop old → rename new

CREATE TABLE jobs_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'scrape',
  url TEXT,
  frequency_hours INTEGER NOT NULL DEFAULT 24,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Copy existing data (excluding config column)
INSERT INTO jobs_new (id, name, type, url, frequency_hours, enabled, created_at, updated_at)
  SELECT id, name, type, url, frequency_hours, enabled, created_at, updated_at FROM jobs;

-- Replace old table with new
DROP TABLE jobs;
ALTER TABLE jobs_new RENAME TO jobs;
