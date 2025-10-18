/**
 * @fileoverview Scrape Queue Management Service
 *
 * Manages the scrape_queue table for FastAPI integration.
 * Handles job queuing, polling, and status updates.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import type { Env } from "../../config/env/env.config";
import type { PollingResponse } from "./fastapi.service";

/**
 * Environment interface for Scrape Queue Service
 */
export interface ScrapeQueueServiceEnv extends Env {
  DB: D1Database;
}

/**
 * Scrape queue job data
 */
export interface ScrapeQueueJob {
  id: string;
  url: string;
  site_id: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  priority: number;
  available_at: string;
  created_at: string;
  updated_at: string;
  source?: string;
  job_id?: string;
  job_type?: "scrape_job" | "autonomous_scrape" | "monitor_job";
  context?: string;
  max_tasks?: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  retry_count?: number;
  max_retries?: number;
  metadata?: string;
  last_claimed_at?: string;
}

/**
 * Polling response for FastAPI
 */
// PollingResponse interface is exported from fastapi.service.ts

/**
 * Scrape Queue Management Service
 *
 * Manages the scrape_queue table for FastAPI integration,
 * including job queuing, polling, and status updates.r
 */
export class ScrapeQueueService {
  private env: ScrapeQueueServiceEnv;

  constructor(env: ScrapeQueueServiceEnv) {
    this.env = env;
  }

  /**
   * Polls for the next available job in the scrape queue
   *
   * @param maxJobs - Maximum number of jobs to return (default: 1)
   * @returns Promise<PollingResponse> - Response with job details or no_action
   */
  async pollForJobs(maxJobs: number = 1): Promise<PollingResponse> {
    try {
      // Get the highest priority pending job
      const result = await this.env.DB.prepare(
        `
        SELECT * FROM scrape_queue 
        WHERE status = 'pending' 
        AND (available_at IS NULL OR available_at <= CURRENT_TIMESTAMP)
        ORDER BY priority DESC, created_at ASC 
        LIMIT ?
      `
      )
        .bind(maxJobs)
        .all();

      const jobs = result.results as unknown as ScrapeQueueJob[];

      if (jobs.length === 0) {
        return {
          action: "no_action",
        };
      }

      // Take the first job
      const job = jobs[0];
      if (!job) {
        return {
          action: "no_action",
        };
      }

      // Update job status to processing
      await this.updateJobStatus(job.id, "processing", {
        started_at: new Date().toISOString(),
        last_claimed_at: new Date().toISOString(),
      });

      return {
        action:
          job.job_type === "monitor_job"
            ? "scrape_job"
            : job.job_type || "scrape_job",
        job: {
          job_id: job.id,
          url: job.url,
          site_id: job.site_id,
        },
        params: {
          context: job.context || "",
          max_tasks: job.max_tasks || 1,
        },
      };
    } catch (error) {
      console.error("Error polling scrape queue:", error);
      throw new Error(
        `Failed to poll scrape queue: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Adds a new job to the scrape queue
   *
   * @param job - Job details to add
   * @returns Promise<string> - Job ID
   */
  async addJob(job: {
    url: string;
    site_id: string;
    priority?: number;
    source?: string;
    job_type?: "scrape_job" | "autonomous_scrape" | "monitor_job";
    context?: string;
    max_tasks?: number;
    metadata?: string;
  }): Promise<string> {
    try {
      const jobId = crypto.randomUUID();
      const now = new Date().toISOString();

      await this.env.DB.prepare(
        `
        INSERT INTO scrape_queue (
          id, url, site_id, status, priority, available_at, created_at, updated_at,
          source, job_type, context, max_tasks, metadata, retry_count, max_retries
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
        .bind(
          jobId,
          job.url,
          job.site_id,
          "pending",
          job.priority || 0,
          now,
          now,
          now,
          job.source || null,
          job.job_type || "scrape_job",
          job.context || null,
          job.max_tasks || 1,
          job.metadata || null,
          0,
          3
        )
        .run();

      return jobId;
    } catch (error) {
      console.error("Error adding job to scrape queue:", error);
      throw new Error(
        `Failed to add job: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Updates the status of a job in the scrape queue
   *
   * @param jobId - ID of the job to update
   * @param status - New status
   * @param additionalData - Additional data to update
   * @returns Promise<void>
   */
  async updateJobStatus(
    jobId: string,
    status: "pending" | "processing" | "completed" | "failed" | "cancelled",
    additionalData?: {
      started_at?: string;
      completed_at?: string;
      error_message?: string;
      last_claimed_at?: string;
      retry_count?: number;
    }
  ): Promise<void> {
    try {
      const now = new Date().toISOString();
      let updateFields = ["status = ?", "updated_at = ?"];
      let bindValues = [status, now];

      if (additionalData) {
        if (additionalData.started_at) {
          updateFields.push("started_at = ?");
          bindValues.push(additionalData.started_at);
        }
        if (additionalData.completed_at) {
          updateFields.push("completed_at = ?");
          bindValues.push(additionalData.completed_at);
        }
        if (additionalData.error_message) {
          updateFields.push("error_message = ?");
          bindValues.push(additionalData.error_message);
        }
        if (additionalData.last_claimed_at) {
          updateFields.push("last_claimed_at = ?");
          bindValues.push(String(additionalData.last_claimed_at));
        }
        if (additionalData.retry_count !== undefined) {
          updateFields.push("retry_count = ?");
          bindValues.push(String(additionalData.retry_count));
        }
      }

      bindValues.push(jobId);

      await this.env.DB.prepare(
        `
        UPDATE scrape_queue 
        SET ${updateFields.join(", ")} 
        WHERE id = ?
      `
      )
        .bind(...bindValues)
        .run();
    } catch (error) {
      console.error("Error updating job status:", error);
      throw new Error(
        `Failed to update job status: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Gets a job by ID
   *
   * @param jobId - ID of the job to retrieve
   * @returns Promise<ScrapeQueueJob | null> - Job data or null if not found
   */
  async getJob(jobId: string): Promise<ScrapeQueueJob | null> {
    try {
      const result = await this.env.DB.prepare(
        `
        SELECT * FROM scrape_queue WHERE id = ?
      `
      )
        .bind(jobId)
        .first();

      return result as ScrapeQueueJob | null;
    } catch (error) {
      console.error("Error getting job:", error);
      throw new Error(
        `Failed to get job: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Gets jobs by status
   *
   * @param status - Status to filter by
   * @param limit - Maximum number of jobs to return
   * @returns Promise<ScrapeQueueJob[]> - List of jobs
   */
  async getJobsByStatus(
    status: "pending" | "processing" | "completed" | "failed" | "cancelled",
    limit: number = 100
  ): Promise<ScrapeQueueJob[]> {
    try {
      const result = await this.env.DB.prepare(
        `
        SELECT * FROM scrape_queue 
        WHERE status = ? 
        ORDER BY priority DESC, created_at ASC 
        LIMIT ?
      `
      )
        .bind(status, limit)
        .all();

      return result.results as unknown as ScrapeQueueJob[];
    } catch (error) {
      console.error("Error getting jobs by status:", error);
      throw new Error(
        `Failed to get jobs by status: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Deletes a job from the scrape queue
   *
   * @param jobId - ID of the job to delete
   * @returns Promise<void>
   */
  async deleteJob(jobId: string): Promise<void> {
    try {
      await this.env.DB.prepare(
        `
        DELETE FROM scrape_queue WHERE id = ?
      `
      )
        .bind(jobId)
        .run();
    } catch (error) {
      console.error("Error deleting job:", error);
      throw new Error(
        `Failed to delete job: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Gets queue statistics
   *
   * @returns Promise<Record<string, number>> - Statistics by status
   */
  async getQueueStats(): Promise<Record<string, number>> {
    try {
      const result = await this.env.DB.prepare(
        `
        SELECT status, COUNT(*) as count 
        FROM scrape_queue 
        GROUP BY status
      `
      ).all();

      const stats: Record<string, number> = {};
      (result.results as Array<{ status: string; count: number }>).forEach(
        (row) => {
          stats[row.status] = row.count;
        }
      );

      return stats;
    } catch (error) {
      console.error("Error getting queue stats:", error);
      throw new Error(
        `Failed to get queue stats: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

/**
 * Factory function to create a ScrapeQueueService instance
 *
 * @param env - Environment object containing D1 database
 * @returns ScrapeQueueService instance
 */
export function createScrapeQueueService(
  env: ScrapeQueueServiceEnv
): ScrapeQueueService {
  return new ScrapeQueueService(env);
}
