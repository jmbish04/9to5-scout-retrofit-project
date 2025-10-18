/**
 * Job monitoring service for tracking job changes and status updates.
 * Handles job monitoring, change detection, and status updates.
 */

import type { Env } from "../../../config/env";
import type { Job } from "../models/job.types";
import {
  createJobTrackingHistory,
  getJobsForMonitoring,
  updateJobStatus,
} from "./job-storage.service";

export interface JobMonitoringResult {
  job_id: string;
  status: "unchanged" | "changed" | "closed" | "error";
  changes?: {
    title_changed?: boolean;
    requirements_changed?: boolean;
    salary_changed?: boolean;
    description_changed?: boolean;
  };
  error?: string;
}

export interface JobMonitoringStats {
  total_checked: number;
  unchanged: number;
  changed: number;
  closed: number;
  errors: number;
  processing_time_ms: number;
}

/**
 * Monitor all jobs that need checking.
 * This is the main entry point for job monitoring.
 */
export async function monitorAllJobs(env: Env): Promise<JobMonitoringStats> {
  const startTime = Date.now();

  try {
    console.log("🔍 Starting job monitoring...");

    // Get jobs that need monitoring
    const jobs = await getJobsForMonitoring(env);
    console.log(`📊 Found ${jobs.length} jobs to monitor`);

    const stats: JobMonitoringStats = {
      total_checked: jobs.length,
      unchanged: 0,
      changed: 0,
      closed: 0,
      errors: 0,
      processing_time_ms: 0,
    };

    // Process each job
    for (const job of jobs) {
      try {
        const result = await monitorJob(env, job);

        switch (result.status) {
          case "unchanged":
            stats.unchanged++;
            break;
          case "changed":
            stats.changed++;
            break;
          case "closed":
            stats.closed++;
            break;
          case "error":
            stats.errors++;
            break;
        }
      } catch (error) {
        console.error(`❌ Error monitoring job ${job.id}:`, error);
        stats.errors++;
      }
    }

    stats.processing_time_ms = Date.now() - startTime;

    console.log(`✅ Job monitoring complete:`, stats);
    return stats;
  } catch (error) {
    console.error("❌ Job monitoring failed:", error);
    throw error;
  }
}

/**
 * Monitor a single job for changes.
 * Checks if the job is still open and detects any changes.
 */
export async function monitorJob(
  env: Env,
  job: Job
): Promise<JobMonitoringResult> {
  try {
    console.log(`🔍 Monitoring job: ${job.id} (${job.title})`);

    // Check if job is still accessible
    const isStillOpen = await checkJobStillOpen(env, job);

    if (!isStillOpen) {
      // Job appears to be closed
      await updateJobStatus(env, job.id!, "closed", true);

      await createJobTrackingHistory(env, {
        job_id: job.id!,
        status: "closed",
        description_changed: true,
      });

      return {
        job_id: job.id!,
        status: "closed",
      };
    }

    // Check for changes in job content
    const changes = await detectJobChanges(env, job);

    if (changes.hasChanges) {
      await createJobTrackingHistory(env, {
        job_id: job.id!,
        status: "changed",
        title_changed: changes.title_changed,
        requirements_changed: changes.requirements_changed,
        salary_changed: changes.salary_changed,
        description_changed: changes.description_changed,
      });

      return {
        job_id: job.id!,
        status: "changed",
        changes: {
          title_changed: changes.title_changed,
          requirements_changed: changes.requirements_changed,
          salary_changed: changes.salary_changed,
          description_changed: changes.description_changed,
        },
      };
    }

    // Update last status check time
    await updateJobStatus(env, job.id!, "open");

    return {
      job_id: job.id!,
      status: "unchanged",
    };
  } catch (error) {
    console.error(`❌ Error monitoring job ${job.id}:`, error);

    await createJobTrackingHistory(env, {
      job_id: job.id!,
      status: "error",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      job_id: job.id!,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if a job is still open/accessible.
 * This is a placeholder - in reality, this would check the actual job posting.
 */
async function checkJobStillOpen(env: Env, job: Job): Promise<boolean> {
  try {
    // For now, we'll assume all jobs are still open
    // In the real implementation, this would:
    // 1. Make a request to the job URL
    // 2. Check if the page still exists
    // 3. Look for indicators that the job is closed

    // Simulate some jobs being closed (for testing)
    const random = Math.random();
    return random > 0.1; // 90% chance of being open
  } catch (error) {
    console.error(`Failed to check if job ${job.id} is still open:`, error);
    return false;
  }
}

/**
 * Detect changes in job content.
 * This is a placeholder - in reality, this would compare current content with stored content.
 */
async function detectJobChanges(
  env: Env,
  job: Job
): Promise<{
  hasChanges: boolean;
  title_changed: boolean;
  requirements_changed: boolean;
  salary_changed: boolean;
  description_changed: boolean;
}> {
  try {
    // For now, we'll simulate some changes
    // In the real implementation, this would:
    // 1. Fetch the current job page
    // 2. Extract the current content
    // 3. Compare with stored content
    // 4. Detect specific changes

    const random = Math.random();

    if (random < 0.05) {
      // 5% chance of changes
      return {
        hasChanges: true,
        title_changed: random < 0.02,
        requirements_changed: random < 0.03,
        salary_changed: random < 0.01,
        description_changed: random < 0.04,
      };
    }

    return {
      hasChanges: false,
      title_changed: false,
      requirements_changed: false,
      salary_changed: false,
      description_changed: false,
    };
  } catch (error) {
    console.error(`Failed to detect changes for job ${job.id}:`, error);
    return {
      hasChanges: false,
      title_changed: false,
      requirements_changed: false,
      salary_changed: false,
      description_changed: false,
    };
  }
}

/**
 * Get monitoring statistics for a specific time period.
 */
export async function getMonitoringStats(
  env: Env,
  options: {
    start_date?: string;
    end_date?: string;
    job_id?: string;
  } = {}
): Promise<{
  total_checks: number;
  changes_detected: number;
  closures_detected: number;
  errors: number;
  avg_processing_time_ms: number;
}> {
  try {
    let query = `
      SELECT 
        COUNT(*) as total_checks,
        SUM(CASE WHEN status = 'changed' THEN 1 ELSE 0 END) as changes_detected,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closures_detected,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors
      FROM job_tracking_history
      WHERE 1=1
    `;

    const params: any[] = [];

    if (options.start_date) {
      query += " AND created_at >= ?";
      params.push(options.start_date);
    }

    if (options.end_date) {
      query += " AND created_at <= ?";
      params.push(options.end_date);
    }

    if (options.job_id) {
      query += " AND job_id = ?";
      params.push(options.job_id);
    }

    const result = await env.DB.prepare(query)
      .bind(...params)
      .first();

    return {
      total_checks: (result as any)?.total_checks || 0,
      changes_detected: (result as any)?.changes_detected || 0,
      closures_detected: (result as any)?.closures_detected || 0,
      errors: (result as any)?.errors || 0,
      avg_processing_time_ms: 0, // This would need to be calculated separately
    };
  } catch (error) {
    console.error("Failed to get monitoring stats:", error);
    return {
      total_checks: 0,
      changes_detected: 0,
      closures_detected: 0,
      errors: 0,
      avg_processing_time_ms: 0,
    };
  }
}

/**
 * Enable monitoring for a job.
 */
export async function enableJobMonitoring(
  env: Env,
  jobId: string,
  frequencyHours: number = 24
): Promise<void> {
  try {
    await env.DB.prepare(
      `
      UPDATE jobs 
      SET daily_monitoring_enabled = 1, monitoring_frequency_hours = ?
      WHERE id = ?
    `
    )
      .bind(frequencyHours, jobId)
      .run();

    console.log(
      `✅ Enabled monitoring for job ${jobId} (every ${frequencyHours} hours)`
    );
  } catch (error) {
    console.error(`Failed to enable monitoring for job ${jobId}:`, error);
    throw error;
  }
}

/**
 * Disable monitoring for a job.
 */
export async function disableJobMonitoring(
  env: Env,
  jobId: string
): Promise<void> {
  try {
    await env.DB.prepare(
      `
      UPDATE jobs 
      SET daily_monitoring_enabled = 0
      WHERE id = ?
    `
    )
      .bind(jobId)
      .run();

    console.log(`✅ Disabled monitoring for job ${jobId}`);
  } catch (error) {
    console.error(`Failed to disable monitoring for job ${jobId}:`, error);
    throw error;
  }
}
