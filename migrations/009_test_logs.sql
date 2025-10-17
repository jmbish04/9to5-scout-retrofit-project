-- Test Logs Table
-- Stores test execution logs from various test suites

CREATE TABLE IF NOT EXISTS test_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    test_name TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    duration REAL NOT NULL,
    error TEXT,
    data TEXT, -- JSON string
    timestamp TEXT NOT NULL,
    test_type TEXT NOT NULL, -- 'google_talent_api', 'browser_render', etc.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_logs_session_id ON test_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_test_logs_test_type ON test_logs(test_type);
CREATE INDEX IF NOT EXISTS idx_test_logs_timestamp ON test_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_test_logs_success ON test_logs(success);
