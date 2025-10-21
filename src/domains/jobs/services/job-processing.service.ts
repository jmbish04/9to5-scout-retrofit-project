/**
 * @module src/domains/jobs/services/job-processing.service.ts
 * @description
 * Service for processing-related job tasks like monitoring and status updates.
 */

import { JobStorageService, JobStorageEnv } from './job-storage.service';
import type { Job } from '../types';

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
        batch.map(job => this.processSingleJob(job))
      );

      results.forEach(result => {
        if (result.status === 'fulfilled') {
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
    await this.updateJobStatus(job.id, 'open');
  }

  /**
   * Updates a job's status and last_status_check_at timestamp.
   */
  async updateJobStatus(jobId: string, status: string): Promise<void> {
    await this.env.DB.prepare(
      `UPDATE jobs SET status = ?, last_status_check_at = datetime('now') WHERE id = ?`
    ).bind(status, jobId).run();
  }

  async performJobStatusCheck(jobId: string, jobUrl: string): Promise<any> {
    const { crawlJob } = await import('../../scraping/lib/crawl');
    const currentJob = await crawlJob(this.env, jobUrl);
    const lastCheck = new Date().toISOString();

    if (!currentJob) {
      await this.storage.updateJobStatus(jobId, 'closed', lastCheck);
      return {
        job_id: jobId,
        status: 'job_not_found',
        last_check: lastCheck,
      };
    }

    await this.storage.updateJobStatus(jobId, 'open', lastCheck);

    return {
      job_id: jobId,
      status: 'job_active',
      last_check: lastCheck,
      title: currentJob.title,
      company: currentJob.company,
      location: currentJob.location,
    };
  }

  /**
   * Update monitoring settings for a specific job.
   */
  async updateJobMonitoringSettings(jobId: string, settings: {
    daily_monitoring_enabled?: boolean;
    monitoring_frequency_hours?: number;
  }): Promise<void> {
    // ... (implementation remains the same)
  }
}