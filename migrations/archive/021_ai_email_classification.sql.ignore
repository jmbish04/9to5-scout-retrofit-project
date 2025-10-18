-- AI-powered email classification system
PRAGMA foreign_keys=ON;

-- Add AI classification fields to enhanced_email_logs table
ALTER TABLE enhanced_email_logs ADD COLUMN ai_from TEXT;
ALTER TABLE enhanced_email_logs ADD COLUMN ai_subject TEXT;
ALTER TABLE enhanced_email_logs ADD COLUMN ai_body TEXT;
ALTER TABLE enhanced_email_logs ADD COLUMN ai_category TEXT CHECK(ai_category IN ('SPAM', 'JOB_ALERT', 'MESSAGE', 'RECRUITER', 'NETWORKING', 'MARKETING_SPAM', 'OTP', 'SYSTEM', 'UNKNOWN'));
ALTER TABLE enhanced_email_logs ADD COLUMN ai_category_reasoning TEXT;
ALTER TABLE enhanced_email_logs ADD COLUMN ai_job_links TEXT; -- JSON array of extracted job URLs
ALTER TABLE enhanced_email_logs ADD COLUMN ai_processed_at TEXT;
ALTER TABLE enhanced_email_logs ADD COLUMN ai_processing_status TEXT DEFAULT 'pending' CHECK(ai_processing_status IN ('pending', 'processing', 'completed', 'failed'));

-- Create index for AI category filtering
CREATE INDEX IF NOT EXISTS idx_enhanced_email_logs_ai_category ON enhanced_email_logs(ai_category);
CREATE INDEX IF NOT EXISTS idx_enhanced_email_logs_ai_processing_status ON enhanced_email_logs(ai_processing_status);

-- Update email_job_links table to reference the correct column
-- Note: The existing table references auto_id but we need to reference id
-- We'll need to handle this migration carefully
DROP TABLE IF EXISTS email_job_links_old;
CREATE TABLE email_job_links_old AS SELECT * FROM email_job_links;

DROP TABLE IF EXISTS email_job_links;
CREATE TABLE email_job_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_id INTEGER NOT NULL, -- References enhanced_email_logs.id
  job_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  job_id TEXT, -- FK to jobs table if successfully processed
  processing_error TEXT, -- Store error message if processing fails
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (email_id) REFERENCES enhanced_email_logs(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
);

-- Migrate existing data if any
INSERT INTO email_job_links (email_id, job_url, status, job_id, created_at, updated_at)
SELECT 
  e.id as email_id,
  ejl.job_url,
  ejl.status,
  ejl.job_id,
  ejl.created_at,
  ejl.updated_at
FROM email_job_links_old ejl
JOIN enhanced_email_logs e ON e.id = ejl.email_auto_id;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_job_links_email_id ON email_job_links(email_id);
CREATE INDEX IF NOT EXISTS idx_email_job_links_status ON email_job_links(status);
CREATE INDEX IF NOT EXISTS idx_email_job_links_job_id ON email_job_links(job_id);

-- Clean up old table
DROP TABLE IF EXISTS email_job_links_old;
