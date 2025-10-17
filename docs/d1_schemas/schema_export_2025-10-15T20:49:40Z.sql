
 ⛅️ wrangler 4.33.2 (update available 4.43.0)
─────────────────────────────────────────────
🌀 Executing on local database DB (11092798-a3d9-44b8-be5f-1835c0027887) from .wrangler/state/v3/d1:
🌀 To execute on your remote database, add a --remote flag to your wrangler command.
🚣 1 command executed successfully.
[
  {
    "results": [
      {
        "sql": "CREATE TABLE d1_migrations(\n\t\tid         INTEGER PRIMARY KEY AUTOINCREMENT,\n\t\tname       TEXT UNIQUE,\n\t\tapplied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL\n)"
      },
      {
        "sql": "null"
      },
      {
        "sql": "CREATE TABLE sqlite_sequence(name,seq)"
      },
      {
        "sql": "CREATE TABLE _cf_METADATA (\n        key INTEGER PRIMARY KEY,\n        value BLOB\n      )"
      },
      {
        "sql": "CREATE TABLE sites (\n  id TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  base_url TEXT NOT NULL,\n  robots_txt TEXT,\n  sitemap_url TEXT,\n  discovery_strategy TEXT NOT NULL,\n  last_discovered_at TEXT,\n  created_at TEXT DEFAULT CURRENT_TIMESTAMP\n)"
      },
      {
        "sql": "null"
      },
      {
        "sql": "CREATE TABLE search_configs (\n  id TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  keywords TEXT NOT NULL,\n  locations TEXT,\n  include_domains TEXT,\n  exclude_domains TEXT,\n  min_comp_total INTEGER,\n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT\n)"
      },
      {
        "sql": "null"
      },
      {
        "sql": "CREATE TABLE jobs (\n  id TEXT PRIMARY KEY,\n  site_id TEXT REFERENCES sites(id),\n  url TEXT UNIQUE NOT NULL,\n  canonical_url TEXT,\n  title TEXT,\n  company TEXT,\n  location TEXT,\n  employment_type TEXT,\n  department TEXT,\n  salary_min INTEGER,\n  salary_max INTEGER,\n  salary_currency TEXT,\n  salary_raw TEXT,\n  compensation_raw TEXT,\n  description_md TEXT,\n  requirements_md TEXT,\n  posted_at TEXT,\n  closed_at TEXT,\n  status TEXT NOT NULL DEFAULT 'open',\n  last_seen_open_at TEXT,\n  first_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  last_crawled_at TEXT\n, source TEXT NOT NULL DEFAULT 'SCRAPED', daily_monitoring_enabled BOOLEAN NOT NULL DEFAULT 1, monitoring_frequency_hours INTEGER NOT NULL DEFAULT 24, last_status_check_at TEXT, closure_detected_at TEXT)"
      },
      {
        "sql": "null"
      },
      {
        "sql": "null"
      },
      {
        "sql": "CREATE TABLE snapshots (\n  id TEXT PRIMARY KEY,\n  job_id TEXT REFERENCES jobs(id),\n  run_id TEXT,\n  content_hash TEXT,\n  html_r2_key TEXT,\n  json_r2_key TEXT,\n  screenshot_r2_key TEXT,\n  fetched_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  http_status INTEGER,\n  etag TEXT\n, pdf_r2_key TEXT, markdown_r2_key TEXT)"
      },
      {
        "sql": "null"
      },
      {
        "sql": "CREATE TABLE changes (\n  id TEXT PRIMARY KEY,\n  job_id TEXT REFERENCES jobs(id),\n  from_snapshot_id TEXT REFERENCES snapshots(id),\n  to_snapshot_id TEXT REFERENCES snapshots(id),\n  diff_json TEXT NOT NULL,\n  semantic_summary TEXT,\n  changed_at TEXT DEFAULT CURRENT_TIMESTAMP\n)"
      },
      {
        "sql": "null"
      },
      {
        "sql": "CREATE TABLE runs (\n  id TEXT PRIMARY KEY,\n  type TEXT NOT NULL,\n  config_id TEXT,\n  started_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  finished_at TEXT,\n  status TEXT,\n  stats_json TEXT\n)"
      },
      {
        "sql": "null"
      },
      {
        "sql": "CREATE INDEX idx_jobs_status ON jobs(status)"
      },
      {
        "sql": "CREATE INDEX idx_jobs_site_id ON jobs(site_id)"
      },
      {
        "sql": "CREATE INDEX idx_jobs_posted_at ON jobs(posted_at)"
      },
      {
        "sql": "CREATE INDEX idx_snapshots_job_id ON snapshots(job_id)"
      },
      {
        "sql": "CREATE INDEX idx_changes_job_id ON changes(job_id)"
      },
      {
        "sql": "CREATE TABLE email_configs (\n  id TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  enabled BOOLEAN NOT NULL DEFAULT 1,\n  frequency_hours INTEGER NOT NULL DEFAULT 24,\n  recipient_email TEXT NOT NULL,\n  include_new_jobs BOOLEAN NOT NULL DEFAULT 1,\n  include_job_changes BOOLEAN NOT NULL DEFAULT 1,\n  include_statistics BOOLEAN NOT NULL DEFAULT 1,\n  last_sent_at TEXT,\n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT\n)"
      },
      {
        "sql": "null"
      },
      {
        "sql": "CREATE TABLE email_logs (\n  id TEXT PRIMARY KEY,\n  from_email TEXT NOT NULL,\n  subject TEXT,\n  content_preview TEXT,\n  job_links_extracted INTEGER DEFAULT 0,\n  jobs_processed INTEGER DEFAULT 0,\n  received_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  processed_at TEXT,\n  status TEXT NOT NULL DEFAULT 'pending'\n)"
      },
      {
        "sql": "null"
      },
      {
        "sql": "CREATE TABLE agent_configs (\n  id TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  role TEXT NOT NULL,\n  goal TEXT NOT NULL,\n  backstory TEXT NOT NULL,\n  llm TEXT NOT NULL,\n  system_prompt TEXT,\n  max_tokens INTEGER DEFAULT 4000,\n  temperature REAL DEFAULT 0.7,\n  enabled BOOLEAN NOT NULL DEFAULT 1,\n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT DEFAULT CURRENT_TIMESTAMP\n)"
      },
      {
        "sql": "null"
      },
      {
        "sql": "CREATE TABLE task_configs (\n  id TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  description TEXT NOT NULL,\n  expected_output TEXT NOT NULL,\n  agent_id TEXT NOT NULL REFERENCES agent_configs(id),\n  context_tasks TEXT, \n  output_schema TEXT, \n  enabled BOOLEAN NOT NULL DEFAULT 1,\n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT DEFAULT CURRENT_TIMESTAMP\n)"
      },
      {
        "sql": "null"
      },
      {
        "sql": "CREATE TABLE workflow_configs (\n  id TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  description TEXT NOT NULL,\n  task_sequence TEXT NOT NULL, \n  enabled BOOLEAN NOT NULL DEFAULT 1,\n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT DEFAULT CURRENT_TIMESTAMP\n)"
      },
      {
        "sql": "null"
      },
      {
        "sql": "CREATE TABLE applicant_profiles (\n  id TEXT PRIMARY KEY,\n  user_id TEXT NOT NULL UNIQUE, \n  name TEXT,\n  email TEXT,\n  phone TEXT,\n  current_title TEXT,\n  target_roles TEXT, \n  years_experience INTEGER,\n  education_level TEXT,\n  skills TEXT, \n  preferences TEXT, \n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT DEFAULT CURRENT_TIMESTAMP\n)"
      },
      {
        "sql": "null"
      },
      {
        "sql": "null"
      },
      {
        "sql": "CREATE TABLE job_history (\n  id TEXT PRIMARY KEY,\n  applicant_id TEXT NOT NULL REFERENCES applicant_profiles(id),\n  company_name TEXT NOT NULL,\n  job_title TEXT NOT NULL,\n  department TEXT,\n  employment_type TEXT, \n  start_date TEXT, \n  end_date TEXT, \n  is_current BOOLEAN DEFAULT 0,\n  location TEXT,\n  salary_min INTEGER,\n  salary_max INTEGER,\n  salary_currency TEXT DEFAULT 'USD',\n  responsibilities TEXT, \n  achievements TEXT, \n  skills_used TEXT, \n  technologies TEXT, \n  keywords TEXT, \n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT DEFAULT CURRENT_TIMESTAMP\n)"
      },
      {
        "sql": "null"
      },
      {
        "sql": "CREATE TABLE job_history_submissions (\n  id TEXT PRIMARY KEY,\n  applicant_id TEXT NOT NULL REFERENCES applicant_profiles(id),\n  raw_content TEXT NOT NULL,\n  content_type TEXT DEFAULT 'text/plain', \n  processing_status TEXT DEFAULT 'pending', \n  processing_error TEXT,\n  ai_response TEXT, \n  processed_entries INTEGER DEFAULT 0, \n  submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  processed_at TEXT\n)"
      },
      {
        "sql": "null"
      },
      {
        "sql": "CREATE TABLE job_ratings (\n  id TEXT PRIMARY KEY,\n  applicant_id TEXT NOT NULL REFERENCES applicant_profiles(id),\n  job_id TEXT NOT NULL REFERENCES jobs(id),\n  overall_score INTEGER, \n  skill_match_score INTEGER, \n  experience_match_score INTEGER, \n  compensation_fit_score INTEGER, \n  location_fit_score INTEGER, \n  company_culture_score INTEGER, \n  growth_potential_score INTEGER, \n  rating_summary TEXT, \n  recommendation TEXT, \n  strengths TEXT, \n  gaps TEXT, \n  improvement_suggestions TEXT, \n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  UNIQUE(applicant_id, job_id)\n)"
      },
      {
        "sql": "null"
      },
      {
        "sql": "null"
      },
      {
        "sql": "CREATE INDEX idx_job_history_applicant ON job_history(applicant_id)"
      },
      {
        "sql": "CREATE INDEX idx_job_history_company ON job_history(company_name)"
      },
      {
        "sql": "CREATE INDEX idx_job_history_title ON job_history(job_title)"
      },
      {
        "sql": "CREATE INDEX idx_job_history_current ON job_history(is_current)"
      },
      {
        "sql": "CREATE INDEX idx_job_history_dates ON job_history(start_date, end_date)"
      },
      {
        "sql": "CREATE INDEX idx_job_history_submissions_applicant ON job_history_submissions(applicant_id)"
      },
      {
        "sql": "CREATE INDEX idx_job_history_submissions_status ON job_history_submissions(processing_status)"
      },
      {
        "sql": "CREATE INDEX idx_job_ratings_applicant ON job_ratings(applicant_id)"
      },
      {
        "sql": "CREATE INDEX idx_job_ratings_job ON job_ratings(job_id)"
      },
      {
        "sql": "CREATE INDEX idx_job_ratings_score ON job_ratings(overall_score)"
      },
      {
        "sql": "CREATE INDEX idx_job_ratings_recommendation ON job_ratings(recommendation)"
      },
      {
        "sql": "CREATE TABLE job_tracking_history (\n  id TEXT PRIMARY KEY,\n  job_id TEXT REFERENCES jobs(id),\n  snapshot_id TEXT REFERENCES snapshots(id),\n  tracking_date TEXT NOT NULL, \n  status TEXT NOT NULL,         \n  content_hash TEXT,\n  title_changed BOOLEAN DEFAULT 0,\n  requirements_changed BOOLEAN DEFAULT 0,\n  salary_changed BOOLEAN DEFAULT 0,\n  description_changed BOOLEAN DEFAULT 0,\n  error_message TEXT,\n  created_at TEXT DEFAULT CURRENT_TIMESTAMP\n)"
      },
      {
        "sql": "null"
      },
      {
        "sql": "CREATE TABLE job_market_stats (\n  id TEXT PRIMARY KEY,\n  date TEXT NOT NULL,              \n  total_jobs_tracked INTEGER DEFAULT 0,\n  new_jobs_found INTEGER DEFAULT 0,\n  jobs_closed INTEGER DEFAULT 0,\n  jobs_modified INTEGER DEFAULT 0,\n  avg_job_duration_days REAL,\n  top_companies TEXT,              \n  trending_keywords TEXT,          \n  salary_stats TEXT,              \n  location_stats TEXT,            \n  created_at TEXT DEFAULT CURRENT_TIMESTAMP\n)"
      },
      {
        "sql": "null"
      },
      {
        "sql": "CREATE INDEX idx_job_tracking_history_job_date ON job_tracking_history(job_id, tracking_date)"
      },
      {
        "sql": "CREATE INDEX idx_job_tracking_history_date ON job_tracking_history(tracking_date)"
      },
      {
        "sql": "CREATE INDEX idx_job_market_stats_date ON job_market_stats(date)"
      },
      {
        "sql": "CREATE INDEX idx_jobs_daily_monitoring ON jobs(daily_monitoring_enabled, status)"
      },
      {
        "sql": "CREATE INDEX idx_jobs_last_status_check ON jobs(last_status_check_at) WHERE daily_monitoring_enabled = 1"
      },
      {
        "sql": "CREATE INDEX idx_snapshots_job_date ON snapshots(job_id, fetched_at)"
      }
    ],
    "success": true,
    "meta": {
      "duration": 0
    }
  }
]
