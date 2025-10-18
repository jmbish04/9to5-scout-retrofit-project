/**
 * @fileoverview Talent API Integration Types
 *
 * Type definitions for talent API integration including job search,
 * salary parsing, and result mapping functionality.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * Talent service environment configuration
 */
export interface TalentServiceEnv {
  SERPAPI_API_KEY: string;
  USAGE_TRACKER: KVNamespace;
  DB: D1Database;
}

/**
 * Job search result interface
 */
export interface JobSearchResult {
  company_name: string;
  job_title: string;
  job_location: string;
  employment_type?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_raw?: string;
  job_description?: string;
  posted_date?: string;
  source_url: string;
  url: string;
}

/**
 * Job search response interface
 */
export interface JobSearchResponse {
  provider: string;
  count: number;
  results: JobSearchResult[];
  error?: string;
  query: string;
  location?: string;
  timestamp: string;
}

/**
 * Job search parameters interface
 */
export interface JobSearchParams {
  query: string;
  location?: string;
  limit?: number;
  salary_min?: number;
  salary_max?: number;
  employment_type?: string;
  date_posted?: "today" | "week" | "month" | "any";
  remote?: boolean;
  company?: string;
}

/**
 * Salary range parsing result
 */
export interface SalaryRange {
  salary_min?: number;
  salary_max?: number;
  salary_currency: string;
  salary_raw: string;
}

/**
 * Usage statistics interface
 */
export interface UsageStats {
  date: string;
  total_requests: number;
  queries: Array<{
    query: string;
    location?: string;
    timestamp: string;
  }>;
}

/**
 * SerpAPI raw result interface (for internal mapping)
 */
export interface SerpApiRawResult {
  title?: string;
  company_name?: string;
  company?: string;
  location?: string;
  description?: string;
  date?: string;
  salary?: string;
  job_google_link?: string;
  link?: string;
  apply_options?: Array<{
    link: string;
  }>;
  extensions?: string[];
  detected_extensions?: {
    salary?: string;
    schedule_type?: string;
  };
}

/**
 * SerpAPI response interface
 */
export interface SerpApiResponse {
  jobs_results?: SerpApiRawResult[];
  search_metadata?: {
    id: string;
    status: string;
    created_at: string;
    processed_at: string;
    total_time_taken: number;
  };
  search_parameters?: {
    engine: string;
    q: string;
    location?: string;
    api_key: string;
  };
}
