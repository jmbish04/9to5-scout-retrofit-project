-- Create scrape_queue table and add source column for Python integration
PRAGMA foreign_keys=ON;

-- Create scrape_queue table if it doesn't exist
CREATE TABLE IF NOT EXISTS scrape_queue (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  site_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  available_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  source TEXT
);

-- Add indexes for efficient querying (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_scrape_queue_status ON scrape_queue(status);
CREATE INDEX IF NOT EXISTS idx_scrape_queue_priority ON scrape_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_queue_available_at ON scrape_queue(available_at);
