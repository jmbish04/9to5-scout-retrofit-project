/**
 * Applicant Matching Service
 *
 * Service for matching applicants with job opportunities based on skills,
 * experience, location, and other criteria.
 */

import type { Env } from "../../../config/env";
import type {
  ApplicantMatch,
  ApplicantProfile,
  Job,
  JobRecommendation,
  MatchingCriteria,
  MatchingResult,
} from "../types/applicant.types";

export class ApplicantMatchingService {
  constructor(private env: Env) {}

  /**
   * Match an applicant with a specific job
   */
  async matchApplicantWithJob(
    applicantId: string,
    jobId: string,
    criteria?: MatchingCriteria
  ): Promise<ApplicantMatch> {
    const applicant = await this.getApplicant(applicantId);
    const job = await this.getJob(jobId);

    if (!applicant || !job) {
      throw new Error("Applicant or job not found");
    }

    const match = await this.calculateMatch(applicant, job, criteria);
    return match;
  }

  /**
   * Find job recommendations for an applicant
   */
  async findJobRecommendations(
    applicantId: string,
    limit: number = 10,
    criteria?: MatchingCriteria
  ): Promise<JobRecommendation[]> {
    const applicant = await this.getApplicant(applicantId);
    if (!applicant) {
      throw new Error("Applicant not found");
    }

    // Get recent jobs
    const jobs = await this.getRecentJobs(limit * 2); // Get more to filter

    const recommendations: JobRecommendation[] = [];

    for (const job of jobs) {
      const match = await this.calculateMatch(applicant, job, criteria);

      if (match.match_score >= (criteria?.min_score || 0.6)) {
        recommendations.push({
          job,
          match,
          reasons: this.generateMatchReasons(match),
        });
      }
    }

    // Sort by match score and return top recommendations
    return recommendations
      .sort((a, b) => b.match.match_score - a.match.match_score)
      .slice(0, limit);
  }

  /**
   * Find applicants for a specific job
   */
  async findApplicantsForJob(
    jobId: string,
    limit: number = 10,
    criteria?: MatchingCriteria
  ): Promise<MatchingResult[]> {
    const job = await this.getJob(jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    // Get applicants with relevant skills
    const applicants = await this.getApplicantsWithSkills(
      job.required_skills || []
    );

    const results: MatchingResult[] = [];

    for (const applicant of applicants) {
      const match = await this.calculateMatch(applicant, job, criteria);

      if (match.match_score >= (criteria?.min_score || 0.6)) {
        results.push({
          applicant,
          match,
          reasons: this.generateMatchReasons(match),
        });
      }
    }

    // Sort by match score and return top matches
    return results
      .sort((a, b) => b.match.match_score - a.match.match_score)
      .slice(0, limit);
  }

  /**
   * Calculate match score between applicant and job
   */
  private async calculateMatch(
    applicant: ApplicantProfile,
    job: Job,
    criteria?: MatchingCriteria
  ): Promise<ApplicantMatch> {
    const skillMatch = this.calculateSkillMatch(applicant, job);
    const experienceMatch = this.calculateExperienceMatch(applicant, job);
    const locationMatch = this.calculateLocationMatch(applicant, job);
    const salaryMatch = this.calculateSalaryMatch(applicant, job);
    const cultureMatch = this.calculateCultureMatch(applicant, job);

    // Calculate overall match score
    const weights = criteria?.weights || {
      skills: 0.3,
      experience: 0.25,
      location: 0.2,
      salary: 0.15,
      culture: 0.1,
    };

    const overallFit =
      skillMatch * (weights.skills || 0.3) +
      experienceMatch * (weights.experience || 0.25) +
      locationMatch * (weights.location || 0.2) +
      salaryMatch * (weights.salary || 0.15) +
      cultureMatch * (weights.culture || 0.1);

    return {
      applicant_id: applicant.id!,
      job_id: job.id,
      match_score: Math.round(overallFit * 100) / 100,
      skill_match: skillMatch,
      experience_match: experienceMatch,
      location_match: locationMatch,
      salary_match: salaryMatch,
      culture_match: cultureMatch,
      overall_fit: overallFit,
      matched_at: new Date().toISOString(),
    };
  }

  /**
   * Calculate skill match score
   */
  private calculateSkillMatch(applicant: ApplicantProfile, job: Job): number {
    const applicantSkills = applicant.skills || [];
    const requiredSkills = job.required_skills || [];
    const preferredSkills = job.preferred_skills || [];

    if (requiredSkills.length === 0) {
      return 1.0; // No required skills means perfect match
    }

    const requiredMatches = requiredSkills.filter((skill) =>
      applicantSkills.some((appSkill) => this.skillsMatch(appSkill, skill))
    ).length;

    const preferredMatches = preferredSkills.filter((skill) =>
      applicantSkills.some((appSkill) => this.skillsMatch(appSkill, skill))
    ).length;

    const requiredScore = requiredMatches / requiredSkills.length;
    const preferredScore =
      (preferredMatches / Math.max(preferredSkills.length, 1)) * 0.3;

    return Math.min(1.0, requiredScore + preferredScore);
  }

  /**
   * Calculate experience match score
   */
  private calculateExperienceMatch(
    applicant: ApplicantProfile,
    job: Job
  ): number {
    const applicantExp = applicant.years_experience || 0;
    const requiredExp = job.experience_required || 0;

    if (requiredExp === 0) {
      return 1.0; // No experience required
    }

    if (applicantExp >= requiredExp) {
      return 1.0; // Meets or exceeds requirements
    }

    // Partial credit for partial experience
    return Math.max(0.3, applicantExp / requiredExp);
  }

  /**
   * Calculate location match score
   */
  private calculateLocationMatch(
    applicant: ApplicantProfile,
    job: Job
  ): number {
    const applicantLocations = applicant.preferences?.locations || [];
    const jobLocation = job.location;

    if (!jobLocation || applicantLocations.length === 0) {
      return 0.5; // Neutral if no location data
    }

    // Check for exact match
    if (
      applicantLocations.some((loc) => this.locationsMatch(loc, jobLocation))
    ) {
      return 1.0;
    }

    // Check for remote work preference
    if (
      job.remote_work &&
      applicant.preferences?.remote_preference === "required"
    ) {
      return 1.0;
    }

    // Check for partial match (city/state level)
    const partialMatch = applicantLocations.some((loc) =>
      this.partialLocationMatch(loc, jobLocation)
    );

    return partialMatch ? 0.7 : 0.3;
  }

  /**
   * Calculate salary match score
   */
  private calculateSalaryMatch(applicant: ApplicantProfile, job: Job): number {
    const applicantMin = applicant.preferences?.salary_min || 0;
    const applicantMax = applicant.preferences?.salary_max || Infinity;
    const jobMin = job.salary_min || 0;
    const jobMax = job.salary_max || Infinity;

    if (applicantMin === 0 && applicantMax === Infinity) {
      return 0.5; // No salary preferences
    }

    if (jobMin === 0 && jobMax === Infinity) {
      return 0.5; // No salary information
    }

    // Check if salary ranges overlap
    const rangesOverlap = !(jobMax < applicantMin || applicantMax < jobMin);

    if (!rangesOverlap) {
      return 0.2; // No overlap
    }

    // Calculate overlap percentage
    const overlapMin = Math.max(applicantMin, jobMin);
    const overlapMax = Math.min(applicantMax, jobMax);
    const overlapRange = overlapMax - overlapMin;
    const totalRange =
      Math.max(applicantMax, jobMax) - Math.min(applicantMin, jobMin);

    return Math.max(0.5, overlapRange / totalRange);
  }

  /**
   * Calculate culture match score
   */
  private calculateCultureMatch(applicant: ApplicantProfile, job: Job): number {
    // This is a simplified implementation
    // In a real system, you'd have more sophisticated culture matching
    const applicantSkills = applicant.skills || [];
    const jobDescription = job.description || "";

    // Look for culture-related keywords in job description
    const cultureKeywords = [
      "collaborative",
      "team",
      "innovative",
      "creative",
      "fast-paced",
      "startup",
      "established",
      "remote",
      "flexible",
      "diverse",
    ];

    const cultureMatches = cultureKeywords.filter((keyword) =>
      jobDescription.toLowerCase().includes(keyword)
    ).length;

    return Math.min(1.0, cultureMatches / cultureKeywords.length);
  }

  /**
   * Check if two skills match (with fuzzy matching)
   */
  private skillsMatch(skill1: string, skill2: string): boolean {
    const s1 = skill1.toLowerCase().trim();
    const s2 = skill2.toLowerCase().trim();

    // Exact match
    if (s1 === s2) return true;

    // Contains match
    if (s1.includes(s2) || s2.includes(s1)) return true;

    // Common variations
    const variations: { [key: string]: string[] } = {
      javascript: ["js", "ecmascript"],
      typescript: ["ts"],
      react: ["reactjs", "react.js"],
      node: ["nodejs", "node.js"],
      python: ["py"],
      "machine learning": ["ml", "ai"],
      "artificial intelligence": ["ai", "machine learning"],
    };

    for (const [key, variants] of Object.entries(variations)) {
      if (
        (s1 === key || variants.includes(s1)) &&
        (s2 === key || variants.includes(s2))
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if two locations match
   */
  private locationsMatch(loc1: string, loc2: string): boolean {
    const l1 = loc1.toLowerCase().trim();
    const l2 = loc2.toLowerCase().trim();

    return l1 === l2 || l1.includes(l2) || l2.includes(l1);
  }

  /**
   * Check for partial location match (city/state level)
   */
  private partialLocationMatch(loc1: string, loc2: string): boolean {
    const l1 = loc1.toLowerCase().trim();
    const l2 = loc2.toLowerCase().trim();

    // Split by common separators
    const parts1 = l1.split(/[,\s-]+/);
    const parts2 = l2.split(/[,\s-]+/);

    // Check if any parts match
    return parts1.some((p1) => parts2.some((p2) => p1 === p2 && p1.length > 2));
  }

  /**
   * Generate human-readable match reasons
   */
  private generateMatchReasons(match: ApplicantMatch): string[] {
    const reasons: string[] = [];

    if (match.skill_match >= 0.8) {
      reasons.push("Strong skill match");
    } else if (match.skill_match >= 0.6) {
      reasons.push("Good skill match");
    }

    if (match.experience_match >= 0.8) {
      reasons.push("Experience requirements met");
    } else if (match.experience_match >= 0.6) {
      reasons.push("Partial experience match");
    }

    if (match.location_match >= 0.8) {
      reasons.push("Location preference match");
    }

    if (match.salary_match >= 0.8) {
      reasons.push("Salary expectations align");
    }

    if (match.culture_match >= 0.7) {
      reasons.push("Cultural fit");
    }

    return reasons;
  }

  /**
   * Get applicant by ID
   */
  private async getApplicant(
    applicantId: string
  ): Promise<ApplicantProfile | null> {
    const result = await this.env.DB.prepare(
      `
      SELECT * FROM applicant_profiles WHERE id = ?
    `
    )
      .bind(applicantId)
      .first();

    if (!result) return null;

    return {
      id: result.id,
      user_id: result.user_id,
      name: result.name,
      email: result.email,
      phone: result.phone,
      current_title: result.current_title,
      target_roles: result.target_roles
        ? JSON.parse(result.target_roles)
        : undefined,
      years_experience: result.years_experience,
      education_level: result.education_level,
      skills: result.skills ? JSON.parse(result.skills) : undefined,
      preferences: result.preferences
        ? JSON.parse(result.preferences)
        : undefined,
      created_at: result.created_at,
      updated_at: result.updated_at,
    };
  }

  /**
   * Get job by ID
   */
  private async getJob(jobId: string): Promise<Job | null> {
    const result = await this.env.DB.prepare(
      `
      SELECT * FROM jobs WHERE id = ?
    `
    )
      .bind(jobId)
      .first();

    if (!result) return null;

    return {
      id: result.id,
      site_id: result.site_id,
      url: result.url,
      title: result.title,
      company: result.company,
      location: result.location,
      salary_min: result.salary_min,
      salary_max: result.salary_max,
      description: result.description,
      status: result.status,
      tags: result.tags ? JSON.parse(result.tags) : undefined,
      posted_at: result.posted_at,
      first_seen_at: result.first_seen_at,
      last_crawled_at: result.last_crawled_at,
      last_changed_at: result.last_changed_at,
      created_at: result.created_at,
      updated_at: result.updated_at,
      // Additional fields for matching
      required_skills: result.required_skills
        ? JSON.parse(result.required_skills)
        : undefined,
      preferred_skills: result.preferred_skills
        ? JSON.parse(result.preferred_skills)
        : undefined,
      experience_required: result.experience_required,
      remote_work: result.remote_work,
    };
  }

  /**
   * Get recent jobs
   */
  private async getRecentJobs(limit: number): Promise<Job[]> {
    const result = await this.env.DB.prepare(
      `
      SELECT * FROM jobs 
      WHERE status = 'open' 
      ORDER BY posted_at DESC 
      LIMIT ?
    `
    )
      .bind(limit)
      .all();

    return (result || []).map((row: any) => ({
      id: row.id,
      site_id: row.site_id,
      url: row.url,
      title: row.title,
      company: row.company,
      location: row.location,
      salary_min: row.salary_min,
      salary_max: row.salary_max,
      description: row.description,
      status: row.status,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      posted_at: row.posted_at,
      first_seen_at: row.first_seen_at,
      last_crawled_at: row.last_crawled_at,
      last_changed_at: row.last_changed_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      required_skills: row.required_skills
        ? JSON.parse(row.required_skills)
        : undefined,
      preferred_skills: row.preferred_skills
        ? JSON.parse(row.preferred_skills)
        : undefined,
      experience_required: row.experience_required,
      remote_work: row.remote_work,
    }));
  }

  /**
   * Get applicants with specific skills
   */
  private async getApplicantsWithSkills(
    skills: string[]
  ): Promise<ApplicantProfile[]> {
    if (skills.length === 0) {
      return [];
    }

    const skillConditions = skills.map(() => "skills LIKE ?").join(" OR ");
    const skillParams = skills.map((skill) => `%${skill}%`);

    const result = await this.env.DB.prepare(
      `
      SELECT * FROM applicant_profiles 
      WHERE ${skillConditions}
      ORDER BY updated_at DESC
      LIMIT 50
    `
    )
      .bind(...skillParams)
      .all();

    return (result || []).map((row: any) => ({
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
    }));
  }
}

/**
 * Factory function to create an ApplicantMatchingService instance
 */
export function createApplicantMatchingService(
  env: Env
): ApplicantMatchingService {
  return new ApplicantMatchingService(env);
}
