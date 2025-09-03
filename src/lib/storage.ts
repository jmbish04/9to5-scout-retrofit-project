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
  const id = job.id || crypto.randomUUID();
  
  await env.DB.prepare(
    `INSERT OR REPLACE INTO jobs(
      id, site_id, url, canonical_url, title, company, location, 
      employment_type, department, salary_min, salary_max, salary_currency, 
      salary_raw, compensation_raw, description_md, requirements_md, 
      posted_at, closed_at, status, last_seen_open_at, first_seen_at, last_crawled_at
    ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22)`
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
      job.last_seen_open_at,
      job.first_seen_at || new Date().toISOString(),
      new Date().toISOString()
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