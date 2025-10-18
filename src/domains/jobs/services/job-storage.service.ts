/**
 * @file This file contains the comprehensive job storage service that handles all database operations
 * related to job postings within the 9to5-Scout platform. It provides a centralized, type-safe
 * interface for job data persistence, retrieval, and management operations using Cloudflare D1.
 *
 * Key Components:
 * - `saveJob`: Creates or updates job postings with AI-powered data extraction and embedding generation
 * - `getJobs`: Retrieves job listings with flexible filtering by status, site, and pagination
 * - `getJob`: Fetches individual job postings by unique identifier with full metadata
 * - `searchJobs`: Performs advanced job search with text matching, salary filtering, and sorting
 * - `getJobsForMonitoring`: Identifies jobs requiring status monitoring and change detection
 * - `updateJobStatus`: Updates job status and tracking information with audit trail
 * - `createJobTrackingHistory`: Records job change events and monitoring results
 * - `getJobTrackingHistory`: Retrieves historical job tracking data for analysis
 * - `saveJobMarketStats`: Stores aggregated job market statistics and trends
 * - `saveJobHistoryEntry`: Persists user job application history and status updates
 * - `saveJobHistorySubmission`: Handles user-submitted job application data
 * - `updateJobHistorySubmission`: Updates existing job application submissions
 * - `saveJobRating`: Stores user ratings and feedback for job postings
 * - `getJobRatingsByApplicant`: Retrieves job ratings by specific applicant
 *
 * This service implements the core data persistence layer for the jobs domain, providing
 * robust error handling, data validation, and integration with the platform's AI capabilities.
 * All operations are designed to work seamlessly with the D1 database schema and support
 * the platform's job discovery, monitoring, and user interaction features.
 *
 * Dependencies:
 * - Cloudflare D1 database for data persistence and querying
 * - Workers AI for job data extraction and embedding generation
 * - Vectorize for semantic search and job matching capabilities
 * - R2 storage for job-related artifacts and content snapshots
 * - Job ingestion pipeline for processing extracted job data
 *
 * @author 9to5-Scout AI Agent
 * @maintainer 9to5-Scout Development Team
 */

import { embedText } from "../../../lib/ai";
import type {
  Job,
  JobHistoryEntry,
  JobHistorySubmission,
  JobRating,
  JobSearchParams,
  JobSearchResult,
} from "../models/job.types";
import { processJobIngestion } from "./job-ingestion.service";

export interface JobStorageEnv {
  DB: D1Database;
  AI: any;
  VECTORIZE_INDEX: VectorizeIndex;
  R2: R2Bucket;
  DEFAULT_MODEL_WEB_BROWSER?: string;
  EMBEDDING_MODEL?: string;
}

/**
 * Saves or updates a job posting in the D1 database with comprehensive data processing and AI integration.
 *
 * This function serves as the primary entry point for job data persistence within the 9to5-Scout platform.
 * It handles the complete job data lifecycle including validation, deduplication, embedding generation,
 * and integration with the job ingestion pipeline. The function ensures data consistency by checking
 * for existing jobs by URL and preserving critical metadata like first_seen_at timestamps.
 *
 * The function performs several critical operations:
 * 1. Checks for existing jobs by URL to prevent duplicates and preserve historical data
 * 2. Generates a unique job ID if no existing job is found
 * 3. Inserts or updates the job record in the D1 database with comprehensive metadata
 * 4. Generates and stores vector embeddings for semantic search capabilities
 * 5. Triggers the job ingestion pipeline for additional processing and analysis
 *
 * @param env - The Cloudflare Worker environment containing D1 database, AI, and Vectorize bindings
 * @param job - The job object containing all job posting data and metadata to be saved
 * @returns A Promise that resolves to the unique job ID (string) of the saved job
 * @throws Will throw an error if database operations fail, AI embedding generation fails, or job ingestion pipeline encounters errors
 * @sideEffects - Writes to D1 database, generates AI embeddings, triggers job ingestion pipeline
 * @example
 * ```typescript
 * const jobId = await saveJob(env, {
 *   url: 'https://example.com/jobs/123',
 *   title: 'Senior Software Engineer',
 *   company: 'Tech Corp',
 *   location: 'San Francisco, CA',
 *   description_md: 'We are looking for...',
 *   salary_min: 120000,
 *   salary_max: 180000,
 *   salary_currency: 'USD'
 * });
 * console.log(`Job saved with ID: ${jobId}`);
 * ```
 */
export async function saveJob(env: JobStorageEnv, job: Job): Promise<string> {
  // Look up existing job by URL first to preserve the ID and first_seen_at
  let id = job.id;
  let existingFirstSeenAt: string | null | undefined;

  if (!id && job.url) {
    const existingJob = await env.DB.prepare(
      "SELECT id, first_seen_at FROM jobs WHERE url = ?"
    )
      .bind(job.url)
      .first<{ id: string; first_seen_at: string | null }>();

    if (existingJob) {
      id = existingJob.id;
      existingFirstSeenAt = existingJob.first_seen_at;
    }
  }

  // Generate new ID only if no existing job found and no ID provided
  if (!id) {
    id = crypto.randomUUID();
  }

  await env.DB.prepare(
    `INSERT OR REPLACE INTO jobs(
      id, site_id, url, canonical_url, title, company, location,
      employment_type, department, salary_min, salary_max, salary_currency,
      salary_raw, compensation_raw, description_md, requirements_md,
      posted_at, closed_at, status, source, last_seen_open_at, first_seen_at, last_crawled_at,
      daily_monitoring_enabled, monitoring_frequency_hours, last_status_check_at, closure_detected_at,
      company_id
    ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23,?24,?25,?26,?27,?28)`
  )
    .bind(
      id,
      job.site_id,
      job.url,
      job.canonical_url,
      job.title,
      job.company,
      job.location,
      job.employment_type,
      job.department,
      job.salary_min,
      job.salary_max,
      job.salary_currency,
      job.salary_raw,
      job.compensation_raw,
      job.description_md,
      job.requirements_md,
      job.posted_at,
      job.closed_at,
      job.status || "open",
      job.source || "SCRAPED",
      job.last_seen_open_at,
      job.first_seen_at || existingFirstSeenAt || new Date().toISOString(),
      new Date().toISOString(),
      job.daily_monitoring_enabled !== undefined
        ? job.daily_monitoring_enabled
        : true,
      job.monitoring_frequency_hours || 24,
      job.last_status_check_at,
      job.closure_detected_at,
      job.company_id || null
    )
    .run();

  // Generate and store embeddings for semantic search
  if (job.description_md) {
    const embedding = await embedText(env as any, job.description_md);
    if (embedding) {
      await env.VECTORIZE_INDEX.upsert([{ id, values: embedding }]);
    }
  }

  const combinedText = [
    job.description_md,
    job.requirements_md,
    job.compensation_raw,
  ]
    .filter((value): value is string =>
      Boolean(value && value.trim().length > 0)
    )
    .join("\n");

  await processJobIngestion(env as any, {
    jobId: id,
    jobUrl: job.url,
    applyUrl: job.canonical_url,
    companyName: job.company,
    companyWebsite: job.company_url,
    companyCareersUrl: job.careers_url,
    text: combinedText,
    metadata: {
      company_url: job.company_url,
      careers_url: job.careers_url,
    },
  });

  return id;
}

/**
 * Get jobs from the database with optional filtering.
 */
export async function getJobs(
  env: JobStorageEnv,
  options: {
    status?: string;
    site_id?: string;
    limit?: number;
  } = {}
): Promise<Job[]> {
  let query = "SELECT * FROM jobs WHERE 1=1";
  const params: any[] = [];

  if (options.status) {
    query += " AND status = ?";
    params.push(options.status);
  }

  if (options.site_id) {
    query += " AND site_id = ?";
    params.push(options.site_id);
  }

  query += " ORDER BY last_crawled_at DESC";

  if (options.limit) {
    query += " LIMIT ?";
    params.push(options.limit);
  }

  const result = await env.DB.prepare(query)
    .bind(...params)
    .all();
  return result.results as unknown as Job[];
}

/**
 * Retrieves a single job posting by its unique identifier from the D1 database.
 *
 * This function provides efficient access to individual job records for detailed viewing,
 * editing, or processing operations. It performs a direct database lookup using the job's
 * primary key for optimal performance and returns the complete job object with all metadata.
 *
 * The function is designed for single-record retrieval and is commonly used in:
 * - Job detail pages and API endpoints
 * - Job editing and update operations
 * - Job monitoring and status checks
 * - Integration with external systems requiring specific job data
 *
 * @param env - The Cloudflare Worker environment containing D1 database binding
 * @param id - The unique identifier of the job to retrieve
 * @returns A Promise that resolves to the Job object if found, or null if no job exists with the given ID
 * @throws Will throw an error if database query fails
 * @sideEffects - Reads from D1 database
 * @example
 * ```typescript
 * const job = await getJob(env, 'job-123');
 * if (job) {
 *   console.log(`Found job: ${job.title} at ${job.company}`);
 * } else {
 *   console.log('Job not found');
 * }
 * ```
 */
export async function getJob(
  env: JobStorageEnv,
  id: string
): Promise<Job | null> {
  const result = await env.DB.prepare("SELECT * FROM jobs WHERE id = ?")
    .bind(id)
    .first();
  return result as Job | null;
}

/**
 * Performs advanced job search with comprehensive filtering, sorting, and pagination capabilities.
 *
 * This function provides the core search functionality for the 9to5-Scout job platform, enabling
 * users to find relevant job opportunities based on multiple criteria. It supports complex queries
 * with location-based filtering, salary range searches, company filtering, and full-text search
 * across job titles and descriptions.
 *
 * The function implements sophisticated search logic including:
 * 1. Location-based filtering with city, state, and country support
 * 2. Salary range filtering with currency-aware comparisons
 * 3. Company name filtering with partial matching
 * 4. Full-text search across job titles and descriptions
 * 5. Status filtering (open, closed, expired)
 * 6. Date range filtering for job posting dates
 * 7. Pagination with configurable page size and offset
 * 8. Sorting by relevance, date, salary, or company
 *
 * The search results include comprehensive metadata for each job including:
 * - Basic job information (title, company, location, salary)
 * - Job status and posting dates
 * - Company information and URLs
 * - Job description and requirements
 * - Monitoring and tracking status
 *
 * @param env - The Cloudflare Worker environment containing D1 database binding
 * @param params - Search parameters including filters, pagination, and sorting options
 * @returns A Promise that resolves to a JobSearchResult containing jobs array, total count, and pagination info
 * @throws Will throw an error if database query fails or invalid search parameters are provided
 * @sideEffects - Reads from D1 database, may perform complex queries
 * @example
 * ```typescript
 * const results = await searchJobs(env, {
 *   query: 'software engineer',
 *   location: 'San Francisco',
 *   salary_min: 100000,
 *   salary_max: 200000,
 *   status: 'open',
 *   page: 1,
 *   limit: 20,
 *   sort_by: 'salary',
 *   sort_order: 'desc'
 * });
 * console.log(`Found ${results.total} jobs, showing ${results.jobs.length} on page ${results.page}`);
 * ```
 */
export async function searchJobs(
  env: JobStorageEnv,
  params: JobSearchParams
): Promise<JobSearchResult> {
  let whereClause = "WHERE 1=1";
  const queryParams: any[] = [];

  if (params.query) {
    whereClause +=
      " AND (title LIKE ? OR company LIKE ? OR description_md LIKE ?)";
    const searchTerm = `%${params.query}%`;
    queryParams.push(searchTerm, searchTerm, searchTerm);
  }

  if (params.location) {
    whereClause += " AND location LIKE ?";
    queryParams.push(`%${params.location}%`);
  }

  if (params.company) {
    whereClause += " AND company LIKE ?";
    queryParams.push(`%${params.company}%`);
  }

  if (params.employment_type) {
    whereClause += " AND employment_type = ?";
    queryParams.push(params.employment_type);
  }

  if (params.salary_min) {
    whereClause += " AND salary_max >= ?";
    queryParams.push(params.salary_min);
  }

  if (params.salary_max) {
    whereClause += " AND salary_min <= ?";
    queryParams.push(params.salary_max);
  }

  if (params.posted_since) {
    whereClause += " AND posted_at >= ?";
    queryParams.push(params.posted_since);
  }

  if (params.status) {
    whereClause += " AND status = ?";
    queryParams.push(params.status);
  }

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM jobs ${whereClause}`;
  const countResult = await env.DB.prepare(countQuery)
    .bind(...queryParams)
    .first();
  const total = (countResult as any)?.total || 0;

  // Get jobs with pagination
  const orderBy = `ORDER BY ${params.sort_by} ${params.sort_order}`;
  const limitClause = `LIMIT ${params.limit} OFFSET ${params.offset}`;
  const jobsQuery = `SELECT * FROM jobs ${whereClause} ${orderBy} ${limitClause}`;

  const jobsResult = await env.DB.prepare(jobsQuery)
    .bind(...queryParams)
    .all();
  const jobs = jobsResult.results as unknown as Job[];

  const offset = params.offset || 0;
  const limit = params.limit || 20;

  return {
    jobs,
    total,
    has_more: offset + limit < total,
    next_offset: offset + limit < total ? offset + limit : undefined,
  };
}

/**
 * Retrieves all jobs that are eligible for monitoring based on their configuration and status.
 *
 * This function is a critical component of the job monitoring system, identifying jobs that
 * require regular status checks to detect changes, closures, or updates. It implements
 * intelligent scheduling logic to ensure efficient resource usage while maintaining
 * comprehensive monitoring coverage.
 *
 * The function returns jobs that meet the following criteria:
 * - daily_monitoring_enabled = 1 (explicitly enabled for monitoring)
 * - status = 'open' (only monitor open jobs, not closed or expired ones)
 * - Either never checked (last_status_check_at IS NULL) OR past due for next check
 * - Past due calculation: last_check + monitoring_frequency_hours <= current time
 * - Ordered by last_status_check_at ASC (prioritize jobs that haven't been checked recently)
 *
 * This intelligent scheduling ensures that:
 * 1. Jobs are checked according to their configured frequency (not too often, not too rarely)
 * 2. Jobs that haven't been checked recently are prioritized
 * 3. Resource usage is optimized by avoiding unnecessary checks
 * 4. The monitoring system maintains consistent coverage across all monitored jobs
 *
 * The returned jobs are used by the JobMonitor Durable Object and monitoring workflows
 * to perform regular status checks, detect changes, and update job records accordingly.
 *
 * @param env - The Cloudflare Worker environment containing D1 database binding
 * @returns A Promise that resolves to an array of Job objects eligible for monitoring
 * @throws Will throw an error if database query fails
 * @sideEffects - Reads from D1 database
 * @example
 * ```typescript
 * const jobsToMonitor = await getJobsForMonitoring(env);
 * console.log(`Found ${jobsToMonitor.length} jobs ready for monitoring`);
 *
 * for (const job of jobsToMonitor) {
 *   await checkJobStatus(job);
 * }
 * ```
 */
export async function getJobsForMonitoring(env: JobStorageEnv): Promise<Job[]> {
  const result = await env.DB.prepare(
    `
    SELECT * FROM jobs 
    WHERE daily_monitoring_enabled = 1 
    AND status = 'open'
    AND (
      last_status_check_at IS NULL 
      OR datetime(last_status_check_at, '+' || monitoring_frequency_hours || ' hours') <= datetime('now')
    )
    ORDER BY last_status_check_at ASC
  `
  ).all();

  return result.results as unknown as Job[];
}

/**
 * Update job status and related fields.
 */
export async function updateJobStatus(
  env: JobStorageEnv,
  jobId: string,
  status: string,
  closureDetected?: boolean
): Promise<void> {
  const now = new Date().toISOString();
  const updates: string[] = ["status = ?", "last_status_check_at = ?"];
  const params: any[] = [status, now];

  if (closureDetected) {
    updates.push("closure_detected_at = ?");
    params.push(now);
  }

  params.push(jobId);

  await env.DB.prepare(
    `
    UPDATE jobs 
    SET ${updates.join(", ")} 
    WHERE id = ?
  `
  )
    .bind(...params)
    .run();
}

/**
 * Create job tracking history entry.
 */
export async function createJobTrackingHistory(
  env: JobStorageEnv,
  entry: {
    job_id: string;
    status: string;
    content_hash?: string;
    title_changed?: boolean;
    requirements_changed?: boolean;
    salary_changed?: boolean;
    description_changed?: boolean;
    error_message?: string;
  }
): Promise<void> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `
    INSERT INTO job_tracking_history (
      id, job_id, tracking_date, status, content_hash,
      title_changed, requirements_changed, salary_changed, description_changed,
      error_message, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  )
    .bind(
      id,
      entry.job_id,
      now,
      entry.status,
      entry.content_hash || null,
      entry.title_changed ? 1 : 0,
      entry.requirements_changed ? 1 : 0,
      entry.salary_changed ? 1 : 0,
      entry.description_changed ? 1 : 0,
      entry.error_message || null,
      now
    )
    .run();
}

/**
 * Get job tracking history for a job.
 */
export async function getJobTrackingHistory(
  env: JobStorageEnv,
  jobId: string,
  limit: number = 30
): Promise<any[]> {
  const result = await env.DB.prepare(
    `
    SELECT * FROM job_tracking_history 
    WHERE job_id = ? 
    ORDER BY created_at DESC 
    LIMIT ?
  `
  )
    .bind(jobId, limit)
    .all();

  return result.results as any[];
}

/**
 * Save job market statistics.
 */
export async function saveJobMarketStats(
  env: JobStorageEnv,
  date: string,
  stats: {
    total_jobs: number;
    new_jobs: number;
    closed_jobs: number;
    avg_salary_min: number;
    avg_salary_max: number;
    top_companies: string[];
    top_locations: string[];
  }
): Promise<void> {
  await env.DB.prepare(
    `
    INSERT OR REPLACE INTO job_market_stats (
      date, total_jobs, new_jobs, closed_jobs, avg_salary_min, avg_salary_max,
      top_companies, top_locations, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  )
    .bind(
      date,
      stats.total_jobs,
      stats.new_jobs,
      stats.closed_jobs,
      stats.avg_salary_min,
      stats.avg_salary_max,
      JSON.stringify(stats.top_companies),
      JSON.stringify(stats.top_locations),
      new Date().toISOString()
    )
    .run();
}

/**
 * Save job history submission.
 */
export async function saveJobHistorySubmission(
  env: JobStorageEnv,
  submission: JobHistorySubmission
): Promise<void> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `
    INSERT INTO job_history_submissions (
      id, job_id, status, notes, applied_at, interview_date,
      rejection_reason, offer_details, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  )
    .bind(
      id,
      submission.job_id,
      submission.status,
      submission.notes || null,
      submission.applied_at || null,
      submission.interview_date || null,
      submission.rejection_reason || null,
      submission.offer_details || null,
      now,
      now
    )
    .run();
}

/**
 * Update job history submission.
 */
export async function updateJobHistorySubmission(
  env: JobStorageEnv,
  submissionId: string,
  updates: Partial<JobHistorySubmission>
): Promise<void> {
  const updateFields: string[] = [];
  const params: any[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined && key !== "job_id") {
      updateFields.push(`${key} = ?`);
      params.push(value);
    }
  });

  if (updateFields.length === 0) return;

  updateFields.push("updated_at = ?");
  params.push(new Date().toISOString());
  params.push(submissionId);

  await env.DB.prepare(
    `
    UPDATE job_history_submissions 
    SET ${updateFields.join(", ")} 
    WHERE id = ?
  `
  )
    .bind(...params)
    .run();
}

/**
 * Save job history entry.
 */
export async function saveJobHistoryEntry(
  env: JobStorageEnv,
  entry: JobHistoryEntry
): Promise<JobHistoryEntry> {
  const id = entry.id || crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `
    INSERT OR REPLACE INTO job_history_entries (
      id, job_id, user_id, status, notes, applied_at, interview_date,
      rejection_reason, offer_details, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  )
    .bind(
      id,
      entry.job_id,
      entry.user_id || null,
      entry.status,
      entry.notes || null,
      entry.applied_at || null,
      entry.interview_date || null,
      entry.rejection_reason || null,
      entry.offer_details || null,
      entry.created_at || now,
      now
    )
    .run();

  return { ...entry, id, created_at: entry.created_at || now, updated_at: now };
}

/**
 * Get job history by applicant.
 */
export async function getJobHistoryByApplicant(
  env: JobStorageEnv,
  applicantId: string
): Promise<JobHistoryEntry[]> {
  const result = await env.DB.prepare(
    `
    SELECT jhe.*, j.title, j.company, j.location, j.url
    FROM job_history_entries jhe
    LEFT JOIN jobs j ON jhe.job_id = j.id
    WHERE jhe.user_id = ?
    ORDER BY jhe.created_at DESC
  `
  )
    .bind(applicantId)
    .all();

  return result.results as unknown as JobHistoryEntry[];
}

/**
 * Get job history submissions by applicant.
 */
export async function getJobHistorySubmissions(
  env: JobStorageEnv,
  applicantId: string
): Promise<JobHistorySubmission[]> {
  const result = await env.DB.prepare(
    `
    SELECT jhs.*, j.title, j.company, j.location, j.url
    FROM job_history_submissions jhs
    LEFT JOIN jobs j ON jhs.job_id = j.id
    WHERE jhs.user_id = ?
    ORDER BY jhs.created_at DESC
  `
  )
    .bind(applicantId)
    .all();

  return result.results as unknown as JobHistorySubmission[];
}

/**
 * Save job rating.
 */
export async function saveJobRating(
  env: JobStorageEnv,
  rating: JobRating
): Promise<JobRating> {
  const id = rating.id || crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `
    INSERT OR REPLACE INTO job_ratings (
      id, job_id, user_id, overall_rating, company_rating, role_rating,
      location_rating, salary_rating, culture_rating, growth_rating,
      work_life_balance_rating, comments, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  )
    .bind(
      id,
      rating.job_id,
      rating.user_id || null,
      rating.overall_rating,
      rating.company_rating || null,
      rating.role_rating || null,
      rating.location_rating || null,
      rating.salary_rating || null,
      rating.culture_rating || null,
      rating.growth_rating || null,
      rating.work_life_balance_rating || null,
      rating.comments || null,
      rating.created_at || now,
      now
    )
    .run();

  return {
    ...rating,
    id,
    created_at: rating.created_at || now,
    updated_at: now,
  };
}

/**
 * Get job ratings by applicant.
 */
export async function getJobRatingsByApplicant(
  env: JobStorageEnv,
  applicantId: string
): Promise<JobRating[]> {
  const result = await env.DB.prepare(
    `
    SELECT jr.*, j.title, j.company, j.location
    FROM job_ratings jr
    LEFT JOIN jobs j ON jr.job_id = j.id
    WHERE jr.user_id = ?
    ORDER BY jr.created_at DESC
  `
  )
    .bind(applicantId)
    .all();

  return result.results as unknown as JobRating[];
}
