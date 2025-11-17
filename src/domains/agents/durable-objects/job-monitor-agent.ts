/**
 * JobMonitorAgent - Autonomous job posting monitoring and analysis
 */

import { Agent } from "agents";
import type { Env } from "../../../config/env";
import { JobProcessingService } from "../../jobs/services/job-processing.service";
import type { Job } from "../../jobs/types";

export class JobMonitorAgent extends Agent<Env, any> {
  private processingService: JobProcessingService;

  constructor(state: any, env: Env) {
     super(state, env);
    this.processingService = new JobProcessingService(env);
  }

  // ... (other agent methods)

  /**
   * Check job changes by ID
   */
  private async checkJobChangesById(jobId: string): Promise<any> {
    // Query job using the service (from main)
    const job = (await this.processingService.storage.getJob(jobId)) as Job | null;

    if (!job || !job.url) {
      throw new Error(`Job ${jobId} not found or missing URL`);
    }

    // Use the public performJobStatusCheck method (from fix/typescript-compilation-errors)
    const result = await this.processingService.performJobStatusCheck(
      jobId,
      job.url
    );

    // Return the detailed result (from fix/typescript-compilation-errors)
    return {
      jobId,
      hasChanges: result.status !== "job_active", // Determine changes based on status
      lastChecked: result.last_check,
      status: result.status,
    };
  }
}