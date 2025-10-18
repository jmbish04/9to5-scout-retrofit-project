-- Centralize email logging into a single email_logs table
-- This migration consolidates enhanced_email_logs features into the main email_logs table
PRAGMA foreign_keys=ON;

-- First, let's backup the existing tables
CREATE TABLE IF NOT EXISTS email_logs_backup AS SELECT * FROM email_logs;
CREATE TABLE IF NOT EXISTS enhanced_email_logs_backup AS SELECT * FROM enhanced_email_logs;

-- Drop the old email_logs table and recreate it with all enhanced features
DROP TABLE IF EXISTS email_logs;

CREATE TABLE email_logs (
  -- Primary key and identification
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  
  -- Basic email information
  from_email TEXT NOT NULL,
  to_email TEXT,
  subject TEXT,
  message_id TEXT,
  date_received TEXT,
  
  -- Email content
  content_text TEXT,
  content_html TEXT,
  content_preview TEXT,
  headers TEXT, -- JSON string of all headers
  
  -- Job processing tracking
  job_links_extracted INTEGER DEFAULT 0,
  jobs_processed INTEGER DEFAULT 0,
  
  -- AI classification fields
  ai_from TEXT,
  ai_subject TEXT,
  ai_body TEXT,
  ai_category TEXT CHECK(ai_category IN ('SPAM', 'JOB_ALERT', 'MESSAGE', 'RECRUITER', 'NETWORKING', 'MARKETING_SPAM', 'OTP', 'SYSTEM', 'UNKNOWN')),
  ai_category_reasoning TEXT,
  ai_job_links TEXT, -- JSON array of extracted job URLs
  ai_processed_at TEXT,
  ai_processing_status TEXT DEFAULT 'pending' CHECK(ai_processing_status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Embeddings and semantic search
  embeddings_id TEXT, -- UUID for embeddings storage
  embeddings_vector TEXT, -- JSON array of embedding values for semantic search
  
  -- OTP detection and forwarding
  otp_detected BOOLEAN DEFAULT 0,
  otp_code TEXT,
  otp_forwarded_to TEXT,
  
  -- Status and timestamps
  status TEXT NOT NULL DEFAULT 'pending',
  received_at TEXT DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Migrate data from enhanced_email_logs to the new email_logs table
INSERT INTO email_logs (
  id, uuid, from_email, to_email, subject, message_id, date_received,
  content_text, content_html, content_preview, headers,
  job_links_extracted, jobs_processed,
  ai_from, ai_subject, ai_body, ai_category, ai_category_reasoning, ai_job_links, ai_processed_at, ai_processing_status,
  embeddings_id, embeddings_vector,
  otp_detected, otp_code, otp_forwarded_to,
  status, received_at, processed_at, created_at, updated_at
)
SELECT 
  id, uuid, from_email, to_email, subject, message_id, date_received,
  content_text, content_html, content_preview, headers,
  job_links_extracted, jobs_processed,
  ai_from, ai_subject, ai_body, ai_category, ai_category_reasoning, ai_job_links, ai_processed_at, ai_processing_status,
  embeddings_id, NULL as embeddings_vector, -- Will be populated when embeddings are generated
  otp_detected, otp_code, otp_forwarded_to,
  status, received_at, processed_at, created_at, updated_at
FROM enhanced_email_logs;

-- Migrate any remaining data from the old email_logs_backup that wasn't in enhanced_email_logs
INSERT OR IGNORE INTO email_logs (
  id, from_email, subject, content_preview, job_links_extracted, jobs_processed,
  received_at, processed_at, status, created_at, updated_at
)
SELECT 
  CAST(id AS INTEGER), from_email, subject, content_preview, job_links_extracted, jobs_processed,
  received_at, processed_at, status, received_at as created_at, processed_at as updated_at
FROM email_logs_backup
WHERE CAST(id AS INTEGER) NOT IN (SELECT id FROM email_logs);

-- Update email_job_links to reference the consolidated email_logs table
-- First backup the existing email_job_links
CREATE TABLE IF NOT EXISTS email_job_links_backup AS SELECT * FROM email_job_links;

-- Drop and recreate email_job_links with proper foreign key
DROP TABLE IF EXISTS email_job_links;
CREATE TABLE email_job_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_id INTEGER NOT NULL, -- References email_logs.id
  job_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  job_id TEXT, -- FK to jobs table if successfully processed
  processing_error TEXT, -- Store error message if processing fails
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (email_id) REFERENCES email_logs(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
);

-- Migrate existing email_job_links data
INSERT INTO email_job_links (email_id, job_url, status, job_id, processing_error, created_at, updated_at)
SELECT 
  ejl.email_id,
  ejl.job_url,
  ejl.status,
  ejl.job_id,
  ejl.processing_error,
  ejl.created_at,
  ejl.updated_at
FROM email_job_links_backup ejl
WHERE ejl.email_id IN (SELECT id FROM email_logs);

-- Create comprehensive indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_logs_from_email ON email_logs(from_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_subject ON email_logs(subject);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_received_at ON email_logs(received_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_ai_category ON email_logs(ai_category);
CREATE INDEX IF NOT EXISTS idx_email_logs_ai_processing_status ON email_logs(ai_processing_status);
CREATE INDEX IF NOT EXISTS idx_email_logs_embeddings_id ON email_logs(embeddings_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_otp_detected ON email_logs(otp_detected);
CREATE INDEX IF NOT EXISTS idx_email_logs_uuid ON email_logs(uuid);

-- Create indexes for email_job_links
CREATE INDEX IF NOT EXISTS idx_email_job_links_email_id ON email_job_links(email_id);
CREATE INDEX IF NOT EXISTS idx_email_job_links_status ON email_job_links(status);
CREATE INDEX IF NOT EXISTS idx_email_job_links_job_id ON email_job_links(job_id);

-- Update any existing email embeddings to reference the new table structure
-- (This would need to be handled in the application code as well)

-- Clean up backup tables (commented out for safety - uncomment after verifying migration)
-- DROP TABLE IF EXISTS email_logs_backup;
-- DROP TABLE IF EXISTS enhanced_email_logs_backup;
-- DROP TABLE IF EXISTS email_job_links_backup;

-- Note: The enhanced_email_logs table is kept for now to ensure no data loss
-- It can be dropped after confirming the migration was successful
