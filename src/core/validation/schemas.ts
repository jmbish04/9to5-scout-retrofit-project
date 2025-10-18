/**
 * Validation schemas using Zod for type-safe request/response validation
 */

import { z } from "zod";

// Job Site enum validation - matches the actual JobSite enum from steel library
export const JobSiteSchema = z.enum([
  "linkedin",
  "indeed",
  "glassdoor",
  "ziprecruiter",
  "naukri",
  "bdjobs",
  "bayt",
  "google",
] as const);

// Search parameters validation
export const SearchParamsSchema = z.object({
  keywords: z.string().min(1, "Keywords are required"),
  location: z.string().optional(),
  salaryMin: z.number().positive().optional(),
  salaryMax: z.number().positive().optional(),
  employmentType: z
    .enum(["full-time", "part-time", "contract", "internship"])
    .optional(),
  experienceLevel: z.enum(["entry", "mid", "senior", "executive"]).optional(),
  remote: z.boolean().optional(),
  postedWithin: z
    .enum(["1day", "3days", "1week", "2weeks", "1month"])
    .optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

// Credentials validation for authenticated sites
export const CredentialsSchema = z.object({
  site: JobSiteSchema,
  email: z.string().email().optional(),
  password: z.string().min(1, "Password is required").optional(),
  username: z.string().min(1, "Username is required").optional(),
  apiKey: z.string().optional(),
  cookies: z.string().optional(),
});

// Job scraping request validation
export const ScrapeJobRequestSchema = z.object({
  jobUrl: z.string().url("Valid job URL is required"),
  credentials: CredentialsSchema.optional(),
});

// Job data validation schema
export const JobDataSchema = z.object({
  id: z.string().min(1),
  site_id: z.string().min(1),
  url: z.string().url(),
  canonical_url: z.string().url().optional(),
  title: z.string().optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  employment_type: z.string().optional(),
  department: z.string().optional(),
  salary_min: z.number().optional(),
  salary_max: z.number().optional(),
  salary_currency: z.string().optional(),
  salary_raw: z.string().optional(),
  compensation_raw: z.string().optional(),
  description_md: z.string().optional(),
  requirements_md: z.string().optional(),
  posted_at: z.string().optional(),
  closed_at: z.string().optional(),
  status: z.enum(["open", "closed", "expired"]).optional(),
  last_seen_open_at: z.string().optional(),
  first_seen_at: z.string().optional(),
  last_crawled_at: z.string().optional(),
  daily_monitoring_enabled: z.boolean().optional(),
  monitoring_frequency_hours: z.number().optional(),
  last_status_check_at: z.string().optional(),
  closure_detected_at: z.string().optional(),
});

// Snapshot data validation schema
export const SnapshotDataSchema = z.object({
  id: z.string().min(1),
  job_id: z.string().min(1),
  run_id: z.string().min(1),
  content_hash: z.string().min(1),
  html_r2_key: z.string().optional(),
  json_r2_key: z.string().optional(),
  screenshot_r2_key: z.string().optional(),
  pdf_r2_key: z.string().optional(),
  markdown_r2_key: z.string().optional(),
  fetched_at: z.string(),
  http_status: z.number().optional(),
  etag: z.string().optional(),
});

// Job tracking history validation schema
export const JobTrackingHistorySchema = z.object({
  id: z.string().min(1),
  job_id: z.string().min(1),
  snapshot_id: z.string().min(1),
  tracking_date: z.string(),
  status: z.string(),
  content_hash: z.string().optional(),
  title_changed: z.boolean().optional(),
  requirements_changed: z.boolean().optional(),
  salary_changed: z.boolean().optional(),
  description_changed: z.boolean().optional(),
  error_message: z.string().optional(),
  created_at: z.string(),
});

// Site data validation schema
export const SiteDataSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  base_url: z.string().url(),
  robots_txt: z.string().optional(),
  sitemap_url: z.string().url().optional(),
  discovery_strategy: z.enum(["sitemap", "list", "search", "custom"]).optional(),
  last_discovered_at: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

// Applicant data validation schema
export const ApplicantDataSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().min(1),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  skills: z.array(z.string()).optional(),
  experience_years: z.number().optional(),
  current_title: z.string().optional(),
  current_company: z.string().optional(),
  education: z.string().optional(),
  resume_url: z.string().url().optional(),
  cover_letter_url: z.string().url().optional(),
  preferences: z.record(z.unknown()).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

// Document data validation schema
export const DocumentDataSchema = z.object({
  id: z.number(),
  user_id: z.string().min(1),
  doc_type: z.enum(["resume", "cover_letter"]),
  purpose: z.enum(["job_related", "example", "reference"]).optional(),
  title: z.string().optional(),
  r2_key_md: z.string().optional(),
  r2_url_md: z.string().url().optional(),
  r2_key_pdf: z.string().optional(),
  r2_url_pdf: z.string().url().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Email data validation schema
export const EmailDataSchema = z.object({
  from: z.string().email(),
  to: z.string().email(),
  subject: z.string(),
  body: z.string(),
  category: z.enum([
    "SPAM",
    "JOB_ALERT", 
    "MESSAGE",
    "RECRUITER",
    "NETWORKING",
    "MARKETING_SPAM",
    "OTP",
    "SYSTEM",
    "UNKNOWN"
  ]),
  category_reasoning: z.string(),
  job_links: z.array(z.string().url()),
});

// API response validation schemas
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

// Pagination validation schema
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).optional(),
});

// Export types
export type JobSite = z.infer<typeof JobSiteSchema>;
export type SearchParams = z.infer<typeof SearchParamsSchema>;
export type Credentials = z.infer<typeof CredentialsSchema>;
export type ScrapeJobRequest = z.infer<typeof ScrapeJobRequestSchema>;
export type JobData = z.infer<typeof JobDataSchema>;
export type SnapshotData = z.infer<typeof SnapshotDataSchema>;
export type JobTrackingHistory = z.infer<typeof JobTrackingHistorySchema>;
export type SiteData = z.infer<typeof SiteDataSchema>;
export type ApplicantData = z.infer<typeof ApplicantDataSchema>;
export type DocumentData = z.infer<typeof DocumentDataSchema>;
export type EmailData = z.infer<typeof EmailDataSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
