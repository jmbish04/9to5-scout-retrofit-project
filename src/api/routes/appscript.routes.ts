/**
 * @file src/api/routes/appscript.routes.ts
 * @description AppScript logging endpoint
 */

import { Hono } from "hono";
import type { Env } from "../../config/env";

const app = new Hono<{ Bindings: Env }>();

/**
 * @route POST /api/appscript/run
 * @description Log an Apps Script execution
 */
app.post("/run", async (c) => {
  try {
    // Verify authentication
    const authHeader = c.req.header("Authorization");
    const apiKey = authHeader?.replace("Bearer ", "");

    if (!apiKey || apiKey !== c.env.WORKER_API_KEY) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Parse request data
    const runData = await c.req.json();

    // Log to D1
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    await c.env.DB.prepare(
      `INSERT INTO appscript_runs (id, timestamp, script_name, execution_time, triggered_by, status)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        timestamp,
        runData.script_name || "Unknown",
        runData.execution_time || timestamp,
        runData.triggered_by || "unknown",
        runData.status || "running"
      )
      .run();

    // Also log this request to the worker request logs
    const logId = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO worker_request_logs (id, timestamp, endpoint, method, source, request_body, response_code)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        logId,
        timestamp,
        "/api/appscript/run",
        "POST",
        "appscript",
        JSON.stringify(runData),
        200
      )
      .run();

    return c.json({
      success: true,
      runId: id,
      timestamp: timestamp,
    });
  } catch (error) {
    console.error("Error logging AppScript run:", error);
    return c.json(
      {
        error: "Failed to log run",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * @route GET /api/appscript/runs
 * @description Get recent Apps Script execution logs
 */
app.get("/runs", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "50");

    const { results } = await c.env.DB.prepare(
      `SELECT * FROM appscript_runs 
       ORDER BY timestamp DESC 
       LIMIT ?`
    )
      .bind(limit)
      .all();

    return c.json({
      success: true,
      runs: results || [],
      count: (results || []).length,
    });
  } catch (error) {
    console.error("Error fetching AppScript runs:", error);
    return c.json(
      {
        error: "Failed to fetch runs",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

export default app;
