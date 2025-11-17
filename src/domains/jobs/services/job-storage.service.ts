/**
 * @module src/domains/jobs/services/job-storage.service.ts
 * @description
 * Service for all D1 database interactions related to jobs.
 */

// ... (imports and existing service methods)

export interface JobStorageEnv {
  DB: any; // D1Database type from Cloudflare Workers
}

export class JobStorageService {
  private env: JobStorageEnv;

  constructor(env: JobStorageEnv) {
    this.env = env;
  }

  /**
   * Get all jobs with optional filtering.
   */
  async getJobs(
    options: { limit?: number; offset?: number; status?: string } = {}
  ): Promise<any[]> {
    const { limit = 50, offset = 0, status } = options;

    let sql = `SELECT * FROM jobs`;
    const params: any[] = [];

    if (status) {
      sql += ` WHERE status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const { results } = await this.env.DB.prepare(sql)
      .bind(...params)
      .all();
    return results || [];
  }

  /**
   * Get a job by ID.
   */
  async getJobById(id: string): Promise<any | null> {
    const { results } = await this.env.DB.prepare(
      `SELECT * FROM jobs WHERE id = ?`
    )
      .bind(id)
      .all();

    return results && results.length > 0 ? results[0] : null;
  }

  /**
   * Get jobs that are ready for monitoring.
   */
  async getJobsForMonitoring(limit: number = 100): Promise<any[]> {
    const { results } = await this.env.DB.prepare(
      `SELECT id, url, title, company, location, monitoring_frequency_hours, last_status_check_at
       FROM jobs
       WHERE daily_monitoring_enabled = 1 AND status = 'open'
       ORDER BY COALESCE(last_status_check_at, '1970-01-01T00:00:00Z') ASC, id ASC
       LIMIT ?`
    )
      .bind(limit)
      .all();

    return results || [];
  }

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
    )
      .bind(limit)
      .all();

    return results || [];
  }

  async updateJobMonitoringStatus(
    jobId: string,
    status: string,
    nextCheck: Date
  ): Promise<void> {
    await this.env.DB.prepare(
      "UPDATE jobs SET status = ?, last_status_check_at = ?, next_monitoring_check_at = ? WHERE id = ?"
    )
      .bind(status, new Date().toISOString(), nextCheck.toISOString(), jobId)
      .run();
  }

  async getJob(id: string): Promise<any | null> {
    return this.getJobById(id);
  }

  async getJobHistoryByApplicant(applicantId: string): Promise<any[]> {
    // Implementation placeholder
    return [];
  }

  async getJobRatingsByApplicant(applicantId: string): Promise<any[]> {
    // Implementation placeholder
    return [];
  }

  async saveJob(jobData: any): Promise<any> {
    // Implementation placeholder
    return { id: crypto.randomUUID(), ...jobData };
  }

  async saveJobHistoryEntry(entry: any): Promise<any> {
    // Implementation placeholder
    return { id: crypto.randomUUID(), ...entry };
  }

  async saveJobHistorySubmission(submission: any): Promise<any> {
    // Implementation placeholder
    return { id: crypto.randomUUID(), ...submission };
  }

  async saveJobRating(rating: any): Promise<any> {
    // Implementation placeholder
    return { id: crypto.randomUUID(), ...rating };
  }

  async searchJobs(query: any): Promise<any[]> {
    // Implementation placeholder
    return [];
  }
}

// Export methods as named exports for easier importing
export async function getJob(env: any, id: string): Promise<any | null> {
  const service = new JobStorageService({ DB: env.DB });
  return service.getJobById(id);
}

export async function getJobHistoryByApplicant(
  env: any,
  applicantId: string
): Promise<any[]> {
  // Implementation placeholder
  return [];
}

export async function getJobRatingsByApplicant(
  env: any,
  applicantId: string
): Promise<any[]> {
  // Implementation placeholder
  return [];
}

export async function getJobs(
  env: any,
  options?: {
    limit?: number;
    offset?: number;
    status?: string;
    site_id?: string;
  }
): Promise<any[]> {
  const service = new JobStorageService({ DB: env.DB });
  return service.getJobs(options);
}

export async function saveJob(env: any, jobData: any): Promise<any> {
  // Implementation placeholder
  return { id: crypto.randomUUID(), ...jobData };
}

export async function saveJobHistoryEntry(env: any, entry: any): Promise<any> {
  // Implementation placeholder
  return { id: crypto.randomUUID(), ...entry };
}

export async function saveJobHistorySubmission(
  env: any,
  submission: any
): Promise<any> {
  // Implementation placeholder
  return { id: crypto.randomUUID(), ...submission };
}

export async function saveJobRating(env: any, rating: any): Promise<any> {
  // Implementation placeholder
  return { id: crypto.randomUUID(), ...rating };
}

export async function searchJobs(env: any, query: any): Promise<any[]> {
  // Implementation placeholder
  return [];
}
