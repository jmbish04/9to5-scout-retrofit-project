/**
 * @fileoverview FastAPI Integration Service
 *
 * Provides integration with the local FastAPI scraper service running on Ubuntu.
 * Handles polling, WebSocket communication, and job status updates.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import type { Env } from "../../config/env/env.config";
import {
  createScrapeQueueService,
  type ScrapeQueueServiceEnv,
} from "./scrape-queue.service";

/**
 * Environment interface for FastAPI Integration Service
 */
export interface FastAPIServiceEnv extends Env {
  LOCAL_SCRAPER_URL: string;
  LOCAL_SCRAPER_API_KEY: string;
}

/**
 * Scrape job request data
 */
export interface ScrapeJobRequest {
  job_id: string;
  url: string;
  site_id: string;
  job_type: "scrape_job" | "autonomous_scrape" | "monitor_job";
  context?: string;
  max_tasks?: number;
  priority?: number;
}

/**
 * Polling response from FastAPI
 */
export interface PollingResponse {
  action: "scrape_job" | "autonomous_scrape" | "no_action";
  job?: {
    job_id: string;
    url: string;
    site_id: string;
  };
  params?: {
    context: string;
    max_tasks: number;
  };
}

/**
 * Job status update data
 */
export interface JobStatusUpdate {
  status: "completed" | "failed" | "in_progress";
  results?: {
    jobs_found: number;
    scraped_at: string;
  };
  error?: string;
}

/**
 * FastAPI Integration Service
 *
 * Manages communication with the local FastAPI scraper service,
 * including polling for jobs, WebSocket connections, and status updates.
 */
export class FastAPIService {
  private env: FastAPIServiceEnv;
  private baseUrl: string;
  private apiKey: string;
  private scrapeQueueService: any;

  constructor(env: FastAPIServiceEnv) {
    this.env = env;
    this.baseUrl = env.LOCAL_SCRAPER_URL;
    this.apiKey = env.LOCAL_SCRAPER_API_KEY;
    this.scrapeQueueService = createScrapeQueueService(
      env as ScrapeQueueServiceEnv
    );
  }

  /**
   * Polls the scrape queue for available jobs
   *
   * @param maxJobs - Maximum number of jobs to return
   * @returns Promise<PollingResponse> - Response with job details or no_action
   */
  async pollForJobs(maxJobs: number = 1): Promise<PollingResponse> {
    try {
      // Use the scrape queue service to get jobs from our database
      return await this.scrapeQueueService.pollForJobs(maxJobs);
    } catch (error) {
      console.error("Error polling scrape queue for jobs:", error);
      throw new Error(
        `Failed to poll for jobs: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Submits a job to the scrape queue
   *
   * @param job - Job details to submit
   * @returns Promise<string> - Job ID
   */
  async submitJob(job: ScrapeJobRequest): Promise<string> {
    try {
      // Add job to our scrape queue
      return await this.scrapeQueueService.addJob({
        url: job.url,
        site_id: job.site_id,
        priority: job.priority,
        source: "fastapi",
        job_type: job.job_type,
        context: job.context,
        max_tasks: job.max_tasks,
        metadata: JSON.stringify({ submitted_via: "fastapi" }),
      });
    } catch (error) {
      console.error("Error submitting job to scrape queue:", error);
      throw new Error(
        `Failed to submit job: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Updates job status in the scrape queue
   *
   * @param jobId - ID of the job to update
   * @param status - New status information
   * @returns Promise<void>
   */
  async updateJobStatus(jobId: string, status: JobStatusUpdate): Promise<void> {
    try {
      // Map the status to our scrape queue status
      let queueStatus:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled";
      switch (status.status) {
        case "in_progress":
          queueStatus = "processing";
          break;
        case "completed":
          queueStatus = "completed";
          break;
        case "failed":
          queueStatus = "failed";
          break;
        default:
          queueStatus = "pending";
      }

      const additionalData: any = {};
      if (status.status === "completed" || status.status === "failed") {
        additionalData.completed_at = new Date().toISOString();
      }
      if (status.error) {
        additionalData.error_message = status.error;
      }

      await this.scrapeQueueService.updateJobStatus(
        jobId,
        queueStatus,
        additionalData
      );
    } catch (error) {
      console.error("Error updating job status in scrape queue:", error);
      throw new Error(
        `Failed to update job status: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Gets the health status of the FastAPI service
   *
   * @returns Promise<boolean> - True if service is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error("Error checking FastAPI health:", error);
      return false;
    }
  }

  /**
   * Gets diagnostic information from the FastAPI service
   *
   * @returns Promise<any> - Diagnostic data
   */
  async getDiagnostics(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/diagnostics`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Diagnostics request failed: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting FastAPI diagnostics:", error);
      throw new Error(
        `Failed to get diagnostics: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Submits an issue to the FastAPI service
   *
   * @param issue - Issue details to submit
   * @returns Promise<string> - Issue ID
   */
  async submitIssue(issue: {
    agent_name: string;
    priority: "high" | "medium" | "low";
    category: "integration" | "api" | "websocket" | "authentication";
    issue: string;
    description: string;
    expected_behavior: string;
    actual_behavior: string;
    reproduction_steps: string[];
    environment: Record<string, any>;
  }): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/worker-issues`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(issue),
      });

      if (!response.ok) {
        throw new Error(
          `Issue submission failed: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as { issue_id: string };
      return data.issue_id;
    } catch (error) {
      console.error("Error submitting issue to FastAPI:", error);
      throw new Error(
        `Failed to submit issue: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Gets all submitted issues from the FastAPI service
   *
   * @returns Promise<any[]> - List of issues
   */
  async getIssues(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/worker-issues`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Issues request failed: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting issues from FastAPI:", error);
      throw new Error(
        `Failed to get issues: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

/**
 * Factory function to create a FastAPI service instance
 *
 * @param env - Environment object containing FastAPI configuration
 * @returns FastAPIService instance
 */
export function createFastAPIService(env: FastAPIServiceEnv): FastAPIService {
  return new FastAPIService(env);
}
