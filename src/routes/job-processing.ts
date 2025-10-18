/**
 * Job processing API endpoints
 * Provides endpoints for submitting job URLs and checking processing status
 */

import type { Env } from "../domains/config/env/env.config";
import {
  getJobProcessingStatus,
  submitJobUrlsForProcessing,
} from "../lib/job-processing";

/**
 * Submit job URLs for processing
 * POST /api/job-processing/submit
 */
export async function handleJobProcessingSubmit(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const data = (await request.json()) as {
      urls: string[];
      source?: string;
      source_id?: string;
      metadata?: Record<string, any>;
    };
    const { urls, source, source_id, metadata } = data;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Invalid request: urls array is required and must not be empty",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `🚀 Submitting ${urls.length} job URLs from ${source || "api"}...`
    );

    const result = await submitJobUrlsForProcessing(env, {
      urls,
      source: source || "api",
      source_id,
      metadata,
    });

    return new Response(
      JSON.stringify({
        success: result.success,
        processed_count: result.processed_count,
        failed_count: result.failed_count,
        results: result.results,
        message: `Job processing completed: ${result.processed_count} successful, ${result.failed_count} failed`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Job processing submission failed:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Get job processing status
 * GET /api/job-processing/status?source=email&source_id=123
 */
export async function handleJobProcessingStatus(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const source = url.searchParams.get("source");
    const sourceId = url.searchParams.get("source_id");

    console.log(
      `📊 Getting job processing status for source: ${source}, source_id: ${sourceId}`
    );

    const status = await getJobProcessingStatus(
      env,
      sourceId || undefined,
      source || undefined
    );

    return new Response(
      JSON.stringify({
        success: true,
        count: status.length,
        results: status,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Failed to get job processing status:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
