/**
 * @module src/domains/jobs/services/job-storage.service.ts
 * @description
 * Service for all D1 database interactions related to jobs.
 */

// ... (imports and existing service methods)

export class JobStorageService {
  // ... (constructor, getJobs, getJob, etc.)

  /**
   * Get a list of jobs that are enabled for monitoring.
   */
  async getMonitoredJobs(limit: number = 100): Promise<any[]> {
    const { results } = await this.env.DB.prepare(
      `SELECT id, url, title, company, location, monitoring_frequency_hours, last_status_check_at
       FROM jobs
       WHERE daily_monitoring_enabled = 1 AND status = 'open'
       ORDER BY COALESCE(last_status_check_at, '1970-01-01T00:00:00Z') ASC, id ASC
       LIMIT ?`
    ).bind(limit).all();

    return results || [];
  }

  async updateJobMonitoringStatus(jobId: string, status: string, nextCheck: Date): Promise<void> {
    await this.env.DB.prepare(
      "UPDATE jobs SET status = ?, last_status_check_at = ?, next_monitoring_check_at = ? WHERE id = ?"
    ).bind(status, new Date().toISOString(), nextCheck.toISOString(), jobId).run();
  }
}
