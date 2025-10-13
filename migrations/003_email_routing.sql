-- Email routing and source tracking enhancements
PRAGMA foreign_keys=ON;

-- Add source tracking to jobs table
ALTER TABLE jobs ADD COLUMN source TEXT NOT NULL DEFAULT 'SCRAPED';

-- Email configuration table for sending insights
CREATE TABLE email_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT 1,
  frequency_hours INTEGER NOT NULL DEFAULT 24,
  recipient_email TEXT NOT NULL,
  include_new_jobs BOOLEAN NOT NULL DEFAULT 1,
  include_job_changes BOOLEAN NOT NULL DEFAULT 1,
  include_statistics BOOLEAN NOT NULL DEFAULT 1,
  last_sent_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT
);

-- Email processing log to track incoming emails
CREATE TABLE email_logs (
  id TEXT PRIMARY KEY,
  from_email TEXT NOT NULL,
  subject TEXT,
  content_preview TEXT,
  job_links_extracted INTEGER DEFAULT 0,
  jobs_processed INTEGER DEFAULT 0,
  received_at TEXT DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
);

-- Insert default email configuration
INSERT INTO email_configs (id, name, recipient_email, frequency_hours) 
VALUES ('default', 'Daily Job Insights', 'justin@126colby.com', 24);
