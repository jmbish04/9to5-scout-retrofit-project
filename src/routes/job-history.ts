/**
 * Job History Management Routes
 * Handles applicant profile management, job history submission, and job rating functionality
 */

import type { Env } from "../index";
import {
  createApplicantProfile,
  getApplicantProfile,
  getJobHistoryByApplicant,
  getJobHistorySubmissions,
  saveJobHistoryEntry,
  saveJobHistorySubmission,
  updateApplicantProfile,
  updateJobHistorySubmission,
  getJobRatingsByApplicant,
  saveJobRating,
} from "../domains/applicants/services/applicant-storage.service";
import { getJobById } from "../domains/jobs/services/job-storage.service";
import type { StorageEnv } from "../lib/types";
import {
  ApplicantProfile,
  JobHistoryEntry,
  JobHistoryRequest,
  JobHistorySubmission,
  JobRating,
} from "../lib/types";

export async function handleJobHistoryPost(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = (await request.json()) as JobHistoryRequest;

    if (!body.user_id || !body.raw_content) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: user_id and raw_content",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const storageEnv = env as StorageEnv;

    // Get or create applicant profile
    let applicant = await getApplicantProfile(storageEnv, body.user_id);
    if (!applicant) {
      applicant = await createApplicantProfile(storageEnv, body.user_id);
    }

    // Create job history submission record
    const submissionId = crypto.randomUUID();
    const submission: JobHistorySubmission = {
      id: submissionId,
      applicant_id: applicant.id!,
      raw_content: body.raw_content,
      content_type: body.content_type || "text/plain",
      processing_status: "processing",
      submitted_at: new Date().toISOString(),
    };

    await saveJobHistorySubmission(storageEnv, submission);

    // Process the job history with AI
    try {
      const processedHistory = await processJobHistoryWithAI(
        env,
        body.raw_content,
        applicant
      );

      // Save processed job history entries
      const savedEntries = [];
      for (const entry of processedHistory.entries) {
        entry.applicant_id = applicant.id!;
        const savedEntry = await saveJobHistoryEntry(storageEnv, entry);
        savedEntries.push(savedEntry);
      }

      // Update applicant profile with extracted information
      if (processedHistory.profile_updates) {
        await updateApplicantProfile(
          storageEnv,
          applicant.id!,
          processedHistory.profile_updates
        );
      }

      // Update submission status
      await updateJobHistorySubmission(storageEnv, submissionId, {
        processing_status: "completed",
        ai_response: JSON.stringify(processedHistory),
        processed_entries: savedEntries.length,
        processed_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          success: true,
          submission_id: submissionId,
          applicant_id: applicant.id,
          entries_processed: savedEntries.length,
          entries: savedEntries,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (aiError) {
      // Update submission with error
      await updateJobHistorySubmission(storageEnv, submissionId, {
        processing_status: "failed",
        processing_error:
          aiError instanceof Error ? aiError.message : "AI processing failed",
        processed_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          error: "Failed to process job history with AI",
          submission_id: submissionId,
          details: aiError instanceof Error ? aiError.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function handleJobHistoryGet(
  request: Request,
  env: Env,
  params: Record<string, string>
): Promise<Response> {
  try {
    const { user_id } = params;

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "Missing user_id parameter" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const storageEnv = env as StorageEnv;
    const applicant = await getApplicantProfile(storageEnv, user_id);
    if (!applicant) {
      return new Response(
        JSON.stringify({ error: "Applicant profile not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const jobHistory = await getJobHistoryByApplicant(
      storageEnv,
      applicant.id!
    );
    const submissions = await getJobHistorySubmissions(
      storageEnv,
      applicant.id!
    );

    return new Response(
      JSON.stringify({
        applicant: applicant,
        job_history: jobHistory,
        submissions: submissions,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function handleJobRatingPost(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = (await request.json()) as { user_id: string; job_id: string };

    if (!body.user_id || !body.job_id) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: user_id and job_id",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const storageEnv = env as StorageEnv;
    const applicant = await getApplicantProfile(storageEnv, body.user_id);
    if (!applicant) {
      return new Response(
        JSON.stringify({ error: "Applicant profile not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get job details
    const job = await getJobById(storageEnv, body.job_id);
    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get applicant's job history
    const jobHistory = await getJobHistoryByApplicant(
      storageEnv,
      applicant.id!
    );

    // Generate job rating using AI
    const rating = await generateJobRating(
      env,
      applicant,
      jobHistory,
      job as unknown as Record<string, unknown>
    );
    rating.applicant_id = applicant.id!;
    rating.job_id = body.job_id;

    // Save or update the rating
    const savedRating = await saveJobRating(storageEnv, rating);

    return new Response(JSON.stringify(savedRating), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function handleJobRatingsGet(
  request: Request,
  env: Env,
  params: Record<string, string>
): Promise<Response> {
  try {
    const { user_id } = params;

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "Missing user_id parameter" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const storageEnv = env as StorageEnv;
    const applicant = await getApplicantProfile(storageEnv, user_id);
    if (!applicant) {
      return new Response(
        JSON.stringify({ error: "Applicant profile not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const ratings = await getJobRatingsByApplicant(storageEnv, applicant.id!);

    return new Response(JSON.stringify(ratings), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// AI Processing Functions

interface ProcessedJobHistory {
  entries: JobHistoryEntry[];
  profile_updates?: Partial<ApplicantProfile>;
}

async function processJobHistoryWithAI(
  env: Env,
  rawContent: string,
  applicant: ApplicantProfile
): Promise<ProcessedJobHistory> {
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
    const response = await env.AI.run(env.DEFAULT_MODEL_REASONING, {
      messages: [{ role: "user", content: prompt }],
    });

    if (!(response as { response?: string }).response) {
      throw new Error("No response from AI");
    }

    // Extract JSON from response
    const jsonMatch = (response as { response: string }).response.match(
      /\{[\s\S]*\}/
    );
    if (!jsonMatch) {
      throw new Error("No valid JSON found in AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed as ProcessedJobHistory;
  } catch (error) {
    console.error("AI processing error:", error);
    throw new Error(
      `Failed to process job history with AI: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

async function generateJobRating(
  env: Env,
  applicant: ApplicantProfile,
  jobHistory: JobHistoryEntry[],
  job: Record<string, unknown>
): Promise<JobRating> {
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
    const response = await env.AI.run(env.DEFAULT_MODEL_REASONING, {
      messages: [{ role: "user", content: prompt }],
    });

    if (!(response as { response?: string }).response) {
      throw new Error("No response from AI");
    }

    // Extract JSON from response
    const jsonMatch = (response as { response: string }).response.match(
      /\{[\s\S]*\}/
    );
    if (!jsonMatch) {
      throw new Error("No valid JSON found in AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed as JobRating;
  } catch (error) {
    console.error("Job rating AI error:", error);
    throw new Error(
      `Failed to generate job rating with AI: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
