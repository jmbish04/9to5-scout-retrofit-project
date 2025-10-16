PRAGMA foreign_keys=ON;

CREATE TABLE job_intake_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_url TEXT NOT NULL,
  job_title TEXT,
  company_name TEXT,
  source TEXT,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  dry_run INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  queued_at TEXT DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT,
  completed_at TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_intake_status_priority ON job_intake_queue(status, priority, queued_at);
CREATE INDEX idx_job_intake_job_url ON job_intake_queue(job_url);
