/**
 * Shared type definitions for job scraping functionality.
 * These types align with the database schema and API contracts.
 */

export interface Job {
  id?: string;
  site_id?: string;
  url: string;
  canonical_url?: string;
  title?: string;
  company?: string;
  location?: string;
  employment_type?: string;
  department?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_raw?: string;
  compensation_raw?: string;
  description_md?: string;
  requirements_md?: string;
  posted_at?: string;
  closed_at?: string;
  status?: string;
  last_seen_open_at?: string;
  first_seen_at?: string;
  last_crawled_at?: string;
}

export interface Site {
  id: string;
  name: string;
  base_url: string;
  robots_txt?: string;
  sitemap_url?: string;
  discovery_strategy: string;
  last_discovered_at?: string;
  created_at?: string;
}

export interface SearchConfig {
  id: string;
  name: string;
  keywords: string;
  locations?: string;
  include_domains?: string;
  exclude_domains?: string;
  min_comp_total?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Run {
  id: string;
  type: string;
  config_id?: string;
  started_at?: string;
  finished_at?: string;
  status?: string;
  stats_json?: string;
}

export interface Snapshot {
  id: string;
  job_id: string;
  run_id?: string;
  content_hash?: string;
  html_r2_key?: string;
  json_r2_key?: string;
  screenshot_r2_key?: string;
  fetched_at?: string;
  http_status?: number;
  etag?: string;
}

export interface Change {
  id: string;
  job_id: string;
  from_snapshot_id?: string;
  to_snapshot_id?: string;
  diff_json: string;
  semantic_summary?: string;
  changed_at?: string;
}