/**
 * Monitoring Routes
 *
 * RESTful API routes for monitoring management, including job monitoring,
 * statistics, and monitoring configuration.
 */

import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../../../config/env";
import {
  getValidatedBody,
  getValidatedParams,
  logger,
  rateLimit,
  validateBody,
  validateParams,
} from "../../../core/validation/hono-validation";
import { CreateJobMonitoringRequestSchema } from "../models/monitoring.schema";
import { createMonitoringService } from "../services/monitoring.service";

// Parameter validation schemas
const JobIdParamsSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
});

const ErrorIdParamsSchema = z.object({
  errorId: z.string().min(1, "Error ID is required"),
});

const app = new Hono<{ Bindings: Env }>();

// Apply middleware
app.use("*", logger());
app.use("*", rateLimit({ requests: 50, windowMs: 60000 }));

/**
 * @route POST /monitoring/daily-run
 * @desc Trigger daily job monitoring run
 * @access Private
 * @returns {DailyMonitoringResult} Monitoring run results
 */
app.post("/daily-run", async (c) => {
  try {
    const monitoringService = createMonitoringService(c.env);
    const result = await monitoringService.runDailyJobMonitoring();

    return c.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Error running daily monitoring:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to run daily monitoring",
      },
      500
    );
  }
});

/**
 * @route GET /monitoring/stats
 * @desc Get monitoring statistics
 * @access Private
 * @returns {MonitoringStatsResponse} Monitoring statistics
 */
app.get("/stats", async (c) => {
  try {
    const monitoringService = createMonitoringService(c.env);
    const stats = await monitoringService.getMonitoringStats();

    return c.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error getting monitoring stats:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get monitoring stats",
      },
      500
    );
  }
});

/**
 * @route GET /monitoring/dashboard
 * @desc Get monitoring dashboard data
 * @access Private
 * @returns {MonitoringDashboardResponse} Dashboard data
 */
app.get("/dashboard", async (c) => {
  try {
    const monitoringService = createMonitoringService(c.env);
    const stats = await monitoringService.getMonitoringStats();

    // Get recent activity (last 10 job changes)
    const recentActivity = await c.env.DB.prepare(
      `
      SELECT 
        jc.job_id,
        jc.change_type,
        jc.old_value,
        jc.new_value,
        jc.significance_score,
        jc.ai_summary,
        jc.detected_at,
        j.title as job_title,
        j.company
      FROM job_changes jc
      JOIN jobs j ON jc.job_id = j.id
      ORDER BY jc.detected_at DESC
      LIMIT 10
    `
    ).all();

    // Get active alerts
    const activeAlerts = await c.env.DB.prepare(
      `
      SELECT * FROM monitoring_alerts 
      WHERE enabled = 1
      ORDER BY created_at DESC
    `
    ).all();

    // Calculate system health
    const systemHealth = {
      status:
        stats.error_rate_percentage > 10 ? "warning" : ("healthy" as const),
      uptime_percentage: 100 - stats.error_rate_percentage,
      last_error:
        stats.error_rate_percentage > 0
          ? "Recent monitoring errors detected"
          : undefined,
    };

    const dashboard = {
      stats,
      recent_activity: recentActivity || [],
      active_alerts: activeAlerts || [],
      system_health: systemHealth,
      performance_metrics: {
        average_processing_time_ms: stats.average_processing_time_ms,
        success_rate_percentage: 100 - stats.error_rate_percentage,
        error_rate_percentage: stats.error_rate_percentage,
      },
    };

    return c.json({
      success: true,
      dashboard,
    });
  } catch (error) {
    console.error("Error getting monitoring dashboard:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get monitoring dashboard",
      },
      500
    );
  }
});

/**
 * @route GET /monitoring/jobs/:jobId/status
 * @desc Get monitoring status for a specific job
 * @access Private
 * @param {string} jobId - Job ID
 * @returns {JobMonitoringStatus} Job monitoring status
 */
app.get("/jobs/:jobId/status", validateParams(JobIdParamsSchema), async (c) => {
  try {
    const { jobId } = getValidatedParams(c) as { jobId: string };

    const status = await c.env.DB.prepare(
      `
        SELECT 
          j.id as job_id,
          CASE WHEN j.status = 'open' THEN 1 ELSE 0 END as is_monitoring,
          j.last_crawled_at as last_checked_at,
          datetime(j.last_crawled_at, '+24 hours') as next_check_at,
          COALESCE(me.consecutive_failures, 0) as consecutive_failures,
          COALESCE(me.total_checks, 0) as total_checks,
          me.last_error,
          j.created_at,
          j.updated_at
        FROM jobs j
        LEFT JOIN monitoring_errors me ON j.id = me.job_id
        WHERE j.id = ?
      `
    )
      .bind(jobId)
      .first();

    if (!status) {
      return c.json(
        {
          success: false,
          error: "Job not found",
        },
        404
      );
    }

    return c.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error("Error getting job monitoring status:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get job monitoring status",
      },
      500
    );
  }
});

/**
 * @route POST /monitoring/jobs/:jobId/start
 * @desc Start monitoring a specific job
 * @access Private
 * @param {string} jobId - Job ID
 * @param {CreateJobMonitoringRequest} body - Monitoring configuration
 * @returns {JobMonitoringResponse} Created monitoring configuration
 */
app.post(
  "/jobs/:jobId/start",
  validateParams(JobIdParamsSchema),
  validateBody(CreateJobMonitoringRequestSchema),
  async (c) => {
    try {
      const { jobId } = getValidatedParams(c) as { jobId: string };
      const configData = getValidatedBody(c);

      // Check if job exists
      const job = await c.env.DB.prepare(
        `
        SELECT id FROM jobs WHERE id = ?
      `
      )
        .bind(jobId)
        .first();

      if (!job) {
        return c.json(
          {
            success: false,
            error: "Job not found",
          },
          404
        );
      }

      // Create monitoring configuration
      const configId = crypto.randomUUID();
      const nextCheckAt = new Date();
      nextCheckAt.setHours(
        nextCheckAt.getHours() + configData.check_frequency_hours
      );

      await c.env.DB.prepare(
        `
        INSERT INTO job_monitoring_configs (
          id, job_id, enabled, check_frequency_hours, 
          next_check_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `
      )
        .bind(
          configId,
          jobId,
          configData.enabled,
          configData.check_frequency_hours,
          nextCheckAt.toISOString()
        )
        .run();

      const config = {
        id: configId,
        job_id: jobId,
        enabled: configData.enabled,
        check_frequency_hours: configData.check_frequency_hours,
        next_check_at: nextCheckAt.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return c.json(
        {
          success: true,
          config,
        },
        201
      );
    } catch (error) {
      console.error("Error starting job monitoring:", error);
      return c.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to start job monitoring",
        },
        500
      );
    }
  }
);

/**
 * @route POST /monitoring/jobs/:jobId/stop
 * @desc Stop monitoring a specific job
 * @access Private
 * @param {string} jobId - Job ID
 * @returns {object} Success message
 */
app.post("/jobs/:jobId/stop", validateParams(JobIdParamsSchema), async (c) => {
  try {
    const { jobId } = getValidatedParams(c) as { jobId: string };

    await c.env.DB.prepare(
      `
        UPDATE job_monitoring_configs 
        SET enabled = 0, updated_at = datetime('now')
        WHERE job_id = ?
      `
    )
      .bind(jobId)
      .run();

    return c.json({
      success: true,
      message: "Job monitoring stopped successfully",
    });
  } catch (error) {
    console.error("Error stopping job monitoring:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to stop job monitoring",
      },
      500
    );
  }
});

/**
 * @route GET /monitoring/errors
 * @desc Get monitoring errors
 * @access Private
 * @query {boolean} resolved - Filter by resolved status
 * @query {number} limit - Number of errors to return
 * @query {number} offset - Number of errors to skip
 * @returns {MonitoringError[]} List of monitoring errors
 */
app.get("/errors", async (c) => {
  try {
    const resolved = c.req.query("resolved");
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = parseInt(c.req.query("offset") || "0");

    let whereClause = "WHERE 1=1";
    const params: any[] = [];

    if (resolved !== undefined) {
      whereClause += " AND resolved = ?";
      params.push(resolved === "true" ? 1 : 0);
    }

    const errors = await c.env.DB.prepare(
      `
      SELECT * FROM monitoring_errors 
      ${whereClause}
      ORDER BY occurred_at DESC
      LIMIT ? OFFSET ?
    `
    )
      .bind(...params, limit, offset)
      .all();

    return c.json({
      success: true,
      errors: errors || [],
      total: errors?.length || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error getting monitoring errors:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get monitoring errors",
      },
      500
    );
  }
});

/**
 * @route POST /monitoring/errors/:errorId/resolve
 * @desc Mark a monitoring error as resolved
 * @access Private
 * @param {string} errorId - Error ID
 * @returns {object} Success message
 */
app.post(
  "/errors/:errorId/resolve",
  validateParams(ErrorIdParamsSchema),
  async (c) => {
    try {
      const { errorId } = getValidatedParams(c) as { errorId: string };

      await c.env.DB.prepare(
        `
        UPDATE monitoring_errors 
        SET resolved = 1, resolved_at = datetime('now')
        WHERE id = ?
      `
      )
        .bind(errorId)
        .run();

      return c.json({
        success: true,
        message: "Error marked as resolved",
      });
    } catch (error) {
      console.error("Error resolving monitoring error:", error);
      return c.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to resolve monitoring error",
        },
        500
      );
    }
  }
);

export default app;
