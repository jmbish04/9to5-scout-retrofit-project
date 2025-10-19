import type {
  ApplicantProfile,
  JobHistoryEntry,
  JobHistorySubmission,
  JobRating,
} from "../../../lib/types";

export interface StorageEnv {
  DB: D1Database;
}

/**
 * Get an applicant profile by user ID.
 */
export async function getApplicantProfile(
  env: StorageEnv,
  userId: string
): Promise<ApplicantProfile | null> {
  const result = await env.DB.prepare(
    "SELECT * FROM applicant_profiles WHERE user_id = ?"
  )
    .bind(userId)
    .first();

  if (!result) return null;

  return {
    ...result,
    target_roles:
      result.target_roles && typeof result.target_roles === "string"
        ? JSON.parse(result.target_roles)
        : [],
    skills:
      result.skills && typeof result.skills === "string"
        ? JSON.parse(result.skills)
        : [],
    preferences:
      result.preferences && typeof result.preferences === "string"
        ? JSON.parse(result.preferences)
        : {},
  } as ApplicantProfile;
}

/**
 * Create a new applicant profile.
 */
export async function createApplicantProfile(
  env: StorageEnv,
  userId: string
): Promise<ApplicantProfile> {
  const id = crypto.randomUUID();
  const profile: ApplicantProfile = {
    id,
    user_id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await env.DB.prepare(
    `
    INSERT INTO applicant_profiles (id, user_id, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `
  )
    .bind(id, userId, profile.created_at, profile.updated_at)
    .run();

  return profile;
}

/**
 * Update an applicant profile.
 */
export async function updateApplicantProfile(
  env: StorageEnv,
  applicantId: string,
  updates: Partial<ApplicantProfile>
): Promise<void> {
  const setClause = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && key !== "id" && key !== "user_id") {
      setClause.push(`${key} = ?`);
      if (Array.isArray(value) || typeof value === "object") {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
    }
  }

  if (setClause.length === 0) return;

  setClause.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(applicantId);

  await env.DB.prepare(
    `
    UPDATE applicant_profiles
    SET ${setClause.join(", ")}
    WHERE id = ?
  `
  )
    .bind(...values)
    .run();
}

/**
 * Save a job history submission.
 */
export async function saveJobHistorySubmission(
  env: StorageEnv,
  submission: JobHistorySubmission
): Promise<void> {
  await env.DB.prepare(
    `
    INSERT INTO job_history_submissions
    (id, applicant_id, raw_content, content_type, processing_status, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `
  )
    .bind(
      submission.id,
      submission.applicant_id,
      submission.raw_content,
      submission.content_type,
      submission.processing_status,
      submission.submitted_at
    )
    .run();
}

/**
 * Update a job history submission.
 */
export async function updateJobHistorySubmission(
  env: StorageEnv,
  submissionId: string,
  updates: Partial<JobHistorySubmission>
): Promise<void> {
  const setClause = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && key !== "id") {
      setClause.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (setClause.length === 0) return;

  values.push(submissionId);

  await env.DB.prepare(
    `
    UPDATE job_history_submissions
    SET ${setClause.join(", ")}
    WHERE id = ?
  `
  )
    .bind(...values)
    .run();
}

/**
 * Save a job history entry.
 */
export async function saveJobHistoryEntry(
  env: StorageEnv,
  entry: JobHistoryEntry
): Promise<JobHistoryEntry> {
  const id = entry.id || crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `
    INSERT INTO job_history
    (id, applicant_id, company_name, job_title, department, employment_type,
     start_date, end_date, is_current, location, salary_min, salary_max,
     salary_currency, responsibilities, achievements, skills_used, technologies,
     keywords, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  )
    .bind(
      id,
      entry.applicant_id,
      entry.company_name,
      entry.job_title,
      entry.department,
      entry.employment_type,
      entry.start_date,
      entry.end_date,
      entry.is_current ? 1 : 0,
      entry.location,
      entry.salary_min,
      entry.salary_max,
      entry.salary_currency,
      entry.responsibilities,
      entry.achievements,
      entry.skills_used ? JSON.stringify(entry.skills_used) : null,
      entry.technologies ? JSON.stringify(entry.technologies) : null,
      entry.keywords ? JSON.stringify(entry.keywords) : null,
      now,
      now
    )
    .run();

  return { ...entry, id, created_at: now, updated_at: now };
}

/**
 * Get job history by applicant ID.
 */
export async function getJobHistoryByApplicant(
  env: StorageEnv,
  applicantId: string
): Promise<JobHistoryEntry[]> {
  const results = await env.DB.prepare(
    "SELECT * FROM job_history WHERE applicant_id = ? ORDER BY start_date DESC"
  )
    .bind(applicantId)
    .all();

  return results.results.map(
    (row: any): JobHistoryEntry => ({
      id: row.id,
      applicant_id: row.applicant_id,
      company_name: row.company_name,
      job_title: row.job_title,
      department: row.department,
      employment_type: row.employment_type,
      start_date: row.start_date,
      end_date: row.end_date,
      location: row.location,
      salary_min: row.salary_min,
      salary_max: row.salary_max,
      salary_currency: row.salary_currency,
      responsibilities: row.responsibilities,
      achievements: row.achievements,
      created_at: row.created_at,
      updated_at: row.updated_at,
      is_current: Boolean(row.is_current),
      skills_used: row.skills_used ? JSON.parse(row.skills_used) : [],
      technologies: row.technologies ? JSON.parse(row.technologies) : [],
      keywords: row.keywords ? JSON.parse(row.keywords) : [],
    })
  );
}

/**
 * Get job history submissions by applicant ID.
 */
export async function getJobHistorySubmissions(
  env: StorageEnv,
  applicantId: string
): Promise<JobHistorySubmission[]> {
  const results = await env.DB.prepare(
    "SELECT * FROM job_history_submissions WHERE applicant_id = ? ORDER BY submitted_at DESC"
  )
    .bind(applicantId)
    .all();

  return (results.results || []) as unknown as JobHistorySubmission[];
}

/**
 * Save or update a job rating.
 */
export async function saveJobRating(
  env: StorageEnv,
  rating: JobRating
): Promise<JobRating> {
  const id = rating.id || crypto.randomUUID();
  const now = new Date().toISOString();

  // Use INSERT ... ON CONFLICT for a safe upsert
  await env.DB.prepare(
    `
    INSERT INTO job_ratings
    (id, applicant_id, job_id, overall_score, skill_match_score, experience_match_score,
     compensation_fit_score, location_fit_score, company_culture_score, growth_potential_score,
     rating_summary, recommendation, strengths, gaps, improvement_suggestions,
     created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(applicant_id, job_id) DO UPDATE SET
      overall_score = excluded.overall_score,
      skill_match_score = excluded.skill_match_score,
      experience_match_score = excluded.experience_match_score,
      compensation_fit_score = excluded.compensation_fit_score,
      location_fit_score = excluded.location_fit_score,
      company_culture_score = excluded.company_culture_score,
      growth_potential_score = excluded.growth_potential_score,
      rating_summary = excluded.rating_summary,
      recommendation = excluded.recommendation,
      strengths = excluded.strengths,
      gaps = excluded.gaps,
      improvement_suggestions = excluded.improvement_suggestions,
      updated_at = excluded.updated_at
  `
  )
    .bind(
      id,
      rating.applicant_id,
      rating.job_id,
      rating.overall_score,
      rating.skill_match_score,
      rating.experience_match_score,
      rating.compensation_fit_score,
      rating.location_fit_score,
      rating.company_culture_score,
      rating.growth_potential_score,
      rating.rating_summary,
      rating.recommendation,
      rating.strengths ? JSON.stringify(rating.strengths) : null,
      rating.gaps ? JSON.stringify(rating.gaps) : null,
      rating.improvement_suggestions,
      now,
      now
    )
    .run();

  return { ...rating, id, created_at: now, updated_at: now };
}

/**
 * Get job ratings by applicant ID.
 */
export async function getJobRatingsByApplicant(
  env: StorageEnv,
  applicantId: string
): Promise<JobRating[]> {
  const results = await env.DB.prepare(
    `
    SELECT jr.*, j.title as job_title, j.company as job_company, j.url as job_url
    FROM job_ratings jr
    JOIN jobs j ON jr.job_id = j.id
    WHERE jr.applicant_id = ?
    ORDER BY jr.overall_score DESC
  `
  )
    .bind(applicantId)
    .all();

  return results.results.map((row: any) => ({
    ...row,
    strengths: row.strengths ? JSON.parse(row.strengths) : [],
    gaps: row.gaps ? JSON.parse(row.gaps) : [],
  })) as JobRating[];
}
