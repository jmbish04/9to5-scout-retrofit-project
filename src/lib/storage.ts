/**
 * Data storage utilities for job scraping functionality.
 * Handles database operations for jobs, sites, and related entities.
 */

import type { Job, Site, SearchConfig, Run } from './types';
import { embedText } from './ai';

export interface StorageEnv {
  DB: any;
  AI: any;
  VECTORIZE_INDEX: any;
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
      'SELECT id, first_seen_at FROM jobs WHERE url = ?'
    ).bind(job.url).first();
    
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
      daily_monitoring_enabled, monitoring_frequency_hours, last_status_check_at, closure_detected_at
    ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23,?24,?25,?26,?27)`
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
      job.status || 'open',
      job.source || 'SCRAPED',
      job.last_seen_open_at,
      job.first_seen_at || existingFirstSeenAt || new Date().toISOString(),
      new Date().toISOString(),
      job.daily_monitoring_enabled !== undefined ? job.daily_monitoring_enabled : true,
      job.monitoring_frequency_hours || 24,
      job.last_status_check_at,
      job.closure_detected_at
    )
    .run();

  // Generate and store embeddings for semantic search
  if (job.description_md) {
    const embedding = await embedText(env, job.description_md);
    if (embedding) {
      await env.VECTORIZE_INDEX.upsert([{ id, values: embedding }]);
    }
  }

  return id;
}

/**
 * Get jobs from the database with optional filtering.
 */
export async function getJobs(env: StorageEnv, options: {
  status?: string;
  site_id?: string;
  limit?: number;
} = {}): Promise<Job[]> {
  const { status, site_id, limit = 50 } = options;
  
  let sql = 'SELECT * FROM jobs WHERE 1=1';
  const params: any[] = [];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  
  if (site_id) {
    sql += ' AND site_id = ?';
    params.push(site_id);
  }

  sql += ` ORDER BY first_seen_at DESC LIMIT ${limit}`;

  const stmt = env.DB.prepare(sql);
  const result = await stmt.bind(...params).all();
  return result.results || [];
}

/**
 * Get a single job by ID.
 */
export async function getJob(env: StorageEnv, id: string): Promise<Job | null> {
  const stmt = env.DB.prepare('SELECT * FROM jobs WHERE id = ?1');
  const result = await stmt.bind(id).first();
  return result || null;
}

/**
 * Save a site configuration.
 */
export async function saveSite(env: StorageEnv, site: Site): Promise<string> {
  const id = site.id || crypto.randomUUID();
  
  await env.DB.prepare(
    `INSERT OR REPLACE INTO sites(
      id, name, base_url, robots_txt, sitemap_url, 
      discovery_strategy, last_discovered_at, created_at
    ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)`
  )
    .bind(
      id,
      site.name,
      site.base_url,
      site.robots_txt,
      site.sitemap_url,
      site.discovery_strategy,
      site.last_discovered_at,
      site.created_at || new Date().toISOString()
    )
    .run();

  return id;
}

/**
 * Get all sites.
 */
export async function getSites(env: StorageEnv): Promise<Site[]> {
  const result = await env.DB.prepare('SELECT * FROM sites ORDER BY name').all();
  return result.results || [];
}

/**
 * Save a search configuration.
 */
export async function saveSearchConfig(env: StorageEnv, config: SearchConfig): Promise<string> {
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
export async function getSearchConfigs(env: StorageEnv): Promise<SearchConfig[]> {
  const result = await env.DB.prepare('SELECT * FROM search_configs ORDER BY name').all();
  return result.results || [];
}

/**
 * Create a new run entry.
 */
export async function createRun(env: StorageEnv, type: string, config_id?: string): Promise<string> {
  const id = crypto.randomUUID();
  
  await env.DB.prepare(
    'INSERT INTO runs(id, type, config_id, status) VALUES(?1, ?2, ?3, ?4)'
  )
    .bind(id, type, config_id, 'queued')
    .run();

  return id;
}

/**
 * Get recent runs.
 */
export async function getRuns(env: StorageEnv, limit: number = 20): Promise<Run[]> {
  const result = await env.DB.prepare(
    'SELECT * FROM runs ORDER BY started_at DESC LIMIT ?1'
  ).bind(limit).all();
  
  return result.results || [];
}

/**
 * Create a new snapshot with enhanced storage options.
 */
export async function createSnapshot(env: StorageEnv, snapshot: {
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
}): Promise<string> {
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
      httpMetadata: { contentType: 'text/html' }
    });
    r2Keys.html_r2_key = key;
  }

  if (snapshot.json_content) {
    const key = `snapshots/${snapshot.job_id}/${id}/data.json`;
    await env.R2.put(key, snapshot.json_content, {
      httpMetadata: { contentType: 'application/json' }
    });
    r2Keys.json_r2_key = key;
  }

  if (snapshot.screenshot_data) {
    const key = `snapshots/${snapshot.job_id}/${id}/screenshot.png`;
    await env.R2.put(key, snapshot.screenshot_data, {
      httpMetadata: { contentType: 'image/png' }
    });
    r2Keys.screenshot_r2_key = key;
  }

  if (snapshot.pdf_data) {
    const key = `snapshots/${snapshot.job_id}/${id}/render.pdf`;
    await env.R2.put(key, snapshot.pdf_data, {
      httpMetadata: { contentType: 'application/pdf' }
    });
    r2Keys.pdf_r2_key = key;
  }

  if (snapshot.markdown_content) {
    const key = `snapshots/${snapshot.job_id}/${id}/extract.md`;
    await env.R2.put(key, snapshot.markdown_content, {
      httpMetadata: { contentType: 'text/markdown' }
    });
    r2Keys.markdown_r2_key = key;
  }

  // Save snapshot record to database
  await env.DB.prepare(
    `INSERT INTO snapshots(
      id, job_id, run_id, content_hash, html_r2_key, json_r2_key, 
      screenshot_r2_key, pdf_r2_key, markdown_r2_key, fetched_at, http_status, etag
    ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)`
  ).bind(
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
  ).run();

  return id;
}

/**
 * Get jobs that need daily monitoring.
 */
export async function getJobsForMonitoring(env: StorageEnv): Promise<Job[]> {
  const result = await env.DB.prepare(`
    SELECT * FROM jobs 
    WHERE daily_monitoring_enabled = 1 
    AND status = 'open'
    AND (
      last_status_check_at IS NULL 
      OR datetime(last_status_check_at, '+' || monitoring_frequency_hours || ' hours') <= datetime('now')
    )
    ORDER BY last_status_check_at ASC NULLS FIRST
  `).all();
  
  return result.results || [];
}

/**
 * Update job status and monitoring timestamp.
 */
export async function updateJobStatus(env: StorageEnv, jobId: string, status: string, closureDetected?: boolean): Promise<void> {
  const now = new Date().toISOString();
  
  if (closureDetected) {
    await env.DB.prepare(
      'UPDATE jobs SET status = ?, last_status_check_at = ?, closure_detected_at = ? WHERE id = ?'
    ).bind(status, now, now, jobId).run();
  } else {
    await env.DB.prepare(
      'UPDATE jobs SET status = ?, last_status_check_at = ? WHERE id = ?'
    ).bind(status, now, jobId).run();
  }
}

/**
 * Create job tracking history entry.
 */
export async function createJobTrackingHistory(env: StorageEnv, entry: {
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
}): Promise<string> {
  const id = crypto.randomUUID();
  
  await env.DB.prepare(
    `INSERT INTO job_tracking_history(
      id, job_id, snapshot_id, tracking_date, status, content_hash,
      title_changed, requirements_changed, salary_changed, description_changed, error_message
    ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)`
  ).bind(
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
  ).run();

  return id;
}

/**
 * Get job tracking history for a specific job.
 */
export async function getJobTrackingHistory(env: StorageEnv, jobId: string, limit: number = 30): Promise<any[]> {
  const result = await env.DB.prepare(`
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
  `).bind(jobId, limit).all();
  
  return result.results || [];
}

/**
 * Create or update daily job market statistics.
 */
export async function saveJobMarketStats(env: StorageEnv, date: string, stats: {
  total_jobs_tracked: number;
  new_jobs_found: number;
  jobs_closed: number;
  jobs_modified: number;
  avg_job_duration_days?: number;
  top_companies?: any;
  trending_keywords?: any;
  salary_stats?: any;
  location_stats?: any;
}): Promise<void> {
  await env.DB.prepare(
    `INSERT OR REPLACE INTO job_market_stats(
      id, date, total_jobs_tracked, new_jobs_found, jobs_closed, jobs_modified,
      avg_job_duration_days, top_companies, trending_keywords, salary_stats, location_stats
    ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)`
  ).bind(
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
  ).run();
}