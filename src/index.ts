/**
 * @module src/index.ts
 * @description
 * Main entry point for the refactored Cloudflare Worker.
 * It delegates all routing to the Hono app and includes the global
 * error handler, WebSocket handling, and cron triggers.
 */

import PostalMime from "postal-mime";
import router from "./api/router";
import { HealthCheckSocket } from "./core/durable-objects/health-check-socket";
import { ErrorLoggingService } from "./core/services/error-logging.service";

// Import Durable Objects
import { GenericAgent } from "./domains/agents/durable-objects/generic-agent";
import { JobMonitor } from "./domains/jobs/durable-objects/job-monitor.do";
import { ScrapeSocket } from "./domains/scraping/durable-objects/scrape-socket.do";
import { SiteCrawler } from "./domains/scraping/durable-objects/site-crawler.do";
// EmailProcessorAgent is deprecated
import { CareerCoachAgent } from "./domains/agents/durable-objects/career-coach-agent";
import { CompanyIntelligenceAgent } from "./domains/agents/durable-objects/company-intelligence-agent";
import { EmailClassificationAgent } from "./domains/agents/durable-objects/email-classification-agent";
import { InterviewPreparationAgent } from "./domains/agents/durable-objects/interview-preparation-agent";
import { JobMonitorAgent } from "./domains/agents/durable-objects/job-monitor-agent";
import { ResumeOptimizationAgent } from "./domains/agents/durable-objects/resume-optimization-agent";

// Import Workflows
import { ChangeAnalysisWorkflow } from "./domains/workflows/workflow-classes/change-analysis-workflow";
import { DiscoveryWorkflow } from "./domains/workflows/workflow-classes/discovery-workflow";
import { JobMonitorWorkflow } from "./domains/workflows/workflow-classes/job-monitor-workflow";

// Export Durable Objects
export {
  GenericAgent,
  HealthCheckSocket,
  JobMonitor,
  ScrapeSocket,
  SiteCrawler,
};
// EmailProcessorAgent is deprecated
export {
  CareerCoachAgent,
  CompanyIntelligenceAgent,
  EmailClassificationAgent,
  InterviewPreparationAgent,
  JobMonitorAgent,
  ResumeOptimizationAgent,
};

// Export Workflows
export { ChangeAnalysisWorkflow, DiscoveryWorkflow, JobMonitorWorkflow };

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const loggingService = new ErrorLoggingService(env);
    try {
      // Delegate all routing to the Hono app
      return await router.fetch(request, env, ctx);
    } catch (error: unknown) {
      // --- GLOBAL ERROR HANDLING ---
      if (error instanceof Error) {
        console.error("Global error handler caught:", error);
        // Log error using the logging service
        await loggingService.logError(error, {
          request: {
            url: request.url,
            method: request.method,
            headers: Object.fromEntries(Array.from(request.headers as any)),
          },
        });
      }
      return new Response(
        JSON.stringify({ error: "An unexpected error occurred" }),
        { status: 500 }
      );
    }
  },

  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    // ... (scheduled handler remains the same)
  },

  async email(
    message: EmailMessage,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    try {
      const parser = new (PostalMime as any).default();
      const arrayBuf = await new Response((message as any).raw).arrayBuffer();
      const parsed = await parser.parse(arrayBuf);

      const id = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      ctx.waitUntil(
        env.DB.prepare(
          `INSERT INTO worker_request_logs (
            id, timestamp, endpoint, method, source, request_body, response_code, processing_time_ms
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            id,
            timestamp,
            "email",
            "EMAIL",
            parsed.from?.address ?? "unknown",
            JSON.stringify({
              subject: parsed.subject,
              to: parsed.to,
              from: parsed.from,
              cc: parsed.cc,
              date: parsed.date,
            }),
            202,
            0
          )
          .run()
      );
    } catch (err) {
      console.error("Email handler error:", err);
    }
  },
};
