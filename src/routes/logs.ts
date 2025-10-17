import { Hono } from "hono";
import type { Env } from "../index";

const logs = new Hono<{ Bindings: Env }>();

// Log test result to D1
logs.post("/api/logs/test", async (c) => {
  console.log("📝 Logs API: Test log request received");
  
  try {
    const body = await c.req.json();
    const {
      session_id,
      test_name,
      success,
      duration,
      error,
      data,
      timestamp,
      test_type,
    } = body;

    console.log(`📊 Log entry details:`, {
      session_id,
      test_name,
      success,
      duration,
      test_type,
      has_error: !!error,
      has_data: !!data
    });

    // Validate required fields
    if (
      !session_id ||
      !test_name ||
      success === undefined ||
      !duration ||
      !timestamp ||
      !test_type
    ) {
      console.error("❌ Missing required fields in log entry");
      return c.json({ error: "Missing required fields" }, 400);
    }

    console.log("✅ Log entry validation passed");

    // Insert into D1
    console.log("💾 Inserting test log into D1 database...");
    const result = await c.env.DB.prepare(
      `
      INSERT INTO test_logs (
        session_id, test_name, success, duration, error, data, timestamp, test_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        session_id,
        test_name,
        success,
        duration,
        error || null,
        data || null,
        timestamp,
        test_type
      )
      .run();

    console.log(`✅ Test log saved successfully with ID: ${result.meta.last_row_id}`);

    return c.json({
      success: true,
      id: result.meta.last_row_id,
      message: "Test log saved successfully",
    });
  } catch (error) {
    console.error("💥 Error saving test log:", error);
    return c.json(
      {
        error: "Failed to save test log",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

// Get test logs by session ID
logs.get("/api/logs/session/:sessionId", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");

    const result = await c.env.DB.prepare(
      `
      SELECT * FROM test_logs 
      WHERE session_id = ? 
      ORDER BY timestamp ASC
    `
    )
      .bind(sessionId)
      .all();

    return c.json({
      success: true,
      logs: result.results,
      count: result.results.length,
    });
  } catch (error) {
    console.error("Error fetching test logs:", error);
    return c.json(
      {
        error: "Failed to fetch test logs",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

// Get test logs by type
logs.get("/api/logs/type/:testType", async (c) => {
  try {
    const testType = c.req.param("testType");
    const limit = c.req.query("limit") || "100";

    const result = await c.env.DB.prepare(
      `
      SELECT * FROM test_logs 
      WHERE test_type = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `
    )
      .bind(testType, parseInt(limit))
      .all();

    return c.json({
      success: true,
      logs: result.results,
      count: result.results.length,
    });
  } catch (error) {
    console.error("Error fetching test logs by type:", error);
    return c.json(
      {
        error: "Failed to fetch test logs by type",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

// Get test statistics
logs.get("/stats", async (c) => {
  try {
    const testType = c.req.query("testType");
    const days = c.req.query("days") || "7";

    let whereClause =
      "WHERE timestamp >= datetime('now', '-" + days + " days')";
    let params: any[] = [];

    if (testType) {
      whereClause += " AND test_type = ?";
      params.push(testType);
    }

    const stats = await c.env.DB.prepare(
      `
      SELECT 
        test_type,
        COUNT(*) as total_tests,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_tests,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_tests,
        AVG(duration) as avg_duration,
        MIN(timestamp) as first_test,
        MAX(timestamp) as last_test
      FROM test_logs 
      ${whereClause}
      GROUP BY test_type
      ORDER BY last_test DESC
    `
    )
      .bind(...params)
      .all();

    return c.json({
      success: true,
      stats: stats.results,
      period_days: parseInt(days),
    });
  } catch (error) {
    console.error("Error fetching test statistics:", error);
    return c.json(
      {
        error: "Failed to fetch test statistics",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

// Get recent test sessions
logs.get("/sessions", async (c) => {
  try {
    const limit = c.req.query("limit") || "20";

    const result = await c.env.DB.prepare(
      `
      SELECT 
        session_id,
        test_type,
        COUNT(*) as total_tests,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_tests,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_tests,
        AVG(duration) as avg_duration,
        MIN(timestamp) as started_at,
        MAX(timestamp) as completed_at
      FROM test_logs 
      GROUP BY session_id, test_type
      ORDER BY completed_at DESC
      LIMIT ?
    `
    )
      .bind(parseInt(limit))
      .all();

    return c.json({
      success: true,
      sessions: result.results,
      count: result.results.length,
    });
  } catch (error) {
    console.error("Error fetching test sessions:", error);
    return c.json(
      {
        error: "Failed to fetch test sessions",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

export { logs };
