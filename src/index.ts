import type { Env } from './domains/config/env/env.config';

// Import all agents for Cloudflare Agents SDK
import { CareerCoachAgent } from "./domains/agents/career-coach-agent";
import { CompanyIntelligenceAgent } from "./domains/agents/company-intelligence-agent";
import { EmailProcessorAgent } from "./domains/agents/email-processor-agent";
import { GenericAgent } from "./domains/agents/generic_agent";
import { InterviewPreparationAgent } from "./domains/agents/interview-preparation-agent";
import { JobMonitorAgent } from "./domains/agents/job-monitor-agent";
import { ResumeOptimizationAgent } from "./domains/agents/resume-optimization-agent";

/**
 * Central entry point for the 9to5-scout Cloudflare Worker.
 *
 * The file now focuses on orchestrating high-level request routing while the
 * detailed route handlers, durable object implementations, and workflows live
 * in dedicated modules under `src/routes` and `src/lib`.
 */

// Imports from the refactored main branch
import { handleScheduledEvent } from './lib/scheduled';
import { handleApiRequest } from './routes/api';
// Note: Email ingestion is now handled by EmailProcessorAgent
import { handlePageRequest } from './domains/ui/routes/pages.routes';
import { handleScrapeSocket } from './routes/socket';

// Re-exports of Durable Objects and Workflows from the refactored main branch
export { JobMonitor } from './domains/scraping/durable-objects/job-monitor';
export { ScrapeSocket } from './domains/scraping/durable-objects/scrape-socket';
export { SiteCrawler } from './domains/scraping/durable-objects/site-crawler';
export { ChangeAnalysisWorkflow } from './domains/workflows/workflow-classes/change-analysis-workflow';
export { DiscoveryWorkflow } from './domains/workflows/workflow-classes/discovery-workflow';
export { JobMonitorWorkflow } from './domains/workflows/workflow-classes/job-monitor-workflow';

// Re-exports of domain modules (specific exports to avoid conflicts)
export * from './domains/agents';
export * from './domains/companies';
export * from './domains/documents';
export * from './domains/interview';
export * from './domains/monitoring';
export * from './domains/scraping';
export * from './domains/sites';
export * from './domains/stats';
export * from './domains/workflows';

// Re-exports of shared utilities
export * from './shared';

// Export UI and Config domains
export * from './domains/config';
export * from './domains/ui';

// Export all Cloudflare Agents SDK agents
export { CareerCoachAgent, CompanyIntelligenceAgent, EmailProcessorAgent, GenericAgent, InterviewPreparationAgent, JobMonitorAgent, ResumeOptimizationAgent };

  export type { Env };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    console.log(`🌐 Request received: ${request.method} ${url.pathname}`);

    // High-level routing adopted from 'main'

    // 1. Email ingestion for Cloudflare Email Workers
    // Note: Email ingestion is now handled by EmailProcessorAgent

    // 2. WebSocket connection handling
    if (
      url.pathname === "/ws" &&
      request.headers.get("Upgrade") === "websocket"
    ) {
      return handleScrapeSocket(request, env);
    }

    // 3. API and Page routing
    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(request, env, ctx);
    }

    return handlePageRequest(request, env);
  },

  /**
   * Email handler for Cloudflare Email Routing.
   * Uses the EmailProcessorAgent for AI-powered email processing.
   */
  async email(message: ForwardableEmailMessage, env: Env, _ctx: ExecutionContext): Promise<void> {
    try {
      // Create a new instance of the EmailProcessorAgent
      const agentId = env.EMAIL_PROCESSOR_AGENT.newUniqueId();
      const agent = env.EMAIL_PROCESSOR_AGENT.get(agentId);
      
      // Process the email using the agent
      await agent.email(message, env);
    } catch (error) {
      console.error("❌ Email processing failed:", error);
      // Log error but don't process email if agent fails
      console.error("Email processing failed, email will be rejected");
    }
  },

  /**
   * Scheduled handler for automated job monitoring and email insights.
   */
  async scheduled(event: any, env: Env): Promise<void> {
    await handleScheduledEvent(env, event);
  },
};