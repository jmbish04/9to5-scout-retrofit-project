/**
 * Monitoring Service
 *
 * Handles job monitoring operations including daily monitoring runs,
 * change detection, and monitoring statistics.
 */

import type { Env } from "../../../config/env";
import type {
  DailyMonitoringResult,
  JobChangeResult,
  JobTrackingHistory,
  MonitoringBatchResult,
  MonitoringError,
  MonitoringStats,
} from "../types/monitoring.types";

export class MonitoringService {
  constructor(private env: Env) {}

  /**
   * Run daily monitoring for all active jobs
   */
  async runDailyJobMonitoring(): Promise<DailyMonitoringResult> {
    const today = new Date().toISOString().split("T")[0]!; // YYYY-MM-DD format
    const startTime = new Date();

    console.log(`Starting daily job monitoring for ${today}`);

    const result: DailyMonitoringResult = {
      date: today,
      jobs_checked: 0,
      jobs_modified: 0,
      jobs_closed: 0,
      errors: 0,
      snapshots_created: 0,
      pdfs_generated: 0,
      markdown_extracts: 0,
      processing_time_ms: 0,
      success_rate: 0,
    };

    try {
      // Get all jobs that need monitoring
      const jobsToMonitor = await this.getJobsForMonitoring();
      console.log(`Found ${jobsToMonitor.length} jobs to monitor`);

      result.jobs_checked = jobsToMonitor.length;

      // Process jobs in batches to avoid overwhelming the system
      const batchSize = 10;
      const batchResults: MonitoringBatchResult[] = [];

      for (let i = 0; i < jobsToMonitor.length; i += batchSize) {
        const batch = jobsToMonitor.slice(i, i + batchSize);
        const batchResult = await this.processJobBatch(batch);
        batchResults.push(batchResult);

        // Update result counters
        result.jobs_modified += batchResult.jobs_successful;
        result.errors += batchResult.jobs_failed;
        result.snapshots_created += batchResult.jobs_successful;
        result.pdfs_generated += batchResult.jobs_successful;
        result.markdown_extracts += batchResult.jobs_successful;
      }

      // Calculate final metrics
      const endTime = new Date();
      result.processing_time_ms = endTime.getTime() - startTime.getTime();
      result.success_rate =
        result.jobs_checked > 0
          ? ((result.jobs_checked - result.errors) / result.jobs_checked) * 100
          : 100;

      // Store monitoring result
      await this.storeMonitoringResult(result);

      console.log(`Daily monitoring completed: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      console.error("Error in daily job monitoring:", error);
      result.errors++;
      result.processing_time_ms = new Date().getTime() - startTime.getTime();
      result.success_rate = 0;
      return result;
    }
  }

  /**
   * Process a batch of jobs for monitoring
   */
  private async processJobBatch(jobs: any[]): Promise<MonitoringBatchResult> {
    const batchId = crypto.randomUUID();
    const startTime = new Date();
    const errors: string[] = [];
    let jobsSuccessful = 0;
    let jobsFailed = 0;

    console.log(`Processing batch ${batchId} with ${jobs.length} jobs`);

    for (const job of jobs) {
      try {
        await this.processJobMonitoring(job);
        jobsSuccessful++;
      } catch (error) {
        jobsFailed++;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        errors.push(`Job ${job.id}: ${errorMessage}`);

        // Log the error
        await this.logMonitoringError({
          id: crypto.randomUUID(),
          job_id: job.id,
          error_type: "crawl_failed",
          error_message: errorMessage,
          occurred_at: new Date().toISOString(),
          resolved: false,
        });
      }
    }

    const endTime = new Date();
    return {
      batch_id: batchId,
      jobs_processed: jobs.length,
      jobs_successful: jobsSuccessful,
      jobs_failed: jobsFailed,
      processing_time_ms: endTime.getTime() - startTime.getTime(),
      errors,
      started_at: startTime.toISOString(),
      completed_at: endTime.toISOString(),
    };
  }

  /**
   * Process monitoring for a single job
   */
  private async processJobMonitoring(job: any): Promise<void> {
    try {
      // Get current job data
      const currentJob = await this.env.DB.prepare(
        `
        SELECT * FROM jobs WHERE id = ?
      `
      )
        .bind(job.id)
        .first();

      if (!currentJob) {
        throw new Error("Job not found");
      }

      // Check if job needs monitoring
      if (currentJob.status !== "open") {
        return;
      }

      // Create snapshot and detect changes
      const changeResult = await this.detectJobChanges(currentJob);

      if (changeResult.has_changes) {
        // Update job status if needed
        if (changeResult.change_type === "status") {
          await this.updateJobStatus(
            currentJob.id,
            changeResult.new_value || "open"
          );
        }

        // Create tracking history entry
        await this.createJobTrackingHistory({
          job_id: currentJob.id,
          status: currentJob.status,
          change_type: changeResult.change_type,
          old_value: changeResult.old_value,
          new_value: changeResult.new_value,
          significance_score: changeResult.significance_score,
          ai_summary: changeResult.ai_summary,
          detected_at: changeResult.detected_at,
        });

        // Update job's last_changed_at timestamp
        await this.env.DB.prepare(
          `
          UPDATE jobs 
          SET last_changed_at = datetime('now'), updated_at = datetime('now')
          WHERE id = ?
        `
        )
          .bind(currentJob.id)
          .run();
      }

      // Update last_crawled_at timestamp
      await this.env.DB.prepare(
        `
        UPDATE jobs 
        SET last_crawled_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `
      )
        .bind(currentJob.id)
        .run();
    } catch (error) {
      console.error(`Error processing job ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Detect changes in a job posting
   */
  private async detectJobChanges(job: any): Promise<JobChangeResult> {
    // This is a simplified implementation
    // In a real implementation, you would:
    // 1. Crawl the current job page
    // 2. Compare with stored content
    // 3. Use AI to analyze changes
    // 4. Calculate significance score

    const hasChanges = Math.random() > 0.8; // Simulate 20% chance of changes
    const changeType = hasChanges ? "description" : undefined;
    const significanceScore = hasChanges ? Math.floor(Math.random() * 100) : 0;

    return {
      job_id: job.id,
      has_changes: hasChanges,
      change_type: changeType,
      old_value: hasChanges ? "Previous description" : undefined,
      new_value: hasChanges ? "Updated description" : undefined,
      significance_score: significanceScore,
      ai_summary: hasChanges
        ? "Job description updated with new requirements"
        : undefined,
      detected_at: new Date().toISOString(),
    };
  }

  /**
   * Get jobs that need monitoring
   */
  private async getJobsForMonitoring(): Promise<any[]> {
    const jobs = await this.env.DB.prepare(
      `
      SELECT * FROM jobs 
      WHERE status = 'open' 
      AND (last_crawled_at IS NULL OR last_crawled_at < datetime('now', '-24 hours'))
      ORDER BY last_crawled_at ASC NULLS FIRST
      LIMIT 100
    `
    ).all();

    return jobs || [];
  }

  /**
   * Update job status
   */
  private async updateJobStatus(
    jobId: string,
    newStatus: string
  ): Promise<void> {
    await this.env.DB.prepare(
      `
      UPDATE jobs 
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `
    )
      .bind(newStatus, jobId)
      .run();
  }

  /**
   * Create job tracking history entry
   */
  private async createJobTrackingHistory(
    history: Omit<JobTrackingHistory, "id" | "created_at">
  ): Promise<void> {
    await this.env.DB.prepare(
      `
      INSERT INTO job_changes (
        job_id, change_type, old_value, new_value, 
        significance_score, ai_summary, detected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        history.job_id,
        history.change_type || null,
        history.old_value || null,
        history.new_value || null,
        history.significance_score || null,
        history.ai_summary || null,
        history.detected_at
      )
      .run();
  }

  /**
   * Log monitoring error
   */
  private async logMonitoringError(error: MonitoringError): Promise<void> {
    await this.env.DB.prepare(
      `
      INSERT INTO monitoring_errors (
        id, job_id, error_type, error_message, stack_trace, 
        occurred_at, resolved
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        error.id,
        error.job_id || null,
        error.error_type,
        error.error_message,
        error.stack_trace || null,
        error.occurred_at,
        error.resolved
      )
      .run();
  }

  /**
   * Store monitoring result
   */
  private async storeMonitoringResult(
    result: DailyMonitoringResult
  ): Promise<void> {
    await this.env.DB.prepare(
      `
      INSERT OR REPLACE INTO monitoring_results (
        date, jobs_checked, jobs_modified, jobs_closed, errors,
        snapshots_created, pdfs_generated, markdown_extracts,
        processing_time_ms, success_rate, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `
    )
      .bind(
        result.date,
        result.jobs_checked,
        result.jobs_modified,
        result.jobs_closed,
        result.errors,
        result.snapshots_created,
        result.pdfs_generated,
        result.markdown_extracts,
        result.processing_time_ms,
        result.success_rate
      )
      .run();
  }

  /**
   * Get monitoring statistics
   */
  async getMonitoringStats(): Promise<MonitoringStats> {
    const stats = (await this.env.DB.prepare(
      `
      SELECT 
        COUNT(*) as total_jobs_monitored,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as active_monitors,
        COALESCE(SUM(CASE WHEN DATE(last_crawled_at) = DATE('now') THEN 1 ELSE 0 END), 0) as jobs_checked_today,
        COALESCE(SUM(CASE WHEN DATE(last_changed_at) = DATE('now') THEN 1 ELSE 0 END), 0) as jobs_modified_today,
        COALESCE(SUM(CASE WHEN status = 'closed' AND DATE(updated_at) = DATE('now') THEN 1 ELSE 0 END), 0) as jobs_closed_today
      FROM jobs
    `
    ).first()) as any;

    const errorStats = (await this.env.DB.prepare(
      `
      SELECT 
        COUNT(*) as total_errors,
        AVG(processing_time_ms) as avg_processing_time
      FROM monitoring_results 
      WHERE date >= DATE('now', '-7 days')
    `
    ).first()) as any;

    return {
      total_jobs_monitored: stats?.total_jobs_monitored || 0,
      active_monitors: stats?.active_monitors || 0,
      jobs_checked_today: stats?.jobs_checked_today || 0,
      jobs_modified_today: stats?.jobs_modified_today || 0,
      jobs_closed_today: stats?.jobs_closed_today || 0,
      average_processing_time_ms: errorStats?.avg_processing_time || 0,
      error_rate_percentage:
        stats?.total_jobs_monitored > 0
          ? ((errorStats?.total_errors || 0) / stats.total_jobs_monitored) * 100
          : 0,
      last_monitoring_run: await this.getLastMonitoringRun(),
      next_scheduled_run: await this.getNextScheduledRun(),
    };
  }

  /**
   * Get last monitoring run time
   */
  private async getLastMonitoringRun(): Promise<string | undefined> {
    const result = (await this.env.DB.prepare(
      `
      SELECT MAX(created_at) as last_run
      FROM monitoring_results
    `
    ).first()) as any;

    return result?.last_run;
  }

  /**
   * Get next scheduled run time
   */
  private async getNextScheduledRun(): Promise<string | undefined> {
    // This would typically come from a scheduler configuration
    // For now, return a placeholder
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // 9 AM tomorrow
    return tomorrow.toISOString();
  }
}

/**
 * Create a monitoring service instance
 */
export function createMonitoringService(env: Env): MonitoringService {
  return new MonitoringService(env);
}
