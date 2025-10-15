/**
 * Central entry point for the 9to5-scout Cloudflare Worker.
 *
 * The file now focuses on orchestrating high-level request routing while the
 * detailed route handlers, durable object implementations, and workflows live
 * in dedicated modules under `src/routes` and `src/lib`.
 */

import type { Env } from './lib/env';
import { handleApiRequest } from './routes/api';
import { handlePageRequest } from './routes/pages';
import { handleScrapeSocket } from './routes/socket';
import { isEmailIngestRequest, handleEmailIngest } from './routes/email-ingest';
import { processEmailEvent } from './lib/email-event';
import { handleScheduledEvent } from './lib/scheduled';

export { SiteCrawler } from './lib/durable-objects/site-crawler';
export { JobMonitor } from './lib/durable-objects/job-monitor';
export { ScrapeSocket } from './lib/durable-objects/scrape-socket';
export { DiscoveryWorkflow } from './lib/workflows/discovery-workflow';
export { JobMonitorWorkflow } from './lib/workflows/job-monitor-workflow';
export { ChangeAnalysisWorkflow } from './lib/workflows/change-analysis-workflow';
export type { Env };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (isEmailIngestRequest(request)) {
      return handleEmailIngest(request, env);
    }

    if (url.pathname === '/ws' && request.headers.get('Upgrade') === 'websocket') {
      return handleScrapeSocket(request, env);
    }

    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(request, env);
    }

    return handlePageRequest(request, env);
  },

  async email(message: ForwardableEmailMessage, env: Env, _ctx: ExecutionContext): Promise<void> {
    await processEmailEvent(message, env);
  },

  async scheduled(event: any, env: Env): Promise<void> {
    await handleScheduledEvent(env, event);
  },
};
