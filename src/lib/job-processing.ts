/**
 * Generic job processing service
 * Handles job URL processing from multiple sources (email, manual, API, etc.)
 */

import type { Env } from "./env";

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

    const results: Array<{
      url: string;
      success: boolean;
      job_id?: string;
      error?: string;
    }> = [];

    let processedCount = 0;
    let failedCount = 0;

    // Process URLs in parallel (with some concurrency control)
    const batchSize = 5; // Process 5 URLs at a time
    const batches = [];

    for (let i = 0; i < request.urls.length; i += batchSize) {
      const batch = request.urls.slice(i, i + batchSize);
      batches.push(batch);
    }

    for (const batch of batches) {
      const batchPromises = batch.map((url) =>
        processJobUrl(
          env,
          url,
          request.source,
          request.source_id,
          request.metadata
        )
      );
      const batchResults = await Promise.allSettled(batchPromises);

      for (let i = 0; i < batchResults.length; i++) {
        const result = batchResults[i];
        const url = batch[i];

        if (!url) {
          // Skip if URL is undefined (shouldn't happen, but safety check)
          continue;
        }

        if (result && result.status === "fulfilled" && result.value.success) {
          results.push({
            url,
            success: true,
            job_id: result.value.job_id,
          });
          processedCount++;
        } else if (result && result.status === "rejected") {
          results.push({
            url,
            success: false,
            error: (result.reason as Error)?.message || "Unknown error",
          });
          failedCount++;
        } else if (result && result.status === "fulfilled") {
          results.push({
            url,
            success: false,
            error: result.value.error || "Processing failed",
          });
          failedCount++;
        } else {
          results.push({
            url,
            success: false,
            error: "Processing failed",
          });
          failedCount++;
        }
      }

      // Small delay between batches to avoid overwhelming the system
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(
      `✅ Job processing completed: ${processedCount} successful, ${failedCount} failed`
    );

    return {
      success: true,
      processed_count: processedCount,
      failed_count: failedCount,
      results,
    };
  } catch (error) {
    console.error("❌ Job processing failed:", error);

    return {
      success: false,
      processed_count: 0,
      failed_count: request.urls.length,
      results: request.urls.map((url) => ({
        url,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })),
    };
  }
}

/**
 * Process a single job URL
 * This is the core job processing function used by all sources
 */
export async function processJobUrl(
  env: Env,
  jobUrl: string,
  source: string,
  sourceId?: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; job_id?: string; error?: string }> {
  try {
    console.log(`🔗 Processing job URL from ${source}: ${jobUrl}`);

    // Use the existing crawlJob function to process the job
    const { crawlJob } = await import("./crawl");

    // Ensure required properties are present for CrawlEnv
    const crawlEnv = {
      ...env,
      DEFAULT_MODEL_WEB_BROWSER:
        env.DEFAULT_MODEL_WEB_BROWSER || "@cf/meta/llama-3.1-8b-instruct",
      EMBEDDING_MODEL: env.EMBEDDING_MODEL || "@cf/baai/bge-large-en-v1.5",
    };

    const job = await crawlJob(crawlEnv, jobUrl, source);

    if (job) {
      // Log the successful processing
      await logJobProcessing(env, {
        url: jobUrl,
        source,
        source_id: sourceId,
        status: "completed",
        job_id: job.id,
        metadata,
      });

      console.log(
        `✅ Successfully processed job: ${job.title} at ${job.company}`
      );

      return {
        success: true,
        job_id: job.id,
      };
    } else {
      // Log the failed processing
      await logJobProcessing(env, {
        url: jobUrl,
        source,
        source_id: sourceId,
        status: "failed",
        error: "Job processing failed - no job data extracted",
        metadata,
      });

      console.log(`❌ Failed to process job URL: ${jobUrl}`);

      return {
        success: false,
        error: "Job processing failed - no job data extracted",
      };
    }
  } catch (error) {
    console.error(`❌ Error processing job URL ${jobUrl}:`, error);

    // Log the failed processing
    await logJobProcessing(env, {
      url: jobUrl,
      source,
      source_id: sourceId,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      metadata,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Log job processing activity
 * This creates a record of job processing attempts for tracking and debugging
 */
async function logJobProcessing(
  env: Env,
  entry: Omit<JobQueueEntry, "id" | "created_at" | "updated_at">
): Promise<void> {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.DB.prepare(
      `
      INSERT INTO job_processing_queue (
        id, url, source, source_id, status, job_id, error, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        id,
        entry.url,
        entry.source,
        entry.source_id || null,
        entry.status,
        entry.job_id || null,
        entry.error || null,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
        now,
        now
      )
      .run();
  } catch (error) {
    console.error("Failed to log job processing:", error);
    // Don't throw here as this is just logging
  }
}

/**
 * Get job processing status
 * Useful for tracking the status of submitted job URLs
 */
export async function getJobProcessingStatus(
  env: Env,
  sourceId?: string,
  source?: string
): Promise<JobQueueEntry[]> {
  try {
    let query = "SELECT * FROM job_processing_queue WHERE 1=1";
    const params: any[] = [];

    if (sourceId) {
      query += " AND source_id = ?";
      params.push(sourceId);
    }

    if (source) {
      query += " AND source = ?";
      params.push(source);
    }

    query += " ORDER BY created_at DESC LIMIT 100";

    const result = await env.DB.prepare(query)
      .bind(...params)
      .all();

    return (result.results || []).map((row: any) => ({
      id: row.id,
      url: row.url,
      source: row.source,
      source_id: row.source_id,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      job_id: row.job_id,
      error: row.error,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  } catch (error) {
    console.error("Failed to get job processing status:", error);
    return [];
  }
}
