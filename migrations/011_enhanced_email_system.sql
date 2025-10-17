-- Enhanced email system with embeddings, OTP detection, and improved logging
PRAGMA foreign_keys=ON;

-- Enhanced email_logs table with auto-incrementing ID and UUID
CREATE TABLE IF NOT EXISTS enhanced_email_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  from_email TEXT NOT NULL,
  to_email TEXT,
  subject TEXT,
  message_id TEXT,
  date_received TEXT,
  content_text TEXT,
  content_html TEXT,
  content_preview TEXT,
  headers TEXT, -- JSON string of all headers
  job_links_extracted INTEGER DEFAULT 0,
  jobs_processed INTEGER DEFAULT 0,
  embeddings_id TEXT, -- UUID for embeddings storage
  otp_detected BOOLEAN DEFAULT 0,
  otp_code TEXT,
  otp_forwarded_to TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  received_at TEXT DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Email embeddings table for semantic search
CREATE TABLE IF NOT EXISTS email_embeddings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_uuid TEXT NOT NULL,
  content_type TEXT NOT NULL, -- 'subject', 'body', 'full'
  content TEXT NOT NULL,
  embedding BLOB NOT NULL, -- Vectorized content
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (email_uuid) REFERENCES enhanced_email_logs(uuid) ON DELETE CASCADE
);

-- OTP forwarding log
CREATE TABLE IF NOT EXISTS otp_forwarding_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_uuid TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  forwarded_to TEXT NOT NULL,
  forwarded_at TEXT DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'sent',
  FOREIGN KEY (email_uuid) REFERENCES enhanced_email_logs(uuid) ON DELETE CASCADE
);

-- Email templates for HTML emails
CREATE TABLE IF NOT EXISTS email_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  subject_template TEXT NOT NULL,
  html_template TEXT NOT NULL,
  variables TEXT, -- JSON string of available variables
  is_active BOOLEAN DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert default email templates
INSERT INTO email_templates (name, subject_template, html_template, variables) VALUES 
('job_insights', 'Daily Job Insights - {{date}}', '<!DOCTYPE html><html><head><title>Job Insights</title></head><body><h1>Daily Job Insights</h1><p>Date: {{date}}</p><p>New Jobs: {{new_jobs_count}}</p><p>Total Jobs: {{total_jobs_count}}</p></body></html>', '["date", "new_jobs_count", "total_jobs_count", "top_companies", "top_locations"]'),
('otp_alert', 'OTP Code Received - {{service_name}}', '<!DOCTYPE html><html><head><title>OTP Alert</title></head><body><h1>OTP Code Received</h1><p>Service: {{service_name}}</p><p>Code: <strong>{{otp_code}}</strong></p><p>Time: {{timestamp}}</p></body></html>', '["service_name", "otp_code", "timestamp", "original_subject"]');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_enhanced_email_logs_uuid ON enhanced_email_logs(uuid);
CREATE INDEX IF NOT EXISTS idx_enhanced_email_logs_from_email ON enhanced_email_logs(from_email);
CREATE INDEX IF NOT EXISTS idx_enhanced_email_logs_received_at ON enhanced_email_logs(received_at);
CREATE INDEX IF NOT EXISTS idx_enhanced_email_logs_status ON enhanced_email_logs(status);
CREATE INDEX IF NOT EXISTS idx_enhanced_email_logs_otp_detected ON enhanced_email_logs(otp_detected);

CREATE INDEX IF NOT EXISTS idx_email_embeddings_uuid ON email_embeddings(email_uuid);
CREATE INDEX IF NOT EXISTS idx_email_embeddings_content_type ON email_embeddings(content_type);

CREATE INDEX IF NOT EXISTS idx_otp_forwarding_email_uuid ON otp_forwarding_log(email_uuid);
CREATE INDEX IF NOT EXISTS idx_otp_forwarding_forwarded_at ON otp_forwarding_log(forwarded_at);
