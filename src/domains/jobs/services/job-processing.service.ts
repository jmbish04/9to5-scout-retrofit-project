/**
 * Job processing service for handling job URL processing from multiple sources.
 * Handles job URL processing from email, manual, API, etc.
 */

import type { Env } from "../../../config/env";
import type { Job } from "../models/job.types";
import { saveJob } from "./job-storage.service";

export interface JobProcessingRequest {
  urls: string[];
  source: string;
  source_id?: string; // Optional ID to track the source (e.g., email_id, user_id)
  metadata?: Record<string, any>; // Additional metadata
}

export interface JobProcessingResult {
  success: boolean;
  processed_count: number;
  failed_count: number;
  results: Array<{
    url: string;
    success: boolean;
    job_id?: string;
    error?: string;
  }>;
}

export interface JobQueueEntry {
  id: string;
  url: string;
  source: string;
  source_id?: string;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
  updated_at: string;
  job_id?: string;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Submit job URLs for processing
 * This is the main entry point for job processing from any source
 */
export async function submitJobUrlsForProcessing(
  env: Env,
  request: JobProcessingRequest
): Promise<JobProcessingResult> {
  try {
    console.log(
      `🚀 Submitting ${request.urls.length} job URLs from ${request.source}...`
    );

    const results: JobProcessingResult["results"] = [];
    let processedCount = 0;
    let failedCount = 0;

    // Process each URL
    for (const url of request.urls) {
      try {
        console.log(`Processing job URL: ${url}`);

        // Create job entry in queue
        const queueEntryId = await addToJobQueue(env, {
          url,
          source: request.source,
          source_id: request.source_id,
          metadata: request.metadata,
        });

        // Process the job URL
        const jobId = await processJobUrl(env, url, {
          source: request.source,
          source_id: request.source_id,
          metadata: request.metadata,
        });

        // Update queue entry with success
        await updateJobQueueEntry(env, queueEntryId, {
          status: "completed",
          job_id: jobId,
        });

        results.push({
          url,
          success: true,
          job_id: jobId,
        });

        processedCount++;
        console.log(`✅ Successfully processed job URL: ${url} (ID: ${jobId})`);
      } catch (error) {
        console.error(`❌ Failed to process job URL: ${url}`, error);

        // Update queue entry with failure
        const queueEntryId = await addToJobQueue(env, {
          url,
          source: request.source,
          source_id: request.source_id,
          metadata: request.metadata,
        });

        await updateJobQueueEntry(env, queueEntryId, {
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });

        results.push({
          url,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        failedCount++;
      }
    }

    const result: JobProcessingResult = {
      success: failedCount === 0,
      processed_count: processedCount,
      failed_count: failedCount,
      results,
    };

    console.log(
      `📊 Job processing complete: ${processedCount} successful, ${failedCount} failed`
    );

    return result;
  } catch (error) {
    console.error("❌ Job processing failed:", error);
    throw error;
  }
}

/**
 * Process a single job URL
 * This is the core job processing logic that can be called from anywhere
 */
export async function processJobUrl(
  env: Env,
  url: string,
  context: {
    source: string;
    source_id?: string;
    metadata?: Record<string, any>;
  }
): Promise<string> {
  try {
    console.log(`🔍 Processing job URL: ${url}`);

    // Extract job data from URL
    const jobData = await extractJobDataFromUrl(env, url);

    if (!jobData) {
      throw new Error("Failed to extract job data from URL");
    }

    // Add context information
    const job: Job = {
      ...jobData,
      url,
      source: context.source as any,
      first_seen_at: new Date().toISOString(),
      last_crawled_at: new Date().toISOString(),
    };

    // Save job to database
    const jobId = await saveJob(env, job);

    console.log(`💾 Job saved with ID: ${jobId}`);

    return jobId;
  } catch (error) {
    console.error(`❌ Failed to process job URL ${url}:`, error);
    throw error;
  }
}

/**
 * Extract job data from a URL
 * This is a placeholder - in reality, this would use browser rendering or scraping
 */
async function extractJobDataFromUrl(
  env: Env,
  url: string
): Promise<Partial<Job> | null> {
  try {
    // For now, create a basic job entry
    // In the real implementation, this would:
    // 1. Use browser rendering to load the page
    // 2. Extract job details using AI
    // 3. Parse structured data

    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    return {
      title: `Job at ${domain}`,
      company: domain,
      location: "Unknown",
      status: "open",
      description_md: `Job posting found at ${url}`,
    };
  } catch (error) {
    console.error(`Failed to extract job data from ${url}:`, error);
    return null;
  }
}

/**
 * Add entry to job queue
 */
async function addToJobQueue(
  env: Env,
  entry: Omit<JobQueueEntry, "id" | "status" | "created_at" | "updated_at">
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `
    INSERT INTO job_queue (
      id, url, source, source_id, status, created_at, updated_at, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `
  )
    .bind(
      id,
      entry.url,
      entry.source,
      entry.source_id || null,
      "pending",
      now,
      now,
      entry.metadata ? JSON.stringify(entry.metadata) : null
    )
    .run();

  return id;
}

/**
 * Update job queue entry
 */
async function updateJobQueueEntry(
  env: Env,
  id: string,
  updates: Partial<Pick<JobQueueEntry, "status" | "job_id" | "error">>
): Promise<void> {
  const updateFields: string[] = [];
  const params: any[] = [];

  if (updates.status) {
    updateFields.push("status = ?");
    params.push(updates.status);
  }

  if (updates.job_id) {
    updateFields.push("job_id = ?");
    params.push(updates.job_id);
  }

  if (updates.error) {
    updateFields.push("error = ?");
    params.push(updates.error);
  }

  if (updateFields.length === 0) return;

  updateFields.push("updated_at = ?");
  params.push(new Date().toISOString());
  params.push(id);

  await env.DB.prepare(
    `
    UPDATE job_queue 
    SET ${updateFields.join(", ")} 
    WHERE id = ?
  `
  )
    .bind(...params)
    .run();
}

/**
 * Get job queue entries
 */
export async function getJobQueueEntries(
  env: Env,
  options: {
    status?: string;
    source?: string;
    limit?: number;
  } = {}
): Promise<JobQueueEntry[]> {
  let query = "SELECT * FROM job_queue WHERE 1=1";
  const params: any[] = [];

  if (options.status) {
    query += " AND status = ?";
    params.push(options.status);
  }

  if (options.source) {
    query += " AND source = ?";
    params.push(options.source);
  }

  query += " ORDER BY created_at DESC";

  if (options.limit) {
    query += " LIMIT ?";
    params.push(options.limit);
  }

  const result = await env.DB.prepare(query)
    .bind(...params)
    .all();
  return result.results as JobQueueEntry[];
}

/**
 * Clean up old job queue entries
 */
export async function cleanupJobQueue(
  env: Env,
  olderThanDays: number = 30
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const result = await env.DB.prepare(
    `
    DELETE FROM job_queue 
    WHERE created_at < ? AND status IN ('completed', 'failed')
  `
  )
    .bind(cutoffDate.toISOString())
    .run();

  return result.changes || 0;
}
