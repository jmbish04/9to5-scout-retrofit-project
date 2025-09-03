/**
 * Job History Management Routes
 * Handles applicant profile management, job history submission, and job rating functionality
 */

import { ApplicantProfile, JobHistoryEntry, JobHistorySubmission, JobRating, JobHistoryRequest } from '../lib/types';

export async function handleJobHistoryPost(request: Request, env: any): Promise<Response> {
  try {
    const body = await request.json() as JobHistoryRequest;
    
    if (!body.user_id || !body.raw_content) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: user_id and raw_content' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get or create applicant profile
    let applicant = await getApplicantProfile(env, body.user_id);
    if (!applicant) {
      applicant = await createApplicantProfile(env, body.user_id);
    }

    // Create job history submission record
    const submissionId = crypto.randomUUID();
    const submission: JobHistorySubmission = {
      id: submissionId,
      applicant_id: applicant.id!,
      raw_content: body.raw_content,
      content_type: body.content_type || 'text/plain',
      processing_status: 'processing',
      submitted_at: new Date().toISOString()
    };

    await saveJobHistorySubmission(env, submission);

    // Process the job history with AI
    try {
      const processedHistory = await processJobHistoryWithAI(env, body.raw_content, applicant);
      
      // Save processed job history entries
      const savedEntries = [];
      for (const entry of processedHistory.entries) {
        entry.applicant_id = applicant.id!;
        const savedEntry = await saveJobHistoryEntry(env, entry);
        savedEntries.push(savedEntry);
      }

      // Update applicant profile with extracted information
      if (processedHistory.profile_updates) {
        await updateApplicantProfile(env, applicant.id!, processedHistory.profile_updates);
      }

      // Update submission status
      await updateJobHistorySubmission(env, submissionId, {
        processing_status: 'completed',
        ai_response: JSON.stringify(processedHistory),
        processed_entries: savedEntries.length,
        processed_at: new Date().toISOString()
      });

      return new Response(JSON.stringify({
        success: true,
        submission_id: submissionId,
        applicant_id: applicant.id,
        entries_processed: savedEntries.length,
        entries: savedEntries
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (aiError) {
      // Update submission with error
      await updateJobHistorySubmission(env, submissionId, {
        processing_status: 'failed',
        processing_error: aiError instanceof Error ? aiError.message : 'AI processing failed',
        processed_at: new Date().toISOString()
      });

      return new Response(JSON.stringify({
        error: 'Failed to process job history with AI',
        submission_id: submissionId,
        details: aiError instanceof Error ? aiError.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function handleJobHistoryGet(request: Request, env: any, params: Record<string, string>): Promise<Response> {
  try {
    const { user_id } = params;
    
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'Missing user_id parameter' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const applicant = await getApplicantProfile(env, user_id);
    if (!applicant) {
      return new Response(JSON.stringify({ error: 'Applicant profile not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const jobHistory = await getJobHistoryByApplicant(env, applicant.id!);
    const submissions = await getJobHistorySubmissions(env, applicant.id!);

    return new Response(JSON.stringify({
      applicant: applicant,
      job_history: jobHistory,
      submissions: submissions
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function handleJobRatingPost(request: Request, env: any): Promise<Response> {
  try {
    const body = await request.json() as { user_id: string; job_id: string };
    
    if (!body.user_id || !body.job_id) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: user_id and job_id' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const applicant = await getApplicantProfile(env, body.user_id);
    if (!applicant) {
      return new Response(JSON.stringify({ error: 'Applicant profile not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get job details
    const job = await getJobById(env, body.job_id);
    if (!job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get applicant's job history
    const jobHistory = await getJobHistoryByApplicant(env, applicant.id!);

    // Generate job rating using AI
    const rating = await generateJobRating(env, applicant, jobHistory, job);
    rating.applicant_id = applicant.id!;
    rating.job_id = body.job_id;

    // Save or update the rating
    const savedRating = await saveJobRating(env, rating);

    return new Response(JSON.stringify(savedRating), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function handleJobRatingsGet(request: Request, env: any, params: Record<string, string>): Promise<Response> {
  try {
    const { user_id } = params;
    
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'Missing user_id parameter' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const applicant = await getApplicantProfile(env, user_id);
    if (!applicant) {
      return new Response(JSON.stringify({ error: 'Applicant profile not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const ratings = await getJobRatingsByApplicant(env, applicant.id!);

    return new Response(JSON.stringify(ratings), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Helper functions for database operations

async function getApplicantProfile(env: any, userId: string): Promise<ApplicantProfile | null> {
  const result = await env.DB.prepare(
    'SELECT * FROM applicant_profiles WHERE user_id = ?'
  ).bind(userId).first();
  
  if (!result) return null;
  
  return {
    ...result,
    target_roles: result.target_roles ? JSON.parse(result.target_roles) : [],
    skills: result.skills ? JSON.parse(result.skills) : [],
    preferences: result.preferences ? JSON.parse(result.preferences) : {}
  } as ApplicantProfile;
}

async function createApplicantProfile(env: any, userId: string): Promise<ApplicantProfile> {
  const id = crypto.randomUUID();
  const profile: ApplicantProfile = {
    id,
    user_id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await env.DB.prepare(`
    INSERT INTO applicant_profiles (id, user_id, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `).bind(id, userId, profile.created_at, profile.updated_at).run();

  return profile;
}

async function updateApplicantProfile(env: any, applicantId: string, updates: Partial<ApplicantProfile>): Promise<void> {
  const setClause = [];
  const values = [];
  
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && key !== 'id' && key !== 'user_id') {
      setClause.push(`${key} = ?`);
      if (Array.isArray(value) || typeof value === 'object') {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
    }
  }
  
  if (setClause.length === 0) return;
  
  setClause.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(applicantId);

  await env.DB.prepare(`
    UPDATE applicant_profiles 
    SET ${setClause.join(', ')} 
    WHERE id = ?
  `).bind(...values).run();
}

async function saveJobHistorySubmission(env: any, submission: JobHistorySubmission): Promise<void> {
  await env.DB.prepare(`
    INSERT INTO job_history_submissions 
    (id, applicant_id, raw_content, content_type, processing_status, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    submission.id,
    submission.applicant_id,
    submission.raw_content,
    submission.content_type,
    submission.processing_status,
    submission.submitted_at
  ).run();
}

async function updateJobHistorySubmission(env: any, submissionId: string, updates: Partial<JobHistorySubmission>): Promise<void> {
  const setClause = [];
  const values = [];
  
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && key !== 'id') {
      setClause.push(`${key} = ?`);
      values.push(value);
    }
  }
  
  if (setClause.length === 0) return;
  
  values.push(submissionId);

  await env.DB.prepare(`
    UPDATE job_history_submissions 
    SET ${setClause.join(', ')} 
    WHERE id = ?
  `).bind(...values).run();
}

async function saveJobHistoryEntry(env: any, entry: JobHistoryEntry): Promise<JobHistoryEntry> {
  const id = entry.id || crypto.randomUUID();
  const now = new Date().toISOString();
  
  await env.DB.prepare(`
    INSERT INTO job_history 
    (id, applicant_id, company_name, job_title, department, employment_type, 
     start_date, end_date, is_current, location, salary_min, salary_max, 
     salary_currency, responsibilities, achievements, skills_used, technologies, 
     keywords, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, entry.applicant_id, entry.company_name, entry.job_title, entry.department,
    entry.employment_type, entry.start_date, entry.end_date, entry.is_current ? 1 : 0,
    entry.location, entry.salary_min, entry.salary_max, entry.salary_currency,
    entry.responsibilities, entry.achievements, 
    entry.skills_used ? JSON.stringify(entry.skills_used) : null,
    entry.technologies ? JSON.stringify(entry.technologies) : null,
    entry.keywords ? JSON.stringify(entry.keywords) : null,
    now, now
  ).run();

  return { ...entry, id, created_at: now, updated_at: now };
}

async function getJobHistoryByApplicant(env: any, applicantId: string): Promise<JobHistoryEntry[]> {
  const results = await env.DB.prepare(
    'SELECT * FROM job_history WHERE applicant_id = ? ORDER BY start_date DESC'
  ).bind(applicantId).all();
  
  return results.results.map((row: any) => ({
    ...row,
    is_current: Boolean(row.is_current),
    skills_used: row.skills_used ? JSON.parse(row.skills_used) : [],
    technologies: row.technologies ? JSON.parse(row.technologies) : [],
    keywords: row.keywords ? JSON.parse(row.keywords) : []
  })) as JobHistoryEntry[];
}

async function getJobHistorySubmissions(env: any, applicantId: string): Promise<JobHistorySubmission[]> {
  const results = await env.DB.prepare(
    'SELECT * FROM job_history_submissions WHERE applicant_id = ? ORDER BY submitted_at DESC'
  ).bind(applicantId).all();
  
  return results.results as JobHistorySubmission[];
}

async function getJobById(env: any, jobId: string): Promise<any> {
  return await env.DB.prepare('SELECT * FROM jobs WHERE id = ?').bind(jobId).first();
}

async function saveJobRating(env: any, rating: JobRating): Promise<JobRating> {
  const id = rating.id || crypto.randomUUID();
  const now = new Date().toISOString();
  
  // Use INSERT OR REPLACE to handle duplicates
  await env.DB.prepare(`
    INSERT OR REPLACE INTO job_ratings 
    (id, applicant_id, job_id, overall_score, skill_match_score, experience_match_score,
     compensation_fit_score, location_fit_score, company_culture_score, growth_potential_score,
     rating_summary, recommendation, strengths, gaps, improvement_suggestions,
     created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, rating.applicant_id, rating.job_id, rating.overall_score, rating.skill_match_score,
    rating.experience_match_score, rating.compensation_fit_score, rating.location_fit_score,
    rating.company_culture_score, rating.growth_potential_score, rating.rating_summary,
    rating.recommendation, 
    rating.strengths ? JSON.stringify(rating.strengths) : null,
    rating.gaps ? JSON.stringify(rating.gaps) : null,
    rating.improvement_suggestions, now, now
  ).run();

  return { ...rating, id, created_at: now, updated_at: now };
}

async function getJobRatingsByApplicant(env: any, applicantId: string): Promise<JobRating[]> {
  const results = await env.DB.prepare(`
    SELECT jr.*, j.title as job_title, j.company as job_company, j.url as job_url
    FROM job_ratings jr
    JOIN jobs j ON jr.job_id = j.id
    WHERE jr.applicant_id = ?
    ORDER BY jr.overall_score DESC
  `).bind(applicantId).all();
  
  return results.results.map((row: any) => ({
    ...row,
    strengths: row.strengths ? JSON.parse(row.strengths) : [],
    gaps: row.gaps ? JSON.parse(row.gaps) : []
  })) as JobRating[];
}

// AI Processing Functions

interface ProcessedJobHistory {
  entries: JobHistoryEntry[];
  profile_updates?: Partial<ApplicantProfile>;
}

async function processJobHistoryWithAI(env: any, rawContent: string, applicant: ApplicantProfile): Promise<ProcessedJobHistory> {
  const prompt = `
You are a career historian expert. Your task is to analyze the provided job history content and extract structured information.

EXISTING APPLICANT PROFILE:
${JSON.stringify(applicant, null, 2)}

INCOMING JOB HISTORY CONTENT:
${rawContent}

Please analyze the content and extract:
1. Individual job history entries with structured data
2. Any profile updates (skills, experience level, target roles) that should be merged with existing profile

IMPORTANT: Consider any existing job history already in the system and avoid duplicates. Format dates as ISO strings (YYYY-MM-DD).

Return a JSON response with this exact structure:
{
  "entries": [
    {
      "company_name": "string",
      "job_title": "string", 
      "department": "string or null",
      "employment_type": "full-time|part-time|contract|internship|freelance",
      "start_date": "YYYY-MM-DD or null",
      "end_date": "YYYY-MM-DD or null", 
      "is_current": boolean,
      "location": "string or null",
      "salary_min": number or null,
      "salary_max": number or null,
      "salary_currency": "USD|EUR|GBP etc",
      "responsibilities": "markdown formatted responsibilities",
      "achievements": "markdown formatted achievements",
      "skills_used": ["skill1", "skill2"],
      "technologies": ["tech1", "tech2"],
      "keywords": ["keyword1", "keyword2"]
    }
  ],
  "profile_updates": {
    "name": "string or null",
    "current_title": "string or null", 
    "years_experience": number or null,
    "education_level": "string or null",
    "skills": ["updated", "skills", "array"],
    "target_roles": ["role1", "role2"]
  }
}
`;

  try {
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{ role: 'user', content: prompt }]
    });

    if (!response.response) {
      throw new Error('No response from AI');
    }

    // Extract JSON from response
    const jsonMatch = response.response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed as ProcessedJobHistory;

  } catch (error) {
    console.error('AI processing error:', error);
    throw new Error(`Failed to process job history with AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function generateJobRating(env: any, applicant: ApplicantProfile, jobHistory: JobHistoryEntry[], job: any): Promise<JobRating> {
  const prompt = `
You are a job fit analysis expert. Analyze how well this candidate matches the given job opportunity.

CANDIDATE PROFILE:
${JSON.stringify(applicant, null, 2)}

CANDIDATE JOB HISTORY:
${JSON.stringify(jobHistory, null, 2)}

JOB OPPORTUNITY:
${JSON.stringify(job, null, 2)}

Analyze the fit across multiple dimensions and provide scores (1-100) for:
1. Overall fit score
2. Skill match (technical and soft skills)
3. Experience level match (years, seniority)
4. Compensation fit (if salary expectations available)
5. Location fit (if location preferences available)
6. Company culture fit (based on job description)
7. Growth potential (career progression opportunity)

Also provide:
- A summary of why this is a good/bad fit
- Recommendation: "Strong Match", "Good Fit", "Consider", or "Pass"
- Top 3-5 candidate strengths for this role
- Top 3-5 gaps or areas for improvement
- Specific suggestions for improving candidacy

Return JSON with this structure:
{
  "overall_score": number (1-100),
  "skill_match_score": number (1-100),
  "experience_match_score": number (1-100),
  "compensation_fit_score": number (1-100),
  "location_fit_score": number (1-100),
  "company_culture_score": number (1-100),
  "growth_potential_score": number (1-100),
  "rating_summary": "detailed analysis summary",
  "recommendation": "Strong Match|Good Fit|Consider|Pass",
  "strengths": ["strength1", "strength2", "strength3"],
  "gaps": ["gap1", "gap2", "gap3"],
  "improvement_suggestions": "actionable advice for improving candidacy"
}
`;

  try {
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{ role: 'user', content: prompt }]
    });

    if (!response.response) {
      throw new Error('No response from AI');
    }

    // Extract JSON from response
    const jsonMatch = response.response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed as JobRating;

  } catch (error) {
    console.error('Job rating AI error:', error);
    throw new Error(`Failed to generate job rating with AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}