-- Job History Management Schema
PRAGMA foreign_keys=ON;

-- Table to store applicant profiles and their job history
CREATE TABLE applicant_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE, -- User identifier for multi-user support
  name TEXT,
  email TEXT,
  phone TEXT,
  current_title TEXT,
  target_roles TEXT, -- JSON array of target job titles
  years_experience INTEGER,
  education_level TEXT,
  skills TEXT, -- JSON array of skills
  preferences TEXT, -- JSON object for job preferences (location, salary, etc.)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Table to store structured job history entries
CREATE TABLE job_history (
  id TEXT PRIMARY KEY,
  applicant_id TEXT NOT NULL REFERENCES applicant_profiles(id),
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  department TEXT,
  employment_type TEXT, -- full-time, part-time, contract, etc.
  start_date TEXT, -- ISO date format
  end_date TEXT, -- ISO date format, NULL if current
  is_current BOOLEAN DEFAULT 0,
  location TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'USD',
  responsibilities TEXT, -- Markdown formatted responsibilities
  achievements TEXT, -- Markdown formatted achievements
  skills_used TEXT, -- JSON array of skills used in this role
  technologies TEXT, -- JSON array of technologies/tools used
  keywords TEXT, -- JSON array of extracted keywords for matching
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Table to store raw job history submissions before AI processing
CREATE TABLE job_history_submissions (
  id TEXT PRIMARY KEY,
  applicant_id TEXT NOT NULL REFERENCES applicant_profiles(id),
  raw_content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text/plain', -- text/plain, text/markdown, application/json
  processing_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  processing_error TEXT,
  ai_response TEXT, -- Raw AI response with extracted data
  processed_entries INTEGER DEFAULT 0, -- Number of job history entries created
  submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT
);

-- Table to store job ratings based on candidate fit
CREATE TABLE job_ratings (
  id TEXT PRIMARY KEY,
  applicant_id TEXT NOT NULL REFERENCES applicant_profiles(id),
  job_id TEXT NOT NULL REFERENCES jobs(id),
  overall_score INTEGER, -- 1-100 score based on fit
  skill_match_score INTEGER, -- 1-100 skill alignment score
  experience_match_score INTEGER, -- 1-100 experience level match
  compensation_fit_score INTEGER, -- 1-100 salary expectation match
  location_fit_score INTEGER, -- 1-100 location preference match
  company_culture_score INTEGER, -- 1-100 company culture fit
  growth_potential_score INTEGER, -- 1-100 career growth potential
  rating_summary TEXT, -- AI-generated summary of why this is a good/bad fit
  recommendation TEXT, -- AI recommendation: "Strong Match", "Good Fit", "Consider", "Pass"
  strengths TEXT, -- JSON array of candidate strengths for this role
  gaps TEXT, -- JSON array of skill/experience gaps
  improvement_suggestions TEXT, -- AI suggestions for improving candidacy
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(applicant_id, job_id)
);

-- Indexes for performance
CREATE INDEX idx_job_history_applicant ON job_history(applicant_id);
CREATE INDEX idx_job_history_company ON job_history(company_name);
CREATE INDEX idx_job_history_title ON job_history(job_title);
CREATE INDEX idx_job_history_current ON job_history(is_current);
CREATE INDEX idx_job_history_dates ON job_history(start_date, end_date);

CREATE INDEX idx_job_history_submissions_applicant ON job_history_submissions(applicant_id);
CREATE INDEX idx_job_history_submissions_status ON job_history_submissions(processing_status);

CREATE INDEX idx_job_ratings_applicant ON job_ratings(applicant_id);
CREATE INDEX idx_job_ratings_job ON job_ratings(job_id);
CREATE INDEX idx_job_ratings_score ON job_ratings(overall_score);
CREATE INDEX idx_job_ratings_recommendation ON job_ratings(recommendation);