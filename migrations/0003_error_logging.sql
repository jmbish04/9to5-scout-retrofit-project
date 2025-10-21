-- Migration 0003: Create error_logs table
-- This table stores detailed information about errors that occur in the application,
-- providing a foundation for logging, monitoring, and AI-powered diagnostics.

CREATE TABLE IF NOT EXISTS error_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    error_code TEXT,
    severity TEXT NOT NULL CHECK(severity IN ('info', 'warning', 'critical')),
    context TEXT, -- JSON blob for request details, user info, etc.
    agentic_analysis TEXT, -- To be filled by the Error Investigation Agent
    potential_solution TEXT, -- To be filled by the Error Investigation Agent
    is_resolved BOOLEAN DEFAULT FALSE
);

-- Index on timestamp for efficient querying of recent errors.
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp);

-- Index on severity to quickly filter for critical errors.
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
