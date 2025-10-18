/**
 * Applicant Storage Service
 *
 * Service for managing applicant data storage and retrieval operations.
 * Handles CRUD operations for applicant profiles, job history, and ratings.
 */

import type { Env } from "../../../config/env";
import type {
  ApplicantMatch,
  ApplicantProfile,
  ApplicantSearchRequest,
  ApplicantSearchResponse,
  ApplicantStats,
  CreateApplicantRequest,
  JobHistoryEntry,
  JobHistorySubmission,
  JobRating,
  UpdateApplicantRequest,
} from "../types/applicant.types";

export class ApplicantStorageService {
  constructor(private env: Env) {}

  /**
   * Create a new applicant profile
   */
  async createApplicant(
    request: CreateApplicantRequest
  ): Promise<ApplicantProfile> {
    const applicantId = crypto.randomUUID();
    const now = new Date().toISOString();

    const applicant: ApplicantProfile = {
      id: applicantId,
      user_id: request.user_id,
      name: request.name,
      email: request.email,
      phone: request.phone,
      current_title: request.current_title,
      target_roles: request.target_roles,
      years_experience: request.years_experience,
      education_level: request.education_level,
      skills: request.skills,
      preferences: request.preferences,
      created_at: now,
      updated_at: now,
    };

    await this.env.DB.prepare(
      `
      INSERT INTO applicant_profiles (
        id, user_id, name, email, phone, current_title, target_roles,
        years_experience, education_level, skills, preferences,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        applicant.id,
        applicant.user_id,
        applicant.name,
        applicant.email,
        applicant.phone,
        applicant.current_title,
        applicant.target_roles ? JSON.stringify(applicant.target_roles) : null,
        applicant.years_experience,
        applicant.education_level,
        applicant.skills ? JSON.stringify(applicant.skills) : null,
        applicant.preferences ? JSON.stringify(applicant.preferences) : null,
        applicant.created_at,
        applicant.updated_at
      )
      .run();

    return applicant;
  }

  /**
   * Get an applicant profile by user ID
   */
  async getApplicantByUserId(userId: string): Promise<ApplicantProfile | null> {
    const result = await this.env.DB.prepare(
      `
      SELECT * FROM applicant_profiles WHERE user_id = ?
    `
    )
      .bind(userId)
      .first();

    if (!result) {
      return null;
    }

    return this.mapDbRowToApplicant(result);
  }

  /**
   * Get an applicant profile by ID
   */
  async getApplicant(applicantId: string): Promise<ApplicantProfile | null> {
    const result = await this.env.DB.prepare(
      `
      SELECT * FROM applicant_profiles WHERE id = ?
    `
    )
      .bind(applicantId)
      .first();

    if (!result) {
      return null;
    }

    return this.mapDbRowToApplicant(result);
  }

  /**
   * Update an applicant profile
   */
  async updateApplicant(
    applicantId: string,
    updates: UpdateApplicantRequest
  ): Promise<ApplicantProfile | null> {
    const applicant = await this.getApplicant(applicantId);
    if (!applicant) {
      return null;
    }

    const updatedApplicant = {
      ...applicant,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    await this.env.DB.prepare(
      `
      UPDATE applicant_profiles 
      SET name = ?, email = ?, phone = ?, current_title = ?, target_roles = ?,
          years_experience = ?, education_level = ?, skills = ?, preferences = ?,
          updated_at = ?
      WHERE id = ?
    `
    )
      .bind(
        updatedApplicant.name,
        updatedApplicant.email,
        updatedApplicant.phone,
        updatedApplicant.current_title,
        updatedApplicant.target_roles
          ? JSON.stringify(updatedApplicant.target_roles)
          : null,
        updatedApplicant.years_experience,
        updatedApplicant.education_level,
        updatedApplicant.skills
          ? JSON.stringify(updatedApplicant.skills)
          : null,
        updatedApplicant.preferences
          ? JSON.stringify(updatedApplicant.preferences)
          : null,
        updatedApplicant.updated_at,
        applicantId
      )
      .run();

    return updatedApplicant;
  }

  /**
   * Delete an applicant profile
   */
  async deleteApplicant(applicantId: string): Promise<boolean> {
    const result = await this.env.DB.prepare(
      `
      DELETE FROM applicant_profiles WHERE id = ?
    `
    )
      .bind(applicantId)
      .run();

    return result.changes > 0;
  }

  /**
   * Search applicants
   */
  async searchApplicants(
    request: ApplicantSearchRequest
  ): Promise<ApplicantSearchResponse> {
    const page = Math.max(
      1,
      request.offset
        ? Math.floor(request.offset / (request.limit || 25)) + 1
        : 1
    );
    const limit = request.limit || 25;
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const params: any[] = [];

    if (request.query) {
      whereClause += " AND (name LIKE ? OR current_title LIKE ?)";
      params.push(`%${request.query}%`, `%${request.query}%`);
    }

    if (request.skills && request.skills.length > 0) {
      whereClause += " AND skills LIKE ?";
      params.push(`%${request.skills.join("%")}%`);
    }

    if (request.experience_years !== undefined) {
      whereClause += " AND years_experience >= ?";
      params.push(request.experience_years);
    }

    if (request.location) {
      whereClause += " AND preferences LIKE ?";
      params.push(`%${request.location}%`);
    }

    if (request.target_roles && request.target_roles.length > 0) {
      whereClause += " AND target_roles LIKE ?";
      params.push(`%${request.target_roles.join("%")}%`);
    }

    // Get total count
    const countResult = await this.env.DB.prepare(
      `
      SELECT COUNT(*) as total FROM applicant_profiles ${whereClause}
    `
    )
      .bind(...params)
      .first();

    const total = (countResult as { total: number }).total;

    // Get applicants
    const applicants = await this.env.DB.prepare(
      `
      SELECT * FROM applicant_profiles 
      ${whereClause}
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `
    )
      .bind(...params, limit, offset)
      .all();

    const applicantList = (applicants || []).map((row: any) =>
      this.mapDbRowToApplicant(row)
    );

    return {
      applicants: applicantList,
      total,
      page,
      limit,
      has_more: offset + limit < total,
    };
  }

  /**
   * Create job history entry
   */
  async createJobHistoryEntry(
    entry: Omit<JobHistoryEntry, "id" | "created_at" | "updated_at">
  ): Promise<JobHistoryEntry> {
    const entryId = crypto.randomUUID();
    const now = new Date().toISOString();

    const fullEntry: JobHistoryEntry = {
      ...entry,
      id: entryId,
      created_at: now,
      updated_at: now,
    };

    await this.env.DB.prepare(
      `
      INSERT INTO job_history (
        id, applicant_id, company_name, job_title, department, employment_type,
        start_date, end_date, is_current, location, salary_min, salary_max,
        salary_currency, responsibilities, achievements, skills_used,
        technologies, keywords, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        fullEntry.id,
        fullEntry.applicant_id,
        fullEntry.company_name,
        fullEntry.job_title,
        fullEntry.department,
        fullEntry.employment_type,
        fullEntry.start_date,
        fullEntry.end_date,
        fullEntry.is_current ? 1 : 0,
        fullEntry.location,
        fullEntry.salary_min,
        fullEntry.salary_max,
        fullEntry.salary_currency,
        fullEntry.responsibilities,
        fullEntry.achievements,
        JSON.stringify(fullEntry.skills_used),
        JSON.stringify(fullEntry.technologies),
        JSON.stringify(fullEntry.keywords),
        fullEntry.created_at,
        fullEntry.updated_at
      )
      .run();

    return fullEntry;
  }

  /**
   * Get job history for an applicant
   */
  async getJobHistoryByApplicant(
    applicantId: string
  ): Promise<JobHistoryEntry[]> {
    const result = await this.env.DB.prepare(
      `
      SELECT * FROM job_history WHERE applicant_id = ? ORDER BY start_date DESC
    `
    )
      .bind(applicantId)
      .all();

    return (result || []).map((row: any) => this.mapDbRowToJobHistory(row));
  }

  /**
   * Create job history submission
   */
  async createJobHistorySubmission(
    submission: Omit<JobHistorySubmission, "id" | "submitted_at">
  ): Promise<JobHistorySubmission> {
    const submissionId = crypto.randomUUID();
    const now = new Date().toISOString();

    const fullSubmission: JobHistorySubmission = {
      ...submission,
      id: submissionId,
      submitted_at: now,
    };

    await this.env.DB.prepare(
      `
      INSERT INTO job_history_submissions (
        id, applicant_id, raw_content, content_type, processing_status,
        processed_at, error_message, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        fullSubmission.id,
        fullSubmission.applicant_id,
        fullSubmission.raw_content,
        fullSubmission.content_type,
        fullSubmission.processing_status,
        fullSubmission.processed_at,
        fullSubmission.error_message,
        fullSubmission.submitted_at
      )
      .run();

    return fullSubmission;
  }

  /**
   * Get job history submissions for an applicant
   */
  async getJobHistorySubmissions(
    applicantId: string
  ): Promise<JobHistorySubmission[]> {
    const result = await this.env.DB.prepare(
      `
      SELECT * FROM job_history_submissions WHERE applicant_id = ? ORDER BY submitted_at DESC
    `
    )
      .bind(applicantId)
      .all();

    return (result || []).map((row: any) =>
      this.mapDbRowToJobHistorySubmission(row)
    );
  }

  /**
   * Update job history submission status
   */
  async updateJobHistorySubmissionStatus(
    submissionId: string,
    status: JobHistorySubmission["processing_status"],
    errorMessage?: string
  ): Promise<void> {
    await this.env.DB.prepare(
      `
      UPDATE job_history_submissions 
      SET processing_status = ?, processed_at = ?, error_message = ?
      WHERE id = ?
    `
    )
      .bind(
        status,
        status === "completed" || status === "failed"
          ? new Date().toISOString()
          : null,
        errorMessage,
        submissionId
      )
      .run();
  }

  /**
   * Create job rating
   */
  async createJobRating(
    rating: Omit<JobRating, "id" | "created_at" | "updated_at">
  ): Promise<JobRating> {
    const ratingId = crypto.randomUUID();
    const now = new Date().toISOString();

    const fullRating: JobRating = {
      ...rating,
      id: ratingId,
      created_at: now,
      updated_at: now,
    };

    await this.env.DB.prepare(
      `
      INSERT INTO job_ratings (
        id, applicant_id, job_id, overall_rating, skill_match_rating,
        salary_fit_rating, location_rating, company_culture_rating,
        growth_opportunity_rating, comments, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        fullRating.id,
        fullRating.applicant_id,
        fullRating.job_id,
        fullRating.overall_rating,
        fullRating.skill_match_rating,
        fullRating.salary_fit_rating,
        fullRating.location_rating,
        fullRating.company_culture_rating,
        fullRating.growth_opportunity_rating,
        fullRating.comments,
        fullRating.created_at,
        fullRating.updated_at
      )
      .run();

    return fullRating;
  }

  /**
   * Get job ratings for an applicant
   */
  async getJobRatingsByApplicant(applicantId: string): Promise<JobRating[]> {
    const result = await this.env.DB.prepare(
      `
      SELECT * FROM job_ratings WHERE applicant_id = ? ORDER BY created_at DESC
    `
    )
      .bind(applicantId)
      .all();

    return (result || []).map((row: any) => this.mapDbRowToJobRating(row));
  }

  /**
   * Create applicant match
   */
  async createApplicantMatch(
    match: Omit<ApplicantMatch, "matched_at">
  ): Promise<ApplicantMatch> {
    const fullMatch: ApplicantMatch = {
      ...match,
      matched_at: new Date().toISOString(),
    };

    await this.env.DB.prepare(
      `
      INSERT INTO applicant_matches (
        applicant_id, job_id, match_score, skill_match, experience_match,
        location_match, salary_match, culture_match, overall_fit, matched_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        fullMatch.applicant_id,
        fullMatch.job_id,
        fullMatch.match_score,
        fullMatch.skill_match,
        fullMatch.experience_match,
        fullMatch.location_match,
        fullMatch.salary_match,
        fullMatch.culture_match,
        fullMatch.overall_fit,
        fullMatch.matched_at
      )
      .run();

    return fullMatch;
  }

  /**
   * Get applicant statistics
   */
  async getApplicantStats(): Promise<ApplicantStats> {
    // Get total applicants
    const totalResult = await this.env.DB.prepare(
      `
      SELECT COUNT(*) as total FROM applicant_profiles
    `
    ).first();
    const total_applicants = (totalResult as { total: number }).total;

    // Get active applicants (those with recent activity)
    const activeResult = await this.env.DB.prepare(
      `
      SELECT COUNT(*) as active FROM applicant_profiles 
      WHERE updated_at > datetime('now', '-30 days')
    `
    ).first();
    const active_applicants = (activeResult as { active: number }).active;

    // Get average experience
    const experienceResult = await this.env.DB.prepare(
      `
      SELECT AVG(years_experience) as avg_exp FROM applicant_profiles 
      WHERE years_experience IS NOT NULL
    `
    ).first();
    const average_experience =
      (experienceResult as { avg_exp: number }).avg_exp || 0;

    // Get top skills
    const skillsResult = await this.env.DB.prepare(
      `
      SELECT skills FROM applicant_profiles WHERE skills IS NOT NULL
    `
    ).all();
    const allSkills: string[] = [];
    (skillsResult || []).forEach((row: any) => {
      if (row.skills) {
        const skills = JSON.parse(row.skills);
        allSkills.push(...skills);
      }
    });
    const skillCounts = new Map<string, number>();
    allSkills.forEach((skill) => {
      skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
    });
    const top_skills = Array.from(skillCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill]) => skill);

    // Get top locations
    const locationsResult = await this.env.DB.prepare(
      `
      SELECT preferences FROM applicant_profiles WHERE preferences IS NOT NULL
    `
    ).all();
    const allLocations: string[] = [];
    (locationsResult || []).forEach((row: any) => {
      if (row.preferences) {
        const prefs = JSON.parse(row.preferences);
        if (prefs.locations) {
          allLocations.push(...prefs.locations);
        }
      }
    });
    const locationCounts = new Map<string, number>();
    allLocations.forEach((location) => {
      locationCounts.set(location, (locationCounts.get(location) || 0) + 1);
    });
    const top_locations = Array.from(locationCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([location]) => location);

    // Get top target roles
    const rolesResult = await this.env.DB.prepare(
      `
      SELECT target_roles FROM applicant_profiles WHERE target_roles IS NOT NULL
    `
    ).all();
    const allRoles: string[] = [];
    (rolesResult || []).forEach((row: any) => {
      if (row.target_roles) {
        const roles = JSON.parse(row.target_roles);
        allRoles.push(...roles);
      }
    });
    const roleCounts = new Map<string, number>();
    allRoles.forEach((role) => {
      roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
    });
    const top_target_roles = Array.from(roleCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([role]) => role);

    // Get average rating
    const ratingResult = await this.env.DB.prepare(
      `
      SELECT AVG(overall_rating) as avg_rating FROM job_ratings
    `
    ).first();
    const average_rating =
      (ratingResult as { avg_rating: number }).avg_rating || 0;

    return {
      total_applicants,
      active_applicants,
      average_experience,
      top_skills,
      top_locations,
      top_target_roles,
      average_rating,
    };
  }

  /**
   * Map database row to ApplicantProfile
   */
  private mapDbRowToApplicant(row: any): ApplicantProfile {
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      current_title: row.current_title,
      target_roles: row.target_roles ? JSON.parse(row.target_roles) : undefined,
      years_experience: row.years_experience,
      education_level: row.education_level,
      skills: row.skills ? JSON.parse(row.skills) : undefined,
      preferences: row.preferences ? JSON.parse(row.preferences) : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Map database row to JobHistoryEntry
   */
  private mapDbRowToJobHistory(row: any): JobHistoryEntry {
    return {
      id: row.id,
      applicant_id: row.applicant_id,
      company_name: row.company_name,
      job_title: row.job_title,
      department: row.department,
      employment_type: row.employment_type,
      start_date: row.start_date,
      end_date: row.end_date,
      is_current: Boolean(row.is_current),
      location: row.location,
      salary_min: row.salary_min,
      salary_max: row.salary_max,
      salary_currency: row.salary_currency,
      responsibilities: row.responsibilities,
      achievements: row.achievements,
      skills_used: row.skills_used ? JSON.parse(row.skills_used) : [],
      technologies: row.technologies ? JSON.parse(row.technologies) : [],
      keywords: row.keywords ? JSON.parse(row.keywords) : [],
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Map database row to JobHistorySubmission
   */
  private mapDbRowToJobHistorySubmission(row: any): JobHistorySubmission {
    return {
      id: row.id,
      applicant_id: row.applicant_id,
      raw_content: row.raw_content,
      content_type: row.content_type,
      processing_status: row.processing_status,
      processed_at: row.processed_at,
      error_message: row.error_message,
      submitted_at: row.submitted_at,
    };
  }

  /**
   * Map database row to JobRating
   */
  private mapDbRowToJobRating(row: any): JobRating {
    return {
      id: row.id,
      applicant_id: row.applicant_id,
      job_id: row.job_id,
      overall_rating: row.overall_rating,
      skill_match_rating: row.skill_match_rating,
      salary_fit_rating: row.salary_fit_rating,
      location_rating: row.location_rating,
      company_culture_rating: row.company_culture_rating,
      growth_opportunity_rating: row.growth_opportunity_rating,
      comments: row.comments,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

/**
 * Factory function to create an ApplicantStorageService instance
 */
export function createApplicantStorageService(
  env: Env
): ApplicantStorageService {
  return new ApplicantStorageService(env);
}
