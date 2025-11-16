/**
 * @module src/db/schema.ts
 * @description
 * Drizzle ORM schema definitions for all database tables.
 * This file provides type-safe schema definitions and type inference.
 */

import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ============================================================================
// Core Tables
// ============================================================================

export const sites = sqliteTable("sites", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  baseUrl: text("base_url").notNull(),
  robotsTxt: text("robots_txt"),
  sitemapUrl: text("sitemap_url"),
  discoveryStrategy: text("discovery_strategy").notNull(),
  lastDiscoveredAt: text("last_discovered_at"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const companies = sqliteTable("companies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  normalizedDomain: text("normalized_domain").notNull(),
  websiteUrl: text("website_url"),
  careersUrl: text("careers_url"),
  description: text("description"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  siteId: text("site_id").references(() => sites.id),
  companyId: text("company_id").references(() => companies.id),
  url: text("url").notNull().unique(),
  canonicalUrl: text("canonical_url"),
  title: text("title"),
  company: text("company"),
  location: text("location"),
  employmentType: text("employment_type"),
  department: text("department"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  salaryCurrency: text("salary_currency"),
  salaryRaw: text("salary_raw"),
  compensationRaw: text("compensation_raw"),
  descriptionMd: text("description_md"),
  requirementsMd: text("requirements_md"),
  postedAt: text("posted_at"),
  closedAt: text("closed_at"),
  status: text("status").notNull().default("open"),
  lastSeenOpenAt: text("last_seen_open_at"),
  firstSeenAt: text("first_seen_at").default(sql`CURRENT_TIMESTAMP`),
  lastCrawledAt: text("last_crawled_at"),
  source: text("source").notNull().default("SCRAPED"),
  dailyMonitoringEnabled: integer("daily_monitoring_enabled", {
    mode: "boolean",
  })
    .notNull()
    .default(true),
  monitoringFrequencyHours: integer("monitoring_frequency_hours")
    .notNull()
    .default(24),
  lastStatusCheckAt: text("last_status_check_at"),
  closureDetectedAt: text("closure_detected_at"),
});

export const snapshots = sqliteTable("snapshots", {
  id: text("id").primaryKey(),
  jobId: text("job_id").references(() => jobs.id),
  runId: text("run_id"),
  contentHash: text("content_hash"),
  htmlR2Key: text("html_r2_key"),
  jsonR2Key: text("json_r2_key"),
  screenshotR2Key: text("screenshot_r2_key"),
  pdfR2Key: text("pdf_r2_key"),
  markdownR2Key: text("markdown_r2_key"),
  fetchedAt: text("fetched_at").default(sql`CURRENT_TIMESTAMP`),
  httpStatus: integer("http_status"),
  etag: text("etag"),
});

export const changes = sqliteTable("changes", {
  id: text("id").primaryKey(),
  jobId: text("job_id").references(() => jobs.id),
  fromSnapshotId: text("from_snapshot_id").references(() => snapshots.id),
  toSnapshotId: text("to_snapshot_id").references(() => snapshots.id),
  diffJson: text("diff_json").notNull(),
  semanticSummary: text("semantic_summary"),
  changedAt: text("changed_at").default(sql`CURRENT_TIMESTAMP`),
});

export const runs = sqliteTable("runs", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  configId: text("config_id"),
  startedAt: text("started_at").default(sql`CURRENT_TIMESTAMP`),
  finishedAt: text("finished_at"),
  status: text("status"),
  statsJson: text("stats_json"),
});

// ============================================================================
// Configuration Tables
// ============================================================================

export const searchConfigs = sqliteTable("search_configs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  keywords: text("keywords").notNull(),
  locations: text("locations"),
  includeDomains: text("include_domains"),
  excludeDomains: text("exclude_domains"),
  minCompTotal: integer("min_comp_total"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at"),
});

export const emailConfigs = sqliteTable("email_configs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  frequencyHours: integer("frequency_hours").notNull().default(24),
  recipientEmail: text("recipient_email").notNull(),
  includeNewJobs: integer("include_new_jobs", { mode: "boolean" })
    .notNull()
    .default(true),
  includeJobChanges: integer("include_job_changes", { mode: "boolean" })
    .notNull()
    .default(true),
  includeStatistics: integer("include_statistics", { mode: "boolean" })
    .notNull()
    .default(true),
  lastSentAt: text("last_sent_at"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at"),
});

export const agentConfigs = sqliteTable("agent_configs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  goal: text("goal").notNull(),
  backstory: text("backstory").notNull(),
  llm: text("llm").notNull(),
  systemPrompt: text("system_prompt"),
  maxTokens: integer("max_tokens").default(4000),
  temperature: real("temperature").default(0.7),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const taskConfigs = sqliteTable("task_configs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  expectedOutput: text("expected_output").notNull(),
  agentId: text("agent_id")
    .notNull()
    .references(() => agentConfigs.id),
  contextTasks: text("context_tasks"), // JSON array
  outputSchema: text("output_schema"), // JSON schema
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const workflowConfigs = sqliteTable("workflow_configs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  taskSequence: text("task_sequence").notNull(), // JSON array
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================================
// Applicant & Profile Tables
// ============================================================================

export const applicantProfiles = sqliteTable("applicant_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  name: text("name"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  linkedinUrl: text("linkedin_url"),
  githubUrl: text("github_url"),
  portfolioUrl: text("portfolio_url"),
  location: text("location"),
  timezone: text("timezone"),
  currentTitle: text("current_title"),
  currentCompany: text("current_company"),
  targetRoles: text("target_roles"),
  yearsExperience: integer("years_experience"),
  educationLevel: text("education_level"),
  skills: text("skills"),
  preferences: text("preferences"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  isConfirmed: integer("is_confirmed", { mode: "boolean" }).default(false),
  lastActivityAt: text("last_activity_at").default(sql`CURRENT_TIMESTAMP`),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const jobHistory = sqliteTable("job_history", {
  id: text("id").primaryKey(),
  applicantId: text("applicant_id")
    .notNull()
    .references(() => applicantProfiles.id),
  companyName: text("company_name").notNull(),
  jobTitle: text("job_title").notNull(),
  department: text("department"),
  employmentType: text("employment_type"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  isCurrent: integer("is_current", { mode: "boolean" }).default(false),
  location: text("location"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  salaryCurrency: text("salary_currency").default("USD"),
  responsibilities: text("responsibilities"),
  achievements: text("achievements"),
  skillsUsed: text("skills_used"),
  technologies: text("technologies"),
  keywords: text("keywords"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const jobHistorySubmissions = sqliteTable("job_history_submissions", {
  id: text("id").primaryKey(),
  applicantId: text("applicant_id")
    .notNull()
    .references(() => applicantProfiles.id),
  rawContent: text("raw_content").notNull(),
  contentType: text("content_type").default("text/plain"),
  processingStatus: text("processing_status").default("pending"),
  processingError: text("processing_error"),
  aiResponse: text("ai_response"),
  processedEntries: integer("processed_entries").default(0),
  submittedAt: text("submitted_at").default(sql`CURRENT_TIMESTAMP`),
  processedAt: text("processed_at"),
});

export const jobRatings = sqliteTable("job_ratings", {
  id: text("id").primaryKey(),
  applicantId: text("applicant_id")
    .notNull()
    .references(() => applicantProfiles.id),
  jobId: text("job_id")
    .notNull()
    .references(() => jobs.id),
  overallScore: integer("overall_score"),
  skillMatchScore: integer("skill_match_score"),
  experienceMatchScore: integer("experience_match_score"),
  compensationFitScore: integer("compensation_fit_score"),
  locationFitScore: integer("location_fit_score"),
  companyCultureScore: integer("company_culture_score"),
  growthPotentialScore: integer("growth_potential_score"),
  ratingSummary: text("rating_summary"),
  recommendation: text("recommendation"),
  strengths: text("strengths"),
  gaps: text("gaps"),
  improvementSuggestions: text("improvement_suggestions"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================================
// Monitoring & Tracking Tables
// ============================================================================

export const jobTrackingHistory = sqliteTable("job_tracking_history", {
  id: text("id").primaryKey(),
  jobId: text("job_id").references(() => jobs.id),
  snapshotId: text("snapshot_id").references(() => snapshots.id),
  trackingDate: text("tracking_date").notNull(),
  status: text("status").notNull(),
  contentHash: text("content_hash"),
  titleChanged: integer("title_changed", { mode: "boolean" }).default(false),
  requirementsChanged: integer("requirements_changed", {
    mode: "boolean",
  }).default(false),
  salaryChanged: integer("salary_changed", { mode: "boolean" }).default(false),
  descriptionChanged: integer("description_changed", {
    mode: "boolean",
  }).default(false),
  errorMessage: text("error_message"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const jobMarketStats = sqliteTable("job_market_stats", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  totalJobsTracked: integer("total_jobs_tracked").default(0),
  newJobsFound: integer("new_jobs_found").default(0),
  jobsClosed: integer("jobs_closed").default(0),
  jobsModified: integer("jobs_modified").default(0),
  avgJobDurationDays: real("avg_job_duration_days"),
  topCompanies: text("top_companies"),
  trendingKeywords: text("trending_keywords"),
  salaryStats: text("salary_stats"),
  locationStats: text("location_stats"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================================
// Queue & Processing Tables
// ============================================================================

export const scrapeQueue = sqliteTable("scrape_queue", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  urls: text("urls").notNull(),
  status: text("status").notNull().default("pending"),
  priority: integer("priority").default(0),
  payload: text("payload"),
  availableAt: text("available_at").default(sql`CURRENT_TIMESTAMP`),
  lastClaimedAt: text("last_claimed_at"),
  completedAt: text("completed_at"),
  errorMessage: text("error_message"),
  jobId: text("job_id"),
  jobType: text("job_type"), // CHECK constraint handled in migration
  context: text("context"),
  maxTasks: integer("max_tasks").default(1),
  startedAt: text("started_at"),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  metadata: text("metadata"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const scrapedJobDetails = sqliteTable("scraped_job_details", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  queueId: integer("queue_id").references(() => scrapeQueue.id, {
    onDelete: "set null",
  }),
  jobUrl: text("job_url").notNull(),
  source: text("source"),
  company: text("company"),
  title: text("title"),
  location: text("location"),
  employmentType: text("employment_type"),
  salary: text("salary"),
  applyUrl: text("apply_url"),
  description: text("description"),
  metadata: text("metadata"),
  rawPayload: text("raw_payload"),
  monitoredJobId: text("monitored_job_id").references(() => jobs.id, {
    onDelete: "set null",
  }),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const jobIntakeQueue = sqliteTable("job_intake_queue", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobUrl: text("job_url").notNull(),
  jobTitle: text("job_title"),
  companyName: text("company_name"),
  source: text("source"),
  payloadJson: text("payload_json").notNull(),
  status: text("status").notNull().default("pending"),
  priority: integer("priority").default(0),
  attempts: integer("attempts").notNull().default(0),
  dryRun: integer("dry_run", { mode: "boolean" }).notNull().default(false),
  lastError: text("last_error"),
  queuedAt: text("queued_at").default(sql`CURRENT_TIMESTAMP`),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const jobProcessingQueue = sqliteTable("job_processing_queue", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  source: text("source").notNull(),
  sourceId: text("source_id"),
  status: text("status").notNull().default("pending"),
  jobId: text("job_id").references(() => jobs.id, { onDelete: "set null" }),
  error: text("error"),
  metadata: text("metadata"),
  priority: integer("priority").default(0),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  processingTimeMs: integer("processing_time_ms"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const jobProcessingResults = sqliteTable("job_processing_results", {
  id: text("id").primaryKey(),
  queueId: text("queue_id"),
  jobId: text("job_id").references(() => jobs.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  resultsCount: integer("results_count").default(0),
  processingTimeMs: integer("processing_time_ms"),
  scrapedAt: text("scraped_at").default(sql`CURRENT_TIMESTAMP`),
  errorMessage: text("error_message"),
  rawData: text("raw_data"),
  processedData: text("processed_data"),
  metadata: text("metadata"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================================
// Logging & System Tables
// ============================================================================

export const systemLogs = sqliteTable("system_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  timestamp: text("timestamp")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  source: text("source").notNull(),
  logLevel: text("log_level").notNull().default("INFO"),
  message: text("message"),
  jsonPayload: text("json_payload"),
  context: text("context"),
  requestId: text("request_id"),
  expiresAt: text("expires_at")
    .notNull()
    .default(sql`datetime('now', '+30 days')`),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const testLogs = sqliteTable("test_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull(),
  testName: text("test_name").notNull(),
  success: integer("success", { mode: "boolean" }).notNull(),
  duration: real("duration").notNull(),
  error: text("error"),
  data: text("data"),
  timestamp: text("timestamp").notNull(),
  testType: text("test_type").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const errorLogs = sqliteTable("error_logs", {
  id: text("id").primaryKey(),
  timestamp: text("timestamp").notNull(),
  errorMessage: text("error_message").notNull(),
  stackTrace: text("stack_trace"),
  errorCode: text("error_code"),
  severity: text("severity").notNull(),
  context: text("context"),
  agenticAnalysis: text("agentic_analysis"),
  potentialSolution: text("potential_solution"),
});

// ============================================================================
// Company Intelligence Tables
// ============================================================================

export const companyBenefitsSnapshots = sqliteTable(
  "company_benefits_snapshots",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    source: text("source").notNull(),
    sourceUrl: text("source_url"),
    snapshotText: text("snapshot_text").notNull(),
    parsed: text("parsed"), // JSON
    extractedAt: integer("extracted_at").notNull(),
  }
);

export const benefitsStats = sqliteTable("benefits_stats", {
  companyId: text("company_id")
    .notNull()
    .references(() => companies.id),
  computedAt: integer("computed_at").notNull(),
  highlights: text("highlights"), // JSON
  totalCompHeuristics: text("total_comp_heuristics"), // JSON
  coverage: text("coverage"), // JSON
});

// ============================================================================
// RAG & Embeddings Tables
// ============================================================================

export const assetEmbeddings = sqliteTable("asset_embeddings", {
  id: text("id").primaryKey(),
  uuid: text("uuid").notNull().unique(),
  contentType: text("content_type").notNull(),
  vectorizeIndex: text("vectorize_index").notNull(),
  vectorId: text("vector_id").notNull(),
  contentHash: text("content_hash").notNull(),
  contentPreview: text("content_preview"),
  metadataJson: text("metadata_json"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const embeddingOperations = sqliteTable("embedding_operations", {
  id: text("id").primaryKey(),
  assetUuid: text("asset_uuid").references(() => assetEmbeddings.uuid),
  operationType: text("operation_type").notNull(),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  vectorizeIndex: text("vectorize_index").notNull(),
  vectorId: text("vector_id"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  completedAt: text("completed_at"),
});

export const ragQueries = sqliteTable("rag_queries", {
  id: text("id").primaryKey(),
  queryText: text("query_text").notNull(),
  queryEmbeddingJson: text("query_embedding_json"),
  vectorizeIndex: text("vectorize_index").notNull(),
  resultsJson: text("results_json"),
  userId: text("user_id"),
  sessionId: text("session_id"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const agentRagInteractions = sqliteTable("agent_rag_interactions", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  queryId: text("query_id").references(() => ragQueries.id),
  responseText: text("response_text"),
  contextUsedJson: text("context_used_json"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================================
// Document Tables
// ============================================================================

export const applicantDocuments = sqliteTable("applicant_documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  jobId: text("job_id").references(() => jobs.id),
  docType: text("doc_type").notNull(), // CHECK constraint in migration
  purpose: text("purpose"),
  r2KeyMd: text("r2_key_md"),
  r2UrlMd: text("r2_url_md"),
  r2KeyPdf: text("r2_key_pdf"),
  r2UrlPdf: text("r2_url_pdf"),
  title: text("title"),
  createdAt: text("created_at").default(
    sql`strftime('%Y-%m-%dT%H:%M:%fZ','now')`
  ),
  updatedAt: text("updated_at").default(
    sql`strftime('%Y-%m-%dT%H:%M:%fZ','now')`
  ),
});

export const resumeSections = sqliteTable("resume_sections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  documentId: integer("document_id")
    .notNull()
    .references(() => applicantDocuments.id, { onDelete: "cascade" }),
  summary: text("summary"),
  contact: text("contact"),
  skills: text("skills"),
  experience: text("experience"),
  education: text("education"),
  projects: text("projects"),
  certifications: text("certifications"),
  extras: text("extras"),
});

export const documentEmbeddings = sqliteTable("document_embeddings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  documentId: integer("document_id")
    .notNull()
    .references(() => applicantDocuments.id, { onDelete: "cascade" }),
  model: text("model").notNull(),
  vectorSize: integer("vector_size").notNull(),
  vectorizeId: text("vectorize_id"),
  contentSha256: text("content_sha256").notNull(),
  createdAt: text("created_at").default(
    sql`strftime('%Y-%m-%dT%H:%M:%fZ','now')`
  ),
});

// ============================================================================
// Email Tables
// ============================================================================

export const emailLogs = sqliteTable("email_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  uuid: text("uuid").notNull().unique(),
  fromEmail: text("from_email").notNull(),
  toEmail: text("to_email"),
  subject: text("subject"),
  messageId: text("message_id"),
  dateReceived: text("date_received"),
  contentText: text("content_text"),
  contentHtml: text("content_html"),
  contentPreview: text("content_preview"),
  headers: text("headers"),
  jobLinksExtracted: integer("job_links_extracted").default(0),
  jobsProcessed: integer("jobs_processed").default(0),
  aiFrom: text("ai_from"),
  aiSubject: text("ai_subject"),
  aiBody: text("ai_body"),
  aiCategory: text("ai_category"),
  aiCategoryReasoning: text("ai_category_reasoning"),
  aiJobLinks: text("ai_job_links"),
  aiProcessedAt: text("ai_processed_at"),
  aiProcessingStatus: text("ai_processing_status").default("pending"),
  embeddingsId: text("embeddings_id"),
  embeddingsVector: text("embeddings_vector"),
  otpDetected: integer("otp_detected", { mode: "boolean" }).default(false),
  otpCode: text("otp_code"),
  otpForwardedTo: text("otp_forwarded_to"),
  status: text("status").notNull().default("pending"),
  receivedAt: text("received_at").default(sql`CURRENT_TIMESTAMP`),
  processedAt: text("processed_at"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const emailJobLinks = sqliteTable("email_job_links", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  emailId: integer("email_id")
    .notNull()
    .references(() => emailLogs.id, { onDelete: "cascade" }),
  jobUrl: text("job_url").notNull(),
  status: text("status").default("pending"),
  jobId: text("job_id").references(() => jobs.id, { onDelete: "set null" }),
  processingError: text("processing_error"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const emailTemplates = sqliteTable("email_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  subjectTemplate: text("subject_template").notNull(),
  htmlTemplate: text("html_template").notNull(),
  variables: text("variables"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const otpForwardingLog = sqliteTable("otp_forwarding_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  emailUuid: text("email_uuid").notNull(),
  otpCode: text("otp_code").notNull(),
  forwardedTo: text("forwarded_to").notNull(),
  forwardedAt: text("forwarded_at").default(sql`CURRENT_TIMESTAMP`),
  status: text("status").default("sent"),
});

// ============================================================================
// Additional Profile Tables
// ============================================================================

export const skills = sqliteTable("skills", {
  id: text("id").primaryKey(),
  profileId: text("profile_id")
    .notNull()
    .references(() => applicantProfiles.id, { onDelete: "cascade" }),
  skillName: text("skill_name").notNull(),
  skillCategory: text("skill_category"),
  proficiencyLevel: text("proficiency_level"),
  yearsExperience: integer("years_experience"),
  isConfirmed: integer("is_confirmed", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const careerGoals = sqliteTable("career_goals", {
  id: text("id").primaryKey(),
  profileId: text("profile_id")
    .notNull()
    .references(() => applicantProfiles.id, { onDelete: "cascade" }),
  goalType: text("goal_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: text("target_date"),
  priority: integer("priority").default(1),
  isConfirmed: integer("is_confirmed", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const industryInterests = sqliteTable("industry_interests", {
  id: text("id").primaryKey(),
  profileId: text("profile_id")
    .notNull()
    .references(() => applicantProfiles.id, { onDelete: "cascade" }),
  industryName: text("industry_name").notNull(),
  interestLevel: text("interest_level"),
  notes: text("notes"),
  isConfirmed: integer("is_confirmed", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const salaryGoals = sqliteTable("salary_goals", {
  id: text("id").primaryKey(),
  profileId: text("profile_id")
    .notNull()
    .references(() => applicantProfiles.id, { onDelete: "cascade" }),
  minSalary: integer("min_salary"),
  maxSalary: integer("max_salary"),
  currency: text("currency").default("USD"),
  salaryType: text("salary_type"),
  location: text("location"),
  isConfirmed: integer("is_confirmed", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const profileChanges = sqliteTable("profile_changes", {
  id: text("id").primaryKey(),
  profileId: text("profile_id")
    .notNull()
    .references(() => applicantProfiles.id, { onDelete: "cascade" }),
  changeType: text("change_type").notNull(),
  tableName: text("table_name").notNull(),
  recordId: text("record_id"),
  oldValues: text("old_values"),
  newValues: text("new_values"),
  changeReason: text("change_reason"),
  aiSuggested: integer("ai_suggested", { mode: "boolean" }).default(false),
  isConfirmed: integer("is_confirmed", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const profileApprovals = sqliteTable("profile_approvals", {
  id: text("id").primaryKey(),
  profileId: text("profile_id")
    .notNull()
    .references(() => applicantProfiles.id, { onDelete: "cascade" }),
  changeId: text("change_id")
    .notNull()
    .references(() => profileChanges.id, { onDelete: "cascade" }),
  approverId: text("approver_id"),
  status: text("status").notNull(),
  comments: text("comments"),
  approvedAt: text("approved_at"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const documentAnalysis = sqliteTable("document_analysis", {
  id: text("id").primaryKey(),
  profileId: text("profile_id")
    .notNull()
    .references(() => applicantProfiles.id, { onDelete: "cascade" }),
  documentType: text("document_type").notNull(),
  documentContent: text("document_content").notNull(),
  analysisResults: text("analysis_results"),
  suggestedImprovements: text("suggested_improvements"),
  aiConfidence: real("ai_confidence"),
  isConfirmed: integer("is_confirmed", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const interviewPrepData = sqliteTable("interview_prep_data", {
  id: text("id").primaryKey(),
  profileId: text("profile_id")
    .notNull()
    .references(() => applicantProfiles.id, { onDelete: "cascade" }),
  jobId: text("job_id").references(() => jobs.id),
  prepType: text("prep_type").notNull(),
  questions: text("questions"),
  answers: text("answers"),
  feedback: text("feedback"),
  score: real("score"),
  isConfirmed: integer("is_confirmed", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================================
// Agent & Company Intelligence Tables
// ============================================================================

export const agentActivities = sqliteTable("agent_activities", {
  id: text("id").primaryKey(),
  agentName: text("agent_name").notNull(),
  activityType: text("activity_type").notNull(),
  data: text("data"),
  status: text("status").default("info"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const agentData = sqliteTable("agent_data", {
  agentName: text("agent_name").notNull(),
  key: text("key").notNull(),
  data: text("data").notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const companyProfiles = sqliteTable("company_profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  domain: text("domain"),
  industry: text("industry"),
  size: text("size"),
  location: text("location"),
  founded: text("founded"),
  description: text("description"),
  mission: text("mission"),
  companyValues: text("company_values"),
  culture: text("culture"),
  recentNews: text("recent_news"),
  financials: text("financials"),
  leadership: text("leadership"),
  benefits: text("benefits"),
  interviewInsights: text("interview_insights"),
  lastUpdated: text("last_updated").default(sql`CURRENT_TIMESTAMP`),
  researchCount: integer("research_count").default(1),
});

export const interviewSessions = sqliteTable("interview_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  jobId: text("job_id").notNull(),
  companyId: text("company_id").notNull(),
  sessionType: text("session_type").notNull(),
  status: text("status").default("active"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  lastActivity: text("last_activity").default(sql`CURRENT_TIMESTAMP`),
  strategy: text("strategy"),
  questions: text("questions"),
  answers: text("answers"),
  feedback: text("feedback"),
  score: real("score").default(0),
  notes: text("notes"),
  nextSteps: text("next_steps"),
});

export const resumeOptimizations = sqliteTable("resume_optimizations", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  resumeData: text("resume_data").notNull(),
  jobDescription: text("job_description").notNull(),
  optimizationType: text("optimization_type").notNull(),
  priority: text("priority").default("medium"),
  status: text("status").default("pending"),
  currentStep: text("current_step"),
  results: text("results"),
  feedback: text("feedback"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  completedAt: text("completed_at"),
});

export const jobMonitoring = sqliteTable("job_monitoring", {
  id: text("id").primaryKey(),
  jobId: text("job_id")
    .notNull()
    .references(() => jobs.id),
  agentId: text("agent_id").notNull(),
  status: text("status").default("active"),
  lastChecked: text("last_checked"),
  changeCount: integer("change_count").default(0),
  relevanceScore: real("relevance_score"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================================
// Python Clients Table
// ============================================================================

export const pythonClients = sqliteTable("python_clients", {
  id: text("id").primaryKey(),
  clientName: text("client_name").notNull(),
  clientType: text("client_type").notNull(),
  status: text("status").default("active"),
  lastSeen: text("last_seen").default(sql`CURRENT_TIMESTAMP`),
  lastPoll: text("last_poll"),
  apiKey: text("api_key").notNull(),
  capabilities: text("capabilities"),
  version: text("version"),
  environment: text("environment"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
  errorCount: integer("error_count").default(0),
  successCount: integer("success_count").default(0),
  metadata: text("metadata"),
});

// ============================================================================
// Test Definitions Table
// ============================================================================

export const testDefs = sqliteTable("test_defs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category"),
  severity: text("severity"),
  is_active: integer("is_active").notNull().default(1),
  error_map: text("error_map"),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const testResults = sqliteTable("test_results", {
  id: text("id").primaryKey(),
  session_uuid: text("session_uuid").notNull(),
  test_fk: text("test_fk")
    .notNull()
    .references(() => testDefs.id),
  started_at: text("started_at").notNull(),
  finished_at: text("finished_at"),
  duration_ms: integer("duration_ms"),
  status: text("status").notNull(), // 'pass' | 'fail'
  error_code: text("error_code"),
  raw: text("raw"),
  ai_human_readable_error_description: text(
    "ai_human_readable_error_description"
  ),
  ai_prompt_to_fix_error: text("ai_prompt_to_fix_error"),
});

// ============================================================================
// Type Exports
// ============================================================================

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type Site = InferSelectModel<typeof sites>;
export type NewSite = InferInsertModel<typeof sites>;

export type Job = InferSelectModel<typeof jobs>;
export type NewJob = InferInsertModel<typeof jobs>;

export type Company = InferSelectModel<typeof companies>;
export type NewCompany = InferInsertModel<typeof companies>;

export type ApplicantProfile = InferSelectModel<typeof applicantProfiles>;
export type NewApplicantProfile = InferInsertModel<typeof applicantProfiles>;

// Export all table schemas for use in Kysely Database type
export const schema = {
  sites,
  companies,
  jobs,
  snapshots,
  changes,
  runs,
  searchConfigs,
  emailConfigs,
  agentConfigs,
  taskConfigs,
  workflowConfigs,
  applicantProfiles,
  jobHistory,
  jobHistorySubmissions,
  jobRatings,
  jobTrackingHistory,
  jobMarketStats,
  scrapeQueue,
  scrapedJobDetails,
  jobIntakeQueue,
  jobProcessingQueue,
  jobProcessingResults,
  systemLogs,
  testLogs,
  errorLogs,
  companyBenefitsSnapshots,
  benefitsStats,
  assetEmbeddings,
  embeddingOperations,
  ragQueries,
  agentRagInteractions,
  applicantDocuments,
  resumeSections,
  documentEmbeddings,
  emailLogs,
  emailJobLinks,
  emailTemplates,
  otpForwardingLog,
  skills,
  careerGoals,
  industryInterests,
  salaryGoals,
  profileChanges,
  profileApprovals,
  documentAnalysis,
  interviewPrepData,
  agentActivities,
  agentData,
  companyProfiles,
  interviewSessions,
  resumeOptimizations,
  jobMonitoring,
  pythonClients,
  testDefs,
  testResults,
};
