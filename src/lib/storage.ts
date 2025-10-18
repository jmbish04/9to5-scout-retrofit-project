/**
 * Data storage utilities for job scraping functionality.
 * Handles database operations for jobs, sites, and related entities.
 */

import { processJobIngestion } from "../domains/jobs/services/job-ingestion.service";
import type {
  ApplicantProfile,
  Job,
  JobHistoryEntry,
  JobHistorySubmission,
  JobRating,
  Run,
  SearchConfig,
  Site,
} from "./types";

export interface StorageEnv {
  DB: D1Database;
  AI: Ai;
  VECTORIZE_INDEX: VectorizeIndex;
  R2: R2Bucket;
  EMBEDDING_MODEL: string;
  DEFAULT_MODEL_WEB_BROWSER: string;
}

/**
 * Save or update a job in the database.
 * Also generates and stores embeddings for semantic search.
 */
export async function saveJob(env: StorageEnv, job: Job): Promise<string> {
  // Look up existing job by URL first to preserve the ID and first_seen_at
  let id = job.id;
  let existingFirstSeenAt: string | undefined;

  if (!id && job.url) {
    const existingJob = await env.DB.prepare(
      "SELECT id, first_seen_at FROM jobs WHERE url = ?"
    )
      .bind(job.url)
      .first<{ id: string; first_seen_at: string | null }>();

    if (existingJob) {
      id = existingJob.id;
      existingFirstSeenAt = existingJob.first_seen_at || undefined;
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
    try {
      const response = await env.AI.run(env.EMBEDDING_MODEL as any, {
        text: job.description_md,
      });
      const embedding = (response as { data?: { embedding: number[] }[] })
        ?.data?.[0]?.embedding;
      if (embedding) {
        await env.VECTORIZE_INDEX.upsert([{ id, values: embedding }]);
      }
    } catch (error) {
      console.error("Error generating embeddings:", error);
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
  env: StorageEnv,
  options: {
    status?: string;
    site_id?: string;
    limit?: number;
  } = {}
): Promise<Job[]> {
  const { status, site_id, limit = 50 } = options;

  let sql = "SELECT * FROM jobs WHERE 1=1";
  const params: any[] = [];

  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }

  if (site_id) {
    sql += " AND site_id = ?";
    params.push(site_id);
  }

  sql += ` ORDER BY first_seen_at DESC LIMIT ${limit}`;

  const stmt = env.DB.prepare(sql);
  const result = await stmt.bind(...params).all();
  return (result.results || []) as unknown as Job[];
}

/**
 * Get a single job by ID.
 */
export async function getJob(env: StorageEnv, id: string): Promise<Job | null> {
  const stmt = env.DB.prepare("SELECT * FROM jobs WHERE id = ?1");
  const result = await stmt.bind(id).first();
  return (result as unknown as Job) || null;
}

/**
 * Alias for getJob to maintain compatibility with job-history route functions.
 */
export const getJobById = getJob;

/**
 * Save a site configuration.
 */
export async function saveSite(env: StorageEnv, site: Site): Promise<string> {
  if (site.id) {
    await updateSite(env, site.id, site);
    return site.id;
  }
  return createSite(env, site);
}

/**
 * Get all sites with optional pagination.
 */
export async function getSites(
  env: StorageEnv,
  options: { limit?: number; offset?: number } = {}
): Promise<Site[]> {
  const { limit = 50, offset = 0 } = options;
  const stmt = env.DB.prepare(
    "SELECT * FROM sites ORDER BY name LIMIT ?1 OFFSET ?2"
  );
  const result = await stmt.bind(limit, offset).all();
  return (result.results || []) as unknown as Site[];
}

/**
 * Get a site by ID.
 */
export async function getSiteById(
  env: StorageEnv,
  id: string
): Promise<Site | null> {
  const result = await env.DB.prepare("SELECT * FROM sites WHERE id = ?1")
    .bind(id)
    .first<Site>();
  return result || null;
}

/**
 * Create a new site record.
 */
export async function createSite(env: StorageEnv, site: Site): Promise<string> {
  const id = site.id || crypto.randomUUID();
  const createdAt = site.created_at || new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO sites(
      id, name, base_url, robots_txt, sitemap_url,
      discovery_strategy, last_discovered_at, created_at
    ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)`
  )
    .bind(
      id,
      site.name,
      site.base_url,
      site.robots_txt ?? null,
      site.sitemap_url ?? null,
      site.discovery_strategy,
      site.last_discovered_at ?? null,
      createdAt
    )
    .run();

  return id;
}

/**
 * Update an existing site.
 */
export async function updateSite(
  env: StorageEnv,
  id: string,
  updates: Partial<Site>
): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.base_url !== undefined) {
    fields.push("base_url = ?");
    values.push(updates.base_url);
  }
  if (updates.robots_txt !== undefined) {
    fields.push("robots_txt = ?");
    values.push(updates.robots_txt ?? null);
  }
  if (updates.sitemap_url !== undefined) {
    fields.push("sitemap_url = ?");
    values.push(updates.sitemap_url ?? null);
  }
  if (updates.discovery_strategy !== undefined) {
    fields.push("discovery_strategy = ?");
    values.push(updates.discovery_strategy);
  }
  if (updates.last_discovered_at !== undefined) {
    fields.push("last_discovered_at = ?");
    values.push(updates.last_discovered_at);
  }

  if (fields.length === 0) {
    return;
  }

  values.push(id);

  await env.DB.prepare(`UPDATE sites SET ${fields.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
}

/**
 * Delete a site by ID.
 */
export async function deleteSite(
  env: StorageEnv,
  id: string
): Promise<boolean> {
  const result = await env.DB.prepare("DELETE FROM sites WHERE id = ?1")
    .bind(id)
    .run();
  return (result as any)?.success !== false;
}

/**
 * Save a search configuration.
 */
export async function saveSearchConfig(
  env: StorageEnv,
  config: SearchConfig
): Promise<string> {
  const id = config.id || crypto.randomUUID();

  await env.DB.prepare(
    `INSERT OR REPLACE INTO search_configs(
      id, name, keywords, locations, include_domains, 
      exclude_domains, min_comp_total, created_at, updated_at
    ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)`
  )
    .bind(
      id,
      config.name,
      config.keywords,
      config.locations,
      config.include_domains,
      config.exclude_domains,
      config.min_comp_total,
      config.created_at || new Date().toISOString(),
      new Date().toISOString()
    )
    .run();

  return id;
}

/**
 * Get all search configurations.
 */
export async function getSearchConfigs(
  env: StorageEnv
): Promise<SearchConfig[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM search_configs ORDER BY name"
  ).all();
  return (result.results || []) as unknown as SearchConfig[];
}

/**
 * Create a new run entry.
 */
export async function createRun(
  env: StorageEnv,
  type: string,
  config_id?: string
): Promise<string> {
  const id = crypto.randomUUID();

  await env.DB.prepare(
    "INSERT INTO runs(id, type, config_id, status) VALUES(?1, ?2, ?3, ?4)"
  )
    .bind(id, type, config_id, "queued")
    .run();

  return id;
}

/**
 * Get recent runs.
 */
export async function getRuns(
  env: StorageEnv,
  limit: number = 20
): Promise<Run[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM runs ORDER BY started_at DESC LIMIT ?1"
  )
    .bind(limit)
    .all();

  return (result.results || []) as unknown as Run[];
}

/**
 * Create a new snapshot with enhanced storage options.
 */
export async function createSnapshot(
  env: StorageEnv,
  snapshot: {
    job_id: string;
    run_id?: string;
    content_hash?: string;
    html_content?: string;
    json_content?: string;
    screenshot_data?: ArrayBuffer;
    pdf_data?: ArrayBuffer;
    markdown_content?: string;
    http_status?: number;
    etag?: string;
  }
): Promise<string> {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  // Store content in R2 and get keys
  const r2Keys: {
    html_r2_key?: string;
    json_r2_key?: string;
    screenshot_r2_key?: string;
    pdf_r2_key?: string;
    markdown_r2_key?: string;
  } = {};

  if (snapshot.html_content) {
    const key = `snapshots/${snapshot.job_id}/${id}/page.html`;
    await env.R2.put(key, snapshot.html_content, {
      httpMetadata: { contentType: "text/html" },
    });
    r2Keys.html_r2_key = key;
  }

  if (snapshot.json_content) {
    const key = `snapshots/${snapshot.job_id}/${id}/data.json`;
    await env.R2.put(key, snapshot.json_content, {
      httpMetadata: { contentType: "application/json" },
    });
    r2Keys.json_r2_key = key;
  }

  if (snapshot.screenshot_data) {
    const key = `snapshots/${snapshot.job_id}/${id}/screenshot.png`;
    await env.R2.put(key, snapshot.screenshot_data, {
      httpMetadata: { contentType: "image/png" },
    });
    r2Keys.screenshot_r2_key = key;
  }

  if (snapshot.pdf_data) {
    const key = `snapshots/${snapshot.job_id}/${id}/render.pdf`;
    await env.R2.put(key, snapshot.pdf_data, {
      httpMetadata: { contentType: "application/pdf" },
    });
    r2Keys.pdf_r2_key = key;
  }

  if (snapshot.markdown_content) {
    const key = `snapshots/${snapshot.job_id}/${id}/extract.md`;
    await env.R2.put(key, snapshot.markdown_content, {
      httpMetadata: { contentType: "text/markdown" },
    });
    r2Keys.markdown_r2_key = key;
  }

  // Save snapshot record to database
  await env.DB.prepare(
    `INSERT INTO snapshots(
      id, job_id, run_id, content_hash, html_r2_key, json_r2_key, 
      screenshot_r2_key, pdf_r2_key, markdown_r2_key, fetched_at, http_status, etag
    ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)`
  )
    .bind(
      id,
      snapshot.job_id,
      snapshot.run_id,
      snapshot.content_hash,
      r2Keys.html_r2_key,
      r2Keys.json_r2_key,
      r2Keys.screenshot_r2_key,
      r2Keys.pdf_r2_key,
      r2Keys.markdown_r2_key,
      timestamp,
      snapshot.http_status,
      snapshot.etag
    )
    .run();

  return id;
}

/**
 * Get jobs that need daily monitoring.
 */
export async function getJobsForMonitoring(env: StorageEnv): Promise<Job[]> {
  const result = await env.DB.prepare(
    `
    SELECT * FROM jobs 
    WHERE daily_monitoring_enabled = 1 
    AND status = 'open'
    AND (
      last_status_check_at IS NULL 
      OR datetime(last_status_check_at, '+' || monitoring_frequency_hours || ' hours') <= datetime('now')
    )
    ORDER BY last_status_check_at ASC NULLS FIRST
  `
  ).all();

  return (result.results || []) as unknown as Job[];
}

/**
 * Update job status and monitoring timestamp.
 */
export async function updateJobStatus(
  env: StorageEnv,
  jobId: string,
  status: string,
  closureDetected?: boolean
): Promise<void> {
  const now = new Date().toISOString();

  if (closureDetected) {
    await env.DB.prepare(
      "UPDATE jobs SET status = ?, last_status_check_at = ?, closure_detected_at = ? WHERE id = ?"
    )
      .bind(status, now, now, jobId)
      .run();
  } else {
    await env.DB.prepare(
      "UPDATE jobs SET status = ?, last_status_check_at = ? WHERE id = ?"
    )
      .bind(status, now, jobId)
      .run();
  }
}

/**
 * Create job tracking history entry.
 */
export async function createJobTrackingHistory(
  env: StorageEnv,
  entry: {
    job_id: string;
    snapshot_id?: string;
    tracking_date: string;
    status: string;
    content_hash?: string;
    title_changed?: boolean;
    requirements_changed?: boolean;
    salary_changed?: boolean;
    description_changed?: boolean;
    error_message?: string;
  }
): Promise<string> {
  const id = crypto.randomUUID();

  await env.DB.prepare(
    `INSERT INTO job_tracking_history(
      id, job_id, snapshot_id, tracking_date, status, content_hash,
      title_changed, requirements_changed, salary_changed, description_changed, error_message
    ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)`
  )
    .bind(
      id,
      entry.job_id,
      entry.snapshot_id,
      entry.tracking_date,
      entry.status,
      entry.content_hash,
      entry.title_changed || false,
      entry.requirements_changed || false,
      entry.salary_changed || false,
      entry.description_changed || false,
      entry.error_message
    )
    .run();

  return id;
}

/**
 * Get job tracking history for a specific job.
 */
export async function getJobTrackingHistory(
  env: StorageEnv,
  jobId: string,
  limit: number = 30
): Promise<any[]> {
  const result = await env.DB.prepare(
    `
    SELECT 
      jth.*,
      s.html_r2_key,
      s.pdf_r2_key,
      s.markdown_r2_key,
      s.fetched_at as snapshot_fetched_at
    FROM job_tracking_history jth
    LEFT JOIN snapshots s ON jth.snapshot_id = s.id
    WHERE jth.job_id = ?
    ORDER BY jth.tracking_date DESC, jth.created_at DESC
    LIMIT ?
  `
  )
    .bind(jobId, limit)
    .all();

  return result.results || [];
}

/**
 * Create or update daily job market statistics.
 */
export async function saveJobMarketStats(
  env: StorageEnv,
  date: string,
  stats: {
    total_jobs_tracked: number;
    new_jobs_found: number;
    jobs_closed: number;
    jobs_modified: number;
    avg_job_duration_days?: number;
    top_companies?: any;
    trending_keywords?: any;
    salary_stats?: any;
    location_stats?: any;
  }
): Promise<void> {
  await env.DB.prepare(
    `INSERT OR REPLACE INTO job_market_stats(
      id, date, total_jobs_tracked, new_jobs_found, jobs_closed, jobs_modified,
      avg_job_duration_days, top_companies, trending_keywords, salary_stats, location_stats
    ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)`
  )
    .bind(
      crypto.randomUUID(),
      date,
      stats.total_jobs_tracked,
      stats.new_jobs_found,
      stats.jobs_closed,
      stats.jobs_modified,
      stats.avg_job_duration_days,
      stats.top_companies ? JSON.stringify(stats.top_companies) : null,
      stats.trending_keywords ? JSON.stringify(stats.trending_keywords) : null,
      stats.salary_stats ? JSON.stringify(stats.salary_stats) : null,
      stats.location_stats ? JSON.stringify(stats.location_stats) : null
    )
    .run();
}

// Job History and Applicant Profile Functions

/**
 * Get an applicant profile by user ID.
 */
export async function getApplicantProfile(
  env: StorageEnv,
  userId: string
): Promise<ApplicantProfile | null> {
  const result = await env.DB.prepare(
    "SELECT * FROM applicant_profiles WHERE user_id = ?"
  )
    .bind(userId)
    .first();

  if (!result) return null;

  return {
    ...result,
    target_roles:
      result.target_roles && typeof result.target_roles === "string"
        ? JSON.parse(result.target_roles)
        : [],
    skills:
      result.skills && typeof result.skills === "string"
        ? JSON.parse(result.skills)
        : [],
    preferences:
      result.preferences && typeof result.preferences === "string"
        ? JSON.parse(result.preferences)
        : {},
  } as ApplicantProfile;
}

/**
 * Create a new applicant profile.
 */
export async function createApplicantProfile(
  env: StorageEnv,
  userId: string
): Promise<ApplicantProfile> {
  const id = crypto.randomUUID();
  const profile: ApplicantProfile = {
    id,
    user_id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await env.DB.prepare(
    `
    INSERT INTO applicant_profiles (id, user_id, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `
  )
    .bind(id, userId, profile.created_at, profile.updated_at)
    .run();

  return profile;
}

/**
 * Update an applicant profile.
 */
export async function updateApplicantProfile(
  env: StorageEnv,
  applicantId: string,
  updates: Partial<ApplicantProfile>
): Promise<void> {
  const setClause = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && key !== "id" && key !== "user_id") {
      setClause.push(`${key} = ?`);
      if (Array.isArray(value) || typeof value === "object") {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
    }
  }

  if (setClause.length === 0) return;

  setClause.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(applicantId);

  await env.DB.prepare(
    `
    UPDATE applicant_profiles 
    SET ${setClause.join(", ")} 
    WHERE id = ?
  `
  )
    .bind(...values)
    .run();
}

/**
 * Save a job history submission.
 */
export async function saveJobHistorySubmission(
  env: StorageEnv,
  submission: JobHistorySubmission
): Promise<void> {
  await env.DB.prepare(
    `
    INSERT INTO job_history_submissions 
    (id, applicant_id, raw_content, content_type, processing_status, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `
  )
    .bind(
      submission.id,
      submission.applicant_id,
      submission.raw_content,
      submission.content_type,
      submission.processing_status,
      submission.submitted_at
    )
    .run();
}

/**
 * Update a job history submission.
 */
export async function updateJobHistorySubmission(
  env: StorageEnv,
  submissionId: string,
  updates: Partial<JobHistorySubmission>
): Promise<void> {
  const setClause = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && key !== "id") {
      setClause.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (setClause.length === 0) return;

  values.push(submissionId);

  await env.DB.prepare(
    `
    UPDATE job_history_submissions 
    SET ${setClause.join(", ")} 
    WHERE id = ?
  `
  )
    .bind(...values)
    .run();
}

/**
 * Save a job history entry.
 */
export async function saveJobHistoryEntry(
  env: StorageEnv,
  entry: JobHistoryEntry
): Promise<JobHistoryEntry> {
  const id = entry.id || crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `
    INSERT INTO job_history 
    (id, applicant_id, company_name, job_title, department, employment_type, 
     start_date, end_date, is_current, location, salary_min, salary_max, 
     salary_currency, responsibilities, achievements, skills_used, technologies, 
     keywords, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  )
    .bind(
      id,
      entry.applicant_id,
      entry.company_name,
      entry.job_title,
      entry.department,
      entry.employment_type,
      entry.start_date,
      entry.end_date,
      entry.is_current ? 1 : 0,
      entry.location,
      entry.salary_min,
      entry.salary_max,
      entry.salary_currency,
      entry.responsibilities,
      entry.achievements,
      entry.skills_used ? JSON.stringify(entry.skills_used) : null,
      entry.technologies ? JSON.stringify(entry.technologies) : null,
      entry.keywords ? JSON.stringify(entry.keywords) : null,
      now,
      now
    )
    .run();

  return { ...entry, id, created_at: now, updated_at: now };
}

/**
 * Get job history by applicant ID.
 */
export async function getJobHistoryByApplicant(
  env: StorageEnv,
  applicantId: string
): Promise<JobHistoryEntry[]> {
  const results = await env.DB.prepare(
    "SELECT * FROM job_history WHERE applicant_id = ? ORDER BY start_date DESC"
  )
    .bind(applicantId)
    .all();

  return results.results.map(
    (row: any): JobHistoryEntry => ({
      id: row.id,
      applicant_id: row.applicant_id,
      company_name: row.company_name,
      job_title: row.job_title,
      department: row.department,
      employment_type: row.employment_type,
      start_date: row.start_date,
      end_date: row.end_date,
      location: row.location,
      salary_min: row.salary_min,
      salary_max: row.salary_max,
      salary_currency: row.salary_currency,
      responsibilities: row.responsibilities,
      achievements: row.achievements,
      created_at: row.created_at,
      updated_at: row.updated_at,
      is_current: Boolean(row.is_current),
      skills_used: row.skills_used ? JSON.parse(row.skills_used) : [],
      technologies: row.technologies ? JSON.parse(row.technologies) : [],
      keywords: row.keywords ? JSON.parse(row.keywords) : [],
    })
  );
}

/**
 * Get job history submissions by applicant ID.
 */
export async function getJobHistorySubmissions(
  env: StorageEnv,
  applicantId: string
): Promise<JobHistorySubmission[]> {
  const results = await env.DB.prepare(
    "SELECT * FROM job_history_submissions WHERE applicant_id = ? ORDER BY submitted_at DESC"
  )
    .bind(applicantId)
    .all();

  return (results.results || []) as unknown as JobHistorySubmission[];
}

/**
 * Save or update a job rating.
 */
export async function saveJobRating(
  env: StorageEnv,
  rating: JobRating
): Promise<JobRating> {
  const id = rating.id || crypto.randomUUID();
  const now = new Date().toISOString();

  // Use INSERT ... ON CONFLICT for a safe upsert
  await env.DB.prepare(
    `
    INSERT INTO job_ratings 
    (id, applicant_id, job_id, overall_score, skill_match_score, experience_match_score,
     compensation_fit_score, location_fit_score, company_culture_score, growth_potential_score,
     rating_summary, recommendation, strengths, gaps, improvement_suggestions,
     created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(applicant_id, job_id) DO UPDATE SET
      overall_score = excluded.overall_score,
      skill_match_score = excluded.skill_match_score,
      experience_match_score = excluded.experience_match_score,
      compensation_fit_score = excluded.compensation_fit_score,
      location_fit_score = excluded.location_fit_score,
      company_culture_score = excluded.company_culture_score,
      growth_potential_score = excluded.growth_potential_score,
      rating_summary = excluded.rating_summary,
      recommendation = excluded.recommendation,
      strengths = excluded.strengths,
      gaps = excluded.gaps,
      improvement_suggestions = excluded.improvement_suggestions,
      updated_at = excluded.updated_at
  `
  )
    .bind(
      id,
      rating.applicant_id,
      rating.job_id,
      rating.overall_score,
      rating.skill_match_score,
      rating.experience_match_score,
      rating.compensation_fit_score,
      rating.location_fit_score,
      rating.company_culture_score,
      rating.growth_potential_score,
      rating.rating_summary,
      rating.recommendation,
      rating.strengths ? JSON.stringify(rating.strengths) : null,
      rating.gaps ? JSON.stringify(rating.gaps) : null,
      rating.improvement_suggestions,
      now,
      now
    )
    .run();

  return { ...rating, id, created_at: now, updated_at: now };
}

/**
 * Get job ratings by applicant ID.
 */
export async function getJobRatingsByApplicant(
  env: StorageEnv,
  applicantId: string
): Promise<JobRating[]> {
  const results = await env.DB.prepare(
    `
    SELECT jr.*, j.title as job_title, j.company as job_company, j.url as job_url
    FROM job_ratings jr
    JOIN jobs j ON jr.job_id = j.id
    WHERE jr.applicant_id = ?
    ORDER BY jr.overall_score DESC
  `
  )
    .bind(applicantId)
    .all();

  return results.results.map((row: any) => ({
    ...row,
    strengths: row.strengths ? JSON.parse(row.strengths) : [],
    gaps: row.gaps ? JSON.parse(row.gaps) : [],
  })) as JobRating[];
}
