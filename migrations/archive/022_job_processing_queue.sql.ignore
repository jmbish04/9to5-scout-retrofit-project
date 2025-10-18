-- Job processing queue for tracking job URL processing from multiple sources
PRAGMA foreign_keys=ON;

-- Create job processing queue table
CREATE TABLE IF NOT EXISTS job_processing_queue (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  source TEXT NOT NULL, -- 'email', 'manual', 'api', 'websocket', etc.
  source_id TEXT, -- Optional ID to track the source (e.g., email_id, user_id)
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  job_id TEXT, -- FK to jobs table if successfully processed
  error TEXT, -- Error message if processing failed
  metadata TEXT, -- JSON string for additional metadata
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_job_processing_queue_source ON job_processing_queue(source);
CREATE INDEX IF NOT EXISTS idx_job_processing_queue_source_id ON job_processing_queue(source_id);
CREATE INDEX IF NOT EXISTS idx_job_processing_queue_status ON job_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_job_processing_queue_created_at ON job_processing_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_job_processing_queue_job_id ON job_processing_queue(job_id);
