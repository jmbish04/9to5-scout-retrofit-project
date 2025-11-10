-- Migration: Add AppScript execution logging tables
-- Date: 2025-01-17

-- Table for logging Apps Script runs
CREATE TABLE IF NOT EXISTS appscript_runs (
  id TEXT PRIMARY KEY,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  script_name TEXT,
  execution_time DATETIME,
  triggered_by TEXT,
  status TEXT,
  emails_processed INTEGER DEFAULT 0,
  errors TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table for logging all worker requests
CREATE TABLE IF NOT EXISTS worker_request_logs (
  id TEXT PRIMARY KEY,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  source TEXT,
  request_body TEXT,
  response_code INTEGER,
  response_body TEXT,
  processing_time_ms INTEGER,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index on timestamp for efficient querying
CREATE INDEX IF NOT EXISTS idx_appscript_runs_timestamp ON appscript_runs(timestamp);
CREATE INDEX IF NOT EXISTS idx_worker_request_logs_timestamp ON worker_request_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_worker_request_logs_endpoint ON worker_request_logs(endpoint);
