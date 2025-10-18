
 ⛅️ wrangler 4.43.0
───────────────────
🌀 Executing on preview database DB (11092798-a3d9-44b8-be5f-1835c0027887):
🌀 To execute on your local development database, remove the --remote flag from your wrangler command.
🚣 Executed 1 command in 0.591ms
[
  {
    "results": [
      {
        "sql": "CREATE TABLE _cf_KV (\n        key TEXT PRIMARY KEY,\n        value BLOB\n      ) WITHOUT ROWID"
      },
      {
        "sql": "CREATE TABLE agent_activities (\n  id TEXT PRIMARY KEY,\n  agent_name TEXT NOT NULL,\n  activity_type TEXT NOT NULL,\n  data TEXT, \n  status TEXT CHECK(status IN ('info', 'warn', 'error')) DEFAULT 'info',\n  created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n)"
      },
      {
        "sql": "CREATE TABLE agent_configs (\n  id TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  role TEXT NOT NULL,\n  goal TEXT NOT NULL,\n  backstory TEXT NOT NULL,\n  llm TEXT NOT NULL,\n  system_prompt TEXT,\n  max_tokens INTEGER DEFAULT 4000,\n  temperature REAL DEFAULT 0.7,\n  enabled BOOLEAN NOT NULL DEFAULT 1,\n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT DEFAULT CURRENT_TIMESTAMP\n)"
      },
      {
        "sql": "CREATE TABLE agent_data (\n  agent_name TEXT NOT NULL,\n  key TEXT NOT NULL,\n  data TEXT NOT NULL, \n  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n  PRIMARY KEY (agent_name, key)\n)"
      },
      {
        "sql": "CREATE TABLE agent_rag_interactions (\n  id TEXT PRIMARY KEY,\n  agent_id TEXT NOT NULL,\n  query_id TEXT REFERENCES rag_queries(id),\n  response_text TEXT,\n  context_used_json TEXT, \n  created_at TEXT DEFAULT CURRENT_TIMESTAMP\n)"
      },
      {
        "sql": "CREATE TABLE applicant_documents (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  user_id TEXT NOT NULL,\n  job_id TEXT,\n  doc_type TEXT NOT NULL CHECK (doc_type IN ('resume','cover_letter')),\n  purpose TEXT,\n  r2_key_md TEXT,\n  r2_url_md TEXT,\n  r2_key_pdf TEXT,\n  r2_url_pdf TEXT,\n  title TEXT,\n  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),\n  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))\n)"
      },
      {
        "sql": "CREATE TABLE applicant_profiles (\n  id TEXT PRIMARY KEY,\n  user_id TEXT NOT NULL UNIQUE, \n  name TEXT,\n  email TEXT,\n  phone TEXT,\n  current_title TEXT,\n  target_roles TEXT, \n  years_experience INTEGER,\n  education_level TEXT,\n  skills TEXT, \n  preferences TEXT, \n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT DEFAULT CURRENT_TIMESTAMP\n)"
      },
      {
        "sql": "CREATE TABLE asset_embeddings (\n  id TEXT PRIMARY KEY,\n  uuid TEXT UNIQUE NOT NULL,\n  content_type TEXT NOT NULL, \n  vectorize_index TEXT NOT NULL, \n  vector_id TEXT NOT NULL, \n  content_hash TEXT NOT NULL, \n  content_preview TEXT, \n  metadata_json TEXT, \n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT DEFAULT CURRENT_TIMESTAMP\n)"
      },
      {
        "sql": "CREATE TABLE benefits_stats (\n  company_id TEXT NOT NULL REFERENCES companies(id),\n  computed_at INTEGER NOT NULL,\n  highlights JSON,\n  total_comp_heuristics JSON,\n  coverage JSON,\n  PRIMARY KEY (company_id, computed_at)\n)"
      },
      {
        "sql": "CREATE TABLE changes (\n  id TEXT PRIMARY KEY,\n  job_id TEXT REFERENCES jobs(id),\n  from_snapshot_id TEXT REFERENCES snapshots(id),\n  to_snapshot_id TEXT REFERENCES snapshots(id),\n  diff_json TEXT NOT NULL,\n  semantic_summary TEXT,\n  changed_at TEXT DEFAULT CURRENT_TIMESTAMP\n)"
      },
      {
        "sql": "CREATE TABLE companies (\n  id TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  normalized_domain TEXT NOT NULL,\n  website_url TEXT,\n  careers_url TEXT,\n  description TEXT,\n  created_at INTEGER NOT NULL,\n  updated_at INTEGER NOT NULL\n)"
      },
      {
        "sql": "CREATE TABLE company_benefits_snapshots (\n  id TEXT PRIMARY KEY,\n  company_id TEXT NOT NULL REFERENCES companies(id),\n  source TEXT NOT NULL,\n  source_url TEXT,\n  snapshot_text TEXT NOT NULL,\n  parsed JSON,\n  extracted_at INTEGER NOT NULL\n)"
      },
      {
        "sql": "CREATE TABLE company_profiles (\n  id TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  domain TEXT,\n  industry TEXT,\n  size TEXT,\n  location TEXT,\n  founded TEXT,\n  description TEXT,\n  mission TEXT,\n  company_values TEXT, \n  culture TEXT, \n  recent_news TEXT, \n  financials TEXT, \n  leadership TEXT, \n  benefits TEXT, \n  interview_insights TEXT, \n  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,\n  research_count INTEGER DEFAULT 1\n)"
      },
      {
        "sql": "CREATE TABLE d1_migrations(\n\t\tid         INTEGER PRIMARY KEY AUTOINCREMENT,\n\t\tname       TEXT UNIQUE,\n\t\tapplied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL\n)"
      },
      {
        "sql": "CREATE TABLE document_embeddings (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  document_id INTEGER NOT NULL,\n  model TEXT NOT NULL,\n  vector_size INTEGER NOT NULL,\n  vectorize_id TEXT,\n  content_sha256 TEXT NOT NULL,\n  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),\n  FOREIGN KEY(document_id) REFERENCES applicant_documents(id) ON DELETE CASCADE\n)"
      },
      {
        "sql": "CREATE TABLE email_configs (\n  id TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  enabled BOOLEAN NOT NULL DEFAULT 1,\n  frequency_hours INTEGER NOT NULL DEFAULT 24,\n  recipient_email TEXT NOT NULL,\n  include_new_jobs BOOLEAN NOT NULL DEFAULT 1,\n  include_job_changes BOOLEAN NOT NULL DEFAULT 1,\n  include_statistics BOOLEAN NOT NULL DEFAULT 1,\n  last_sent_at TEXT,\n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT\n)"
      },
      {
        "sql": "CREATE TABLE email_embeddings (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  email_uuid TEXT NOT NULL,\n  content_type TEXT NOT NULL, \n  content TEXT NOT NULL,\n  embedding BLOB NOT NULL, \n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (email_uuid) REFERENCES enhanced_email_logs(uuid) ON DELETE CASCADE\n)"
      },
      {
        "sql": "CREATE TABLE email_job_links (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  email_id INTEGER NOT NULL, \n  job_url TEXT NOT NULL,\n  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),\n  job_id TEXT, \n  processing_error TEXT, \n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (email_id) REFERENCES email_logs(id) ON DELETE CASCADE,\n  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL\n)"
      },
      {
        "sql": "CREATE TABLE email_job_links_backup(\n  id INT,\n  email_id INT,\n  job_url TEXT,\n  status TEXT,\n  job_id TEXT,\n  processing_error TEXT,\n  created_at TEXT,\n  updated_at TEXT\n)"
      },
      {
        "sql": "CREATE TABLE email_logs (\n  \n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  uuid TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),\n  \n  \n  from_email TEXT NOT NULL,\n  to_email TEXT,\n  subject TEXT,\n  message_id TEXT,\n  date_received TEXT,\n  \n  \n  content_text TEXT,\n  content_html TEXT,\n  content_preview TEXT,\n  headers TEXT, \n  \n  \n  job_links_extracted INTEGER DEFAULT 0,\n  jobs_processed INTEGER DEFAULT 0,\n  \n  \n  ai_from TEXT,\n  ai_subject TEXT,\n  ai_body TEXT,\n  ai_category TEXT CHECK(ai_category IN ('SPAM', 'JOB_ALERT', 'MESSAGE', 'RECRUITER', 'NETWORKING', 'MARKETING_SPAM', 'OTP', 'SYSTEM', 'UNKNOWN')),\n  ai_category_reasoning TEXT,\n  ai_job_links TEXT, \n  ai_processed_at TEXT,\n  ai_processing_status TEXT DEFAULT 'pending' CHECK(ai_processing_status IN ('pending', 'processing', 'completed', 'failed')),\n  \n  \n  embeddings_id TEXT, \n  embeddings_vector TEXT, \n  \n  \n  otp_detected BOOLEAN DEFAULT 0,\n  otp_code TEXT,\n  otp_forwarded_to TEXT,\n  \n  \n  status TEXT NOT NULL DEFAULT 'pending',\n  received_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  processed_at TEXT,\n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT DEFAULT CURRENT_TIMESTAMP\n)"
      },
      {
        "sql": "CREATE TABLE email_logs_backup(\n  id TEXT,\n  from_email TEXT,\n  subject TEXT,\n  content_preview TEXT,\n  job_links_extracted INT,\n  jobs_processed INT,\n  received_at TEXT,\n  processed_at TEXT,\n  status TEXT,\n  email_content TEXT,\n  r2_eml_key TEXT,\n  r2_eml_url TEXT,\n  r2_html_key TEXT,\n  r2_html_url TEXT,\n  r2_pdf_key TEXT,\n  r2_pdf_url TEXT\n)"
      },
      {
        "sql": "CREATE TABLE email_templates (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  name TEXT UNIQUE NOT NULL,\n  subject_template TEXT NOT NULL,\n  html_template TEXT NOT NULL,\n  variables TEXT, \n  is_active BOOLEAN DEFAULT 1,\n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT DEFAULT CURRENT_TIMESTAMP\n)"
      },
      {
        "sql": "CREATE TABLE embedding_operations (\n  id TEXT PRIMARY KEY,\n  asset_uuid TEXT REFERENCES asset_embeddings(uuid),\n  operation_type TEXT NOT NULL, \n  status TEXT NOT NULL DEFAULT 'pending', \n  error_message TEXT,\n  vectorize_index TEXT NOT NULL,\n  vector_id TEXT,\n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  completed_at TEXT\n)"
      },
      {
        "sql": "CREATE TABLE enhanced_email_logs (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  uuid TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),\n  from_email TEXT NOT NULL,\n  to_email TEXT,\n  subject TEXT,\n  message_id TEXT,\n  date_received TEXT,\n  content_text TEXT,\n  content_html TEXT,\n  content_preview TEXT,\n  headers TEXT, \n  job_links_extracted INTEGER DEFAULT 0,\n  jobs_processed INTEGER DEFAULT 0,\n  embeddings_id TEXT, \n  otp_detected BOOLEAN DEFAULT 0,\n  otp_code TEXT,\n  otp_forwarded_to TEXT,\n  status TEXT NOT NULL DEFAULT 'pending',\n  received_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  processed_at TEXT,\n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT DEFAULT CURRENT_TIMESTAMP\n, ai_classification TEXT, html_preview_url TEXT, pdf_preview_url TEXT, ai_from TEXT, ai_subject TEXT, ai_body TEXT, ai_category TEXT CHECK(ai_category IN ('SPAM', 'JOB_ALERT', 'MESSAGE', 'RECRUITER', 'NETWORKING', 'MARKETING_SPAM', 'OTP', 'SYSTEM', 'UNKNOWN')), ai_category_reasoning TEXT, ai_job_links TEXT, ai_processed_at TEXT, ai_processing_status TEXT DEFAULT 'pending' CHECK(ai_processing_status IN ('pending', 'processing', 'completed', 'failed')))"
      },
      {
        "sql": "CREATE TABLE enhanced_email_logs_backup(\n  id INT,\n  uuid TEXT,\n  from_email TEXT,\n  to_email TEXT,\n  subject TEXT,\n  message_id TEXT,\n  date_received TEXT,\n  content_text TEXT,\n  content_html TEXT,\n  content_preview TEXT,\n  headers TEXT,\n  job_links_extracted INT,\n  jobs_processed INT,\n  embeddings_id TEXT,\n  otp_detected NUM,\n  otp_code TEXT,\n  otp_forwarded_to TEXT,\n  status TEXT,\n  received_at TEXT,\n  processed_at TEXT,\n  created_at TEXT,\n  updated_at TEXT,\n  ai_classification TEXT,\n  html_preview_url TEXT,\n  pdf_preview_url TEXT,\n  ai_from TEXT,\n  ai_subject TEXT,\n  ai_body TEXT,\n  ai_category TEXT,\n  ai_category_reasoning TEXT,\n  ai_job_links TEXT,\n  ai_processed_at TEXT,\n  ai_processing_status TEXT\n)"
      },
      {
        "sql": "CREATE TABLE interview_sessions (\n  id TEXT PRIMARY KEY,\n  user_id TEXT NOT NULL,\n  job_id TEXT NOT NULL,\n  company_id TEXT NOT NULL,\n  session_type TEXT CHECK(session_type IN ('preparation', 'practice', 'real_time', 'follow_up')) NOT NULL,\n  status TEXT CHECK(status IN ('active', 'paused', 'completed', 'cancelled')) DEFAULT 'active',\n  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n  last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,\n  strategy TEXT, \n  questions TEXT, \n  answers TEXT, \n  feedback TEXT, \n  score REAL DEFAULT 0,\n  notes TEXT, \n  next_steps TEXT \n)"
      },
      {
        "sql": "CREATE TABLE job_history (\n  id TEXT PRIMARY KEY,\n  applicant_id TEXT NOT NULL REFERENCES applicant_profiles(id),\n  company_name TEXT NOT NULL,\n  job_title TEXT NOT NULL,\n  department TEXT,\n  employment_type TEXT, \n  start_date TEXT, \n  end_date TEXT, \n  is_current BOOLEAN DEFAULT 0,\n  location TEXT,\n  salary_min INTEGER,\n  salary_max INTEGER,\n  salary_currency TEXT DEFAULT 'USD',\n  responsibilities TEXT, \n  achievements TEXT, \n  skills_used TEXT, \n  technologies TEXT, \n  keywords TEXT, \n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT DEFAULT CURRENT_TIMESTAMP\n)"
      },
      {
        "sql": "CREATE TABLE job_history_submissions (\n  id TEXT PRIMARY KEY,\n  applicant_id TEXT NOT NULL REFERENCES applicant_profiles(id),\n  raw_content TEXT NOT NULL,\n  content_type TEXT DEFAULT 'text/plain', \n  processing_status TEXT DEFAULT 'pending', \n  processing_error TEXT,\n  ai_response TEXT, \n  processed_entries INTEGER DEFAULT 0, \n  submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  processed_at TEXT\n)"
      },
      {
        "sql": "CREATE TABLE job_intake_queue (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  job_url TEXT NOT NULL,\n  job_title TEXT,\n  company_name TEXT,\n  source TEXT,\n  payload_json TEXT NOT NULL,\n  status TEXT NOT NULL DEFAULT 'pending',\n  priority INTEGER DEFAULT 0,\n  attempts INTEGER NOT NULL DEFAULT 0,\n  dry_run INTEGER NOT NULL DEFAULT 0,\n  last_error TEXT,\n  queued_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  started_at TEXT,\n  completed_at TEXT,\n  updated_at TEXT DEFAULT CURRENT_TIMESTAMP\n)"
      },
      {
        "sql": "CREATE TABLE job_market_stats (\n  id TEXT PRIMARY KEY,\n  date TEXT NOT NULL,              \n  total_jobs_tracked INTEGER DEFAULT 0,\n  new_jobs_found INTEGER DEFAULT 0,\n  jobs_closed INTEGER DEFAULT 0,\n  jobs_modified INTEGER DEFAULT 0,\n  avg_job_duration_days REAL,\n  top_companies TEXT,              \n  trending_keywords TEXT,          \n  salary_stats TEXT,              \n  location_stats TEXT,            \n  created_at TEXT DEFAULT CURRENT_TIMESTAMP\n)"
      },
      {
        "sql": "CREATE TABLE job_monitoring (\n  id TEXT PRIMARY KEY,\n  job_id TEXT NOT NULL,\n  agent_id TEXT NOT NULL,\n  status TEXT CHECK(status IN ('active', 'paused', 'completed', 'failed')) DEFAULT 'active',\n  last_checked DATETIME,\n  change_count INTEGER DEFAULT 0,\n  relevance_score REAL,\n  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (job_id) REFERENCES jobs(id)\n)"
      },
      {
        "sql": "CREATE TABLE job_processing_queue (\n  id TEXT PRIMARY KEY,\n  url TEXT NOT NULL,\n  source TEXT NOT NULL, \n  source_id TEXT, \n  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),\n  job_id TEXT, \n  error TEXT, \n  metadata TEXT, \n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT DEFAULT CURRENT_TIMESTAMP, priority INTEGER DEFAULT 0, retry_count INTEGER DEFAULT 0, max_retries INTEGER DEFAULT 3, started_at TEXT, processing_time_ms INTEGER,\n  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL\n)"
      },
      {
        "sql": "CREATE TABLE job_processing_results (\n  id TEXT PRIMARY KEY,\n  queue_id TEXT, \n  job_id TEXT,\n  status TEXT CHECK(status IN ('completed', 'failed', 'partial')) NOT NULL,\n  results_count INTEGER DEFAULT 0,\n  processing_time_ms INTEGER,\n  scraped_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  error_message TEXT,\n  raw_data TEXT, \n  processed_data TEXT, \n  metadata TEXT, \n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE\n)"
      },
      {
        "sql": "CREATE TABLE job_ratings (\n  id TEXT PRIMARY KEY,\n  applicant_id TEXT NOT NULL REFERENCES applicant_profiles(id),\n  job_id TEXT NOT NULL REFERENCES jobs(id),\n  overall_score INTEGER, \n  skill_match_score INTEGER, \n  experience_match_score INTEGER, \n  compensation_fit_score INTEGER, \n  location_fit_score INTEGER, \n  company_culture_score INTEGER, \n  growth_potential_score INTEGER, \n  rating_summary TEXT, \n  recommendation TEXT, \n  strengths TEXT, \n  gaps TEXT, \n  improvement_suggestions TEXT, \n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  UNIQUE(applicant_id, job_id)\n)"
      },
      {
        "sql": "CREATE TABLE job_tracking_history (\n  id TEXT PRIMARY KEY,\n  job_id TEXT REFERENCES jobs(id),\n  snapshot_id TEXT REFERENCES snapshots(id),\n  tracking_date TEXT NOT NULL, \n  status TEXT NOT NULL,         \n  content_hash TEXT,\n  title_changed BOOLEAN DEFAULT 0,\n  requirements_changed BOOLEAN DEFAULT 0,\n  salary_changed BOOLEAN DEFAULT 0,\n  description_changed BOOLEAN DEFAULT 0,\n  error_message TEXT,\n  created_at TEXT DEFAULT CURRENT_TIMESTAMP\n)"
      },
      {
        "sql": "CREATE TABLE jobs (\n  id TEXT PRIMARY KEY,\n  site_id TEXT REFERENCES sites(id),\n  url TEXT UNIQUE NOT NULL,\n  canonical_url TEXT,\n  title TEXT,\n  company TEXT,\n  location TEXT,\n  employment_type TEXT,\n  department TEXT,\n  salary_min INTEGER,\n  salary_max INTEGER,\n  salary_currency TEXT,\n  salary_raw TEXT,\n  compensation_raw TEXT,\n  description_md TEXT,\n  requirements_md TEXT,\n  posted_at TEXT,\n  closed_at TEXT,\n  status TEXT NOT NULL DEFAULT 'open',\n  last_seen_open_at TEXT,\n  first_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  last_crawled_at TEXT\n, source TEXT NOT NULL DEFAULT 'SCRAPED', daily_monitoring_enabled BOOLEAN NOT NULL DEFAULT 1, monitoring_frequency_hours INTEGER NOT NULL DEFAULT 24, last_status_check_at TEXT, closure_detected_at TEXT, company_id TEXT REFERENCES companies(id))"
      },
      {
        "sql": "CREATE TABLE otp_forwarding_log (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  email_uuid TEXT NOT NULL,\n  otp_code TEXT NOT NULL,\n  forwarded_to TEXT NOT NULL,\n  forwarded_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  status TEXT DEFAULT 'sent',\n  FOREIGN KEY (email_uuid) REFERENCES enhanced_email_logs(uuid) ON DELETE CASCADE\n)"
      },
      {
        "sql": "CREATE TABLE python_clients (\n  id TEXT PRIMARY KEY,\n  client_name TEXT NOT NULL,\n  client_type TEXT CHECK(client_type IN ('scraper', 'monitor', 'analyzer')) NOT NULL,\n  status TEXT CHECK(status IN ('active', 'inactive', 'error', 'maintenance')) DEFAULT 'active',\n  last_seen TEXT DEFAULT CURRENT_TIMESTAMP,\n  last_poll TEXT,\n  api_key TEXT NOT NULL,\n  capabilities TEXT, \n  version TEXT,\n  environment TEXT, \n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  error_count INTEGER DEFAULT 0,\n  success_count INTEGER DEFAULT 0,\n  metadata TEXT \n)"
      },
      {
        "sql": "CREATE TABLE rag_queries (\n  id TEXT PRIMARY KEY,\n  query_text TEXT NOT NULL,\n  query_embedding_json TEXT, \n  vectorize_index TEXT NOT NULL,\n  results_json TEXT, \n  user_id TEXT, \n  session_id TEXT, \n  created_at TEXT DEFAULT CURRENT_TIMESTAMP\n)"
      },
      {
        "sql": "CREATE TABLE resume_optimizations (\n  id TEXT PRIMARY KEY,\n  user_id TEXT NOT NULL,\n  resume_data TEXT NOT NULL, \n  job_description TEXT NOT NULL,\n  optimization_type TEXT CHECK(optimization_type IN ('ats', 'human', 'executive', 'industry', 'comprehensive')) NOT NULL,\n  priority TEXT CHECK(priority IN ('low', 'medium', 'high')) DEFAULT 'medium',\n  status TEXT CHECK(status IN ('pending', 'processing', 'peer_review', 'completed', 'failed')) DEFAULT 'pending',\n  current_step TEXT,\n  results TEXT, \n  feedback TEXT, \n  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n  completed_at DATETIME\n)"
      },
      {
        "sql": "CREATE TABLE resume_sections (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  document_id INTEGER NOT NULL,\n  summary TEXT,\n  contact TEXT,\n  skills TEXT,\n  experience TEXT,\n  education TEXT,\n  projects TEXT,\n  certifications TEXT,\n  extras TEXT,\n  FOREIGN KEY(document_id) REFERENCES applicant_documents(id) ON DELETE CASCADE\n)"
      },
      {
        "sql": "CREATE TABLE runs (\n  id TEXT PRIMARY KEY,\n  type TEXT NOT NULL,\n  config_id TEXT,\n  started_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  finished_at TEXT,\n  status TEXT,\n  stats_json TEXT\n)"
      },
      {
        "sql": "CREATE TABLE scrape_queue (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  urls TEXT NOT NULL,\n  status TEXT NOT NULL DEFAULT 'pending',\n  priority INTEGER DEFAULT 0,\n  payload TEXT,\n  available_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  last_claimed_at TEXT,\n  completed_at TEXT,\n  error_message TEXT,\n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT DEFAULT CURRENT_TIMESTAMP\n, job_id TEXT, job_type TEXT CHECK(job_type IN ('scrape_job', 'autonomous_scrape', 'monitor_job')), context TEXT, max_tasks INTEGER DEFAULT 1, started_at TEXT, retry_count INTEGER DEFAULT 0, max_retries INTEGER DEFAULT 3, metadata TEXT)"
      },
      {
        "sql": "CREATE TABLE scraped_job_details (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  queue_id INTEGER REFERENCES scrape_queue(id) ON DELETE SET NULL,\n  job_url TEXT NOT NULL,\n  source TEXT,\n  company TEXT,\n  title TEXT,\n  location TEXT,\n  employment_type TEXT,\n  salary TEXT,\n  apply_url TEXT,\n  description TEXT,\n  metadata TEXT,\n  raw_payload TEXT,\n  created_at TEXT DEFAULT CURRENT_TIMESTAMP\n, monitored_job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL)"
      },
      {
        "sql": "CREATE TABLE search_configs (\n  id TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  keywords TEXT NOT NULL,\n  locations TEXT,\n  include_domains TEXT,\n  exclude_domains TEXT,\n  min_comp_total INTEGER,\n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT\n)"
      },
      {
        "sql": "CREATE TABLE sites (\n  id TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  base_url TEXT NOT NULL,\n  robots_txt TEXT,\n  sitemap_url TEXT,\n  discovery_strategy TEXT NOT NULL,\n  last_discovered_at TEXT,\n  created_at TEXT DEFAULT CURRENT_TIMESTAMP\n)"
      },
      {
        "sql": "CREATE TABLE snapshots (\n  id TEXT PRIMARY KEY,\n  job_id TEXT REFERENCES jobs(id),\n  run_id TEXT,\n  content_hash TEXT,\n  html_r2_key TEXT,\n  json_r2_key TEXT,\n  screenshot_r2_key TEXT,\n  fetched_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  http_status INTEGER,\n  etag TEXT\n, pdf_r2_key TEXT, markdown_r2_key TEXT)"
      },
      {
        "sql": "CREATE TABLE system_logs (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  source TEXT NOT NULL,\n  log_level TEXT NOT NULL DEFAULT 'INFO',\n  message TEXT,\n  json_payload TEXT,\n  context TEXT,\n  request_id TEXT,\n  expires_at TEXT NOT NULL DEFAULT (datetime('now', '+30 days')),\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)"
      },
      {
        "sql": "CREATE VIRTUAL TABLE system_logs_fts USING fts5(\n  message,\n  json_payload,\n  content='system_logs',\n  content_rowid='id'\n)"
      },
      {
        "sql": "CREATE TABLE 'system_logs_fts_config'(k PRIMARY KEY, v) WITHOUT ROWID"
      },
      {
        "sql": "CREATE TABLE 'system_logs_fts_data'(id INTEGER PRIMARY KEY, block BLOB)"
      },
      {
        "sql": "CREATE TABLE 'system_logs_fts_docsize'(id INTEGER PRIMARY KEY, sz BLOB)"
      },
      {
        "sql": "CREATE TABLE 'system_logs_fts_idx'(segid, term, pgno, PRIMARY KEY(segid, term)) WITHOUT ROWID"
      },
      {
        "sql": "CREATE TABLE task_configs (\n  id TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  description TEXT NOT NULL,\n  expected_output TEXT NOT NULL,\n  agent_id TEXT NOT NULL REFERENCES agent_configs(id),\n  context_tasks TEXT, \n  output_schema TEXT, \n  enabled BOOLEAN NOT NULL DEFAULT 1,\n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT DEFAULT CURRENT_TIMESTAMP\n)"
      },
      {
        "sql": "CREATE TABLE test_logs (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    session_id TEXT NOT NULL,\n    test_name TEXT NOT NULL,\n    success BOOLEAN NOT NULL,\n    duration REAL NOT NULL,\n    error TEXT,\n    data TEXT, \n    timestamp TEXT NOT NULL,\n    test_type TEXT NOT NULL, \n    created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n)"
      },
      {
        "sql": "CREATE TABLE workflow_configs (\n  id TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  description TEXT NOT NULL,\n  task_sequence TEXT NOT NULL, \n  enabled BOOLEAN NOT NULL DEFAULT 1,\n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT DEFAULT CURRENT_TIMESTAMP\n)"
      }
    ],
    "success": true,
    "meta": {
      "served_by": "v3-prod",
      "served_by_region": "ENAM",
      "served_by_primary": true,
      "timings": {
        "sql_duration_ms": 0.591
      },
      "duration": 0.591,
      "changes": 0,
      "last_row_id": 25,
      "changed_db": false,
      "size_after": 27058176,
      "rows_read": 276,
      "rows_written": 0,
      "total_attempts": 1
    }
  }
]
