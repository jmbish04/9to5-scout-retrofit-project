-- Agent State Management Migration
-- Creates tables for agent activities, data storage, and company profiles

-- Agent activities logging table
CREATE TABLE IF NOT EXISTS agent_activities (
  id TEXT PRIMARY KEY,
  agent_name TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  data TEXT, -- JSON data
  status TEXT CHECK(status IN ('info', 'warn', 'error')) DEFAULT 'info',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Agent data storage table (for SQLite storage within agents)
CREATE TABLE IF NOT EXISTS agent_data (
  agent_name TEXT NOT NULL,
  key TEXT NOT NULL,
  data TEXT NOT NULL, -- JSON data
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (agent_name, key)
);

-- Company profiles table for CompanyIntelligenceAgent
CREATE TABLE IF NOT EXISTS company_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT,
  industry TEXT,
  size TEXT,
  location TEXT,
  founded TEXT,
  description TEXT,
  mission TEXT,
  company_values TEXT, -- JSON array
  culture TEXT, -- JSON object
  recent_news TEXT, -- JSON array
  financials TEXT, -- JSON object
  leadership TEXT, -- JSON array
  benefits TEXT, -- JSON array
  interview_insights TEXT, -- JSON object
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  research_count INTEGER DEFAULT 1
);

-- Interview sessions table for InterviewPreparationAgent
CREATE TABLE IF NOT EXISTS interview_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  session_type TEXT CHECK(session_type IN ('preparation', 'practice', 'real_time', 'follow_up')) NOT NULL,
  status TEXT CHECK(status IN ('active', 'paused', 'completed', 'cancelled')) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
  strategy TEXT, -- JSON object
  questions TEXT, -- JSON array
  answers TEXT, -- JSON array
  feedback TEXT, -- JSON array
  score REAL DEFAULT 0,
  notes TEXT, -- JSON array
  next_steps TEXT -- JSON array
);

-- Resume optimization requests table for ResumeOptimizationAgent
CREATE TABLE IF NOT EXISTS resume_optimizations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  resume_data TEXT NOT NULL, -- JSON object
  job_description TEXT NOT NULL,
  optimization_type TEXT CHECK(optimization_type IN ('ats', 'human', 'executive', 'industry', 'comprehensive')) NOT NULL,
  priority TEXT CHECK(priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  status TEXT CHECK(status IN ('pending', 'processing', 'peer_review', 'completed', 'failed')) DEFAULT 'pending',
  current_step TEXT,
  results TEXT, -- JSON object
  feedback TEXT, -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

-- Job monitoring table for JobMonitorAgent
CREATE TABLE IF NOT EXISTS job_monitoring (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  status TEXT CHECK(status IN ('active', 'paused', 'completed', 'failed')) DEFAULT 'active',
  last_checked DATETIME,
  change_count INTEGER DEFAULT 0,
  relevance_score REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agent_activities_agent_name ON agent_activities(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_activities_created_at ON agent_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_activities_status ON agent_activities(status);

CREATE INDEX IF NOT EXISTS idx_agent_data_agent_name ON agent_data(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_data_updated_at ON agent_data(updated_at);

CREATE INDEX IF NOT EXISTS idx_company_profiles_name ON company_profiles(name);
CREATE INDEX IF NOT EXISTS idx_company_profiles_industry ON company_profiles(industry);
CREATE INDEX IF NOT EXISTS idx_company_profiles_last_updated ON company_profiles(last_updated);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_job_id ON interview_sessions(job_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_status ON interview_sessions(status);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_created_at ON interview_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_resume_optimizations_user_id ON resume_optimizations(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_optimizations_status ON resume_optimizations(status);
CREATE INDEX IF NOT EXISTS idx_resume_optimizations_created_at ON resume_optimizations(created_at);

CREATE INDEX IF NOT EXISTS idx_job_monitoring_job_id ON job_monitoring(job_id);
CREATE INDEX IF NOT EXISTS idx_job_monitoring_status ON job_monitoring(status);
CREATE INDEX IF NOT EXISTS idx_job_monitoring_last_checked ON job_monitoring(last_checked);
