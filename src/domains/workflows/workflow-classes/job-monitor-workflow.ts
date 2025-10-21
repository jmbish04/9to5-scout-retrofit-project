/**
 * Job Monitor Workflow
 *
 * Workflow for monitoring job postings for changes and updates.
 * Handles periodic checking, change detection, and alerting.
 */

import type { Env } from "../../../config/env";
import type {
  JobMonitorWorkflowConfig,
  WorkflowResult,
} from "../types/workflow.types";

export class JobMonitorWorkflow {
  constructor(private env: Env) {}

  /**
   * Execute the job monitoring workflow
   */
  async execute(config: JobMonitorWorkflowConfig): Promise<WorkflowResult> {
    const startTime = Date.now();
    const steps = [];
    const errors = [];
    const warnings: string[] = [];

    try {
      // Step 1: Validate job IDs
      steps.push("validating_job_ids");
      const validJobs = await this.validateJobIds(config.job_ids);
      if (validJobs.length === 0) {
        throw new Error("No valid jobs found for monitoring");
      }

      // Step 2: Check each job for changes
      steps.push("checking_jobs");
      const changeResults = await this.checkJobsForChanges(validJobs, config);

      // Step 3: Process detected changes
      steps.push("processing_changes");
      const processedChanges = await this.processDetectedChanges(
        changeResults,
        config
      );

      // Step 4: Update job statuses
      steps.push("updating_statuses");
      await this.updateJobStatuses(validJobs, changeResults);

      // Step 5: Send alerts if configured
      steps.push("sending_alerts");
      if (config.alert_on_status_change || config.alert_on_content_change) {
        await this.sendAlerts(processedChanges, config);
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        data: {
          jobs_checked: validJobs.length,
          changes_detected: processedChanges.length,
          alerts_sent: processedChanges.filter((c) => c.alert_sent).length,
          duration_ms: duration,
        },
        metrics: {
          duration_ms: duration,
          steps_completed: steps.length,
          steps_failed: 0,
          resources_used: {
            jobs_checked: validJobs.length,
            changes_detected: processedChanges.length,
          },
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      return {
        success: false,
        errors: [errorMessage],
        warnings: warnings,
        metrics: {
          duration_ms: duration,
          steps_completed: steps.length,
          steps_failed: 1,
          resources_used: {},
        },
      };
    }
  }

  /**
   * Validate job IDs
   */
  private async validateJobIds(jobIds: string[]): Promise<any[]> {
    const param_placeholders = jobIds.map(() => "?").join(",");
    const jobs = await this.env.DB.prepare(
      `
      SELECT * FROM jobs WHERE id IN (${param_placeholders}) AND status = 'open'
    `
    )
      .bind(...jobIds)
      .all();

    return jobs || [];
  }

  /**
   * Check jobs for changes
   */
  private async checkJobsForChanges(
    jobs: any[],
    config: JobMonitorWorkflowConfig
  ): Promise<any[]> {
    const changeResults = [];

    for (const job of jobs) {
      try {
        const browser = await this.env.MYBROWSER.launch();
        const page = await browser.newPage();

        try {
          await page.goto(job.url);
          const content = await page.content();

          // Compare with stored content
          const changes = await this.detectChanges(job, content, config);
          if (changes.length > 0) {
            changeResults.push({
              job_id: job.id,
              url: job.url,
              changes,
              detected_at: new Date().toISOString(),
            });
          }
        } finally {
          await browser.close();
        }

        // Add delay between checks
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error checking job ${job.id}:`, error);
        changeResults.push({
          job_id: job.id,
          url: job.url,
          error: error instanceof Error ? error.message : "Unknown error",
          detected_at: new Date().toISOString(),
        });
      }
    }

    return changeResults;
  }

  /**
   * Detect changes in job content
   */
  private async detectChanges(
    job: any,
    newContent: string,
    config: JobMonitorWorkflowConfig
  ): Promise<any[]> {
    const changes = [];

    // Get previous content from R2
    const previousContent = await this.getPreviousContent(job.id);
    if (!previousContent) {
      // First time checking this job
      await this.storeContent(job.id, newContent);
      return [];
    }

    // Compare content using AI
    const changeAnalysis = await this.analyzeContentChanges(
      previousContent,
      newContent
    );

    if (changeAnalysis.significant_changes.length > 0) {
      changes.push(...changeAnalysis.significant_changes);
    }

    // Store new content
    await this.storeContent(job.id, newContent);

    return changes;
  }

  /**
   * Get previous content from R2
   */
  private async getPreviousContent(jobId: string): Promise<string | null> {
    try {
      const object = await this.env.R2.get(`job-content/${jobId}.html`);
      return object ? await object.text() : null;
    } catch (error) {
      console.error(`Error getting previous content for job ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Store content in R2
   */
  private async storeContent(jobId: string, content: string): Promise<void> {
    try {
      await this.env.R2.put(`job-content/${jobId}.html`, content);
    } catch (error) {
      console.error(`Error storing content for job ${jobId}:`, error);
    }
  }

  /**
   * Analyze content changes using AI
   */
  private async analyzeContentChanges(
    oldContent: string,
    newContent: string
  ): Promise<any> {
    try {
      const response = await this.env.AI.run(
        this.env.DEFAULT_MODEL_REASONING as keyof AiModels,
        {
          messages: [
            {
              role: "system",
              content:
                "Analyze the differences between two versions of a job posting. Identify significant changes in title, description, requirements, salary, location, or status. Return a JSON object with the analysis.",
            },
            {
              role: "user",
              content: `Compare these two versions of a job posting:\n\nOLD VERSION:\n${oldContent}\n\nNEW VERSION:\n${newContent}`,
            },
          ],
          response_format: {
            type: "json_object",
          },
        }
      );

      return JSON.parse(response.response as string);
    } catch (error) {
      console.error("Error analyzing content changes:", error);
      return { significant_changes: [] };
    }
  }

  /**
   * Process detected changes
   */
  private async processDetectedChanges(
    changeResults: any[],
    config: JobMonitorWorkflowConfig
  ): Promise<any[]> {
    const processedChanges = [];

    for (const result of changeResults) {
      if (result.error) {
        continue;
      }

      for (const change of result.changes) {
        // Store change in database
        const changeId = crypto.randomUUID();
        await this.env.DB.prepare(
          `
          INSERT INTO job_changes (
            id, job_id, change_type, old_value, new_value, 
            significance_score, ai_summary, detected_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
        )
          .bind(
            changeId,
            result.job_id,
            change.type,
            change.old_value,
            change.new_value,
            change.significance_score || 0.5,
            change.summary || "",
            result.detected_at
          )
          .run();

        processedChanges.push({
          ...change,
          job_id: result.job_id,
          change_id: changeId,
          alert_sent: false,
        });
      }
    }

    return processedChanges;
  }

  /**
   * Update job statuses
   */
  private async updateJobStatuses(
    jobs: any[],
    changeResults: any[]
  ): Promise<void> {
    for (const job of jobs) {
      const result = changeResults.find((r) => r.job_id === job.id);
      if (result && result.error) {
        // Mark job as having monitoring errors
        await this.env.DB.prepare(
          `
          UPDATE jobs SET last_crawled_at = datetime('now') WHERE id = ?
        `
        )
          .bind(job.id)
          .run();
      } else {
        // Update last crawled time
        await this.env.DB.prepare(
          `
          UPDATE jobs SET last_crawled_at = datetime('now') WHERE id = ?
        `
        )
          .bind(job.id)
          .run();
      }
    }
  }

  /**
   * Send alerts for detected changes
   */
  private async sendAlerts(
    processedChanges: any[],
    config: JobMonitorWorkflowConfig
  ): Promise<void> {
    for (const change of processedChanges) {
      try {
        // Determine if alert should be sent
        let shouldAlert = false;

        if (config.alert_on_status_change && change.type === "status") {
          shouldAlert = true;
        }

        if (config.alert_on_content_change && change.type !== "status") {
          shouldAlert = true;
        }

        if (
          shouldAlert &&
          change.significance_score > (config.change_threshold || 0.3)
        ) {
          // Send alert (this would integrate with notification system)
          await this.sendChangeAlert(change);
          change.alert_sent = true;
        }
      } catch (error) {
        console.error(
          `Error sending alert for change ${change.change_id}:`,
          error
        );
      }
    }
  }

  /**
   * Send change alert
   */
  private async sendChangeAlert(change: any): Promise<void> {
    // This would integrate with the notification system
    // For now, just log the alert
    console.log(`Alert: Job ${change.job_id} has significant changes:`, {
      type: change.type,
      significance: change.significance_score,
      summary: change.summary,
    });
  }
}
