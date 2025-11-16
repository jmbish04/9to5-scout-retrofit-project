/**
 * @file src/api/routes/email.dashboard.ts
 * @description Dashboard endpoint for email processing statistics
 */

import { Hono } from "hono";
import type { Env } from "../../config/env";

const app = new Hono<{ Bindings: Env }>();

interface DashboardStats {
  totalProcessed: number;
  jobsAlert: number;
  jobRelated: number;
  notJobRelated: number;
  last24Hours: {
    total: number;
    jobsAlert: number;
    jobRelated: number;
    notJobRelated: number;
  };
  recentRuns: Array<{
    id: string;
    timestamp: string;
    script_name: string;
    status: string;
  }>;
  recentClassifications: Array<{
    id: string;
    timestamp: string;
    classification: string;
    from: string;
    subject: string;
  }>;
}

/**
 * @route GET /api/email/dashboard
 * @description Get email processing dashboard statistics
 */
app.get("/dashboard", async (c) => {
  try {
    // Verify authentication
    const authHeader = c.req.header("Authorization");
    const apiKey = authHeader?.replace("Bearer ", "");

    if (!apiKey || apiKey !== c.env.WORKER_API_KEY) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get stats from worker_request_logs
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Get all email classifications from request logs
    const { results: allLogs } = await c.env.DB.prepare(
      `SELECT * FROM worker_request_logs 
       WHERE endpoint = '/api/email/classify' 
       AND method = 'POST'
       ORDER BY timestamp DESC`
    ).all();

    // Get recent AppScript runs
    const { results: recentRuns } = await c.env.DB.prepare(
      `SELECT id, timestamp, script_name, status FROM appscript_runs 
       ORDER BY timestamp DESC 
       LIMIT 10`
    ).all();

    // Parse and aggregate stats
    let totalProcessed = 0;
    let jobsAlert = 0;
    let jobRelated = 0;
    let notJobRelated = 0;
    let last24HoursTotal = 0;
    let last24HoursJobsAlert = 0;
    let last24HoursJobRelated = 0;
    let last24HoursNotJobRelated = 0;
    const recentClassifications: Array<{
      id: string;
      timestamp: string;
      classification: string;
      from: string;
      subject: string;
    }> = [];

    for (const log of allLogs || []) {
      try {
        const requestBody = JSON.parse((log.request_body as string) || "{}");
        // Try to parse response body, but handle cases where it might not be stored
        let classification = "NOT_JOB_RELATED";
        if (log.response_body) {
          try {
            const responseBody = JSON.parse(log.response_body as string);
            classification = responseBody.classification || "NOT_JOB_RELATED";
          } catch (e) {
            // Response body might not be JSON or might be missing
          }
        }
        const logDate = new Date(log.timestamp as string);

        totalProcessed++;

        if (classification === "JOBS_ALERT") {
          jobsAlert++;
          if (logDate >= yesterday) {
            last24HoursJobsAlert++;
            last24HoursTotal++;
          }
        } else if (classification === "JOB_RELATED_DO_NOT_TAG") {
          jobRelated++;
          if (logDate >= yesterday) {
            last24HoursJobRelated++;
            last24HoursTotal++;
          }
        } else {
          notJobRelated++;
          if (logDate >= yesterday) {
            last24HoursNotJobRelated++;
            last24HoursTotal++;
          }
        }

        // Add to recent classifications (last 20)
        if (recentClassifications.length < 20) {
          recentClassifications.push({
            id: log.id as string,
            timestamp: log.timestamp as string,
            classification,
            from: requestBody.from || "unknown",
            subject: requestBody.subject || "No Subject",
          });
        }
      } catch (error) {
        console.error("Error parsing log entry:", error);
      }
    }

    const stats: DashboardStats = {
      totalProcessed,
      jobsAlert,
      jobRelated,
      notJobRelated,
      last24Hours: {
        total: last24HoursTotal,
        jobsAlert: last24HoursJobsAlert,
        jobRelated: last24HoursJobRelated,
        notJobRelated: last24HoursNotJobRelated,
      },
      recentRuns: (recentRuns || []).map((run: any) => ({
        id: run.id as string,
        timestamp: run.timestamp as string,
        script_name: run.script_name as string,
        status: run.status as string,
      })),
      recentClassifications,
    };

    return c.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return c.json(
      {
        error: "Failed to fetch dashboard stats",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

export default app;
