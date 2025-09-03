PRAGMA foreign_keys=ON;

CREATE TABLE sites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  robots_txt TEXT,
  sitemap_url TEXT,
  discovery_strategy TEXT NOT NULL,
  last_discovered_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE search_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  keywords TEXT NOT NULL,
  locations TEXT,
  include_domains TEXT,
  exclude_domains TEXT,
  min_comp_total INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT
);

CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  site_id TEXT REFERENCES sites(id),
  url TEXT UNIQUE NOT NULL,
  canonical_url TEXT,
  title TEXT,
  company TEXT,
  location TEXT,
  employment_type TEXT,
  department TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT,
  salary_raw TEXT,
  compensation_raw TEXT,
  description_md TEXT,
  requirements_md TEXT,
  posted_at TEXT,
  closed_at TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  last_seen_open_at TEXT,
  first_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_crawled_at TEXT
);

CREATE TABLE snapshots (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES jobs(id),
  run_id TEXT,
  content_hash TEXT,
  html_r2_key TEXT,
  json_r2_key TEXT,
  screenshot_r2_key TEXT,
  fetched_at TEXT DEFAULT CURRENT_TIMESTAMP,
  http_status INTEGER,
  etag TEXT
);

CREATE TABLE changes (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES jobs(id),
  from_snapshot_id TEXT REFERENCES snapshots(id),
  to_snapshot_id TEXT REFERENCES snapshots(id),
  diff_json TEXT NOT NULL,
  semantic_summary TEXT,
  changed_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  config_id TEXT,
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  status TEXT,
  stats_json TEXT
);