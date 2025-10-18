/**
 * Applicant Types
 *
 * TypeScript interfaces and types for applicant management,
 * including profiles, job history, and career preferences.
 */

export interface ApplicantProfile {
  id: string;
  user_id: string;
  name?: string;
  email?: string;
  phone?: string;
  current_title?: string;
  target_roles?: string[];
  years_experience?: number;
  education_level?: string;
  skills?: string[];
  preferences?: ApplicantPreferences;
  created_at: string;
  updated_at: string;
}

export interface ApplicantPreferences {
  locations?: string[];
  salary_min?: number;
  salary_max?: number;
  employment_types?: string[];
  remote_preference?: "required" | "preferred" | "no_preference";
  industries?: string[];
  company_sizes?: string[];
  benefits_priority?: string[];
}

export interface JobHistoryEntry {
  id: string;
  applicant_id: string;
  company_name: string;
  job_title: string;
  department?: string;
  employment_type:
    | "full-time"
    | "part-time"
    | "contract"
    | "internship"
    | "freelance";
  start_date: string;
  end_date?: string;
  is_current: boolean;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency: string;
  responsibilities: string;
  achievements: string;
  skills_used: string[];
  technologies: string[];
  keywords: string[];
  created_at: string;
  updated_at: string;
}

export interface JobHistorySubmission {
  id: string;
  applicant_id: string;
  raw_content: string;
  content_type: string;
  processing_status: "pending" | "processing" | "completed" | "failed";
  processed_at?: string;
  error_message?: string;
  submitted_at: string;
}

export interface JobRating {
  id: string;
  applicant_id: string;
  job_id: string;
  overall_rating: number;
  skill_match_rating: number;
  salary_fit_rating: number;
  location_rating: number;
  company_culture_rating: number;
  growth_opportunity_rating: number;
  comments?: string;
  created_at: string;
  updated_at: string;
}

export interface ApplicantMatch {
  applicant_id: string;
  job_id: string;
  match_score: number;
  skill_match: number;
  experience_match: number;
  location_match: number;
  salary_match: number;
  culture_match: number;
  overall_fit: number;
  matched_at: string;
}

export interface ApplicantSearchRequest {
  query?: string;
  skills?: string[];
  experience_years?: number;
  location?: string;
  target_roles?: string[];
  limit?: number;
  offset?: number;
}

export interface ApplicantSearchResponse {
  applicants: ApplicantProfile[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface JobHistoryRequest {
  user_id: string;
  raw_content: string;
  content_type?: string;
}

export interface JobHistoryResponse {
  applicant: ApplicantProfile;
  job_history: JobHistoryEntry[];
  submissions: JobHistorySubmission[];
}

export interface JobRatingRequest {
  applicant_id: string;
  job_id: string;
  overall_rating: number;
  skill_match_rating: number;
  salary_fit_rating: number;
  location_rating: number;
  company_culture_rating: number;
  growth_opportunity_rating: number;
  comments?: string;
}

export interface JobRatingResponse {
  rating: JobRating;
}

export interface ApplicantMatchRequest {
  applicant_id: string;
  job_id: string;
}

export interface ApplicantMatchResponse {
  match: ApplicantMatch;
}

export interface CreateApplicantRequest {
  user_id: string;
  name?: string;
  email?: string;
  phone?: string;
  current_title?: string;
  target_roles?: string[];
  years_experience?: number;
  education_level?: string;
  skills?: string[];
  preferences?: ApplicantPreferences;
}

export interface UpdateApplicantRequest {
  name?: string;
  email?: string;
  phone?: string;
  current_title?: string;
  target_roles?: string[];
  years_experience?: number;
  education_level?: string;
  skills?: string[];
  preferences?: ApplicantPreferences;
}

export interface ApplicantResponse {
  applicant: ApplicantProfile;
}

export interface ApplicantListResponse {
  applicants: ApplicantProfile[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface ApplicantStats {
  total_applicants: number;
  active_applicants: number;
  average_experience: number;
  top_skills: string[];
  top_locations: string[];
  top_target_roles: string[];
  average_rating: number;
}

export interface ApplicantStatsResponse {
  stats: ApplicantStats;
}

// Job interface for matching
export interface Job {
  id: string;
  site_id: string;
  url: string;
  title: string;
  company: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  description?: string;
  status: string;
  tags?: string[];
  posted_at?: string;
  first_seen_at: string;
  last_crawled_at?: string;
  last_changed_at?: string;
  created_at: string;
  updated_at: string;
  // Additional fields for matching
  required_skills?: string[];
  preferred_skills?: string[];
  experience_required?: number;
  remote_work?: boolean;
}

// Matching types
export interface MatchingCriteria {
  min_score?: number;
  weights?: {
    skills?: number;
    experience?: number;
    location?: number;
    salary?: number;
    culture?: number;
  };
}

export interface MatchingResult {
  applicant: ApplicantProfile;
  match: ApplicantMatch;
  reasons: string[];
}

export interface JobRecommendation {
  job: Job;
  match: ApplicantMatch;
  reasons: string[];
}
