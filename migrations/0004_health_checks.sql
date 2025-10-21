-- Migration 0004: Create health_check_runs table
-- This table stores the results of modular health checks, providing a historical
-- record of the application's operational status.

CREATE TABLE IF NOT EXISTS health_check_runs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('passing', 'failing', 'in-progress')),
    duration_ms INTEGER,
    results TEXT, -- JSON blob containing detailed results from each module
    triggered_by TEXT NOT NULL CHECK(triggered_by IN ('cron', 'manual_api'))
);

-- Index on timestamp for efficient querying of the latest run.
CREATE INDEX IF NOT EXISTS idx_health_check_runs_timestamp ON health_check_runs(timestamp DESC);
