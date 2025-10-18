PRAGMA foreign_keys=ON;

CREATE TABLE scrape_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  urls TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  payload TEXT,
  available_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_claimed_at TEXT,
  completed_at TEXT,
  error_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE scraped_job_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  queue_id INTEGER REFERENCES scrape_queue(id) ON DELETE SET NULL,
  job_url TEXT NOT NULL,
  source TEXT,
  company TEXT,
  title TEXT,
  location TEXT,
  employment_type TEXT,
  salary TEXT,
  apply_url TEXT,
  description TEXT,
  metadata TEXT,
  raw_payload TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scrape_queue_status_available ON scrape_queue(status, available_at);
CREATE INDEX idx_scrape_queue_queue_id ON scraped_job_details(queue_id);
CREATE INDEX idx_scraped_job_details_job_url ON scraped_job_details(job_url);
