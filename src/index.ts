import type { Env } from './lib/env';

// Import GenericAgent for Cloudflare Agents SDK - retained from older branch context
import { GenericAgent } from "./lib/generic_agent";

/**
 * Central entry point for the 9to5-scout Cloudflare Worker.
 *
 * The file now focuses on orchestrating high-level request routing while the
 * detailed route handlers, durable object implementations, and workflows live
 * in dedicated modules under `src/routes` and `src/lib`.
 */

// Imports from the refactored main branch
import { handleApiRequest } from './routes/api';
import { handlePageRequest } from './routes/pages';
import { handleScrapeSocket } from './routes/socket';
import { isEmailIngestRequest, handleEmailIngest } from './routes/email-ingest';
import { processEmailEvent } from './lib/email-event';
import { handleScheduledEvent } from './lib/scheduled';

// Re-exports of Durable Objects and Workflows from the refactored main branch
export { SiteCrawler } from './lib/durable-objects/site-crawler';
export { JobMonitor } from './lib/durable-objects/job-monitor';
export { ScrapeSocket } from './lib/durable-objects/scrape-socket';
export { DiscoveryWorkflow } from './lib/workflows/discovery-workflow';
export { JobMonitorWorkflow } from './lib/workflows/job-monitor-workflow';
export { ChangeAnalysisWorkflow } from './lib/workflows/change-analysis-workflow';
export type { Env };

// Export GenericAgent for Cloudflare Agents SDK
export { GenericAgent };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    console.log(`🌐 Request received: ${request.method} ${url.pathname}`);

    // High-level routing adopted from 'main'

    // 1. Email ingestion for Cloudflare Email Workers
    if (isEmailIngestRequest(request)) {
      return handleEmailIngest(request, env);
    }

    // 2. WebSocket connection handling
    if (
      url.pathname === "/ws" &&
      request.headers.get("Upgrade") === "websocket"
    ) {
      return handleScrapeSocket(request, env);
    }

    // 3. API and Page routing
    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(request, env);
    }

    return handlePageRequest(request, env);
  },

  /**
   * Email handler for Cloudflare Email Routing.
   */
  async email(message: ForwardableEmailMessage, env: Env, _ctx: ExecutionContext): Promise<void> {
    await processEmailEvent(message, env);
  },

  /**
   * Scheduled handler for automated job monitoring and email insights.
   */
  async scheduled(event: any, env: Env): Promise<void> {
    await handleScheduledEvent(env, event);
  },
};