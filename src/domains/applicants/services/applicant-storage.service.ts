/**
 * @module src/new/domains/applicants/services/applicant-storage.service.ts
 * @description
 * This service handles all data access and storage operations for the 'applicants'
 * domain, including profiles, job history, and ratings. It uses Zod for robust
 * type validation and safe data parsing.
 */

import { z } from 'zod';

// ============================================================================
// Schemas and Types
// ============================================================================

export const JobHistorySubmissionSchema = z.object({
  id: z.string().uuid(),
  applicant_id: z.string().uuid(),
  raw_content: z.string(),
  content_type: z.string(),
  processing_status: z.enum(['pending', 'processing', 'completed', 'failed']),
  submitted_at: z.string().datetime(),
  error_message: z.string().nullable().optional(),
});

export const JobHistoryEntrySchema = z.object({
    id: z.string().uuid(),
    applicant_id: z.string().uuid(),
    company_name: z.string(),
    job_title: z.string(),
    department: z.string().nullable(),
    employment_type: z.string().nullable(),
    start_date: z.string(),
    end_date: z.string().nullable(),
    is_current: z.boolean(),
    location: z.string().nullable(),
    salary_min: z.number().nullable(),
    salary_max: z.number().nullable(),
    salary_currency: z.string().nullable(),
    responsibilities: z.string().nullable(),
    achievements: z.string().nullable(),
    skills_used: z.array(z.string()),
    technologies: z.array(z.string()),
    keywords: z.array(z.string()),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});

export const ApplicantProfileSchema = z.object({
    id: z.string().uuid(),
    user_id: z.string(),
    name: z.string().nullable().optional(),
    current_title: z.string().nullable().optional(),
    target_roles: z.array(z.string()),
    skills: z.array(z.string()),
    preferences: z.record(z.unknown()),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});

export const JobRatingSchema = z.object({
    id: z.string().uuid(),
    applicant_id: z.string().uuid(),
    job_id: z.string().uuid(),
    overall_score: z.number(),
    skill_match_score: z.number().nullable(),
    experience_match_score: z.number().nullable(),
    compensation_fit_score: z.number().nullable(),
    location_fit_score: z.number().nullable(),
    company_culture_score: z.number().nullable(),
    growth_potential_score: z.number().nullable(),
    rating_summary: z.string().nullable(),
    recommendation: z.string().nullable(),
    strengths: z.array(z.string()),
    gaps: z.array(z.string()),
    improvement_suggestions: z.string().nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});


export type JobHistorySubmission = z.infer<typeof JobHistorySubmissionSchema>;
export type JobHistoryEntry = z.infer<typeof JobHistoryEntrySchema>;
export type ApplicantProfile = z.infer<typeof ApplicantProfileSchema>;
export type JobRating = z.infer<typeof JobRatingSchema>;

export interface StorageEnv {
  DB: D1Database;
}

// ============================================================================
// Service Class
// ============================================================================

export class ApplicantStorageService {
  private env: StorageEnv;

  constructor(env: StorageEnv) {
    this.env = env;
  }

  /**
   * Safely parses a raw database row into a typed object. It handles JSON parsing
   * for array/object fields.
   * @param row - The raw row from D1.
   * @param schema - The Zod schema to validate against.
   * @param jsonFields - A list of field names that need to be JSON parsed.
   */
  private safeParse<T>(row: unknown, schema: z.ZodType<T>, jsonFields: string[] = []): T {
    if (typeof row !== 'object' || row === null) {
      throw new Error('Invalid database row format.');
    }
    
    const rawObject = { ...row };
    for (const field of jsonFields) {
        if (typeof rawObject[field] === 'string') {
            try {
                rawObject[field] = JSON.parse(rawObject[field]);
            } catch {
                // Set to default value if parsing fails, e.g., empty array
                rawObject[field] = []; 
            }
        }
    }

    return schema.parse(rawObject);
  }

  /**
   * Get an applicant profile by user ID.
   */
  async getApplicantProfile(userId: string): Promise<ApplicantProfile | null> {
    const result = await this.env.DB.prepare(
      "SELECT * FROM applicant_profiles WHERE user_id = ?"
    ).bind(userId).first();

    if (!result) return null;

    return this.safeParse(result, ApplicantProfileSchema, ['target_roles', 'skills', 'preferences']);
  }

  /**
   * Get job history submissions by applicant ID.
   * This function now uses safe parsing and removes the unsafe type assertion.
   */
  async getJobHistorySubmissions(applicantId: string): Promise<JobHistorySubmission[]> {
    const { results } = await this.env.DB.prepare(
      "SELECT * FROM job_history_submissions WHERE applicant_id = ? ORDER BY submitted_at DESC"
    ).bind(applicantId).all();

    if (!results) return [];

    // Safely parse each row against the Zod schema
    return results.map(row => this.safeParse(row, JobHistorySubmissionSchema));
  }

  /**
   * Get job history by applicant ID.
   */
  async getJobHistoryByApplicant(applicantId: string): Promise<JobHistoryEntry[]> {
    const { results } = await this.env.DB.prepare(
      'SELECT * FROM job_history WHERE applicant_id = ? ORDER BY start_date DESC'
    ).bind(applicantId).all();

    if (!results) return [];

    return results.map(row => this.safeParse(row, JobHistoryEntrySchema, ['skills_used', 'technologies', 'keywords']));
  }

  /**
   * Get job ratings by applicant ID.
   */
  async getJobRatingsByApplicant(applicantId: string): Promise<(JobRating & { job_title: string; job_company: string; job_url: string })[]> {
    const { results } = await this.env.DB.prepare(`
      SELECT jr.*, j.title as job_title, j.company as job_company, j.url as job_url
      FROM job_ratings jr
      JOIN jobs j ON jr.job_id = j.id
      WHERE jr.applicant_id = ?
      ORDER BY jr.overall_score DESC
    `).bind(applicantId).all();

    if (!results) return [];

    const JobRatingWithJobInfoSchema = JobRatingSchema.extend({
        job_title: z.string(),
        job_company: z.string(),
        job_url: z.string().url(),
    });

    return results.map(row => this.safeParse(row, JobRatingWithJobInfoSchema, ['strengths', 'gaps']));
  }

  // ... (create, update, and other write methods would be included here)
}
