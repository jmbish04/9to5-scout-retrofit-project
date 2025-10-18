/**
 * JobMonitorAgent - Autonomous job posting monitoring and analysis
 *
 * Capabilities:
 * - Continuous monitoring of job postings
 * - Change detection and analysis
 * - Automated job relevance scoring
 * - Real-time notifications
 * - Integration with job processing pipeline
 */

import { Agent } from "agents";
import type { Env } from "../env";

export interface JobMonitorState {
  status: "idle" | "processing" | "error" | "completed";
  lastActivity: string;
  metadata: Record<string, any>;
  errorCount: number;
  successCount: number;
  monitoredJobs: string[];
  monitoringInterval: number; // minutes
  lastCheckTime: string;
  changeThreshold: number; // 0-1, minimum change significance
  relevanceThreshold: number; // 0-1, minimum relevance score
}

export class JobMonitorAgent extends Agent<Env, JobMonitorState> {
  constructor(state: any, env: Env) {
    super(state, env);
  }

  /**
   * Initialize agent with default state
   */
  async initialize(): Promise<void> {
    if (!this.state.monitoredJobs) {
      await this.setState({
        ...this.state,
        monitoredJobs: [],
        monitoringInterval: 30, // 30 minutes default
        lastCheckTime: new Date().toISOString(),
        changeThreshold: 0.1, // 10% change threshold
        relevanceThreshold: 0.7, // 70% relevance threshold
      });
    }

    console.log("JobMonitorAgent initialized", {
      monitoredJobs: this.state.monitoredJobs.length,
      monitoringInterval: this.state.monitoringInterval,
    });
  }

  /**
   * Handle HTTP requests to the agent
   */
  async onRequest(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      switch (path) {
        case "/add-job":
          return await this.handleAddJob(request);
        case "/remove-job":
          return await this.handleRemoveJob(request);
        case "/start-monitoring":
          return await this.handleStartMonitoring(request);
        case "/stop-monitoring":
          return await this.handleStopMonitoring(request);
        case "/update-config":
          return await this.handleUpdateConfig(request);
        case "/manual-check":
          return await this.handleManualCheck(request);
        case "/status":
          return await this.handleStatus(request);
        default:
          return new Response("Not found", { status: 404 });
      }
    } catch (error) {
      console.error("Request handling failed:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }

  /**
   * Add a job to monitoring
   */
  private async handleAddJob(request: Request): Promise<Response> {
    try {
      const { jobId, jobUrl } = (await request.json()) as {
        jobId: string;
        jobUrl: string;
      };

      if (!jobId || !jobUrl) {
        return new Response("Missing jobId or jobUrl", { status: 400 });
      }

      // Store job data
      await this.sql`
        INSERT OR REPLACE INTO job_data (job_id, job_url, status, created_at, updated_at)
        VALUES (${jobId}, ${jobUrl}, 'monitoring', ${new Date().toISOString()}, ${new Date().toISOString()})
      `;

      // Add to monitored jobs list
      const updatedJobs = [...this.state.monitoredJobs, jobId];
      await this.setState({
        ...this.state,
        monitoredJobs: updatedJobs,
        lastActivity: new Date().toISOString(),
      });

      // Schedule monitoring task
      await this.schedule(1000, "checkJobChanges", { jobId });

      console.log("Job added to monitoring", { jobId, jobUrl });
      return new Response(JSON.stringify({ success: true, jobId }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to add job to monitoring:", error);
      return new Response("Failed to add job", { status: 500 });
    }
  }

  /**
   * Remove a job from monitoring
   */
  private async handleRemoveJob(request: Request): Promise<Response> {
    try {
      const { jobId } = (await request.json()) as { jobId: string };

      if (!jobId) {
        return new Response("Missing jobId", { status: 400 });
      }

      // Remove from monitored jobs list
      const updatedJobs = this.state.monitoredJobs.filter((id) => id !== jobId);
      await this.setState({
        ...this.state,
        monitoredJobs: updatedJobs,
        lastActivity: new Date().toISOString(),
      });

      // Cancel scheduled tasks for this job
      const schedules = this.getSchedules();
      for (const schedule of schedules) {
        if (
          schedule.callback === "checkJobChanges" &&
          schedule.payload &&
          (schedule.payload as any).jobId === jobId
        ) {
          await this.cancelSchedule(schedule.id);
        }
      }

      console.log("Job removed from monitoring", { jobId });
      return new Response(JSON.stringify({ success: true, jobId }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to remove job from monitoring:", error);
      return new Response("Failed to remove job", { status: 500 });
    }
  }

  /**
   * Start monitoring all jobs
   */
  private async handleStartMonitoring(request: Request): Promise<Response> {
    try {
      // Cancel existing monitoring tasks
      const schedules = this.getSchedules();
      for (const schedule of schedules) {
        if (schedule.callback === "monitorAllJobs") {
          await this.cancelSchedule(schedule.id);
        }
      }

      // Schedule new monitoring task
      await this.schedule(
        `*/${this.state.monitoringInterval} * * * *`,
        "monitorAllJobs",
        {}
      );

      await this.setState({
        ...this.state,
        lastActivity: new Date().toISOString(),
      });

      console.log("Monitoring started", {
        interval: this.state.monitoringInterval,
        jobCount: this.state.monitoredJobs.length,
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to start monitoring:", error);
      return new Response("Failed to start monitoring", { status: 500 });
    }
  }

  /**
   * Stop monitoring all jobs
   */
  private async handleStopMonitoring(request: Request): Promise<Response> {
    try {
      // Cancel all monitoring tasks
      const schedules = this.getSchedules();
      for (const schedule of schedules) {
        if (schedule.callback === "monitorAllJobs") {
          await this.cancelSchedule(schedule.id);
        }
      }

      await this.setState({
        ...this.state,
        lastActivity: new Date().toISOString(),
      });

      console.log("Monitoring stopped");
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to stop monitoring:", error);
      return new Response("Failed to stop monitoring", { status: 500 });
    }
  }

  /**
   * Update agent configuration
   */
  private async handleUpdateConfig(request: Request): Promise<Response> {
    try {
      const config = (await request.json()) as Record<string, any>;

      await this.setState({
        ...this.state,
        ...config,
        lastActivity: new Date().toISOString(),
      });

      console.log("Configuration updated", config);
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to update configuration:", error);
      return new Response("Failed to update configuration", { status: 500 });
    }
  }

  /**
   * Perform manual check on all jobs
   */
  private async handleManualCheck(request: Request): Promise<Response> {
    try {
      await this.setState({
        ...this.state,
        status: "processing",
        lastActivity: new Date().toISOString(),
      });

      const results = [];
      for (const jobId of this.state.monitoredJobs) {
        try {
          const result = await this.checkJobChanges(jobId);
          results.push({ jobId, success: true, result });
        } catch (error) {
          console.error(`Failed to check job ${jobId}:`, error);
          results.push({
            jobId,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      await this.setState({
        ...this.state,
        status: "completed",
        lastActivity: new Date().toISOString(),
      });

      console.log("Manual check completed", { results: results.length });
      return new Response(JSON.stringify({ success: true, results }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Manual check failed:", error);
      return new Response("Manual check failed", { status: 500 });
    }
  }

  /**
   * Get agent status
   */
  private async handleStatus(request: Request): Promise<Response> {
    return new Response(
      JSON.stringify({
        status: this.state.status,
        monitoredJobs: this.state.monitoredJobs.length,
        lastActivity: this.state.lastActivity,
        monitoringInterval: this.state.monitoringInterval,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  /**
   * Monitor all jobs (scheduled task)
   */
  async monitorAllJobs(): Promise<void> {
    try {
      await this.setState({
        ...this.state,
        status: "processing",
        lastActivity: new Date().toISOString(),
      });

      const results = [];
      for (const jobId of this.state.monitoredJobs) {
        try {
          const result = await this.checkJobChanges(jobId);
          results.push({ jobId, success: true, result });
        } catch (error) {
          console.error(`Job check failed in cycle for ${jobId}:`, error);
          results.push({
            jobId,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      await this.setState({
        ...this.state,
        status: "completed",
        lastActivity: new Date().toISOString(),
      });

      console.log("Monitoring cycle completed", {
        jobCount: this.state.monitoredJobs.length,
        successCount: results.filter((r) => r.success).length,
      });
    } catch (error) {
      console.error("Monitoring cycle failed:", error);
      await this.setState({
        ...this.state,
        status: "error",
        lastActivity: new Date().toISOString(),
      });
    }
  }

  /**
   * Check job changes (scheduled task)
   */
  async checkJobChanges(data: any): Promise<void> {
    const { jobId } = data;
    await this.checkJobChanges(jobId);
  }

  /**
   * Check job changes by ID
   */
  private async checkJobChangesById(jobId: string): Promise<any> {
    // Get job data from database
    const jobData = await this.sql`
      SELECT * FROM job_data WHERE job_id = ${jobId}
    `;

    if (jobData.length === 0) {
      throw new Error(`Job ${jobId} not found`);
    }

    const job = jobData[0];

    // Here you would implement the actual job change detection logic
    // For now, we'll just return a placeholder
    return {
      jobId,
      hasChanges: false,
      lastChecked: new Date().toISOString(),
    };
  }
}
