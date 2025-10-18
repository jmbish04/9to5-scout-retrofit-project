/**
 * Applicant Schemas
 *
 * Zod schemas for validating applicant-related data structures.
 */

import { z } from "zod";

// Base schemas
export const ApplicantPreferencesSchema = z.object({
  locations: z.array(z.string()).optional(),
  salary_min: z.number().int().min(0).optional(),
  salary_max: z.number().int().min(0).optional(),
  employment_types: z.array(z.string()).optional(),
  remote_preference: z
    .enum(["required", "preferred", "no_preference"])
    .optional(),
  industries: z.array(z.string()).optional(),
  company_sizes: z.array(z.string()).optional(),
  benefits_priority: z.array(z.string()).optional(),
});

export const ApplicantProfileSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().min(1),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  current_title: z.string().optional(),
  target_roles: z.array(z.string()).optional(),
  years_experience: z.number().int().min(0).optional(),
  education_level: z.string().optional(),
  skills: z.array(z.string()).optional(),
  preferences: ApplicantPreferencesSchema.optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const JobHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  applicant_id: z.string().uuid(),
  company_name: z.string().min(1),
  job_title: z.string().min(1),
  department: z.string().optional(),
  employment_type: z.enum([
    "full-time",
    "part-time",
    "contract",
    "internship",
    "freelance",
  ]),
  start_date: z.string().datetime(),
  end_date: z.string().datetime().optional(),
  is_current: z.boolean(),
  location: z.string().optional(),
  salary_min: z.number().int().min(0).optional(),
  salary_max: z.number().int().min(0).optional(),
  salary_currency: z.string().default("USD"),
  responsibilities: z.string().min(1),
  achievements: z.string().min(1),
  skills_used: z.array(z.string()),
  technologies: z.array(z.string()),
  keywords: z.array(z.string()),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const JobHistorySubmissionSchema = z.object({
  id: z.string().uuid(),
  applicant_id: z.string().uuid(),
  raw_content: z.string().min(1),
  content_type: z.string().default("text/plain"),
  processing_status: z.enum(["pending", "processing", "completed", "failed"]),
  processed_at: z.string().datetime().optional(),
  error_message: z.string().optional(),
  submitted_at: z.string().datetime(),
});

export const JobRatingSchema = z.object({
  id: z.string().uuid(),
  applicant_id: z.string().uuid(),
  job_id: z.string().uuid(),
  overall_rating: z.number().min(1).max(5),
  skill_match_rating: z.number().min(1).max(5),
  salary_fit_rating: z.number().min(1).max(5),
  location_rating: z.number().min(1).max(5),
  company_culture_rating: z.number().min(1).max(5),
  growth_opportunity_rating: z.number().min(1).max(5),
  comments: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const ApplicantMatchSchema = z.object({
  applicant_id: z.string().uuid(),
  job_id: z.string().uuid(),
  match_score: z.number().min(0).max(100),
  skill_match: z.number().min(0).max(100),
  experience_match: z.number().min(0).max(100),
  location_match: z.number().min(0).max(100),
  salary_match: z.number().min(0).max(100),
  culture_match: z.number().min(0).max(100),
  overall_fit: z.number().min(0).max(100),
  matched_at: z.string().datetime(),
});

// Request/Response schemas
export const ApplicantSearchRequestSchema = z.object({
  query: z.string().optional(),
  skills: z.array(z.string()).optional(),
  experience_years: z.number().int().min(0).optional(),
  location: z.string().optional(),
  target_roles: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const JobHistoryRequestSchema = z.object({
  user_id: z.string().min(1),
  raw_content: z.string().min(1),
  content_type: z.string().default("text/plain"),
});

export const JobRatingRequestSchema = z.object({
  applicant_id: z.string().uuid(),
  job_id: z.string().uuid(),
  overall_rating: z.number().min(1).max(5),
  skill_match_rating: z.number().min(1).max(5),
  salary_fit_rating: z.number().min(1).max(5),
  location_rating: z.number().min(1).max(5),
  company_culture_rating: z.number().min(1).max(5),
  growth_opportunity_rating: z.number().min(1).max(5),
  comments: z.string().optional(),
});

export const ApplicantMatchRequestSchema = z.object({
  applicant_id: z.string().uuid(),
  job_id: z.string().uuid(),
});

export const CreateApplicantRequestSchema = z.object({
  user_id: z.string().min(1),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  current_title: z.string().optional(),
  target_roles: z.array(z.string()).optional(),
  years_experience: z.number().int().min(0).optional(),
  education_level: z.string().optional(),
  skills: z.array(z.string()).optional(),
  preferences: ApplicantPreferencesSchema.optional(),
});

export const UpdateApplicantRequestSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  current_title: z.string().optional(),
  target_roles: z.array(z.string()).optional(),
  years_experience: z.number().int().min(0).optional(),
  education_level: z.string().optional(),
  skills: z.array(z.string()).optional(),
  preferences: ApplicantPreferencesSchema.optional(),
});

export const ApplicantResponseSchema = z.object({
  applicant: ApplicantProfileSchema,
});

export const ApplicantListResponseSchema = z.object({
  applicants: z.array(ApplicantProfileSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  has_more: z.boolean(),
});

export const JobHistoryResponseSchema = z.object({
  applicant: ApplicantProfileSchema,
  job_history: z.array(JobHistoryEntrySchema),
  submissions: z.array(JobHistorySubmissionSchema),
});

export const JobRatingResponseSchema = z.object({
  rating: JobRatingSchema,
});

export const ApplicantMatchResponseSchema = z.object({
  match: ApplicantMatchSchema,
});

export const ApplicantSearchResponseSchema = z.object({
  applicants: z.array(ApplicantProfileSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  has_more: z.boolean(),
});

export const MatchingCriteriaSchema = z.object({
  min_score: z.number().min(0).max(1).optional(),
  weights: z
    .object({
      skills: z.number().min(0).max(1).optional(),
      experience: z.number().min(0).max(1).optional(),
      location: z.number().min(0).max(1).optional(),
      salary: z.number().min(0).max(1).optional(),
      culture: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

export const MatchingResultSchema = z.object({
  applicant: ApplicantProfileSchema,
  match: ApplicantMatchSchema,
  reasons: z.array(z.string()),
});

export const JobRecommendationSchema = z.object({
  job: z.object({
    id: z.string(),
    title: z.string(),
    company: z.string(),
    location: z.string().optional(),
    salary_min: z.number().optional(),
    salary_max: z.number().optional(),
    description: z.string().optional(),
    required_skills: z.array(z.string()).optional(),
    preferred_skills: z.array(z.string()).optional(),
    experience_required: z.number().optional(),
    remote_work: z.boolean().optional(),
  }),
  match: ApplicantMatchSchema,
  reasons: z.array(z.string()),
});

export const ApplicantStatsSchema = z.object({
  total_applicants: z.number().int().min(0),
  active_applicants: z.number().int().min(0),
  average_experience: z.number().min(0),
  top_skills: z.array(z.string()),
  top_locations: z.array(z.string()),
  top_target_roles: z.array(z.string()),
  average_rating: z.number().min(0).max(5),
});

// Type exports
export type JobRecommendation = z.infer<typeof JobRecommendationSchema>;
export type MatchingCriteria = z.infer<typeof MatchingCriteriaSchema>;
export type MatchingResult = z.infer<typeof MatchingResultSchema>;

export const ApplicantStatsResponseSchema = z.object({
  stats: ApplicantStatsSchema,
});

// Type exports
export type ApplicantProfile = z.infer<typeof ApplicantProfileSchema>;
export type ApplicantPreferences = z.infer<typeof ApplicantPreferencesSchema>;
export type JobHistoryEntry = z.infer<typeof JobHistoryEntrySchema>;
export type JobHistorySubmission = z.infer<typeof JobHistorySubmissionSchema>;
export type JobRating = z.infer<typeof JobRatingSchema>;
export type ApplicantMatch = z.infer<typeof ApplicantMatchSchema>;
export type ApplicantSearchRequest = z.infer<
  typeof ApplicantSearchRequestSchema
>;
export type ApplicantSearchResponse = z.infer<
  typeof ApplicantListResponseSchema
>;
export type JobHistoryRequest = z.infer<typeof JobHistoryRequestSchema>;
export type JobHistoryResponse = z.infer<typeof JobHistoryResponseSchema>;
export type JobRatingRequest = z.infer<typeof JobRatingRequestSchema>;
export type JobRatingResponse = z.infer<typeof JobRatingResponseSchema>;
export type ApplicantMatchRequest = z.infer<typeof ApplicantMatchRequestSchema>;
export type ApplicantMatchResponse = z.infer<
  typeof ApplicantMatchResponseSchema
>;
export type CreateApplicantRequest = z.infer<
  typeof CreateApplicantRequestSchema
>;
export type UpdateApplicantRequest = z.infer<
  typeof UpdateApplicantRequestSchema
>;
export type ApplicantResponse = z.infer<typeof ApplicantResponseSchema>;
export type ApplicantListResponse = z.infer<typeof ApplicantListResponseSchema>;
export type ApplicantStats = z.infer<typeof ApplicantStatsSchema>;
export type ApplicantStatsResponse = z.infer<
  typeof ApplicantStatsResponseSchema
>;
