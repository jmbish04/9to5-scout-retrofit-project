/**
 * @module src/index.ts
 * @description
 * Main entry point for the refactored Cloudflare Worker.
 * It delegates all routing to the Hono app and includes the global
 * error handler, WebSocket handling, and cron triggers.
 */

import router from './api/router';
import { ErrorLoggingService, ErrorContext } from './core/services/error-logging.service';
import { ErrorInvestigationAgent } from './core/agents/error-investigation.agent';
import { AppError } from './core/errors';
import { HealthCheckRunner } from './core/services/health-check-runner.service';

// Export all Durable Objects
export { SiteCrawler } from './domains/scraping/durable-objects/site-crawler.do';
export { JobMonitor } from './domains/jobs/durable-objects/job-monitor.do';
export { ScrapeSocket } from './domains/scraping/durable-objects/scrape-socket.do';
export { HealthCheckSocket } from './core/durable-objects/health-check-socket';
export { GenericAgent } from './domains/agents/durable-objects/generic_agent';
export { CareerCoachAgent } from './domains/agents/durable-objects/career-coach-agent';
export { CompanyIntelligenceAgent } from './domains/agents/durable-objects/company-intelligence-agent';
export { InterviewPreparationAgent } from './domains/agents/durable-objects/interview-preparation-agent';
export { JobMonitorAgent } from './domains/agents/durable-objects/job-monitor-agent';
export { ResumeOptimizationAgent } from './domains/agents/durable-objects/resume-optimization-agent';

// EmailProcessorAgent is commented out in the source file, so we create a stub export
// to satisfy the wrangler.toml configuration
export class EmailProcessorAgent {}

// Export all Workflows
export { DiscoveryWorkflow } from './domains/workflows/workflow-classes/discovery-workflow';
export { JobMonitorWorkflow } from './domains/workflows/workflow-classes/job-monitor-workflow';
export { ChangeAnalysisWorkflow } from './domains/workflows/workflow-classes/change-analysis-workflow';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const loggingService = new ErrorLoggingService(env);
    try {
      // Delegate all routing to the Hono app
      return await router.fetch(request, env, ctx);
    } catch (error: unknown) {
      // --- GLOBAL ERROR HANDLING ---
      if (error instanceof Error) {
        const errorContext: ErrorContext = {
          timestamp: new Date().toISOString(),
          url: request.url,
          method: request.method,
          userAgent: request.headers.get('user-agent') || 'unknown',
          errorType: error.name,
          errorMessage: error.message,
          stack: error.stack,
          isAppError: error instanceof AppError,
        };

        // Log the error
        await loggingService.logError(errorContext);

        // If it's an AppError, return the appropriate status code
        if (error instanceof AppError) {
          return new Response(JSON.stringify(error.toJSON()), {
            status: error.statusCode,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // For unknown errors, trigger the Error Investigation Agent
        try {
          const agent = new ErrorInvestigationAgent(env);
          await agent.investigate(errorContext);
        } catch (agentError) {
          console.error('Error Investigation Agent failed:', agentError);
        }
      }
      return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), { status: 500 });
    }
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Run health checks
    const healthCheckRunner = new HealthCheckRunner(env);
    await healthCheckRunner.runScheduledHealthChecks(ctx);
  },
};
