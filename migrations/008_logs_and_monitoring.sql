PRAGMA foreign_keys=ON;

ALTER TABLE scraped_job_details
  ADD COLUMN monitored_job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL;

CREATE TABLE system_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source TEXT NOT NULL,
  log_level TEXT NOT NULL DEFAULT 'INFO',
  message TEXT,
  json_payload TEXT,
  context TEXT,
  request_id TEXT,
  expires_at TEXT NOT NULL DEFAULT (datetime('now', '+30 days')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX idx_system_logs_source ON system_logs(source);
CREATE INDEX idx_system_logs_level ON system_logs(log_level);
CREATE INDEX idx_system_logs_expires_at ON system_logs(expires_at);

CREATE VIRTUAL TABLE system_logs_fts USING fts5(
  message,
  json_payload,
  content='system_logs',
  content_rowid='id'
);

CREATE TRIGGER system_logs_ai AFTER INSERT ON system_logs BEGIN
  INSERT INTO system_logs_fts(rowid, message, json_payload)
  VALUES (new.id, new.message, new.json_payload);
  DELETE FROM system_logs WHERE expires_at <= CURRENT_TIMESTAMP;
END;

CREATE TRIGGER system_logs_ad AFTER DELETE ON system_logs BEGIN
  INSERT INTO system_logs_fts(system_logs_fts, rowid, message, json_payload)
  VALUES('delete', old.id, old.message, old.json_payload);
END;

CREATE TRIGGER system_logs_au AFTER UPDATE ON system_logs BEGIN
  INSERT INTO system_logs_fts(system_logs_fts, rowid, message, json_payload)
  VALUES('delete', old.id, old.message, old.json_payload);
  INSERT INTO system_logs_fts(rowid, message, json_payload)
  VALUES (new.id, new.message, new.json_payload);
END;
