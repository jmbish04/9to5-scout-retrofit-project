-- Ensures that foreign key constraints are enforced for data integrity.
PRAGMA foreign_keys=ON;

--
-- Table: profiles
-- Description: Stores the core personal and contact information for the user. This acts as the central point for the user's professional identity.
--
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,                       -- Unique identifier for the profile
  full_name TEXT NOT NULL,                   -- The user's full name
  email TEXT,                                -- The user's primary contact email
  phone_number TEXT,                         -- The user's contact phone number
  linkedin_url TEXT,                         -- URL to the user's LinkedIn profile
  github_url TEXT,                           -- URL to the user's GitHub profile
  portfolio_url TEXT,                        -- URL to a personal website or portfolio
  summary_md TEXT,                           -- A professional summary or objective, in Markdown format
  created_at TEXT DEFAULT CURRENT_TIMESTAMP, -- Timestamp when the profile was created
  updated_at TEXT                            -- Timestamp of the last profile update
);

--
-- Table: experiences
-- Description: Chronicles the user's professional work history.
--
CREATE TABLE experiences (
  id TEXT PRIMARY KEY,                       -- Unique identifier for the experience entry
  profile_id TEXT NOT NULL REFERENCES profiles(id), -- Links to the user's profile
  company_name TEXT NOT NULL,                -- The name of the employer
  job_title TEXT NOT NULL,                   -- The user's title in this role
  location TEXT,                             -- The location of the job (e.g., "San Francisco, CA")
  start_date TEXT NOT NULL,                  -- The start date of employment
  end_date TEXT,                             -- The end date of employment (NULL if current)
  description_md TEXT,                       -- A detailed description of responsibilities and achievements, in Markdown
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

--
-- Table: educations
-- Description: Stores the user's academic background and qualifications.
--
CREATE TABLE educations (
  id TEXT PRIMARY KEY,                       -- Unique identifier for the education entry
  profile_id TEXT NOT NULL REFERENCES profiles(id), -- Links to the user's profile
  institution_name TEXT NOT NULL,            -- The name of the educational institution
  degree TEXT,                               -- The degree obtained (e.g., "Bachelor of Science")
  field_of_study TEXT,                       -- The major or field of study (e.g., "Computer Science")
  start_date TEXT,                           -- The start date of attendance
  end_date TEXT,                             -- The graduation or end date
  description_md TEXT,                       -- Additional details like honors, relevant coursework, or thesis, in Markdown
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

--
-- Table: projects
-- Description: Showcases significant personal or professional projects the user has completed.
--
CREATE TABLE projects (
  id TEXT PRIMARY KEY,                       -- Unique identifier for the project
  profile_id TEXT NOT NULL REFERENCES profiles(id), -- Links to the user's profile
  project_name TEXT NOT NULL,                -- The title of the project
  description_md TEXT,                       -- A comprehensive description of the project, its purpose, and the outcome, in Markdown
  technologies_used TEXT,                    -- A comma-separated list of key technologies or skills used
  project_url TEXT,                          -- A URL to the live project or a demo
  repository_url TEXT,                       -- A URL to the source code repository (e.g., GitHub)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

--
-- Table: skills
-- Description: A categorized list of the user's professional skills.
--
CREATE TABLE skills (
  id TEXT PRIMARY KEY,                       -- Unique identifier for the skill
  profile_id TEXT NOT NULL REFERENCES profiles(id), -- Links to the user's profile
  skill_name TEXT NOT NULL,                  -- The name of the skill (e.g., "Python", "React", "Project Management")
  category TEXT,                             -- A category for the skill (e.g., "Programming Language", "Framework", "Cloud", "Methodology")
  proficiency_level TEXT,                    -- The user's self-assessed proficiency (e.g., "Expert", "Advanced", "Intermediate")
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

--
-- Table: certifications
-- Description: Lists any professional certifications the user has earned.
--
CREATE TABLE certifications (
  id TEXT PRIMARY KEY,                       -- Unique identifier for the certification
  profile_id TEXT NOT NULL REFERENCES profiles(id), -- Links to the user's profile
  certification_name TEXT NOT NULL,          -- The name of the certification
  issuing_organization TEXT NOT NULL,        -- The organization that issued the certification (e.g., "AWS", "Google Cloud")
  issue_date TEXT,                           -- The date the certification was issued
  expiration_date TEXT,                      -- The expiration date (NULL if it does not expire)
  credential_id TEXT,                        -- A unique ID for verifying the credential
  credential_url TEXT,                       -- A URL to the credential for verification
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

--
-- Table: job_applications
-- Description: Tracks jobs that have been analyzed or applied to by the AI agent, linking the user's profile to a specific job posting.
--
CREATE TABLE job_applications (
  id TEXT PRIMARY KEY,                       -- Unique identifier for the application record
  job_id TEXT NOT NULL,                      -- Foreign key to the `jobs` table in the other schema
  profile_id TEXT NOT NULL REFERENCES profiles(id), -- Links to the user's profile
  status TEXT NOT NULL,                      -- The current status (e.g., "pending_review", "applied", "rejected", "interviewing")
  applied_at TEXT,                           -- Timestamp when the application was submitted
  fit_score INTEGER,                         -- A score (0-100) from the agent on how well the profile matches the job
  fit_summary TEXT,                          -- An AI-generated summary explaining the rationale for the fit score
  notes_md TEXT,                             -- Any notes from the agent or user about this application, in Markdown
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
