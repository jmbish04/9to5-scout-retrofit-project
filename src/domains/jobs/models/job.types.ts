/**
 * @file This file contains comprehensive type definitions for the jobs domain within the 9to5-Scout platform.
 * It serves as the single source of truth for all job-related data structures, interfaces, and type contracts
 * that are used throughout the jobs domain services, routes, and external API integrations.
 *
 * Key Components:
 * - `Job`: Core job posting interface representing individual job opportunities with comprehensive metadata
 * - `JobHistoryEntry`: Tracks user interactions and status changes for specific job postings
 * - `JobHistorySubmission`: Represents user-submitted job application data and status updates
 * - `JobRating`: Captures user ratings and feedback for job postings across multiple dimensions
 * - `JobSearchParams`: Defines search and filtering parameters for job discovery operations
 * - `JobSearchResult`: Structured response format for job search operations with pagination
 * - `JobProcessingResult`: Represents the outcome of job URL processing operations
 * - `JobExtractionResult`: Contains AI-extracted job data from various sources (HTML, text, etc.)
 *
 * This module is a critical foundation for the job discovery and management pipeline, providing type safety
 * and consistency across all job-related operations including scraping, AI extraction, user interactions,
 * and data persistence. All types are designed to align with the established D1 database schema and
 * support the platform's AI-powered job matching and recommendation capabilities.
 *
 * Dependencies:
 * - Aligns with D1 database schema defined in migrations
 * - Supports Workers AI integration for job data extraction and analysis
 * - Compatible with Vectorize for semantic search and job matching
 * - Integrates with R2 storage for job-related artifacts and snapshots
 *
 * @author 9to5-Scout AI Agent
 * @maintainer 9to5-Scout Development Team
 */

export interface Job {
  id?: string;
  site_id?: string;
  url: string;
  canonical_url?: string;
  title?: string;
  company?: string;
  company_id?: string;
  company_url?: string;
  careers_url?: string;
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
  source?: "SCRAPED" | "EMAIL" | "MANUAL";
  last_seen_open_at?: string;
  first_seen_at?: string;
  last_crawled_at?: string;
  daily_monitoring_enabled?: boolean;
  monitoring_frequency_hours?: number;
  last_status_check_at?: string;
  closure_detected_at?: string;
}

export interface JobHistoryEntry {
  id?: string;
  job_id: string;
  user_id?: string;
  status: "APPLIED" | "INTERVIEWED" | "REJECTED" | "OFFERED" | "WITHDRAWN";
  notes?: string;
  applied_at?: string;
  interview_date?: string;
  rejection_reason?: string;
  offer_details?: string;
  created_at?: string;
  updated_at?: string;
}

export interface JobHistorySubmission {
  job_id: string;
  status: "APPLIED" | "INTERVIEWED" | "REJECTED" | "OFFERED" | "WITHDRAWN";
  notes?: string;
  applied_at?: string;
  interview_date?: string;
  rejection_reason?: string;
  offer_details?: string;
}

export interface JobRating {
  id?: string;
  job_id: string;
  user_id?: string;
  overall_rating: number;
  company_rating?: number;
  role_rating?: number;
  location_rating?: number;
  salary_rating?: number;
  culture_rating?: number;
  growth_rating?: number;
  work_life_balance_rating?: number;
  comments?: string;
  created_at?: string;
  updated_at?: string;
}

export interface JobSearchParams {
  query?: string;
  location?: string;
  company?: string;
  employment_type?: string;
  salary_min?: number;
  salary_max?: number;
  posted_since?: string;
  status?: string;
  limit?: number;
  offset?: number;
  sort_by?: "posted_at" | "title" | "company" | "salary_min" | "salary_max";
  sort_order?: "asc" | "desc";
}

export interface JobSearchResult {
  jobs: Job[];
  total: number;
  has_more: boolean;
  next_offset?: number;
}

export interface JobProcessingResult {
  success: boolean;
  job_id?: string;
  error?: string;
  warnings?: string[];
}

export interface JobExtractionResult {
  title?: string;
  company?: string;
  location?: string;
  employment_type?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  description_md?: string;
  requirements_md?: string;
  posted_at?: string;
  confidence_score?: number;
  extraction_metadata?: Record<string, any>;
}
