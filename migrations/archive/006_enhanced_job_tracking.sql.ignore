-- Enhanced job tracking for daily monitoring with PDF and markdown storage
PRAGMA foreign_keys=ON;

-- Add PDF and markdown storage to snapshots table
ALTER TABLE snapshots ADD COLUMN pdf_r2_key TEXT;
ALTER TABLE snapshots ADD COLUMN markdown_r2_key TEXT;

-- Add job tracking metadata
ALTER TABLE jobs ADD COLUMN daily_monitoring_enabled BOOLEAN NOT NULL DEFAULT 1;
ALTER TABLE jobs ADD COLUMN monitoring_frequency_hours INTEGER NOT NULL DEFAULT 24;
ALTER TABLE jobs ADD COLUMN last_status_check_at TEXT;
ALTER TABLE jobs ADD COLUMN closure_detected_at TEXT;

-- Job tracking history for analytics
CREATE TABLE job_tracking_history (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES jobs(id),
  snapshot_id TEXT REFERENCES snapshots(id),
  tracking_date TEXT NOT NULL, -- Date-only for daily tracking (YYYY-MM-DD)
  status TEXT NOT NULL,         -- 'open', 'closed', 'modified', 'error'
  content_hash TEXT,
  title_changed BOOLEAN DEFAULT 0,
  requirements_changed BOOLEAN DEFAULT 0,
  salary_changed BOOLEAN DEFAULT 0,
  description_changed BOOLEAN DEFAULT 0,
  error_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Job market analytics aggregation table
CREATE TABLE job_market_stats (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,              -- Date for the stats (YYYY-MM-DD)
  total_jobs_tracked INTEGER DEFAULT 0,
  new_jobs_found INTEGER DEFAULT 0,
  jobs_closed INTEGER DEFAULT 0,
  jobs_modified INTEGER DEFAULT 0,
  avg_job_duration_days REAL,
  top_companies TEXT,              -- JSON array of top companies
  trending_keywords TEXT,          -- JSON array of trending keywords
  salary_stats TEXT,              -- JSON object with salary statistics
  location_stats TEXT,            -- JSON object with location statistics
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient querying
CREATE INDEX idx_job_tracking_history_job_date ON job_tracking_history(job_id, tracking_date);
CREATE INDEX idx_job_tracking_history_date ON job_tracking_history(tracking_date);
CREATE INDEX idx_job_market_stats_date ON job_market_stats(date);
CREATE INDEX idx_jobs_daily_monitoring ON jobs(daily_monitoring_enabled, status);
CREATE INDEX idx_jobs_last_status_check ON jobs(last_status_check_at) WHERE daily_monitoring_enabled = 1;
CREATE INDEX idx_snapshots_job_date ON snapshots(job_id, fetched_at);