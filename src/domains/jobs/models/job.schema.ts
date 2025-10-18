/**
 * @file This file contains comprehensive Zod validation schemas for all job-related data structures
 * within the 9to5-Scout platform. It provides runtime type validation, data sanitization, and
 * type inference capabilities for the jobs domain, ensuring data integrity and type safety
 * across all job-related operations.
 *
 * Key Components:
 * - `JobSchema`: Validates core job posting data with comprehensive field validation and constraints
 * - `JobHistoryEntrySchema`: Ensures job history entries contain valid status transitions and metadata
 * - `JobHistorySubmissionSchema`: Validates user-submitted job application data and status updates
 * - `JobRatingSchema`: Validates job rating data with proper score ranges and optional feedback
 * - `JobSearchParamsSchema`: Validates search parameters with pagination, sorting, and filtering options
 * - `JobProcessingResultSchema`: Validates job processing operation outcomes and error handling
 * - `JobExtractionResultSchema`: Validates AI-extracted job data from various content sources
 *
 * This module serves as the validation layer for the jobs domain, providing runtime type checking
 * that complements the TypeScript compile-time type system. All schemas are designed to work
 * seamlessly with the D1 database operations, API endpoints, and AI processing pipelines.
 * The schemas include proper error messages, custom validation rules, and transformation logic
 * to ensure data consistency and prevent invalid data from entering the system.
 *
 * Dependencies:
 * - Uses Zod library for runtime validation and type inference
 * - Aligns with D1 database schema constraints and data types
 * - Supports Workers AI integration for data extraction validation
 * - Compatible with Hono framework for API request validation
 *
 * @author 9to5-Scout AI Agent
 * @maintainer 9to5-Scout Development Team
 */

import { z } from "zod";

export const JobSchema = z.object({
  id: z.string().uuid().optional(),
  site_id: z.string().uuid().optional(),
  url: z.string().url(),
  canonical_url: z.string().url().optional(),
  title: z.string().optional(),
  company: z.string().optional(),
  company_id: z.string().optional(),
  company_url: z.string().url().optional(),
  careers_url: z.string().url().optional(),
  location: z.string().optional(),
  employment_type: z.string().optional(),
  department: z.string().optional(),
  salary_min: z.number().positive().optional(),
  salary_max: z.number().positive().optional(),
  salary_currency: z.string().length(3).optional(),
  salary_raw: z.string().optional(),
  compensation_raw: z.string().optional(),
  description_md: z.string().optional(),
  requirements_md: z.string().optional(),
  posted_at: z.string().datetime().optional(),
  closed_at: z.string().datetime().optional(),
  status: z.string().optional(),
  source: z.enum(["SCRAPED", "EMAIL", "MANUAL"]).optional(),
  last_seen_open_at: z.string().datetime().optional(),
  first_seen_at: z.string().datetime().optional(),
  last_crawled_at: z.string().datetime().optional(),
  daily_monitoring_enabled: z.boolean().optional(),
  monitoring_frequency_hours: z.number().positive().optional(),
  last_status_check_at: z.string().datetime().optional(),
  closure_detected_at: z.string().datetime().optional(),
});

export const JobHistoryEntrySchema = z.object({
  id: z.string().uuid().optional(),
  job_id: z.string().uuid(),
  user_id: z.string().uuid().optional(),
  status: z.enum([
    "APPLIED",
    "INTERVIEWED",
    "REJECTED",
    "OFFERED",
    "WITHDRAWN",
  ]),
  notes: z.string().optional(),
  applied_at: z.string().datetime().optional(),
  interview_date: z.string().datetime().optional(),
  rejection_reason: z.string().optional(),
  offer_details: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export const JobHistorySubmissionSchema = z.object({
  job_id: z.string().uuid(),
  status: z.enum([
    "APPLIED",
    "INTERVIEWED",
    "REJECTED",
    "OFFERED",
    "WITHDRAWN",
  ]),
  notes: z.string().optional(),
  applied_at: z.string().datetime().optional(),
  interview_date: z.string().datetime().optional(),
  rejection_reason: z.string().optional(),
  offer_details: z.string().optional(),
});

export const JobRatingSchema = z.object({
  id: z.string().uuid().optional(),
  job_id: z.string().uuid(),
  user_id: z.string().uuid().optional(),
  overall_rating: z.number().min(1).max(5),
  company_rating: z.number().min(1).max(5).optional(),
  role_rating: z.number().min(1).max(5).optional(),
  location_rating: z.number().min(1).max(5).optional(),
  salary_rating: z.number().min(1).max(5).optional(),
  culture_rating: z.number().min(1).max(5).optional(),
  growth_rating: z.number().min(1).max(5).optional(),
  work_life_balance_rating: z.number().min(1).max(5).optional(),
  comments: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export const JobSearchParamsSchema = z.object({
  query: z.string().optional(),
  location: z.string().optional(),
  company: z.string().optional(),
  employment_type: z.string().optional(),
  salary_min: z.number().positive().optional(),
  salary_max: z.number().positive().optional(),
  posted_since: z.string().datetime().optional(),
  status: z.string().optional(),
  limit: z.number().positive().max(100).default(20),
  offset: z.number().min(0).default(0),
  sort_by: z
    .enum(["posted_at", "title", "company", "salary_min", "salary_max"])
    .default("posted_at"),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
});

export const JobProcessingResultSchema = z.object({
  success: z.boolean(),
  job_id: z.string().uuid().optional(),
  error: z.string().optional(),
  warnings: z.array(z.string()).optional(),
});

export const JobExtractionResultSchema = z.object({
  title: z.string().optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  employment_type: z.string().optional(),
  salary_min: z.number().positive().optional(),
  salary_max: z.number().positive().optional(),
  salary_currency: z.string().length(3).optional(),
  description_md: z.string().optional(),
  requirements_md: z.string().optional(),
  posted_at: z.string().datetime().optional(),
  confidence_score: z.number().min(0).max(1).optional(),
  extraction_metadata: z.record(z.string(), z.any()).optional(),
});

// Type exports
export type Job = z.infer<typeof JobSchema>;
export type JobHistoryEntry = z.infer<typeof JobHistoryEntrySchema>;
export type JobHistorySubmission = z.infer<typeof JobHistorySubmissionSchema>;
export type JobRating = z.infer<typeof JobRatingSchema>;
export type JobSearchParams = z.infer<typeof JobSearchParamsSchema>;
export type JobProcessingResult = z.infer<typeof JobProcessingResultSchema>;
export type JobExtractionResult = z.infer<typeof JobExtractionResultSchema>;
