/**
 * @fileoverview FastAPI Integration Routes
 *
 * API routes for integrating with the local FastAPI scraper service.
 * Provides endpoints for polling, job submission, and status updates.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { Hono } from "hono";
import { z } from "zod";
import { ResponseUtils } from "../../../shared/utils/response.utils";
import {
  createFastAPIService,
  type FastAPIServiceEnv,
} from "./fastapi.service";
import {
  createScrapeQueueService,
  type ScrapeQueueServiceEnv,
} from "./scrape-queue.service";
import {
  createWebSocketService,
  type WebSocketServiceEnv,
} from "./websocket.service";

/**
 * Request validation schemas
 */
const PollingRequestSchema = z.object({
  client_id: z.string().optional(),
  max_jobs: z.number().int().min(1).max(10).optional().default(1),
});

const JobSubmissionSchema = z.object({
  job_id: z.string().min(1),
  url: z.string().url(),
  site_id: z.string().min(1),
  job_type: z.enum(["scrape_job", "autonomous_scrape", "monitor_job"]),
  context: z.string().optional(),
  max_tasks: z.number().int().min(1).max(100).optional().default(1),
  priority: z.number().int().min(0).max(10).optional().default(0),
});

const JobStatusUpdateSchema = z.object({
  status: z.enum(["completed", "failed", "in_progress"]),
  results: z
    .object({
      jobs_found: z.number().int().min(0),
      scraped_at: z.string().datetime(),
    })
    .optional(),
  error: z.string().optional(),
});

const IssueSubmissionSchema = z.object({
  agent_name: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]),
  category: z.enum(["integration", "api", "websocket", "authentication"]),
  issue: z.string().min(1),
  description: z.string().min(1),
  expected_behavior: z.string().min(1),
  actual_behavior: z.string().min(1),
  reproduction_steps: z.array(z.string()),
  environment: z.record(z.string(), z.any()),
});

/**
 * FastAPI Integration Routes
 */
export const fastapiRoutes = new Hono<{ Bindings: FastAPIServiceEnv }>();

/**
 * GET /api/v1/poll-for-jobs
 *
 * Polls the FastAPI service for queued scraping jobs.
 * This is the CRITICAL endpoint that the Python service uses to check for work.
 */
fastapiRoutes.get("/api/v1/poll-for-jobs", async (c) => {
  try {
    const query = c.req.query();
    const validatedQuery = PollingRequestSchema.parse(query);

    // Use scrape queue service directly instead of FastAPI service
    const scrapeQueueService = createScrapeQueueService(
      c.env as ScrapeQueueServiceEnv
    );
    const response = await scrapeQueueService.pollForJobs(
      validatedQuery.max_jobs
    );

    return c.json(
      ResponseUtils.success(response, "Polling completed successfully")
    );
  } catch (error) {
    console.error("Error in poll-for-jobs endpoint:", error);

    if (error instanceof z.ZodError) {
      return c.json(
        ResponseUtils.validationError(
          error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
          "Validation error"
        ),
        400
      );
    }

    return c.json(
      ResponseUtils.error(
        "POLLING_FAILED",
        `Failed to poll for jobs: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        500
      ),
      500
    );
  }
});

/**
 * POST /api/v1/submit-job
 *
 * Submits a new job to the FastAPI scraper service.
 */
fastapiRoutes.post("/api/v1/submit-job", async (c) => {
  try {
    const body = await c.req.json();
    const validatedBody = JobSubmissionSchema.parse(body);

    // Use scrape queue service directly
    const scrapeQueueService = createScrapeQueueService(
      c.env as ScrapeQueueServiceEnv
    );
    const jobId = await scrapeQueueService.addJob({
      url: validatedBody.url,
      site_id: validatedBody.site_id,
      priority: validatedBody.priority,
      source: "api",
      job_type: validatedBody.job_type,
      context: validatedBody.context,
      max_tasks: validatedBody.max_tasks,
      metadata: JSON.stringify({ submitted_via: "api" }),
    });

    return c.json(
      ResponseUtils.success({ job_id: jobId }, "Job submitted successfully"),
      201
    );
  } catch (error) {
    console.error("Error in submit-job endpoint:", error);

    if (error instanceof z.ZodError) {
      return c.json(
        ResponseUtils.validationError(
          error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
          "Validation error"
        ),
        400
      );
    }

    return c.json(
      ResponseUtils.error(
        "JOB_SUBMISSION_FAILED",
        `Failed to submit job: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        500
      ),
      500
    );
  }
});

/**
 * POST /api/v1/jobs/:jobId/status
 *
 * Updates the status of a job in the FastAPI service.
 * This is the RECOMMENDED endpoint for reporting job completion.
 */
fastapiRoutes.post("/api/v1/jobs/:jobId/status", async (c) => {
  try {
    const jobId = c.req.param("jobId");
    if (!jobId) {
      return c.json(ResponseUtils.badRequest("Invalid request"), 400);
    }

    const body = await c.req.json();
    const validatedBody = JobStatusUpdateSchema.parse(body);

    // Use scrape queue service directly
    const scrapeQueueService = createScrapeQueueService(
      c.env as ScrapeQueueServiceEnv
    );

    // Map the status to our scrape queue status
    let queueStatus:
      | "pending"
      | "processing"
      | "completed"
      | "failed"
      | "cancelled";
    switch (validatedBody.status) {
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
    if (
      validatedBody.status === "completed" ||
      validatedBody.status === "failed"
    ) {
      additionalData.completed_at = new Date().toISOString();
    }
    if (validatedBody.error) {
      additionalData.error_message = validatedBody.error;
    }

    await scrapeQueueService.updateJobStatus(
      jobId,
      queueStatus,
      additionalData
    );

    return c.json(
      ResponseUtils.success(
        { job_id: jobId, status: validatedBody.status },
        "Job status updated successfully"
      )
    );
  } catch (error) {
    console.error("Error in job status update endpoint:", error);

    if (error instanceof z.ZodError) {
      return c.json(
        ResponseUtils.validationError(
          error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
          "Validation error"
        ),
        400
      );
    }

    return c.json(
      ResponseUtils.error(
        "STATUS_UPDATE_FAILED",
        `Failed to update job status: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        500
      ),
      500
    );
  }
});

/**
 * GET /api/v1/health
 *
 * Checks the health status of the FastAPI service.
 */
fastapiRoutes.get("/api/v1/health", async (c) => {
  try {
    const fastapiService = createFastAPIService(c.env);
    const isHealthy = await fastapiService.checkHealth();

    return c.json(
      ResponseUtils.success(
        { healthy: isHealthy, service: "fastapi" },
        isHealthy ? "Service is healthy" : "Service is unhealthy"
      ),
      isHealthy ? 200 : 503
    );
  } catch (error) {
    console.error("Error in health check endpoint:", error);

    return c.json(
      ResponseUtils.error(
        "HEALTH_CHECK_FAILED",
        `Failed to check health: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        500
      ),
      500
    );
  }
});

/**
 * GET /api/v1/diagnostics
 *
 * Gets diagnostic information from the FastAPI service.
 */
fastapiRoutes.get("/api/v1/diagnostics", async (c) => {
  try {
    const fastapiService = createFastAPIService(c.env);
    const diagnostics = await fastapiService.getDiagnostics();

    return c.json(
      ResponseUtils.success(diagnostics, "Diagnostics retrieved successfully")
    );
  } catch (error) {
    console.error("Error in diagnostics endpoint:", error);

    return c.json(
      ResponseUtils.error(
        "DIAGNOSTICS_FAILED",
        `Failed to get diagnostics: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        500
      ),
      500
    );
  }
});

/**
 * POST /api/v1/issues
 *
 * Submits an issue to the FastAPI service for tracking.
 */
fastapiRoutes.post("/api/v1/issues", async (c) => {
  try {
    const body = await c.req.json();
    const validatedBody = IssueSubmissionSchema.parse(body);

    const fastapiService = createFastAPIService(c.env);
    const issueId = await fastapiService.submitIssue(validatedBody);

    return c.json(
      ResponseUtils.success(
        { issue_id: issueId },
        "Issue submitted successfully"
      ),
      201
    );
  } catch (error) {
    console.error("Error in issue submission endpoint:", error);

    if (error instanceof z.ZodError) {
      return c.json(
        ResponseUtils.validationError(
          error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
          "Validation error"
        ),
        400
      );
    }

    return c.json(
      ResponseUtils.error(
        "ISSUE_SUBMISSION_FAILED",
        `Failed to submit issue: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        500
      ),
      500
    );
  }
});

/**
 * GET /api/v1/issues
 *
 * Gets all submitted issues from the FastAPI service.
 */
fastapiRoutes.get("/api/v1/issues", async (c) => {
  try {
    const fastapiService = createFastAPIService(c.env);
    const issues = await fastapiService.getIssues();

    return c.json(
      ResponseUtils.success(issues, "Issues retrieved successfully")
    );
  } catch (error) {
    console.error("Error in issues list endpoint:", error);

    return c.json(
      ResponseUtils.error(
        "ISSUES_RETRIEVAL_FAILED",
        `Failed to get issues: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        500
      ),
      500
    );
  }
});

/**
 * WebSocket endpoint for real-time communication
 *
 * This is the IMPORTANT WebSocket endpoint for bidirectional communication.
 */
fastapiRoutes.get("/ws", async (c) => {
  try {
    const upgradeHeader = c.req.header("upgrade");
    if (upgradeHeader !== "websocket") {
      return c.json(ResponseUtils.badRequest("Invalid request"), 400);
    }

    const client = c.req.query("client");
    if (client !== "python") {
      return c.json(ResponseUtils.badRequest("Invalid request"), 400);
    }

    // Use WebSocket service to handle the connection
    const webSocketService = createWebSocketService(
      c.env as WebSocketServiceEnv
    );
    return await webSocketService.handleWebSocketUpgrade(c.req.raw);
  } catch (error) {
    console.error("Error in WebSocket endpoint:", error);

    return c.json(
      ResponseUtils.error(
        "WEBSOCKET_FAILED",
        `Failed to establish WebSocket: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        500
      ),
      500
    );
  }
});
