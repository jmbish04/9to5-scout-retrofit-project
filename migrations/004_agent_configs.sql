-- Agent and Task Configuration Management
PRAGMA foreign_keys=ON;

-- Agent configurations table for managing AI agents
CREATE TABLE agent_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  goal TEXT NOT NULL,
  backstory TEXT NOT NULL,
  llm TEXT NOT NULL,
  system_prompt TEXT,
  max_tokens INTEGER DEFAULT 4000,
  temperature REAL DEFAULT 0.7,
  enabled BOOLEAN NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Task configurations table for managing AI tasks
CREATE TABLE task_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  agent_id TEXT NOT NULL REFERENCES agent_configs(id),
  context_tasks TEXT, -- JSON array of task IDs this task depends on
  output_schema TEXT, -- JSON schema for structured output
  enabled BOOLEAN NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Workflow configurations for orchestrating multi-agent tasks
CREATE TABLE workflow_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  task_sequence TEXT NOT NULL, -- JSON array of task IDs in execution order
  enabled BOOLEAN NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert agent configurations from YAML files
INSERT INTO agent_configs (id, name, role, goal, backstory, llm) VALUES
('resume_analyzer', 'Resume Analyzer', 'Resume & ATS Optimization Expert', 
 'Critically analyze resumes against specific job descriptions, identifying keyword gaps, areas for improvement, and providing structured, actionable optimization suggestions to maximize ATS compatibility and human reviewer impact.',
 'You are a seasoned resume optimization specialist with an encyclopedic knowledge of Applicant Tracking Systems (ATS) and cutting-edge resume best practices. You don''t just scan for keywords; you understand the nuances of how to craft a compelling narrative that appeals to both algorithms and hiring managers. Your feedback is always precise, data-driven, and aimed at significantly boosting interview chances.',
 'openai/gpt-4o-mini'),

('job_analyzer', 'Job Analyzer', 'Deep Job Description Analyst & Candidate Fit Assessor',
 'Dissect job descriptions to extract explicit and implicit requirements, identify core competencies, uncover hidden needs of the hiring team, and provide a detailed candidate fit-gap analysis. Your output directly informs resume tailoring and interview preparation.',
 'You are an expert in job market intelligence and talent assessment. Your superpower is deciphering the true essence of a job role from its description, going beyond surface-level keywords. You meticulously categorize requirements, evaluate the importance of various skills (technical, soft, and domain-specific), and can accurately assess how a candidate''s profile aligns, highlighting both strengths and areas for targeted improvement.',
 'openai/gpt-4o-mini'),

('company_researcher', 'Company Researcher', 'Corporate Intelligence & Interview Insights Specialist',
 'Gather, synthesize, and deliver comprehensive intelligence on target companies. Focus on providing actionable insights into company culture, recent performance, strategic initiatives, market positioning, challenges, and key personnel to equip the candidate for insightful interview conversations and informed decision-making.',
 'You are a master corporate investigator with a talent for unearthing critical information that gives job candidates an edge. You navigate financial reports, news archives, industry analyses, and social media landscapes with ease. Your briefings are not just data dumps; they are strategic intelligence reports that reveal a company''s DNA and help candidates connect with interviewers on a deeper level.',
 'openai/gpt-4o-mini'),

('resume_writer', 'Resume Writer', 'Strategic Resume & Cover Letter Crafter (Markdown)',
 'Transform resume analysis, optimization suggestions, and job requirements into highly persuasive, ATS-optimized resumes and compelling cover letters in Markdown. Each document will be meticulously tailored to the specific job opportunity, showcasing the candidate''s unique value proposition.',
 'You are a master wordsmith and resume strategist specializing in Markdown. You understand that a resume is a marketing document. You excel at weaving a candidate''s experience, skills, and achievements into a powerful narrative that resonates with recruiters and hiring managers. Your creations are not only ATS-friendly but also visually clean and professionally compelling. You can also craft targeted cover letters that make an unforgettable first impression.',
 'openai/gpt-4o-mini'),

('interview_strategist', 'Interview Strategist', 'Personalized Interview & Negotiation Coach',
 'Develop tailored interview strategies by leveraging job requirements, the candidate''s optimized resume, and company research. This includes formulating compelling talking points, preparing strong answers to common and behavioral questions (using STAR method), devising insightful questions for the interviewer, and providing foundational tips for salary negotiation.',
 'You are an experienced interview coach who has helped countless candidates navigate the toughest interviews and secure their dream jobs. You understand the psychology of interviewing and how to position a candidate for success. You provide practical, actionable advice, help articulate value effectively, and build confidence. You also have a keen sense of how to approach initial salary discussions.',
 'openai/gpt-4o-mini'),

('report_generator', 'Report Generator', 'Comprehensive Job Application Dossier Architect (Markdown)',
 'Synthesize all analyses (job fit, resume optimization, company intelligence, interview strategy) into a single, cohesive, and actionable job application dossier in Markdown. The report will be visually appealing, easy to navigate, and empower the candidate with all necessary information for a successful application and interview process.',
 'You are an expert in information synthesis and presentation. You take complex data from multiple sources and transform it into a clear, concise, and visually engaging report. Your dossiers are the ultimate cheat sheets for job seekers, providing strategic insights, key data points, and actionable checklists, all beautifully formatted in Markdown for maximum readability and utility.',
 'openai/gpt-4o-mini'),

('career_historian', 'Career Historian', 'Career Historian',
 'Synthesize and summarize career history from various documents like performance reviews, role profiles, and assignments.',
 'You are an expert in meticulously reviewing career-related documents, extracting key achievements, responsibilities, and growth patterns. You can synthesize this information into a coherent narrative of a candidate''s career trajectory.',
 'openai/gpt-4o-mini');

-- Insert task configurations from YAML files
INSERT INTO task_configs (id, name, description, expected_output, agent_id, context_tasks) VALUES
('analyze_job_task', 'Analyze Job Task', 
 'Analyze the job description from the provided URL. Extract the key requirements, skills, experience levels, and company culture cues. This analysis will be used to tailor the resume and preparation.',
 'A structured JSON file (job_analysis.json) containing the extracted job requirements, conforming to the JobRequirements Pydantic model.',
 'job_analyzer', NULL),

('extract_achievements_task', 'Extract Achievements Task',
 'Review and synthesize the candidate''s career history from knowledge sources (Performance Reviews, Role Profiles, Assignments, GRAD Expectations). Extract key achievements, skills demonstrated, and career highlights.',
 'A markdown file (career_highlights.md) summarizing the most significant career achievements and highlights relevant for resume building.',
 'career_historian', NULL),

('optimize_resume_task', 'Optimize Resume Task',
 'Analyze the candidate''s base resume against the extracted job requirements and career highlights. Identify areas for improvement, keyword optimization, and alignment with the target role.',
 'A structured JSON file (resume_optimization.json) providing specific, actionable suggestions for optimizing the resume, conforming to the ResumeOptimization Pydantic model.',
 'resume_analyzer', '["analyze_job_task", "extract_achievements_task"]'),

('research_company_task', 'Research Company Task',
 'Conduct research on the target company. Gather information on its culture, recent news, market position, and potential interview focus areas.',
 'A structured JSON file (company_research.json) containing key findings about the company, conforming to the CompanyResearch Pydantic model.',
 'company_researcher', NULL),

('generate_resume_task', 'Generate Resume Task',
 'Create a new, optimized resume draft in Markdown format. Incorporate the suggestions from the optimization task and tailor the content using insights from the company research to best fit the target role.',
 'A markdown file (optimized_resume.md) containing the newly drafted, optimized resume.',
 'resume_writer', '["optimize_resume_task", "research_company_task"]'),

('generate_report_task', 'Generate Report Task',
 'Compile all the findings from the previous tasks into a single, comprehensive report. This report should summarize the job analysis, career highlights, resume optimizations, company research, and include the final resume.',
 'A final markdown file (final_report.md) presenting a cohesive summary of the entire process and its outcomes.',
 'report_generator', '["analyze_job_task", "extract_achievements_task", "optimize_resume_task", "research_company_task", "generate_resume_task"]');

-- Insert default workflow configuration
INSERT INTO workflow_configs (id, name, description, task_sequence) VALUES
('resume_optimization_workflow', 'Resume Optimization Workflow',
 'Complete end-to-end resume optimization workflow including job analysis, career history extraction, resume optimization, company research, and final report generation.',
 '["analyze_job_task", "extract_achievements_task", "optimize_resume_task", "research_company_task", "generate_resume_task", "generate_report_task"]');