/**
 * AI-powered job extraction service.
 * Integrates with Cloudflare Workers AI for structured data extraction.
 */

import type { Env } from "../../../config/env";
import type { Job, JobExtractionResult } from "../models/job.types";

/**
 * Extract structured job data from HTML content using AI.
 * Uses Cloudflare Workers AI to parse job details from webpage HTML.
 */
export async function extractJob(
  env: Env,
  html: string,
  url: string,
  site: string
): Promise<Job | null> {
  try {
    const jobSchema = {
      type: "object",
      properties: {
        title: { type: "string", description: "Job title or position name" },
        company: {
          type: "string",
          description: "Company or organization name",
        },
        location: {
          type: "string",
          description: "Job location (city, state, remote, etc.)",
        },
        employment_type: {
          type: "string",
          description: "Employment type (full-time, part-time, contract, etc.)",
        },
        department: { type: "string", description: "Department or team" },
        salary_min: {
          type: "number",
          description: "Minimum salary if mentioned",
        },
        salary_max: {
          type: "number",
          description: "Maximum salary if mentioned",
        },
        salary_currency: {
          type: "string",
          description: "Currency code (USD, EUR, etc.)",
        },
        salary_raw: {
          type: "string",
          description: "Raw salary text as found on the page",
        },
        compensation_raw: {
          type: "string",
          description: "Raw compensation text including benefits",
        },
        description_md: {
          type: "string",
          description: "Job description in markdown format",
        },
        requirements_md: {
          type: "string",
          description: "Job requirements in markdown format",
        },
        posted_at: {
          type: "string",
          description: "Job posting date in ISO format",
        },
        confidence_score: {
          type: "number",
          description: "Confidence score for extraction (0-1)",
        },
      },
      required: ["title", "company"],
    };

    const prompt = `Extract job information from this HTML content. The job is from ${site} and the URL is ${url}.

HTML Content:
${html}

Please extract the job details and return them in the specified JSON schema. Be as accurate as possible and include a confidence score based on how clear the information is.`;

    const response = await env.AI.run(
      env.DEFAULT_MODEL_WEB_BROWSER as keyof AiModels,
      {
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        guided_json: jobSchema,
      }
    );

    const extractedData = response.response as any;

    if (!extractedData || !extractedData.title || !extractedData.company) {
      console.warn("Failed to extract required job fields");
      return null;
    }

    // Convert to Job interface
    const job: Job = {
      url,
      title: extractedData.title,
      company: extractedData.company,
      location: extractedData.location,
      employment_type: extractedData.employment_type,
      department: extractedData.department,
      salary_min: extractedData.salary_min,
      salary_max: extractedData.salary_max,
      salary_currency: extractedData.salary_currency,
      salary_raw: extractedData.salary_raw,
      compensation_raw: extractedData.compensation_raw,
      description_md: extractedData.description_md,
      requirements_md: extractedData.requirements_md,
      posted_at: extractedData.posted_at,
      status: "open",
      source: "SCRAPED",
    };

    return job;
  } catch (error) {
    console.error("Failed to extract job data:", error);
    return null;
  }
}

/**
 * Extract job data from text content using AI.
 * Useful for processing job descriptions from emails or other text sources.
 */
export async function extractJobFromText(
  env: Env,
  text: string,
  context?: {
    url?: string;
    site?: string;
    company?: string;
  }
): Promise<JobExtractionResult | null> {
  try {
    const extractionSchema = {
      type: "object",
      properties: {
        title: { type: "string", description: "Job title or position name" },
        company: {
          type: "string",
          description: "Company or organization name",
        },
        location: {
          type: "string",
          description: "Job location (city, state, remote, etc.)",
        },
        employment_type: {
          type: "string",
          description: "Employment type (full-time, part-time, contract, etc.)",
        },
        department: { type: "string", description: "Department or team" },
        salary_min: {
          type: "number",
          description: "Minimum salary if mentioned",
        },
        salary_max: {
          type: "number",
          description: "Maximum salary if mentioned",
        },
        salary_currency: {
          type: "string",
          description: "Currency code (USD, EUR, etc.)",
        },
        description_md: {
          type: "string",
          description: "Job description in markdown format",
        },
        requirements_md: {
          type: "string",
          description: "Job requirements in markdown format",
        },
        posted_at: {
          type: "string",
          description: "Job posting date in ISO format",
        },
        confidence_score: {
          type: "number",
          description: "Confidence score for extraction (0-1)",
        },
        extraction_metadata: {
          type: "object",
          description: "Additional metadata about the extraction",
        },
      },
      required: ["title", "company", "confidence_score"],
    };

    const contextInfo = context
      ? `
Context:
- URL: ${context.url || "Not provided"}
- Site: ${context.site || "Not provided"}
- Company: ${context.company || "Not provided"}
`
      : "";

    const prompt = `Extract job information from this text content.${contextInfo}

Text Content:
${text}

Please extract the job details and return them in the specified JSON schema. Be as accurate as possible and include a confidence score based on how clear the information is.`;

    const response = await env.AI.run(
      env.DEFAULT_MODEL_WEB_BROWSER as keyof AiModels,
      {
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        guided_json: extractionSchema,
      }
    );

    const extractedData = response.response as any;

    if (!extractedData || !extractedData.title || !extractedData.company) {
      console.warn("Failed to extract required job fields from text");
      return null;
    }

    return {
      title: extractedData.title,
      company: extractedData.company,
      location: extractedData.location,
      employment_type: extractedData.employment_type,
      salary_min: extractedData.salary_min,
      salary_max: extractedData.salary_max,
      salary_currency: extractedData.salary_currency,
      description_md: extractedData.description_md,
      requirements_md: extractedData.requirements_md,
      posted_at: extractedData.posted_at,
      confidence_score: extractedData.confidence_score,
      extraction_metadata: extractedData.extraction_metadata,
    };
  } catch (error) {
    console.error("Failed to extract job data from text:", error);
    return null;
  }
}

/**
 * Generate embeddings for job content.
 * Used for semantic search and similarity matching.
 */
export async function generateJobEmbeddings(
  env: Env,
  job: Job
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!job.description_md) {
      return { success: false, error: "No description to embed" };
    }

    const embedding = await embedText(env, job.description_md);

    if (!embedding) {
      return { success: false, error: "Failed to generate embedding" };
    }

    await env.VECTORIZE_INDEX.upsert([
      {
        id: job.id!,
        values: embedding,
        metadata: {
          job_id: job.id!,
          title: job.title || "",
          company: job.company || "",
          location: job.location || "",
        },
      },
    ]);

    return { success: true };
  } catch (error) {
    console.error("Failed to generate job embeddings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Search jobs using semantic similarity.
 * Finds jobs similar to the provided query text.
 */
export async function searchJobsBySimilarity(
  env: Env,
  query: string,
  options: {
    limit?: number;
    threshold?: number;
  } = {}
): Promise<Array<{ job_id: string; score: number; metadata: any }>> {
  try {
    const limit = options.limit || 10;
    const threshold = options.threshold || 0.7;

    // Generate embedding for the query
    const queryEmbedding = await embedText(env, query);

    if (!queryEmbedding) {
      return [];
    }

    // Search for similar jobs
    const results = await env.VECTORIZE_INDEX.query(queryEmbedding, {
      topK: limit,
      filter: { job_id: { $exists: true } },
    });

    // Filter by threshold and return results
    return results.matches
      .filter((match: any) => match.score >= threshold)
      .map((match: any) => ({
        job_id: match.metadata?.job_id || match.id,
        score: match.score,
        metadata: match.metadata,
      }));
  } catch (error) {
    console.error("Failed to search jobs by similarity:", error);
    return [];
  }
}

/**
 * Helper function to generate text embeddings.
 * This should be moved to a shared AI service later.
 */
async function embedText(env: Env, text: string): Promise<number[] | null> {
  try {
    const response = await env.AI.run(env.EMBEDDING_MODEL as keyof AiModels, {
      text: text.trim(),
    });

    return response.data?.[0]?.embedding || null;
  } catch (error) {
    console.error("Failed to generate embedding:", error);
    return null;
  }
}
