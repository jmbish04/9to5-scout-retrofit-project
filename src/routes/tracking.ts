/**
 * API routes for job tracking and monitoring functionality.
 */

import type { Env } from "../index";
import {
  getJobTrackingTimeline,
  runDailyJobMonitoring,
} from "../lib/monitoring";
import { getJobsForMonitoring } from "../domains/jobs/services/job-storage.service";

/**
 * GET /api/jobs/:jobId/tracking
 * Get tracking history for a specific job.
 */
export async function handleJobTrackingGet(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const jobId = pathParts[3]; // /api/jobs/:jobId/tracking

    if (!jobId) {
      return new Response(JSON.stringify({ error: "Job ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const timeline = await getJobTrackingTimeline(env, jobId);

    return new Response(JSON.stringify(timeline), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error getting job tracking:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to get job tracking data",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * GET /api/jobs/:jobId/snapshots/:snapshotId/content
 * Get snapshot content from R2 storage.
 */
export async function handleSnapshotContentGet(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const jobId = pathParts[3]; // /api/jobs/:jobId/snapshots/:snapshotId/content
    const snapshotId = pathParts[5];
    const contentType = url.searchParams.get("type") || "html"; // html, pdf, markdown, json, screenshot

    if (!jobId || !snapshotId) {
      return new Response(
        JSON.stringify({ error: "Job ID and snapshot ID are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get snapshot metadata
    const snapshot = await env.DB.prepare(
      `
      SELECT * FROM snapshots WHERE id = ? AND job_id = ?
    `
    )
      .bind(snapshotId, jobId)
      .first();

    if (!snapshot) {
      return new Response(JSON.stringify({ error: "Snapshot not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Type assertion for snapshot object
    const snapshotData = snapshot as Record<string, unknown>;

    // Get appropriate R2 key based on content type
    let r2Key: string | null = null;
    let mimeType = "text/plain";

    switch (contentType) {
      case "html":
        r2Key = (snapshotData.html_r2_key as string) || null;
        mimeType = "text/html";
        break;
      case "pdf":
        r2Key = (snapshotData.pdf_r2_key as string) || null;
        mimeType = "application/pdf";
        break;
      case "markdown":
        r2Key = (snapshotData.markdown_r2_key as string) || null;
        mimeType = "text/markdown";
        break;
      case "json":
        r2Key = (snapshotData.json_r2_key as string) || null;
        mimeType = "application/json";
        break;
      case "screenshot":
        r2Key = (snapshotData.screenshot_r2_key as string) || null;
        mimeType = "image/png";
        break;
      default:
        return new Response(JSON.stringify({ error: "Invalid content type" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
    }

    if (!r2Key) {
      return new Response(
        JSON.stringify({
          error: `${contentType} content not available for this snapshot`,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get content from R2
    const object = await env.R2.get(r2Key);

    if (!object) {
      return new Response(
        JSON.stringify({ error: "Content not found in storage" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const content = await object.arrayBuffer();

    return new Response(content, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${snapshotId}.${
          contentType === "screenshot" ? "png" : contentType
        }"`,
      },
    });
  } catch (error) {
    console.error("Error getting snapshot content:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to get snapshot content",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * POST /api/monitoring/daily-run
 * Manually trigger daily job monitoring.
 */
export async function handleDailyMonitoringPost(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    console.log("Manual daily monitoring triggered");

    const result = await runDailyJobMonitoring(env);

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in manual daily monitoring:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to run daily monitoring",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * GET /api/monitoring/status
 * Get monitoring status and statistics.
 */
export async function handleMonitoringStatusGet(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // Get monitoring statistics
    const activeJobs = await env.DB.prepare(
      `
      SELECT COUNT(*) as count FROM jobs 
      WHERE daily_monitoring_enabled = 1 AND status = 'open'
    `
    ).first();

    const needsCheck = await env.DB.prepare(
      `
      SELECT COUNT(*) as count FROM jobs 
      WHERE daily_monitoring_enabled = 1 
      AND status = 'open'
      AND (
        last_status_check_at IS NULL 
        OR datetime(last_status_check_at, '+' || monitoring_frequency_hours || ' hours') <= datetime('now')
      )
    `
    ).first();

    const recentActivity = await env.DB.prepare(
      `
      SELECT 
        tracking_date,
        COUNT(*) as jobs_checked,
        SUM(CASE WHEN status = 'modified' THEN 1 ELSE 0 END) as jobs_modified,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as jobs_closed,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors
      FROM job_tracking_history
      WHERE tracking_date >= date('now', '-7 days')
      GROUP BY tracking_date
      ORDER BY tracking_date DESC
    `
    ).all();

    const marketStats = await env.DB.prepare(
      `
      SELECT * FROM job_market_stats 
      WHERE date >= date('now', '-30 days')
      ORDER BY date DESC
      LIMIT 30
    `
    ).all();

    const status = {
      active_jobs_monitored: activeJobs?.count || 0,
      jobs_needing_check: needsCheck?.count || 0,
      last_updated: new Date().toISOString(),
      recent_activity: recentActivity.results || [],
      market_statistics: marketStats.results || [],
    };

    return new Response(JSON.stringify(status), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error getting monitoring status:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to get monitoring status",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * GET /api/jobs/monitoring-queue
 * Get list of jobs that need monitoring.
 */
export async function handleMonitoringQueueGet(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const jobs = await getJobsForMonitoring(env);
    const limitedJobs = jobs.slice(0, limit);

    return new Response(
      JSON.stringify({
        total_jobs: jobs.length,
        returned_jobs: limitedJobs.length,
        jobs: limitedJobs,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error getting monitoring queue:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to get monitoring queue",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * PUT /api/jobs/:jobId/monitoring
 * Update monitoring settings for a specific job.
 */
export async function handleJobMonitoringPut(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const jobId = pathParts[3]; // /api/jobs/:jobId/monitoring

    if (!jobId) {
      return new Response(JSON.stringify({ error: "Job ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const { daily_monitoring_enabled, monitoring_frequency_hours } = body;

    // Validate input
    if (
      daily_monitoring_enabled !== undefined &&
      typeof daily_monitoring_enabled !== "boolean"
    ) {
      return new Response(
        JSON.stringify({ error: "daily_monitoring_enabled must be a boolean" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (
      monitoring_frequency_hours !== undefined &&
      (typeof monitoring_frequency_hours !== "number" ||
        monitoring_frequency_hours < 1)
    ) {
      return new Response(
        JSON.stringify({
          error: "monitoring_frequency_hours must be a positive number",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Update job monitoring settings
    const updateFields = [];
    const values = [];

    if (daily_monitoring_enabled !== undefined) {
      updateFields.push("daily_monitoring_enabled = ?");
      values.push(daily_monitoring_enabled);
    }

    if (monitoring_frequency_hours !== undefined) {
      updateFields.push("monitoring_frequency_hours = ?");
      values.push(monitoring_frequency_hours);
    }

    if (updateFields.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid fields to update" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    values.push(jobId);

    await env.DB.prepare(
      `
      UPDATE jobs SET ${updateFields.join(", ")}, updated_at = datetime('now')
      WHERE id = ?
    `
    )
      .bind(...values)
      .run();

    // Get updated job
    const updatedJob = await env.DB.prepare("SELECT * FROM jobs WHERE id = ?")
      .bind(jobId)
      .first();

    return new Response(JSON.stringify(updatedJob), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error updating job monitoring:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to update job monitoring settings",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
