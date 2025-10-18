-- Consolidated Schema from Migrations
PRAGMA foreign_keys=ON;

-- =================================================================
-- Table: sites
-- =================================================================
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

-- =================================================================
-- Table: companies
-- =================================================================
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


-- =================================================================
-- Table: jobs
-- =================================================================
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  site_id TEXT REFERENCES sites(id),
  company_id TEXT REFERENCES companies(id),
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
  last_crawled_at TEXT,
  source TEXT NOT NULL DEFAULT 'SCRAPED',
  daily_monitoring_enabled BOOLEAN NOT NULL DEFAULT 1,
  monitoring_frequency_hours INTEGER NOT NULL DEFAULT 24,
  last_status_check_at TEXT,
  closure_detected_at TEXT
);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_site_id ON jobs(site_id);
CREATE INDEX idx_jobs_posted_at ON jobs(posted_at);
CREATE INDEX idx_jobs_daily_monitoring ON jobs(daily_monitoring_enabled, status);
CREATE INDEX idx_jobs_last_status_check ON jobs(last_status_check_at) WHERE daily_monitoring_enabled = 1;


-- =================================================================
-- Table: snapshots
-- =================================================================
CREATE TABLE snapshots (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES jobs(id),
  run_id TEXT,
  content_hash TEXT,
  html_r2_key TEXT,
  json_r2_key TEXT,
  screenshot_r2_key TEXT,
  pdf_r2_key TEXT,
  markdown_r2_key TEXT,
  fetched_at TEXT DEFAULT CURRENT_TIMESTAMP,
  http_status INTEGER,
  etag TEXT
);
CREATE INDEX idx_snapshots_job_id ON snapshots(job_id);
CREATE INDEX idx_snapshots_job_date ON snapshots(job_id, fetched_at);


-- =================================================================
-- Table: changes
-- =================================================================
CREATE TABLE changes (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES jobs(id),
  from_snapshot_id TEXT REFERENCES snapshots(id),
  to_snapshot_id TEXT REFERENCES snapshots(id),
  diff_json TEXT NOT NULL,
  semantic_summary TEXT,
  changed_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_changes_job_id ON changes(job_id);


-- =================================================================
-- Table: runs
-- =================================================================
CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  config_id TEXT,
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  status TEXT,
  stats_json TEXT
);

-- =================================================================
-- Table: search_configs
-- =================================================================
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

-- =================================================================
-- Table: email_configs
-- =================================================================
CREATE TABLE email_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT 1,
  frequency_hours INTEGER NOT NULL DEFAULT 24,
  recipient_email TEXT NOT NULL,
  include_new_jobs BOOLEAN NOT NULL DEFAULT 1,
  include_job_changes BOOLEAN NOT NULL DEFAULT 1,
  include_statistics BOOLEAN NOT NULL DEFAULT 1,
  last_sent_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT
);

-- =================================================================
-- Table: agent_configs
-- =================================================================
CREATE TABLE agent_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  goal TEXT NOT NULL,
  backstory TEXT NOT NULL,
  llm TEXT NOT NULL,
  system_prompt TEXT,
  max_tokens INTEGER DEFAULT 4000,
  temperature REAL DEFAULT 0.7,
  enabled BOOLEAN NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =================================================================
-- Table: task_configs
-- =================================================================
CREATE TABLE task_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  agent_id TEXT NOT NULL REFERENCES agent_configs(id),
  context_tasks TEXT, -- JSON array of task IDs this task depends on
  output_schema TEXT, -- JSON schema for structured output
  enabled BOOLEAN NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =================================================================
-- Table: workflow_configs
-- =================================================================
CREATE TABLE workflow_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  task_sequence TEXT NOT NULL, -- JSON array of task IDs in execution order
  enabled BOOLEAN NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);


-- =================================================================
-- Table: applicant_profiles
-- =================================================================
CREATE TABLE applicant_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  name TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  location TEXT,
  timezone TEXT,
  current_title TEXT,
  current_company TEXT,
  target_roles TEXT,
  years_experience INTEGER,
  education_level TEXT,
  skills TEXT,
  preferences TEXT,
  is_active BOOLEAN DEFAULT 1,
  is_confirmed BOOLEAN DEFAULT 0,
  last_activity_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_applicant_profiles_user_id ON applicant_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_applicant_profiles_email ON applicant_profiles(email);


-- =================================================================
-- Table: job_history
-- =================================================================
CREATE TABLE job_history (
  id TEXT PRIMARY KEY,
  applicant_id TEXT NOT NULL REFERENCES applicant_profiles(id),
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  department TEXT,
  employment_type TEXT,
  start_date TEXT,
  end_date TEXT,
  is_current BOOLEAN DEFAULT 0,
  location TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'USD',
  responsibilities TEXT,
  achievements TEXT,
  skills_used TEXT,
  technologies TEXT,
  keywords TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_job_history_applicant ON job_history(applicant_id);
CREATE INDEX idx_job_history_company ON job_history(company_name);
CREATE INDEX idx_job_history_title ON job_history(job_title);
CREATE INDEX idx_job_history_current ON job_history(is_current);
CREATE INDEX idx_job_history_dates ON job_history(start_date, end_date);

-- =================================================================
-- Table: job_history_submissions
-- =================================================================
CREATE TABLE job_history_submissions (
  id TEXT PRIMARY KEY,
  applicant_id TEXT NOT NULL REFERENCES applicant_profiles(id),
  raw_content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text/plain',
  processing_status TEXT DEFAULT 'pending',
  processing_error TEXT,
  ai_response TEXT,
  processed_entries INTEGER DEFAULT 0,
  submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT
);
CREATE INDEX idx_job_history_submissions_applicant ON job_history_submissions(applicant_id);
CREATE INDEX idx_job_history_submissions_status ON job_history_submissions(processing_status);


-- =================================================================
-- Table: job_ratings
-- =================================================================
CREATE TABLE job_ratings (
  id TEXT PRIMARY KEY,
  applicant_id TEXT NOT NULL REFERENCES applicant_profiles(id),
  job_id TEXT NOT NULL REFERENCES jobs(id),
  overall_score INTEGER,
  skill_match_score INTEGER,
  experience_match_score INTEGER,
  compensation_fit_score INTEGER,
  location_fit_score INTEGER,
  company_culture_score INTEGER,
  growth_potential_score INTEGER,
  rating_summary TEXT,
  recommendation TEXT,
  strengths TEXT,
  gaps TEXT,
  improvement_suggestions TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(applicant_id, job_id)
);
CREATE INDEX idx_job_ratings_applicant ON job_ratings(applicant_id);
CREATE INDEX idx_job_ratings_job ON job_ratings(job_id);
CREATE INDEX idx_job_ratings_score ON job_ratings(overall_score);
CREATE INDEX idx_job_ratings_recommendation ON job_ratings(recommendation);

-- =================================================================
-- Table: job_tracking_history
-- =================================================================
CREATE TABLE job_tracking_history (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES jobs(id),
  snapshot_id TEXT REFERENCES snapshots(id),
  tracking_date TEXT NOT NULL,
  status TEXT NOT NULL,
  content_hash TEXT,
  title_changed BOOLEAN DEFAULT 0,
  requirements_changed BOOLEAN DEFAULT 0,
  salary_changed BOOLEAN DEFAULT 0,
  description_changed BOOLEAN DEFAULT 0,
  error_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_job_tracking_history_job_date ON job_tracking_history(job_id, tracking_date);
CREATE INDEX idx_job_tracking_history_date ON job_tracking_history(tracking_date);


-- =================================================================
-- Table: job_market_stats
-- =================================================================
CREATE TABLE job_market_stats (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  total_jobs_tracked INTEGER DEFAULT 0,
  new_jobs_found INTEGER DEFAULT 0,
  jobs_closed INTEGER DEFAULT 0,
  jobs_modified INTEGER DEFAULT 0,
  avg_job_duration_days REAL,
  top_companies TEXT,
  trending_keywords TEXT,
  salary_stats TEXT,
  location_stats TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_job_market_stats_date ON job_market_stats(date);


-- =================================================================
-- Table: scrape_queue
-- =================================================================
CREATE TABLE scrape_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  urls TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  payload TEXT,
  available_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_claimed_at TEXT,
  completed_at TEXT,
  error_message TEXT,
  job_id TEXT,
  job_type TEXT CHECK(job_type IN ('scrape_job', 'autonomous_scrape', 'monitor_job')),
  context TEXT,
  max_tasks INTEGER DEFAULT 1,
  started_at TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  metadata TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_scrape_queue_status_available ON scrape_queue(status, available_at);
CREATE INDEX IF NOT EXISTS idx_scrape_queue_job_id ON scrape_queue(job_id);
CREATE INDEX IF NOT EXISTS idx_scrape_queue_job_type ON scrape_queue(job_type);
CREATE INDEX IF NOT EXISTS idx_scrape_queue_started_at ON scrape_queue(started_at);
CREATE INDEX IF NOT EXISTS idx_scrape_queue_completed_at ON scrape_queue(completed_at);
CREATE INDEX IF NOT EXISTS idx_scrape_queue_retry_count ON scrape_queue(retry_count);


-- =================================================================
-- Table: scraped_job_details
-- =================================================================
CREATE TABLE scraped_job_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  queue_id INTEGER REFERENCES scrape_queue(id) ON DELETE SET NULL,
  job_url TEXT NOT NULL,
  source TEXT,
  company TEXT,
  title TEXT,
  location TEXT,
  employment_type TEXT,
  salary TEXT,
  apply_url TEXT,
  description TEXT,
  metadata TEXT,
  raw_payload TEXT,
  monitored_job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_scrape_queue_queue_id ON scraped_job_details(queue_id);
CREATE INDEX idx_scraped_job_details_job_url ON scraped_job_details(job_url);


-- =================================================================
-- Table: system_logs
-- =================================================================
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


-- =================================================================
-- Table: test_logs
-- =================================================================
CREATE TABLE IF NOT EXISTS test_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    test_name TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    duration REAL NOT NULL,
    error TEXT,
    data TEXT,
    timestamp TEXT NOT NULL,
    test_type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_test_logs_session_id ON test_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_test_logs_test_type ON test_logs(test_type);
CREATE INDEX IF NOT EXISTS idx_test_logs_timestamp ON test_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_test_logs_success ON test_logs(success);

-- =================================================================
-- Table: company_benefits_snapshots
-- =================================================================
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


-- =================================================================
-- Table: benefits_stats
-- =================================================================
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


-- =================================================================
-- Table: asset_embeddings
-- =================================================================
CREATE TABLE asset_embeddings (
  id TEXT PRIMARY KEY,
  uuid TEXT UNIQUE NOT NULL,
  content_type TEXT NOT NULL,
  vectorize_index TEXT NOT NULL,
  vector_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  content_preview TEXT,
  metadata_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_asset_embeddings_uuid ON asset_embeddings(uuid);
CREATE INDEX idx_asset_embeddings_content_type ON asset_embeddings(content_type);
CREATE INDEX idx_asset_embeddings_vectorize_index ON asset_embeddings(vectorize_index);
CREATE INDEX idx_asset_embeddings_content_hash ON asset_embeddings(content_hash);


-- =================================================================
-- Table: embedding_operations
-- =================================================================
CREATE TABLE embedding_operations (
  id TEXT PRIMARY KEY,
  asset_uuid TEXT REFERENCES asset_embeddings(uuid),
  operation_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  vectorize_index TEXT NOT NULL,
  vector_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);
CREATE INDEX idx_embedding_operations_status ON embedding_operations(status);
CREATE INDEX idx_embedding_operations_asset_uuid ON embedding_operations(asset_uuid);
CREATE INDEX idx_embedding_operations_created_at ON embedding_operations(created_at);

-- =================================================================
-- Table: rag_queries
-- =================================================================
CREATE TABLE rag_queries (
  id TEXT PRIMARY KEY,
  query_text TEXT NOT NULL,
  query_embedding_json TEXT,
  vectorize_index TEXT NOT NULL,
  results_json TEXT,
  user_id TEXT,
  session_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_rag_queries_vectorize_index ON rag_queries(vectorize_index);
CREATE INDEX idx_rag_queries_user_id ON rag_queries(user_id);
CREATE INDEX idx_rag_queries_created_at ON rag_queries(created_at);

-- =================================================================
-- Table: agent_rag_interactions
-- =================================================================
CREATE TABLE agent_rag_interactions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  query_id TEXT REFERENCES rag_queries(id),
  response_text TEXT,
  context_used_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_agent_rag_interactions_agent_id ON agent_rag_interactions(agent_id);
CREATE INDEX idx_agent_rag_interactions_query_id ON agent_rag_interactions(query_id);
CREATE INDEX idx_agent_rag_interactions_created_at ON agent_rag_interactions(created_at);


-- =================================================================
-- Table: applicant_documents
-- =================================================================
CREATE TABLE IF NOT EXISTS applicant_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  job_id TEXT,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('resume','cover_letter')),
  purpose TEXT,
  r2_key_md TEXT,
  r2_url_md TEXT,
  r2_key_pdf TEXT,
  r2_url_pdf TEXT,
  title TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_applicant_documents_user ON applicant_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_applicant_documents_job ON applicant_documents(job_id);


-- =================================================================
-- Table: resume_sections
-- =================================================================
CREATE TABLE IF NOT EXISTS resume_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  summary TEXT,
  contact TEXT,
  skills TEXT,
  experience TEXT,
  education TEXT,
  projects TEXT,
  certifications TEXT,
  extras TEXT,
  FOREIGN KEY(document_id) REFERENCES applicant_documents(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_resume_sections_document ON resume_sections(document_id);


-- =================================================================
-- Table: document_embeddings
-- =================================================================
CREATE TABLE IF NOT EXISTS document_embeddings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  model TEXT NOT NULL,
  vector_size INTEGER NOT NULL,
  vectorize_id TEXT,
  content_sha256 TEXT NOT NULL,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY(document_id) REFERENCES applicant_documents(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_doc_embedding_on_sha ON document_embeddings(content_sha256);
CREATE INDEX IF NOT EXISTS idx_doc_embedding_doc ON document_embeddings(document_id);


-- =================================================================
-- Table: job_intake_queue
-- =================================================================
CREATE TABLE job_intake_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_url TEXT NOT NULL,
  job_title TEXT,
  company_name TEXT,
  source TEXT,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  dry_run INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  queued_at TEXT DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT,
  completed_at TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_job_intake_status_priority ON job_intake_queue(status, priority, queued_at);
CREATE INDEX idx_job_intake_job_url ON job_intake_queue(job_url);


-- =================================================================
-- Table: email_logs
-- =================================================================
CREATE TABLE email_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  from_email TEXT NOT NULL,
  to_email TEXT,
  subject TEXT,
  message_id TEXT,
  date_received TEXT,
  content_text TEXT,
  content_html TEXT,
  content_preview TEXT,
  headers TEXT,
  job_links_extracted INTEGER DEFAULT 0,
  jobs_processed INTEGER DEFAULT 0,
  ai_from TEXT,
  ai_subject TEXT,
  ai_body TEXT,
  ai_category TEXT CHECK(ai_category IN ('SPAM', 'JOB_ALERT', 'MESSAGE', 'RECRUITER', 'NETWORKING', 'MARKETING_SPAM', 'OTP', 'SYSTEM', 'UNKNOWN')),
  ai_category_reasoning TEXT,
  ai_job_links TEXT,
  ai_processed_at TEXT,
  ai_processing_status TEXT DEFAULT 'pending' CHECK(ai_processing_status IN ('pending', 'processing', 'completed', 'failed')),
  embeddings_id TEXT,
  embeddings_vector TEXT,
  otp_detected BOOLEAN DEFAULT 0,
  otp_code TEXT,
  otp_forwarded_to TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  received_at TEXT DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_email_logs_from_email ON email_logs(from_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_subject ON email_logs(subject);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_received_at ON email_logs(received_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_ai_category ON email_logs(ai_category);
CREATE INDEX IF NOT EXISTS idx_email_logs_ai_processing_status ON email_logs(ai_processing_status);
CREATE INDEX IF NOT EXISTS idx_email_logs_embeddings_id ON email_logs(embeddings_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_otp_detected ON email_logs(otp_detected);
CREATE INDEX IF NOT EXISTS idx_email_logs_uuid ON email_logs(uuid);


-- =================================================================
-- Table: email_job_links
-- =================================================================
CREATE TABLE email_job_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_id INTEGER NOT NULL,
  job_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  job_id TEXT,
  processing_error TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (email_id) REFERENCES email_logs(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_email_job_links_email_id ON email_job_links(email_id);
CREATE INDEX IF NOT EXISTS idx_email_job_links_status ON email_job_links(status);
CREATE INDEX IF NOT EXISTS idx_email_job_links_job_id ON email_job_links(job_id);


-- =================================================================
-- Table: email_templates
-- =================================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  subject_template TEXT NOT NULL,
  html_template TEXT NOT NULL,
  variables TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);


-- =================================================================
-- Table: otp_forwarding_log
-- =================================================================
CREATE TABLE IF NOT EXISTS otp_forwarding_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_uuid TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  forwarded_to TEXT NOT NULL,
  forwarded_at TEXT DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'sent'
);
CREATE INDEX IF NOT EXISTS idx_otp_forwarding_email_uuid ON otp_forwarding_log(email_uuid);
CREATE INDEX IF NOT EXISTS idx_otp_forwarding_forwarded_at ON otp_forwarding_log(forwarded_at);


-- =================================================================
-- Table: job_processing_queue
-- =================================================================
CREATE TABLE IF NOT EXISTS job_processing_queue (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  source TEXT NOT NULL,
  source_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  job_id TEXT,
  error TEXT,
  metadata TEXT,
  priority INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  started_at TEXT,
  completed_at TEXT,
  processing_time_ms INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_job_processing_queue_source ON job_processing_queue(source);
CREATE INDEX IF NOT EXISTS idx_job_processing_queue_source_id ON job_processing_queue(source_id);
CREATE INDEX IF NOT EXISTS idx_job_processing_queue_status ON job_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_job_processing_queue_created_at ON job_processing_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_job_processing_queue_job_id ON job_processing_queue(job_id);
CREATE INDEX IF NOT EXISTS idx_job_processing_queue_priority ON job_processing_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_job_processing_queue_started_at ON job_processing_queue(started_at);
CREATE INDEX IF NOT EXISTS idx_job_processing_queue_completed_at ON job_processing_queue(completed_at);
CREATE INDEX IF NOT EXISTS idx_job_processing_queue_retry_count ON job_processing_queue(retry_count);


-- =================================================================
-- Table: python_clients
-- =================================================================
CREATE TABLE IF NOT EXISTS python_clients (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_type TEXT CHECK(client_type IN ('scraper', 'monitor', 'analyzer')) NOT NULL,
  status TEXT CHECK(status IN ('active', 'inactive', 'error', 'maintenance')) DEFAULT 'active',
  last_seen TEXT DEFAULT CURRENT_TIMESTAMP,
  last_poll TEXT,
  api_key TEXT NOT NULL,
  capabilities TEXT,
  version TEXT,
  environment TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  error_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  metadata TEXT
);
CREATE INDEX IF NOT EXISTS idx_python_clients_status ON python_clients(status);
CREATE INDEX IF NOT EXISTS idx_python_clients_last_seen ON python_clients(last_seen);
CREATE INDEX IF NOT EXISTS idx_python_clients_client_type ON python_clients(client_type);
CREATE INDEX IF NOT EXISTS idx_python_clients_api_key ON python_clients(api_key);


-- =================================================================
-- Table: job_processing_results
-- =================================================================
CREATE TABLE IF NOT EXISTS job_processing_results (
  id TEXT PRIMARY KEY,
  queue_id TEXT,
  job_id TEXT,
  status TEXT CHECK(status IN ('completed', 'failed', 'partial')) NOT NULL,
  results_count INTEGER DEFAULT 0,
  processing_time_ms INTEGER,
  scraped_at TEXT DEFAULT CURRENT_TIMESTAMP,
  error_message TEXT,
  raw_data TEXT,
  processed_data TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_job_processing_results_queue_id ON job_processing_results(queue_id);
CREATE INDEX IF NOT EXISTS idx_job_processing_results_status ON job_processing_results(status);
CREATE INDEX IF NOT EXISTS idx_job_processing_results_scraped_at ON job_processing_results(scraped_at);
CREATE INDEX IF NOT EXISTS idx_job_processing_results_job_id ON job_processing_results(job_id);


-- =================================================================
-- Table: skills
-- =================================================================
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  skill_category TEXT,
  proficiency_level TEXT,
  years_experience INTEGER,
  is_confirmed BOOLEAN DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES applicant_profiles(id) ON DELETE CASCADE,
  UNIQUE(profile_id, skill_name)
);
CREATE INDEX IF NOT EXISTS idx_skills_profile_id ON skills(profile_id);
CREATE INDEX IF NOT EXISTS idx_skills_skill_name ON skills(skill_name);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(skill_category);
CREATE INDEX IF NOT EXISTS idx_skills_is_confirmed ON skills(is_confirmed);


-- =================================================================
-- Table: career_goals
-- =================================================================
CREATE TABLE IF NOT EXISTS career_goals (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  goal_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_date TEXT,
  priority INTEGER DEFAULT 1,
  is_confirmed BOOLEAN DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES applicant_profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_career_goals_profile_id ON career_goals(profile_id);
CREATE INDEX IF NOT EXISTS idx_career_goals_goal_type ON career_goals(goal_type);
CREATE INDEX IF NOT EXISTS idx_career_goals_is_confirmed ON career_goals(is_confirmed);


-- =================================================================
-- Table: industry_interests
-- =================================================================
CREATE TABLE IF NOT EXISTS industry_interests (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  industry_name TEXT NOT NULL,
  interest_level TEXT,
  notes TEXT,
  is_confirmed BOOLEAN DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES applicant_profiles(id) ON DELETE CASCADE,
  UNIQUE(profile_id, industry_name)
);
CREATE INDEX IF NOT EXISTS idx_industry_interests_profile_id ON industry_interests(profile_id);
CREATE INDEX IF NOT EXISTS idx_industry_interests_industry_name ON industry_interests(industry_name);
CREATE INDEX IF NOT EXISTS idx_industry_interests_is_confirmed ON industry_interests(is_confirmed);


-- =================================================================
-- Table: salary_goals
-- =================================================================
CREATE TABLE IF NOT EXISTS salary_goals (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  min_salary INTEGER,
  max_salary INTEGER,
  currency TEXT DEFAULT 'USD',
  salary_type TEXT,
  location TEXT,
  is_confirmed BOOLEAN DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES applicant_profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_salary_goals_profile_id ON salary_goals(profile_id);
CREATE INDEX IF NOT EXISTS idx_salary_goals_is_confirmed ON salary_goals(is_confirmed);


-- =================================================================
-- Table: profile_changes
-- =================================================================
CREATE TABLE IF NOT EXISTS profile_changes (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  change_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_values TEXT,
  new_values TEXT,
  change_reason TEXT,
  ai_suggested BOOLEAN DEFAULT 0,
  is_confirmed BOOLEAN DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES applicant_profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_profile_changes_profile_id ON profile_changes(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_changes_change_type ON profile_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_profile_changes_is_confirmed ON profile_changes(is_confirmed);
CREATE INDEX IF NOT EXISTS idx_profile_changes_ai_suggested ON profile_changes(ai_suggested);


-- =================================================================
-- Table: profile_approvals
-- =================================================================
CREATE TABLE IF NOT EXISTS profile_approvals (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  change_id TEXT NOT NULL,
  approver_id TEXT,
  status TEXT NOT NULL,
  comments TEXT,
  approved_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES applicant_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (change_id) REFERENCES profile_changes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_profile_approvals_profile_id ON profile_approvals(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_approvals_change_id ON profile_approvals(change_id);
CREATE INDEX IF NOT EXISTS idx_profile_approvals_status ON profile_approvals(status);


-- =================================================================
-- Table: document_analysis
-- =================================================================
CREATE TABLE IF NOT EXISTS document_analysis (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  document_content TEXT NOT NULL,
  analysis_results TEXT,
  suggested_improvements TEXT,
  ai_confidence REAL,
  is_confirmed BOOLEAN DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES applicant_profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_document_analysis_profile_id ON document_analysis(profile_id);
CREATE INDEX IF NOT EXISTS idx_document_analysis_document_type ON document_analysis(document_type);
CREATE INDEX IF NOT EXISTS idx_document_analysis_is_confirmed ON document_analysis(is_confirmed);


-- =================================================================
-- Table: interview_prep_data
-- =================================================================
CREATE TABLE IF NOT EXISTS interview_prep_data (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  job_id TEXT,
  prep_type TEXT NOT NULL,
  questions TEXT,
  answers TEXT,
  feedback TEXT,
  score REAL,
  is_confirmed BOOLEAN DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES applicant_profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_interview_prep_data_profile_id ON interview_prep_data(profile_id);
CREATE INDEX IF NOT EXISTS idx_interview_prep_data_job_id ON interview_prep_data(job_id);
CREATE INDEX IF NOT EXISTS idx_interview_prep_data_prep_type ON interview_prep_data(prep_type);
CREATE INDEX IF NOT EXISTS idx_interview_prep_data_is_confirmed ON interview_prep_data(is_confirmed);


-- =================================================================
-- Table: agent_activities
-- =================================================================
CREATE TABLE IF NOT EXISTS agent_activities (
  id TEXT PRIMARY KEY,
  agent_name TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  data TEXT,
  status TEXT CHECK(status IN ('info', 'warn', 'error')) DEFAULT 'info',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_agent_activities_agent_name ON agent_activities(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_activities_created_at ON agent_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_activities_status ON agent_activities(status);


-- =================================================================
-- Table: agent_data
-- =================================================================
CREATE TABLE IF NOT EXISTS agent_data (
  agent_name TEXT NOT NULL,
  key TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (agent_name, key)
);
CREATE INDEX IF NOT EXISTS idx_agent_data_agent_name ON agent_data(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_data_updated_at ON agent_data(updated_at);


-- =================================================================
-- Table: company_profiles
-- =================================================================
CREATE TABLE IF NOT EXISTS company_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT,
  industry TEXT,
  size TEXT,
  location TEXT,
  founded TEXT,
  description TEXT,
  mission TEXT,
  company_values TEXT,
  culture TEXT,
  recent_news TEXT,
  financials TEXT,
  leadership TEXT,
  benefits TEXT,
  interview_insights TEXT,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  research_count INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_company_profiles_name ON company_profiles(name);
CREATE INDEX IF NOT EXISTS idx_company_profiles_industry ON company_profiles(industry);
CREATE INDEX IF NOT EXISTS idx_company_profiles_last_updated ON company_profiles(last_updated);


-- =================================================================
-- Table: interview_sessions
-- =================================================================
CREATE TABLE IF NOT EXISTS interview_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  session_type TEXT CHECK(session_type IN ('preparation', 'practice', 'real_time', 'follow_up')) NOT NULL,
  status TEXT CHECK(status IN ('active', 'paused', 'completed', 'cancelled')) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
  strategy TEXT,
  questions TEXT,
  answers TEXT,
  feedback TEXT,
  score REAL DEFAULT 0,
  notes TEXT,
  next_steps TEXT
);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_job_id ON interview_sessions(job_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_status ON interview_sessions(status);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_created_at ON interview_sessions(created_at);


-- =================================================================
-- Table: resume_optimizations
-- =================================================================
CREATE TABLE IF NOT EXISTS resume_optimizations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  resume_data TEXT NOT NULL,
  job_description TEXT NOT NULL,
  optimization_type TEXT CHECK(optimization_type IN ('ats', 'human', 'executive', 'industry', 'comprehensive')) NOT NULL,
  priority TEXT CHECK(priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  status TEXT CHECK(status IN ('pending', 'processing', 'peer_review', 'completed', 'failed')) DEFAULT 'pending',
  current_step TEXT,
  results TEXT,
  feedback TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);
CREATE INDEX IF NOT EXISTS idx_resume_optimizations_user_id ON resume_optimizations(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_optimizations_status ON resume_optimizations(status);
CREATE INDEX IF NOT EXISTS idx_resume_optimizations_created_at ON resume_optimizations(created_at);


-- =================================================================
-- Table: job_monitoring
-- =================================================================
CREATE TABLE IF NOT EXISTS job_monitoring (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  status TEXT CHECK(status IN ('active', 'paused', 'completed', 'failed')) DEFAULT 'active',
  last_checked DATETIME,
  change_count INTEGER DEFAULT 0,
  relevance_score REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);
CREATE INDEX IF NOT EXISTS idx_job_monitoring_job_id ON job_monitoring(job_id);
CREATE INDEX IF NOT EXISTS idx_job_monitoring_status ON job_monitoring(status);
CREATE INDEX IF NOT EXISTS idx_job_monitoring_last_checked ON job_monitoring(last_checked);


-- =================================================================
-- Seed Data
-- =================================================================
INSERT INTO email_configs (id, name, recipient_email, frequency_hours)
VALUES ('default', 'Daily Job Insights', 'justin@126colby.com', 24);

-- Insert agent configurations from YAML files
INSERT OR REPLACE INTO agent_configs (id, name, role, goal, backstory, llm) VALUES
('resume_analyzer', 'Resume Analyzer', 'Resume & ATS Optimization Expert',
 'Critically analyze resumes against specific job descriptions, identifying keyword gaps, areas for improvement, and providing structured, actionable optimization suggestions to maximize ATS compatibility and human reviewer impact.',
 'You are a seasoned resume optimization specialist with an encyclopedic knowledge of Applicant Tracking Systems (ATS) and cutting-edge resume best practices. You don''t just scan for keywords; you understand the nuances of how to craft a compelling narrative that appeals to both algorithms and hiring managers. Your feedback is always precise, data-driven, and aimed at significantly boosting interview chances.',
 'openai/gpt-4o-mini'),

('job_analyzer', 'Job Analyzer', 'Deep Job Description Analyst & Candidate Fit Assessor',
 'Dissect job descriptions to extract explicit and implicit requirements, identify core competencies, uncover hidden needs of the hiring team, and provide a detailed candidate fit-gap analysis. Your output directly informs resume tailoring and interview preparation.',
 'You are an expert in job market intelligence and talent assessment. Your superpower is deciphering the true essence of a job role from its description, going beyond surface-level keywords. You meticulously categorize requirements, evaluate the importance of various skills (technical, soft, and domain-specific), and can accurately assess how a candidate''s profile aligns, highlighting both strengths and areas for targeted improvement.',
 'openai/gpt-4o-mini'),

('company_researcher', 'Company Researcher', 'Corporate Intelligence & Interview Insights Specialist',
 'Gather, synthesize, and deliver comprehensive intelligence on target companies. Focus on providing actionable insights into company culture, recent performance, strategic initiatives, market positioning, challenges, and key personnel to equip the candidate for insightful interview conversations and informed decision-making.',
 'You are a master corporate investigator with a talent for unearthing critical information that gives job candidates an edge. You navigate financial reports, news archives, industry analyses, and social media landscapes with ease. Your briefings are not just data dumps; they are strategic intelligence reports that reveal a company''s DNA and help candidates connect with interviewers on a deeper level.',
 'openai/gpt-4o-mini'),

('resume_writer', 'Resume Writer', 'Strategic Resume & Cover Letter Crafter (Markdown)',
 'Transform resume analysis, optimization suggestions, and job requirements into highly persuasive, ATS-optimized resumes and compelling cover letters in Markdown. Each document will be meticulously tailored to the specific job opportunity, showcasing the candidate''s unique value proposition.',
 'You are a master wordsmith and resume strategist specializing in Markdown. You understand that a resume is a marketing document. You excel at weaving a candidate''s experience, skills, and achievements into a powerful narrative that resonates with recruiters and hiring managers. Your creations are not only ATS-friendly but also visually clean and professionally compelling. You can also craft targeted cover letters that make an unforgettable first impression.',
 'openai/gpt-4o-mini'),

('interview_strategist', 'Interview Strategist', 'Personalized Interview & Negotiation Coach',
 'Develop tailored interview strategies by leveraging job requirements, the candidate''s optimized resume, and company research. This includes formulating compelling talking points, preparing strong answers to common and behavioral questions (using STAR method), devising insightful questions for the interviewer, and providing foundational tips for salary negotiation.',
 'You are an experienced interview coach who has helped countless candidates navigate the toughest interviews and secure their dream jobs. You understand the psychology of interviewing and how to position a candidate for success. You provide practical, actionable advice, help articulate value effectively, and build confidence. You also have a keen sense of how to approach initial salary discussions.',
 'openai/gpt-4o-mini'),

('report_generator', 'Report Generator', 'Comprehensive Job Application Dossier Architect (Markdown)',
 'Synthesize all analyses (job fit, resume optimization, company intelligence, interview strategy) into a single, cohesive, and actionable job application dossier in Markdown. The report will be visually appealing, easy to navigate, and empower the candidate with all necessary information for a successful application and interview process.',
 'You are an expert in information synthesis and presentation. You take complex data from multiple sources and transform it into a clear, concise, and visually engaging report. Your dossiers are the ultimate cheat sheets for job seekers, providing strategic insights, key data points, and actionable checklists, all beautifully formatted in Markdown for maximum readability and utility.',
 'openai/gpt-4o-mini'),

('career_historian', 'Career Historian', 'Career Historian',
 'Synthesize and summarize career history from various documents like performance reviews, role profiles, and assignments.',
 'You are an expert in meticulously reviewing career-related documents, extracting key achievements, responsibilities, and growth patterns. You can synthesize this information into a coherent narrative of a candidate''s career trajectory.',
 'openai/gpt-4o-mini');

-- Insert task configurations from YAML files
INSERT OR REPLACE INTO task_configs (id, name, description, expected_output, agent_id, context_tasks) VALUES
('analyze_job_task', 'Analyze Job Task',
 'Analyze the job description from the provided URL. Extract the key requirements, skills, experience levels, and company culture cues. This analysis will be used to tailor the resume and preparation.',
 'A structured JSON file (job_analysis.json) containing the extracted job requirements, conforming to the JobRequirements Pydantic model.',
 'job_analyzer', NULL),

('extract_achievements_task', 'Extract Achievements Task',
 'Review and synthesize the candidate''s career history from knowledge sources (Performance Reviews, Role Profiles, Assignments, GRAD Expectations). Extract key achievements, skills demonstrated, and career highlights.',
 'A markdown file (career_highlights.md) summarizing the most significant career achievements and highlights relevant for resume building.',
 'career_historian', NULL),

('optimize_resume_task', 'Optimize Resume Task',
 'Analyze the candidate''s base resume against the extracted job requirements and career highlights. Identify areas for improvement, keyword optimization, and alignment with the target role.',
 'A structured JSON file (resume_optimization.json) providing specific, actionable suggestions for optimizing the resume, conforming to the ResumeOptimization Pydantic model.',
 'resume_analyzer', '["analyze_job_task", "extract_achievements_task"]'),

('research_company_task', 'Research Company Task',
 'Conduct research on the target company. Gather information on its culture, recent news, market position, and potential interview focus areas.',
 'A structured JSON file (company_research.json) containing key findings about the company, conforming to the CompanyResearch Pydantic model.',
 'company_researcher', NULL),

('generate_resume_task', 'Generate Resume Task',
 'Create a new, optimized resume draft in Markdown format. Incorporate the suggestions from the optimization task and tailor the content using insights from the company research to best fit the target role.',
 'A markdown file (optimized_resume.md) containing the newly drafted, optimized resume.',
 'resume_writer', '["optimize_resume_task", "research_company_task"]'),

('generate_report_task', 'Generate Report Task',
 'Compile all the findings from the previous tasks into a single, comprehensive report. This report should summarize the job analysis, career highlights, resume optimizations, company research, and include the final resume.',
 'A final markdown file (final_report.md) presenting a cohesive summary of the entire process and its outcomes.',
 'report_generator', '["analyze_job_task", "extract_achievements_task", "optimize_resume_task", "research_company_task", "generate_resume_task"]');

-- Insert default workflow configuration
INSERT INTO workflow_configs (id, name, description, task_sequence) VALUES
('resume_optimization_workflow', 'Resume Optimization Workflow',
 'Complete end-to-end resume optimization workflow including job analysis, career history extraction, resume optimization, company research, and final report generation.',
 '["analyze_job_task", "extract_achievements_task", "optimize_resume_task", "research_company_task", "generate_resume_task", "generate_report_task"]');


INSERT INTO email_templates (name, subject_template, html_template, variables) VALUES
('job_insights', 'Daily Job Insights - {{date}}', '<!DOCTYPE html><html><head><title>Job Insights</title></head><body><h1>Daily Job Insights</h1><p>Date: {{date}}</p><p>New Jobs: {{new_jobs_count}}</p><p>Total Jobs: {{total_jobs_count}}</p></body></html>', '["date", "new_jobs_count", "total_jobs_count", "top_companies", "top_locations"]'),
('otp_alert', 'OTP Code Received - {{service_name}}', '<!DOCTYPE html><html><head><title>OTP Alert</title></head><body><h1>OTP Code Received</h1><p>Service: {{service_name}}</p><p>Code: <strong>{{otp_code}}</strong></p><p>Time: {{timestamp}}</p></body></html>', '["service_name", "otp_code", "timestamp", "original_subject"]');