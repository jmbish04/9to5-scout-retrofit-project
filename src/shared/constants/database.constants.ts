/**
 * @fileoverview Database Constants
 *
 * Common constants used across database operations and queries
 * in the 9to5 Scout platform.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * Database Table Names
 */
export const TABLES = {
  // Core tables
  SITES: "sites",
  JOBS: "jobs",
  JOB_CHANGES: "job_changes",

  // User and authentication
  USERS: "users",
  USER_SESSIONS: "user_sessions",
  USER_PROFILES: "user_profiles",

  // Email processing
  EMAIL_LOGS: "email_logs",
  EMAIL_JOB_LINKS: "email_job_links",

  // Agent configurations
  AGENT_CONFIGS: "agent_configs",
  TASK_CONFIGS: "task_configs",

  // Company and applicant data
  COMPANIES: "companies",
  APPLICANTS: "applicants",
  APPLICANT_MATCHES: "applicant_matches",

  // Document management
  DOCUMENTS: "documents",
  DOCUMENT_VERSIONS: "document_versions",

  // Monitoring and analytics
  MONITORING_LOGS: "monitoring_logs",
  ANALYTICS_EVENTS: "analytics_events",

  // Workflow and task management
  WORKFLOWS: "workflows",
  WORKFLOW_INSTANCES: "workflow_instances",
  TASKS: "tasks",

  // Integration data
  INTEGRATION_LOGS: "integration_logs",
  API_KEYS: "api_keys",

  // Scraping and crawling
  SCRAPE_QUEUE: "scrape_queue",
  PYTHON_CLIENTS: "python_clients",
  CRAWL_SESSIONS: "crawl_sessions",
} as const;

/**
 * Database Column Names
 */
export const COLUMNS = {
  // Common columns
  ID: "id",
  CREATED_AT: "created_at",
  UPDATED_AT: "updated_at",
  DELETED_AT: "deleted_at",

  // Site columns
  SITE_ID: "site_id",
  SITE_NAME: "name",
  SITE_URL: "base_url",
  ROBOTS_TXT: "robots_txt",
  SITEMAP_URL: "sitemap_url",
  DISCOVERY_STRATEGY: "discovery_strategy",
  LAST_DISCOVERED_AT: "last_discovered_at",

  // Job columns
  JOB_ID: "job_id",
  JOB_URL: "url",
  JOB_TITLE: "title",
  JOB_COMPANY: "company",
  JOB_LOCATION: "location",
  JOB_SALARY_MIN: "salary_min",
  JOB_SALARY_MAX: "salary_max",
  JOB_DESCRIPTION: "description",
  JOB_STATUS: "status",
  JOB_TAGS: "tags",
  JOB_POSTED_AT: "posted_at",
  JOB_FIRST_SEEN_AT: "first_seen_at",
  JOB_LAST_CRAWLED_AT: "last_crawled_at",
  JOB_LAST_CHANGED_AT: "last_changed_at",

  // Job change columns
  CHANGE_TYPE: "change_type",
  OLD_VALUE: "old_value",
  NEW_VALUE: "new_value",
  SIGNIFICANCE_SCORE: "significance_score",
  AI_SUMMARY: "ai_summary",
  DETECTED_AT: "detected_at",

  // User columns
  USER_ID: "user_id",
  USERNAME: "username",
  EMAIL: "email",
  PASSWORD_HASH: "password_hash",
  FIRST_NAME: "first_name",
  LAST_NAME: "last_name",
  PHONE: "phone",
  ROLE: "role",
  IS_ACTIVE: "is_active",
  LAST_LOGIN_AT: "last_login_at",

  // Email columns
  EMAIL_FROM: "from_email",
  EMAIL_TO: "to_email",
  EMAIL_SUBJECT: "subject",
  EMAIL_BODY: "body",
  EMAIL_CATEGORY: "category",
  EMAIL_CATEGORY_REASONING: "category_reasoning",
  EMAIL_JOB_LINKS: "job_links",
  EMAIL_PROCESSED_AT: "processed_at",

  // Agent columns
  AGENT_NAME: "name",
  AGENT_ROLE: "role",
  AGENT_GOAL: "goal",
  AGENT_BACKSTORY: "backstory",
  AGENT_LLM: "llm",
  AGENT_SYSTEM_PROMPT: "system_prompt",
  AGENT_MAX_TOKENS: "max_tokens",
  AGENT_TEMPERATURE: "temperature",
  AGENT_ENABLED: "enabled",

  // Company columns
  COMPANY_NAME: "name",
  COMPANY_WEBSITE: "website",
  COMPANY_DESCRIPTION: "description",
  COMPANY_INDUSTRY: "industry",
  COMPANY_SIZE: "size",
  COMPANY_LOCATION: "location",
  COMPANY_LOGO_URL: "logo_url",

  // Applicant columns
  APPLICANT_NAME: "name",
  APPLICANT_EMAIL: "email",
  APPLICANT_PHONE: "phone",
  APPLICANT_LOCATION: "location",
  APPLICANT_SKILLS: "skills",
  APPLICANT_EXPERIENCE: "experience",
  APPLICANT_EDUCATION: "education",
  APPLICANT_RESUME_URL: "resume_url",
  APPLICANT_LINKEDIN_URL: "linkedin_url",
  APPLICANT_GITHUB_URL: "github_url",

  // Document columns
  DOCUMENT_NAME: "name",
  DOCUMENT_TYPE: "type",
  DOCUMENT_URL: "url",
  DOCUMENT_SIZE: "size",
  DOCUMENT_MIME_TYPE: "mime_type",
  DOCUMENT_HASH: "hash",
  DOCUMENT_METADATA: "metadata",

  // Workflow columns
  WORKFLOW_NAME: "name",
  WORKFLOW_DESCRIPTION: "description",
  WORKFLOW_STATUS: "status",
  WORKFLOW_CONFIG: "config",
  WORKFLOW_STARTED_AT: "started_at",
  WORKFLOW_COMPLETED_AT: "completed_at",
  WORKFLOW_ERROR: "error",

  // Task columns
  TASK_NAME: "name",
  TASK_DESCRIPTION: "description",
  TASK_STATUS: "status",
  TASK_PRIORITY: "priority",
  TASK_ASSIGNED_TO: "assigned_to",
  TASK_DUE_DATE: "due_date",
  TASK_COMPLETED_AT: "completed_at",

  // Integration columns
  INTEGRATION_NAME: "name",
  INTEGRATION_TYPE: "type",
  INTEGRATION_CONFIG: "config",
  INTEGRATION_STATUS: "status",
  INTEGRATION_LAST_SYNC: "last_sync_at",

  // Scraping columns
  SCRAPE_URL: "url",
  SCRAPE_STATUS: "status",
  SCRAPE_PRIORITY: "priority",
  SCRAPE_SCHEDULED_AT: "scheduled_at",
  SCRAPE_STARTED_AT: "started_at",
  SCRAPE_COMPLETED_AT: "completed_at",
  SCRAPE_ERROR: "error",
  SCRAPE_RESULT: "result",
} as const;

/**
 * Database Index Names
 */
export const INDEXES = {
  // Common indexes
  IDX_CREATED_AT: "idx_created_at",
  IDX_UPDATED_AT: "idx_updated_at",
  IDX_STATUS: "idx_status",

  // Site indexes
  IDX_SITE_NAME: "idx_site_name",
  IDX_SITE_URL: "idx_site_url",
  IDX_SITE_DISCOVERY_STRATEGY: "idx_site_discovery_strategy",

  // Job indexes
  IDX_JOB_SITE_ID: "idx_job_site_id",
  IDX_JOB_URL: "idx_job_url",
  IDX_JOB_TITLE: "idx_job_title",
  IDX_JOB_COMPANY: "idx_job_company",
  IDX_JOB_LOCATION: "idx_job_location",
  IDX_JOB_STATUS: "idx_job_status",
  IDX_JOB_POSTED_AT: "idx_job_posted_at",
  IDX_JOB_FIRST_SEEN_AT: "idx_job_first_seen_at",
  IDX_JOB_LAST_CRAWLED_AT: "idx_job_last_crawled_at",

  // Job change indexes
  IDX_JOB_CHANGE_JOB_ID: "idx_job_change_job_id",
  IDX_JOB_CHANGE_TYPE: "idx_job_change_type",
  IDX_JOB_CHANGE_DETECTED_AT: "idx_job_change_detected_at",

  // User indexes
  IDX_USER_EMAIL: "idx_user_email",
  IDX_USER_USERNAME: "idx_user_username",
  IDX_USER_ROLE: "idx_user_role",
  IDX_USER_IS_ACTIVE: "idx_user_is_active",

  // Email indexes
  IDX_EMAIL_FROM: "idx_email_from",
  IDX_EMAIL_TO: "idx_email_to",
  IDX_EMAIL_CATEGORY: "idx_email_category",
  IDX_EMAIL_PROCESSED_AT: "idx_email_processed_at",

  // Agent indexes
  IDX_AGENT_NAME: "idx_agent_name",
  IDX_AGENT_ROLE: "idx_agent_role",
  IDX_AGENT_ENABLED: "idx_agent_enabled",

  // Company indexes
  IDX_COMPANY_NAME: "idx_company_name",
  IDX_COMPANY_INDUSTRY: "idx_company_industry",
  IDX_COMPANY_LOCATION: "idx_company_location",

  // Applicant indexes
  IDX_APPLICANT_EMAIL: "idx_applicant_email",
  IDX_APPLICANT_SKILLS: "idx_applicant_skills",
  IDX_APPLICANT_LOCATION: "idx_applicant_location",

  // Document indexes
  IDX_DOCUMENT_TYPE: "idx_document_type",
  IDX_DOCUMENT_HASH: "idx_document_hash",

  // Workflow indexes
  IDX_WORKFLOW_NAME: "idx_workflow_name",
  IDX_WORKFLOW_STATUS: "idx_workflow_status",
  IDX_WORKFLOW_STARTED_AT: "idx_workflow_started_at",

  // Task indexes
  IDX_TASK_STATUS: "idx_task_status",
  IDX_TASK_PRIORITY: "idx_task_priority",
  IDX_TASK_ASSIGNED_TO: "idx_task_assigned_to",
  IDX_TASK_DUE_DATE: "idx_task_due_date",

  // Integration indexes
  IDX_INTEGRATION_NAME: "idx_integration_name",
  IDX_INTEGRATION_TYPE: "idx_integration_type",
  IDX_INTEGRATION_STATUS: "idx_integration_status",

  // Scraping indexes
  IDX_SCRAPE_URL: "idx_scrape_url",
  IDX_SCRAPE_STATUS: "idx_scrape_status",
  IDX_SCRAPE_PRIORITY: "idx_scrape_priority",
  IDX_SCRAPE_SCHEDULED_AT: "idx_scrape_scheduled_at",
} as const;

/**
 * Database Constraint Names
 */
export const CONSTRAINTS = {
  // Primary key constraints
  PK_SITES: "pk_sites",
  PK_JOBS: "pk_jobs",
  PK_JOB_CHANGES: "pk_job_changes",
  PK_USERS: "pk_users",
  PK_EMAIL_LOGS: "pk_email_logs",
  PK_AGENT_CONFIGS: "pk_agent_configs",
  PK_COMPANIES: "pk_companies",
  PK_APPLICANTS: "pk_applicants",
  PK_DOCUMENTS: "pk_documents",
  PK_WORKFLOWS: "pk_workflows",
  PK_TASKS: "pk_tasks",
  PK_INTEGRATIONS: "pk_integrations",
  PK_SCRAPE_QUEUE: "pk_scrape_queue",

  // Foreign key constraints
  FK_JOBS_SITE_ID: "fk_jobs_site_id",
  FK_JOB_CHANGES_JOB_ID: "fk_job_changes_job_id",
  FK_EMAIL_JOB_LINKS_EMAIL_ID: "fk_email_job_links_email_id",
  FK_TASKS_WORKFLOW_ID: "fk_tasks_workflow_id",
  FK_SCRAPE_QUEUE_CLIENT_ID: "fk_scrape_queue_client_id",

  // Unique constraints
  UK_SITES_URL: "uk_sites_url",
  UK_JOBS_URL: "uk_jobs_url",
  UK_USERS_EMAIL: "uk_users_email",
  UK_USERS_USERNAME: "uk_users_username",
  UK_AGENT_CONFIGS_NAME: "uk_agent_configs_name",
  UK_COMPANIES_NAME: "uk_companies_name",
  UK_APPLICANTS_EMAIL: "uk_applicants_email",
  UK_DOCUMENTS_HASH: "uk_documents_hash",
  UK_WORKFLOWS_NAME: "uk_workflows_name",
  UK_INTEGRATIONS_NAME: "uk_integrations_name",

  // Check constraints
  CK_JOBS_STATUS: "ck_jobs_status",
  CK_JOB_CHANGES_SIGNIFICANCE_SCORE: "ck_job_changes_significance_score",
  CK_USERS_ROLE: "ck_users_role",
  CK_EMAIL_LOGS_CATEGORY: "ck_email_logs_category",
  CK_AGENT_CONFIGS_MAX_TOKENS: "ck_agent_configs_max_tokens",
  CK_AGENT_CONFIGS_TEMPERATURE: "ck_agent_configs_temperature",
  CK_WORKFLOWS_STATUS: "ck_workflows_status",
  CK_TASKS_STATUS: "ck_tasks_status",
  CK_TASKS_PRIORITY: "ck_tasks_priority",
  CK_INTEGRATIONS_STATUS: "ck_integrations_status",
  CK_SCRAPE_QUEUE_STATUS: "ck_scrape_queue_status",
  CK_SCRAPE_QUEUE_PRIORITY: "ck_scrape_queue_priority",
} as const;

/**
 * Database Query Limits
 */
export const QUERY_LIMITS = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
  BATCH_SIZE: 1000,
  BULK_INSERT_SIZE: 500,
  BULK_UPDATE_SIZE: 100,
  BULK_DELETE_SIZE: 50,
} as const;

/**
 * Database Timeout Values (in milliseconds)
 */
export const TIMEOUTS = {
  QUERY_TIMEOUT: 30000, // 30 seconds
  TRANSACTION_TIMEOUT: 60000, // 1 minute
  CONNECTION_TIMEOUT: 10000, // 10 seconds
  IDLE_TIMEOUT: 300000, // 5 minutes
} as const;

/**
 * Database Retry Configuration
 */
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  RETRY_BACKOFF: 2,
  MAX_RETRY_DELAY: 10000, // 10 seconds
} as const;
