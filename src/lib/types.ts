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
  source?: 'SCRAPED' | 'EMAIL' | 'MANUAL';
  last_seen_open_at?: string;
  first_seen_at?: string;
  last_crawled_at?: string;
  daily_monitoring_enabled?: boolean;
  monitoring_frequency_hours?: number;
  last_status_check_at?: string;
  closure_detected_at?: string;
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
  pdf_r2_key?: string;
  markdown_r2_key?: string;
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

export interface EmailConfig {
  id: string;
  name: string;
  enabled: boolean;
  frequency_hours: number;
  recipient_email: string;
  include_new_jobs: boolean;
  include_job_changes: boolean;
  include_statistics: boolean;
  last_sent_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EmailLog {
  id: string;
  from_email: string;
  subject?: string;
  content_preview?: string;
  job_links_extracted: number;
  jobs_processed: number;
  received_at?: string;
  processed_at?: string;
  status: 'pending' | 'processed' | 'failed';
}

// Job History Management Types
export interface ApplicantProfile {
  id?: string;
  user_id: string;
  name?: string;
  email?: string;
  phone?: string;
  current_title?: string;
  target_roles?: string[]; // Array of target job titles
  years_experience?: number;
  education_level?: string;
  skills?: string[]; // Array of skills
  preferences?: {
    locations?: string[];
    salary_min?: number;
    salary_max?: number;
    employment_types?: string[];
    remote_preference?: 'required' | 'preferred' | 'no_preference';
  };
  created_at?: string;
  updated_at?: string;
}

export interface JobHistoryEntry {
  id?: string;
  applicant_id: string;
  company_name: string;
  job_title: string;
  department?: string;
  employment_type?: string;
  start_date?: string; // ISO date format
  end_date?: string; // ISO date format, null if current
  is_current?: boolean;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  responsibilities?: string; // Markdown formatted
  achievements?: string; // Markdown formatted  
  skills_used?: string[]; // Array of skills used in this role
  technologies?: string[]; // Array of technologies/tools used
  keywords?: string[]; // Array of extracted keywords for matching
  created_at?: string;
  updated_at?: string;
}

export interface JobHistorySubmission {
  id?: string;
  applicant_id: string;
  raw_content: string;
  content_type?: string;
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
  processing_error?: string;
  ai_response?: string;
  processed_entries?: number;
  submitted_at?: string;
  processed_at?: string;
}

export interface JobRating {
  id?: string;
  applicant_id: string;
  job_id: string;
  overall_score?: number; // 1-100
  skill_match_score?: number; // 1-100
  experience_match_score?: number; // 1-100
  compensation_fit_score?: number; // 1-100
  location_fit_score?: number; // 1-100
  company_culture_score?: number; // 1-100
  growth_potential_score?: number; // 1-100
  rating_summary?: string;
  recommendation?: 'Strong Match' | 'Good Fit' | 'Consider' | 'Pass';
  strengths?: string[]; // Array of candidate strengths
  gaps?: string[]; // Array of skill/experience gaps
  improvement_suggestions?: string;
  created_at?: string;
  updated_at?: string;
}

export interface JobHistoryRequest {
  user_id: string;
  raw_content: string;
  content_type?: 'text/plain' | 'text/markdown' | 'application/json';
}

// Enhanced Job Tracking Types
export interface JobTrackingHistory {
  id?: string;
  job_id: string;
  snapshot_id?: string;
  tracking_date: string; // YYYY-MM-DD format
  status: 'open' | 'closed' | 'modified' | 'error';
  content_hash?: string;
  title_changed?: boolean;
  requirements_changed?: boolean;
  salary_changed?: boolean;
  description_changed?: boolean;
  error_message?: string;
  created_at?: string;
}

export interface JobMarketStats {
  id?: string;
  date: string; // YYYY-MM-DD format
  total_jobs_tracked?: number;
  new_jobs_found?: number;
  jobs_closed?: number;
  jobs_modified?: number;
  avg_job_duration_days?: number;
  top_companies?: string; // JSON array
  trending_keywords?: string; // JSON array
  salary_stats?: string; // JSON object
  location_stats?: string; // JSON object
  created_at?: string;
}

export interface DailyMonitoringResult {
  date: string;
  jobs_checked: number;
  jobs_modified: number;
  jobs_closed: number;
  errors: number;
  snapshots_created: number;
  pdfs_generated: number;
  markdown_extracts: number;
}