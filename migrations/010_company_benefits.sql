-- 010_company_benefits.sql
-- Schema additions for company benefits tracking and stats.

-- Companies catalog.
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_domain TEXT NOT NULL,
  website_url TEXT,
  careers_url TEXT,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_domain ON companies(normalized_domain);

-- Jobs now reference companies.
ALTER TABLE jobs ADD COLUMN company_id TEXT REFERENCES companies(id);

-- Historical benefits snapshots captured from jobs and careers pages.
CREATE TABLE IF NOT EXISTS company_benefits_snapshots (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  source TEXT NOT NULL,
  source_url TEXT,
  snapshot_text TEXT NOT NULL,
  parsed JSON,
  extracted_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_benefits_company_time
  ON company_benefits_snapshots(company_id, extracted_at DESC);

-- Aggregated stats for UI consumption.
CREATE TABLE IF NOT EXISTS benefits_stats (
  company_id TEXT NOT NULL REFERENCES companies(id),
  computed_at INTEGER NOT NULL,
  highlights JSON,
  total_comp_heuristics JSON,
  coverage JSON,
  PRIMARY KEY (company_id, computed_at)
);

CREATE INDEX IF NOT EXISTS idx_stats_latest
  ON benefits_stats(company_id, computed_at DESC);
