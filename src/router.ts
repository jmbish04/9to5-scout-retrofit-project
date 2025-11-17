/**
 * @module src/router.ts
 * @description
 * Hono REST routes for health, tests, and API endpoints.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { executeMCPTool, listMCPTools } from "./mcp";
import { handleRPC } from "./rpc";
import {
  HealthSnapshotSchema,
  MCPExecuteRequestSchema,
  RPCRequestSchema,
  TestRunRequestSchema,
  TestRunResponseSchema,
} from "./schemas/apiSchemas";
import { runAllTests } from "./tests/runner";
import type { Env } from "./types";
import {
  getLatestSession,
  getSessionResults,
  initKysely,
  listActiveTests,
} from "./utils/db";

const app = new Hono<{ Bindings: Env }>();

// CORS for /api/* routes
app.use(
  "/api/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Health endpoint
app.get("/api/health", async (c) => {
  try {
    const kysely = initKysely(c.env);
    const latest = await getLatestSession(kysely);

    const status =
      latest && latest.failed > 0
        ? latest.failed > latest.passed
          ? "unhealthy"
          : "degraded"
        : "healthy";

    const snapshot: z.infer<typeof HealthSnapshotSchema> = {
      status,
      uptime: 0, // Would calculate from worker start time
      lastTestSession: {
        sessionUuid: latest?.sessionUuid || null,
        finishedAt: latest?.finishedAt || null,
        passed: latest?.passed || 0,
        failed: latest?.failed || 0,
        totalTests: latest?.totalTests || 0,
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(snapshot);
  } catch (error) {
    return c.json(
      {
        error: "Failed to get health snapshot",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Run tests
app.post("/api/tests/run", async (c) => {
  try {
    const body = await c.req.json();
    const request = TestRunRequestSchema.parse(body);

    const baseUrl = new URL(c.req.url).origin;
    const sessionUuid = await runAllTests(c.env, baseUrl);

    const response: z.infer<typeof TestRunResponseSchema> = {
      sessionUuid,
      status: "running",
      totalTests: request.testIds?.length || 0,
      startedAt: new Date().toISOString(),
    };

    return c.json(response);
  } catch (error) {
    return c.json(
      {
        error: "Failed to run tests",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Get test definitions
app.get("/api/tests/defs", async (c) => {
  try {
    const kysely = initKysely(c.env);
    const defs = await listActiveTests(kysely);

    // Transform to match schema
    const transformed = defs.map((def: any) => ({
      id: def.id,
      name: def.name,
      description: def.description,
      category: (def as any).category || (def as any).aiCategory || undefined,
      severity: def.severity || undefined,
      isActive: (def as any).is_active === 1 || (def as any).isActive === true,
      errorMap: (def as any).error_map
        ? JSON.parse((def as any).error_map)
        : (def as any).errorMap || undefined,
      createdAt: (def as any).created_at || (def as any).createdAt,
    }));

    return c.json(transformed);
  } catch (error) {
    return c.json(
      {
        error: "Failed to get test definitions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Get session results
app.get("/api/tests/session/:sessionUuid", async (c) => {
  try {
    const { sessionUuid } = c.req.param();
    const kysely = initKysely(c.env);
    const results = await getSessionResults(kysely, sessionUuid);

    if (results.length === 0) {
      return c.json({ error: "Session not found" }, 404);
    }

    const totalTests = results.length;
    const passed = results.filter((r: any) => r.status === "pass").length;
    const failed = results.filter((r: any) => r.status === "fail").length;
    const finishedAt = results[results.length - 1].finished_at;

    const transformed = {
      sessionUuid,
      totalTests,
      passed,
      failed,
      finishedAt,
      results: results.map((r: any) => ({
        id: r.id,
        sessionUuid: r.session_uuid,
        testFk: r.test_fk || "",
        startedAt: r.started_at,
        finishedAt: r.finished_at,
        durationMs: r.duration_ms || null,
        status: r.status as "pass" | "fail",
        errorCode: r.error_code || null,
        raw: r.raw || null,
        aiHumanReadableErrorDescription:
          r.ai_human_readable_error_description || null,
        aiPromptToFixError: r.ai_prompt_to_fix_error || null,
        createdAt: r.created_at || "",
        testName: r.test_name || "",
        testDescription: r.test_description || "",
        category: r.category || null,
        severity: r.severity || null,
      })),
    };

    return c.json(transformed);
  } catch (error) {
    return c.json(
      {
        error: "Failed to get session results",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Get latest session
app.get("/api/tests/latest", async (c) => {
  try {
    const kysely = initKysely(c.env);
    const latest = await getLatestSession(kysely);

    if (!latest) {
      return c.json(null);
    }

    const results = await getSessionResults(kysely, latest.sessionUuid);

    const transformed = {
      sessionUuid: latest.sessionUuid,
      totalTests: latest.totalTests,
      passed: latest.passed,
      failed: latest.failed,
      finishedAt: latest.finishedAt,
      results: results.map((r: any) => ({
        id: r.id,
        sessionUuid: r.session_uuid,
        testFk: r.test_fk || "",
        startedAt: r.started_at,
        finishedAt: r.finished_at,
        durationMs: r.duration_ms || null,
        status: r.status as "pass" | "fail",
        errorCode: r.error_code || null,
        raw: r.raw || null,
        aiHumanReadableErrorDescription:
          r.ai_human_readable_error_description || null,
        aiPromptToFixError: r.ai_prompt_to_fix_error || null,
        createdAt: r.created_at || "",
        testName: r.test_name || "",
        testDescription: r.test_description || "",
        category: r.category || null,
        severity: r.severity || null,
      })),
    };

    return c.json(transformed);
  } catch (error) {
    return c.json(
      {
        error: "Failed to get latest session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// RPC endpoint
app.post("/rpc", async (c) => {
  try {
    const body = await c.req.json();
    const request = RPCRequestSchema.parse(body);
    const response = await handleRPC(request, c.env);
    return c.json(response);
  } catch (error) {
    return c.json(
      {
        error: {
          error: error instanceof Error ? error.message : "Unknown error",
          code: "RPC_ERROR",
        },
      },
      400
    );
  }
});

// MCP tools
app.get("/mcp/tools", async (c) => {
  try {
    const tools = listMCPTools();
    return c.json(tools);
  } catch (error) {
    return c.json(
      {
        error: "Failed to list MCP tools",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// MCP execute
app.post("/mcp/execute", async (c) => {
  try {
    const body = await c.req.json();
    const request = MCPExecuteRequestSchema.parse(body);
    const response = await executeMCPTool(request, c.env);
    return c.json(response);
  } catch (error) {
    return c.json(
      {
        result: null,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      400
    );
  }
});

export default app;
