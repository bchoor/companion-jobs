CREATE TABLE jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  url TEXT,
  frequency_hours INTEGER NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  config TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending', 'running', 'success', 'failed')),
  output_file TEXT,
  screenshot_file TEXT,
  error_message TEXT,
  products_found INTEGER,
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);

CREATE TABLE results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (run_id) REFERENCES runs(id)
);

CREATE TABLE files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hash TEXT NOT NULL UNIQUE,
  original_name TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
