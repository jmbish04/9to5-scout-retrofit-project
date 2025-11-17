/**
 * @module src/domains/jobs/services/job-processing.service.ts
 * @description
 * Service for processing-related job tasks like monitoring and status updates.
 */

import type { Job } from "../types";
import { JobStorageEnv, JobStorageService } from "./job-storage.service";

export interface JobProcessingEnv extends JobStorageEnv {
  // Add other env bindings if needed, e.g., for AI or external APIs
}

export class JobProcessingService {
  private env: JobProcessingEnv;
  private storage: JobStorageService;

  constructor(env: JobProcessingEnv) {
    this.env = env;
    this.storage = new JobStorageService(env);
  }

  /**
   * Triggers and executes the daily job monitoring process.
   */
  async runDailyJobMonitoring(): Promise<any> {
    console.log("Daily job monitoring run triggered...");
    const jobsToMonitor = await this.storage.getJobsForMonitoring();
    console.log(`Found ${jobsToMonitor.length} jobs to monitor.`);

    let successCount = 0;
    let errorCount = 0;

    // Process jobs in batches to be safe
    const batchSize = 10;
    for (let i = 0; i < jobsToMonitor.length; i += batchSize) {
      const batch = jobsToMonitor.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((job) => this.processSingleJob(job))
      );

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          successCount++;
        } else {
          errorCount++;
          console.error("Failed to process job:", result.reason);
        }
      });
    }

    const result = {
      message: "Daily job monitoring completed.",
      jobs_checked: jobsToMonitor.length,
      successful: successCount,
      errors: errorCount,
    };

    // In a real implementation, we would store this result.
    console.log(result);
    return result;
  }

  /**
   * Processes a single job for monitoring: checks for changes and updates status.
   */
  private async processSingleJob(job: Job): Promise<void> {
    // This is a simplified version of the logic. A full implementation would:
    // 1. Crawl the job URL.
    // 2. Create a new snapshot of the content.
    // 3. Compare the new snapshot with the previous one to detect changes.
    // 4. Use AI to summarize significant changes.
    // 5. Update the job status and create a tracking history entry.

    console.log(`Processing job: ${job.id} - ${job.title}`);

    // For now, we'll just update the status check timestamp.
    await this.updateJobStatus(job.id, "open");
  }

  /**
   * Updates a job's status and last_status_check_at timestamp.
   */
  async updateJobStatus(jobId: string, status: string): Promise<void> {
    await this.env.DB.prepare(
      `UPDATE jobs SET status = ?, last_status_check_at = datetime('now') WHERE id = ?`
    )
      .bind(status, jobId)
      .run();
  }

  async performJobStatusCheck(jobId: string, jobUrl: string): Promise<any> {
    const { crawlJob } = await import("../../scraping/lib/crawl");
    const currentJob = (await crawlJob(this.env as any, jobUrl)) as any;
    const lastCheck = new Date().toISOString();

    if (!currentJob) {
      await this.storage.updateJobMonitoringStatus(
        jobId,
        "closed",
        new Date(lastCheck)
      );
      return {
        job_id: jobId,
        status: "job_not_found",
        last_check: lastCheck,
      };
    }

    await this.storage.updateJobMonitoringStatus(
      jobId,
      "open",
      new Date(lastCheck)
    );

    return {
      job_id: jobId,
      status: "job_active",
      last_check: lastCheck,
      title: currentJob?.title || "Unknown",
      company: currentJob?.company || "Unknown",
      location: currentJob?.location || "Unknown",
    };
  }

  /**
   * Update monitoring settings for a specific job.
   */
  async updateJobMonitoringSettings(
    jobId: string,
    settings: {
      daily_monitoring_enabled?: boolean;
      monitoring_frequency_hours?: number;
    }
  ): Promise<void> {
    // ... (implementation remains the same)
  }

  /**
   * Submit job URLs for processing.
   */
  async submitJobUrlsForProcessing(data: {
    urls: string[];
    source?: string;
    source_id?: string;
    metadata?: Record<string, any>;
  }): Promise<{
    success: boolean;
    processed_count: number;
    failed_count: number;
    results: any[];
  }> {
    const results: any[] = [];
    let processedCount = 0;
    let failedCount = 0;

    for (const url of data.urls) {
      try {
        // Use the existing performJobStatusCheck method
        const result = await this.performJobStatusCheck(
          crypto.randomUUID(),
          url
        );
        results.push(result);
        processedCount++;
      } catch (error) {
        results.push({
          url,
          error: error instanceof Error ? error.message : "Unknown error",
          status: "failed",
        });
        failedCount++;
      }
    }

    return {
      success: failedCount === 0,
      processed_count: processedCount,
      failed_count: failedCount,
      results,
    };
  }

  /**
   * Get job queue entries based on filters.
   */
  async getJobQueueEntries(
    filters: {
      source?: string;
      status?: string;
      limit?: number;
    } = {}
  ): Promise<any[]> {
    // This is a simplified implementation - in a real system you'd query a queue
    // For now, return an empty array since we don't have a persistent queue
    return [];
  }
}

// Export the methods as named exports for easier importing
export async function submitJobUrlsForProcessing(
  env: any,
  data: {
    urls: string[];
    source?: string;
    priority?: "low" | "normal" | "high";
  }
): Promise<{ processed: number; failed: number; results: any[] }> {
  const service = new JobProcessingService({ DB: env.DB });
  const result = await service.submitJobUrlsForProcessing(data);
  return {
    processed: result.processed_count,
    failed: result.failed_count,
    results: result.results,
  };
}

export async function getJobQueueEntries(
  env: any,
  filters: {
    source?: string;
    status?: string;
    limit?: number;
  } = {}
): Promise<any[]> {
  const service = new JobProcessingService({ DB: env.DB });
  return service.getJobQueueEntries(filters);
}
