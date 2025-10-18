-- Create table for email job links mapping
CREATE TABLE IF NOT EXISTS email_job_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_auto_id INTEGER NOT NULL,
  job_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  job_id INTEGER, -- FK to jobs table if successfully processed
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (email_auto_id) REFERENCES enhanced_email_logs(auto_id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_job_links_email_id ON email_job_links(email_auto_id);
CREATE INDEX IF NOT EXISTS idx_email_job_links_status ON email_job_links(status);
