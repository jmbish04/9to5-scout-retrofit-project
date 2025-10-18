-- Migration 016: Career Coach and Talent Agent - Applicant Profiles
-- Creates comprehensive tables for managing applicant profiles and career data

PRAGMA foreign_keys=ON;

-- Main applicant profiles table
CREATE TABLE IF NOT EXISTS applicant_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL, -- External user identifier
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  location TEXT,
  timezone TEXT,
  current_title TEXT,
  current_company TEXT,
  years_experience INTEGER,
  is_active BOOLEAN DEFAULT 1,
  is_confirmed BOOLEAN DEFAULT 0, -- For human-in-the-loop approval
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Job history table
CREATE TABLE IF NOT EXISTS job_history (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT, -- NULL for current position
  is_current BOOLEAN DEFAULT 0,
  location TEXT,
  description TEXT,
  achievements TEXT, -- JSON array of achievements
  skills_used TEXT, -- JSON array of skills
  salary_range TEXT, -- e.g., "80000-100000"
  employment_type TEXT, -- 'full-time', 'part-time', 'contract', 'internship'
  is_confirmed BOOLEAN DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES applicant_profiles(id) ON DELETE CASCADE
);

-- Skills table
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  skill_category TEXT, -- 'technical', 'soft', 'language', 'certification'
  proficiency_level TEXT, -- 'beginner', 'intermediate', 'advanced', 'expert'
  years_experience INTEGER,
  is_confirmed BOOLEAN DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES applicant_profiles(id) ON DELETE CASCADE,
  UNIQUE(profile_id, skill_name)
);

-- Career goals table
CREATE TABLE IF NOT EXISTS career_goals (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  goal_type TEXT NOT NULL, -- 'short_term', 'long_term', 'skill_development', 'career_change'
  title TEXT NOT NULL,
  description TEXT,
  target_date TEXT,
  priority INTEGER DEFAULT 1, -- 1-5 scale
  is_confirmed BOOLEAN DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES applicant_profiles(id) ON DELETE CASCADE
);

-- Industry interests table
CREATE TABLE IF NOT EXISTS industry_interests (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  industry_name TEXT NOT NULL,
  interest_level TEXT, -- 'low', 'medium', 'high'
  notes TEXT,
  is_confirmed BOOLEAN DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES applicant_profiles(id) ON DELETE CASCADE,
  UNIQUE(profile_id, industry_name)
);

-- Salary goals table
CREATE TABLE IF NOT EXISTS salary_goals (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  min_salary INTEGER,
  max_salary INTEGER,
  currency TEXT DEFAULT 'USD',
  salary_type TEXT, -- 'annual', 'hourly', 'contract'
  location TEXT,
  is_confirmed BOOLEAN DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES applicant_profiles(id) ON DELETE CASCADE
);

-- Profile changes table (for staging changes)
CREATE TABLE IF NOT EXISTS profile_changes (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  change_type TEXT NOT NULL, -- 'create', 'update', 'delete'
  table_name TEXT NOT NULL, -- Which table was changed
  record_id TEXT, -- ID of the changed record
  old_values TEXT, -- JSON of old values
  new_values TEXT, -- JSON of new values
  change_reason TEXT, -- Why the change was made
  ai_suggested BOOLEAN DEFAULT 0, -- Whether change was AI-suggested
  is_confirmed BOOLEAN DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES applicant_profiles(id) ON DELETE CASCADE
);

-- Profile approvals table (for human-in-the-loop)
CREATE TABLE IF NOT EXISTS profile_approvals (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  change_id TEXT NOT NULL,
  approver_id TEXT, -- User ID of approver
  status TEXT NOT NULL, -- 'pending', 'approved', 'rejected'
  comments TEXT,
  approved_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES applicant_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (change_id) REFERENCES profile_changes(id) ON DELETE CASCADE
);

-- Resume and cover letter analysis table
CREATE TABLE IF NOT EXISTS document_analysis (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  document_type TEXT NOT NULL, -- 'resume', 'cover_letter', 'portfolio'
  document_content TEXT NOT NULL,
  analysis_results TEXT, -- JSON of AI analysis
  suggested_improvements TEXT, -- JSON of suggestions
  ai_confidence REAL, -- 0-1 confidence score
  is_confirmed BOOLEAN DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES applicant_profiles(id) ON DELETE CASCADE
);

-- Interview preparation data table
CREATE TABLE IF NOT EXISTS interview_prep_data (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  job_id TEXT, -- Reference to jobs table if available
  prep_type TEXT NOT NULL, -- 'general', 'technical', 'behavioral', 'company_specific'
  questions TEXT, -- JSON array of questions
  answers TEXT, -- JSON array of answers
  feedback TEXT, -- AI feedback on answers
  score REAL, -- Overall preparation score
  is_confirmed BOOLEAN DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES applicant_profiles(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_applicant_profiles_user_id ON applicant_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_applicant_profiles_email ON applicant_profiles(email);
CREATE INDEX IF NOT EXISTS idx_applicant_profiles_is_active ON applicant_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_applicant_profiles_is_confirmed ON applicant_profiles(is_confirmed);

CREATE INDEX IF NOT EXISTS idx_job_history_profile_id ON job_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_job_history_company_name ON job_history(company_name);
CREATE INDEX IF NOT EXISTS idx_job_history_is_current ON job_history(is_current);
CREATE INDEX IF NOT EXISTS idx_job_history_is_confirmed ON job_history(is_confirmed);

CREATE INDEX IF NOT EXISTS idx_skills_profile_id ON skills(profile_id);
CREATE INDEX IF NOT EXISTS idx_skills_skill_name ON skills(skill_name);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(skill_category);
CREATE INDEX IF NOT EXISTS idx_skills_is_confirmed ON skills(is_confirmed);

CREATE INDEX IF NOT EXISTS idx_career_goals_profile_id ON career_goals(profile_id);
CREATE INDEX IF NOT EXISTS idx_career_goals_goal_type ON career_goals(goal_type);
CREATE INDEX IF NOT EXISTS idx_career_goals_is_confirmed ON career_goals(is_confirmed);

CREATE INDEX IF NOT EXISTS idx_industry_interests_profile_id ON industry_interests(profile_id);
CREATE INDEX IF NOT EXISTS idx_industry_interests_industry_name ON industry_interests(industry_name);
CREATE INDEX IF NOT EXISTS idx_industry_interests_is_confirmed ON industry_interests(is_confirmed);

CREATE INDEX IF NOT EXISTS idx_salary_goals_profile_id ON salary_goals(profile_id);
CREATE INDEX IF NOT EXISTS idx_salary_goals_is_confirmed ON salary_goals(is_confirmed);

CREATE INDEX IF NOT EXISTS idx_profile_changes_profile_id ON profile_changes(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_changes_change_type ON profile_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_profile_changes_is_confirmed ON profile_changes(is_confirmed);
CREATE INDEX IF NOT EXISTS idx_profile_changes_ai_suggested ON profile_changes(ai_suggested);

CREATE INDEX IF NOT EXISTS idx_profile_approvals_profile_id ON profile_approvals(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_approvals_change_id ON profile_approvals(change_id);
CREATE INDEX IF NOT EXISTS idx_profile_approvals_status ON profile_approvals(status);

CREATE INDEX IF NOT EXISTS idx_document_analysis_profile_id ON document_analysis(profile_id);
CREATE INDEX IF NOT EXISTS idx_document_analysis_document_type ON document_analysis(document_type);
CREATE INDEX IF NOT EXISTS idx_document_analysis_is_confirmed ON document_analysis(is_confirmed);

CREATE INDEX IF NOT EXISTS idx_interview_prep_data_profile_id ON interview_prep_data(profile_id);
CREATE INDEX IF NOT EXISTS idx_interview_prep_data_job_id ON interview_prep_data(job_id);
CREATE INDEX IF NOT EXISTS idx_interview_prep_data_prep_type ON interview_prep_data(prep_type);
CREATE INDEX IF NOT EXISTS idx_interview_prep_data_is_confirmed ON interview_prep_data(is_confirmed);
