import type { Env } from '../lib/env';
import { parsePathParams } from '../lib/routing';
import { requireApiAuth, type RouteGuard } from '../lib/auth';
import { handleJobsGet, handleJobGet, handleJobsExportGet } from './jobs';
import { handleRunsGet, handleDiscoveryRunPost, handleMonitorRunPost } from './runs';
import { handleConfigsGet, handleConfigsPost } from './configs';
import { handleAgentQuery } from './agent';
import { handleWebhookTest } from './webhooks';
import {
  handleEmailLogsGet,
  handleEmailConfigsGet,
  handleEmailConfigsPut,
  handleEmailInsightsSend,
} from './email';
import { handleEmailsGet, handleEmailGet } from './emails';
import {
  handleAgentsGet,
  handleAgentsPost,
  handleAgentGet,
  handleAgentPut,
  handleAgentDelete,
} from './agents';
import {
  handleTasksGet,
  handleTasksPost,
  handleTaskGet,
  handleTaskPut,
  handleTaskDelete,
} from './tasks';
import {
  handleWorkflowsGet,
  handleWorkflowsPost,
  handleWorkflowGet,
  handleWorkflowPut,
  handleWorkflowDelete,
  handleWorkflowExecute,
} from './workflows';
import {
  handleJobHistoryPost,
  handleJobHistoryGet,
  handleJobRatingPost,
  handleJobRatingsGet,
} from './job-history';
import {
  handleJobTrackingGet,
  handleSnapshotContentGet,
  handleDailyMonitoringPost,
  handleMonitoringStatusGet,
  handleMonitoringQueueGet,
  handleJobMonitoringPut,
} from './tracking';
import {
  handleScrapeQueuePost,
  handleScrapeQueuePendingGet,
  handleScrapeQueueUnrecordedGet,
  handleScraperIntakePost,
  handleScrapedJobDetailsPost,
  handleScraperMonitoredJobsGet,
  handleScraperOptions,
} from './scraper';
import {
  handleLogsPost,
  handleLogsGet,
  handleLogsMetaGet,
  handleLogsOptions,
} from './logs';
import { handleScrapeDispatch } from './socket';
import { handleManualCrawlPost } from './crawl';
import { handleCoverLetterPost, handleResumePost } from './ai-documents';
import {
  handleSitesGet,
  handleSitesPost,
  handleSiteGet,
  handleSitePut,
  handleSiteDelete,
} from './sites';
import {
  handleCompanyScrapePost,
  handleCompaniesGet,
  handleCompanyBenefitsGet,
  handleBenefitsCompareGet,
  handleStatsHighlightsGet,
  handleStatsValuationsGet,
} from './company-benefits';
import {
  handleDocsCreate,
  handleDocsGet,
  handleDocsUpdate,
  handleDocsDelete,
  handleDocsSearch,
  handleAtsEvaluate,
  handleDocumentGenerate,
  handleDocsApplyPatches,
} from './documents';
import { ensureAgentTools } from '../lib/agents';

export async function handleApiRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  ensureAgentTools(env);

  if (url.pathname === '/api/health') {
    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const isScraperEndpoint = url.pathname.startsWith('/api/scraper/');
  if (request.method === 'OPTIONS' && isScraperEndpoint) {
    return handleScraperOptions();
  }

  const isLogsEndpoint = url.pathname.startsWith('/api/logs');
  if (request.method === 'OPTIONS' && isLogsEndpoint) {
    return handleLogsOptions();
  }

  const unauthenticatedRoutes: RouteGuard[] = [
    { method: 'POST', path: '/api/scraper/job-details' },
    { method: 'POST', path: '/api/scraper/intake' },
    { method: 'GET', path: '/api/scraper/queue/pending' },
    { method: 'GET', path: '/api/scraper/queue/unrecorded' },
    { method: 'GET', path: '/api/scraper/monitored-jobs' },
    { method: 'POST', path: '/api/logs' },
    { method: 'GET', path: '/api/logs' },
    { method: 'GET', path: '/api/logs/meta' },
  ];

  const authError = requireApiAuth(request, env, { allowList: unauthenticatedRoutes });
  if (authError) {
    return authError;
  }

  if (url.pathname === '/api/socket/status' && request.method === 'GET') {
    const id = env.SCRAPE_SOCKET.idFromName('default');
    const stub = env.SCRAPE_SOCKET.get(id);
    return stub.fetch('https://dummy/status');
  }

  if (url.pathname === '/api/companies/scrape' && request.method === 'POST') {
    return handleCompanyScrapePost(request, env);
  }

  if (url.pathname === '/api/companies' && request.method === 'GET') {
    return handleCompaniesGet(request, env);
  }

  if (url.pathname === '/api/docs' && request.method === 'POST') {
    return handleDocsCreate(request, env);
  }

  if (url.pathname === '/api/docs' && request.method === 'GET') {
    return new Response(JSON.stringify({ error: 'Document ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.pathname === '/api/docs/search' && request.method === 'POST') {
    return handleDocsSearch(request, env);
  }

  if (url.pathname.startsWith('/api/docs/') && url.pathname.endsWith('/apply-patches') && request.method === 'POST') {
    const params = parsePathParams(url.pathname, '/api/docs/:id/apply-patches');
    if (!params?.id) {
      return new Response(JSON.stringify({ error: 'Document ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return handleDocsApplyPatches(request, env, Number(params.id));
  }

  if (url.pathname.startsWith('/api/docs/') && request.method === 'GET') {
    const params = parsePathParams(url.pathname, '/api/docs/:id');
    if (!params?.id) {
      return new Response(JSON.stringify({ error: 'Document ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return handleDocsGet(request, env, Number(params.id));
  }

  if (url.pathname.startsWith('/api/docs/') && request.method === 'PUT') {
    const params = parsePathParams(url.pathname, '/api/docs/:id');
    if (!params?.id) {
      return new Response(JSON.stringify({ error: 'Document ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return handleDocsUpdate(request, env, Number(params.id));
  }

  if (url.pathname.startsWith('/api/docs/') && request.method === 'DELETE') {
    const params = parsePathParams(url.pathname, '/api/docs/:id');
    if (!params?.id) {
      return new Response(JSON.stringify({ error: 'Document ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return handleDocsDelete(request, env, Number(params.id));
  }

  if (url.pathname === '/api/agents/ats/evaluate' && request.method === 'POST') {
    return handleAtsEvaluate(request, env);
  }

  if (url.pathname === '/api/agents/docs/generate' && request.method === 'POST') {
    return handleDocumentGenerate(request, env);
  }

  if (url.pathname.startsWith('/api/companies/') && url.pathname.endsWith('/benefits') && request.method === 'GET') {
    const params = parsePathParams(url.pathname, '/api/companies/:id/benefits');
    if (!params?.id) {
      return new Response(JSON.stringify({ error: 'Company ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return handleCompanyBenefitsGet(request, env, params.id);
  }

  if (url.pathname === '/api/benefits/compare' && request.method === 'GET') {
    return handleBenefitsCompareGet(request, env);
  }

  if (url.pathname === '/api/stats/highlights' && request.method === 'GET') {
    return handleStatsHighlightsGet(request, env);
  }

  if (url.pathname === '/api/stats/valuations' && request.method === 'GET') {
    return handleStatsValuationsGet(request, env);
  }

  // Scraper & Logs endpoints
  if (url.pathname === '/api/scrape/dispatch' && request.method === 'POST') {
    return handleScrapeDispatch(request, env);
  }
  if (url.pathname === '/api/logs' && request.method === 'POST') {
    return handleLogsPost(request, env);
  }
  if (url.pathname === '/api/logs' && request.method === 'GET') {
    return handleLogsGet(request, env);
  }
  if (url.pathname === '/api/logs/meta' && request.method === 'GET') {
    return handleLogsMetaGet(request, env);
  }
  if (url.pathname === '/api/emails' && request.method === 'GET') {
    return handleEmailsGet(request, env);
  }
  if (url.pathname.startsWith('/api/emails/') && request.method === 'GET') {
    const params = parsePathParams(url.pathname, '/api/emails/:id');
    if (!params?.id) {
      return new Response(JSON.stringify({ error: 'Email ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return handleEmailGet(request, env, params.id);
  }
  if (url.pathname === '/api/scraper/queue' && request.method === 'POST') {
    return handleScrapeQueuePost(request, env);
  }
  if (url.pathname === '/api/scraper/intake' && request.method === 'POST') {
    return handleScraperIntakePost(request, env);
  }
  if (url.pathname === '/api/scraper/queue/pending' && request.method === 'GET') {
    return handleScrapeQueuePendingGet(request, env);
  }
  if (url.pathname === '/api/scraper/queue/unrecorded' && request.method === 'GET') {
    return handleScrapeQueueUnrecordedGet(request, env);
  }
  if (url.pathname === '/api/scraper/job-details' && request.method === 'POST') {
    return handleScrapedJobDetailsPost(request, env);
  }
  if (url.pathname === '/api/scraper/monitored-jobs' && request.method === 'GET') {
    return handleScraperMonitoredJobsGet(request, env);
  }

  // Job scraping & monitoring
  if (url.pathname === '/api/jobs/export' && request.method === 'GET') {
    return handleJobsExportGet(request, env);
  }
  if (url.pathname === '/api/jobs' && request.method === 'GET') {
    return handleJobsGet(request, env);
  }
  if (url.pathname === '/api/jobs/monitoring-queue' && request.method === 'GET') {
    return handleMonitoringQueueGet(request, env);
  }
  if (url.pathname.startsWith('/api/jobs/') && request.method === 'GET') {
    if (url.pathname.endsWith('/tracking')) {
      return handleJobTrackingGet(request, env);
    }
    if (url.pathname.includes('/snapshots/') && url.pathname.endsWith('/content')) {
      return handleSnapshotContentGet(request, env);
    }
    const params = parsePathParams(url.pathname, '/api/jobs/:id');
    if (!params || !params.id) {
      return new Response(JSON.stringify({ error: 'Job ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return handleJobGet(request, env, params.id);
  }
  if (url.pathname.startsWith('/api/jobs/') && url.pathname.endsWith('/monitoring') && request.method === 'PUT') {
    return handleJobMonitoringPut(request, env);
  }
  if (url.pathname === '/api/sites' && request.method === 'GET') {
    return handleSitesGet(request, env);
  }
  if (url.pathname === '/api/sites' && request.method === 'POST') {
    return handleSitesPost(request, env);
  }
  if (url.pathname.startsWith('/api/sites/') && request.method === 'GET') {
    const params = parsePathParams(url.pathname, '/api/sites/:id');
    if (!params?.id) {
      return new Response(JSON.stringify({ error: 'Site ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return handleSiteGet(request, env, params.id);
  }
  if (url.pathname.startsWith('/api/sites/') && request.method === 'PUT') {
    const params = parsePathParams(url.pathname, '/api/sites/:id');
    if (!params?.id) {
      return new Response(JSON.stringify({ error: 'Site ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return handleSitePut(request, env, params.id);
  }
  if (url.pathname.startsWith('/api/sites/') && request.method === 'DELETE') {
    const params = parsePathParams(url.pathname, '/api/sites/:id');
    if (!params?.id) {
      return new Response(JSON.stringify({ error: 'Site ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return handleSiteDelete(request, env, params.id);
  }
  if (url.pathname === '/api/monitoring/daily-run' && request.method === 'POST') {
    return handleDailyMonitoringPost(request, env);
  }
  if (url.pathname === '/api/monitoring/status' && request.method === 'GET') {
    return handleMonitoringStatusGet(request, env);
  }
  // Run & config endpoints
  if (url.pathname === '/api/runs' && request.method === 'GET') {
    return handleRunsGet(request, env);
  }
  if (url.pathname === '/api/runs/discovery' && request.method === 'POST') {
    return handleDiscoveryRunPost(request, env);
  }
  if (url.pathname === '/api/runs/monitor' && request.method === 'POST') {
    return handleMonitorRunPost(request, env);
  }
  if (url.pathname === '/api/configs' && request.method === 'GET') {
    return handleConfigsGet(request, env);
  }
  if (url.pathname === '/api/configs' && request.method === 'POST') {
    return handleConfigsPost(request, env);
  }

  // Agent management
  if (url.pathname === '/api/agent/query' && request.method === 'GET') {
    return handleAgentQuery(request, env);
  }
  if (url.pathname === '/api/agents' && request.method === 'GET') {
    return handleAgentsGet(request, env);
  }
  if (url.pathname === '/api/agents' && request.method === 'POST') {
    return handleAgentsPost(request, env);
  }
  if (url.pathname.startsWith('/api/agents/') && request.method === 'GET') {
    const params = parsePathParams(url.pathname, '/api/agents/:id');
    if (!params || !params.id) {
      return new Response(JSON.stringify({ error: 'Agent ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return handleAgentGet(request, env, params.id);
  }
  if (url.pathname.startsWith('/api/agents/') && request.method === 'PUT') {
    const params = parsePathParams(url.pathname, '/api/agents/:id');
    if (!params || !params.id) {
      return new Response(JSON.stringify({ error: 'Agent ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return handleAgentPut(request, env, params.id);
  }
  if (url.pathname.startsWith('/api/agents/') && request.method === 'DELETE') {
    const params = parsePathParams(url.pathname, '/api/agents/:id');
    if (!params || !params.id) {
      return new Response(JSON.stringify({ error: 'Agent ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return handleAgentDelete(request, env, params.id);
  }

  // Task management
  if (url.pathname === '/api/tasks' && request.method === 'GET') {
    return handleTasksGet(request, env);
  }
  if (url.pathname === '/api/tasks' && request.method === 'POST') {
    return handleTasksPost(request, env);
  }
  if (url.pathname.startsWith('/api/tasks/') && request.method === 'GET') {
    const params = parsePathParams(url.pathname, '/api/tasks/:id');
    if (!params || !params.id) {
      return new Response(JSON.stringify({ error: 'Task ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return handleTaskGet(request, env, params.id);
  }
  if (url.pathname.startsWith('/api/tasks/') && request.method === 'PUT') {
    const params = parsePathParams(url.pathname, '/api/tasks/:id');
    if (!params || !params.id) {
      return new Response(JSON.stringify({ error: 'Task ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return handleTaskPut(request, env, params.id);
  }
  if (url.pathname.startsWith('/api/tasks/') && request.method === 'DELETE') {
    const params = parsePathParams(url.pathname, '/api/tasks/:id');
    if (!params || !params.id) {
      return new Response(JSON.stringify({ error: 'Task ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return handleTaskDelete(request, env, params.id);
  }

  // Workflow management
  if (url.pathname === '/api/workflows' && request.method === 'GET') {
    return handleWorkflowsGet(request, env);
  }
  if (url.pathname === '/api/workflows' && request.method === 'POST') {
    return handleWorkflowsPost(request, env);
  }
  if (url.pathname.startsWith('/api/workflows/') && url.pathname.endsWith('/execute') && request.method === 'POST') {
    const params = parsePathParams(url.pathname, '/api/workflows/:id/execute');
    if (!params || !params.id) {
      return new Response(JSON.stringify({ error: 'Workflow ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return handleWorkflowExecute(request, env, params.id);
  }
  if (url.pathname.startsWith('/api/workflows/') && request.method === 'GET') {
    const params = parsePathParams(url.pathname, '/api/workflows/:id');
    if (!params || !params.id) {
      return new Response(JSON.stringify({ error: 'Workflow ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return handleWorkflowGet(request, env, params.id);
  }
  if (url.pathname.startsWith('/api/workflows/') && request.method === 'PUT') {
    const params = parsePathParams(url.pathname, '/api/workflows/:id');
    if (!params || !params.id) {
      return new Response(JSON.stringify({ error: 'Workflow ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return handleWorkflowPut(request, env, params.id);
  }
  if (url.pathname.startsWith('/api/workflows/') && request.method === 'DELETE') {
    const params = parsePathParams(url.pathname, '/api/workflows/:id');
    if (!params || !params.id) {
      return new Response(JSON.stringify({ error: 'Workflow ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return handleWorkflowDelete(request, env, params.id);
  }

  // Job history & ratings
  if (url.pathname === '/api/applicant/history' && request.method === 'POST') {
    return handleJobHistoryPost(request, env);
  }
  if (url.pathname.startsWith('/api/applicant/') && url.pathname.endsWith('/history') && request.method === 'GET') {
    const params = parsePathParams(url.pathname, '/api/applicant/:user_id/history');
    if (!params || !params.user_id) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return handleJobHistoryGet(request, env, params);
  }
  if (url.pathname === '/api/applicant/job-rating' && request.method === 'POST') {
    return handleJobRatingPost(request, env);
  }
  if (url.pathname.startsWith('/api/applicant/') && url.pathname.endsWith('/job-ratings') && request.method === 'GET') {
    const params = parsePathParams(url.pathname, '/api/applicant/:user_id/job-ratings');
    if (!params || !params.user_id) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return handleJobRatingsGet(request, env, params);
  }

  // Email management
  if (url.pathname === '/api/email/logs' && request.method === 'GET') {
    return handleEmailLogsGet(request, env);
  }
  if (url.pathname === '/api/email/configs' && request.method === 'GET') {
    return handleEmailConfigsGet(request, env);
  }
  if (url.pathname === '/api/email/configs' && request.method === 'PUT') {
    return handleEmailConfigsPut(request, env);
  }
  if (url.pathname === '/api/email/insights/send' && request.method === 'POST') {
    return handleEmailInsightsSend(request, env);
  }

  // Webhook utilities
  if (url.pathname === '/api/webhooks/test' && request.method === 'POST') {
    return handleWebhookTest(request, env);
  }

  // Manual crawl
  if (url.pathname === '/api/crawl' && request.method === 'POST') {
    return handleManualCrawlPost(request, env);
  }

  // AI document generation
  if (url.pathname === '/api/cover-letter' && request.method === 'POST') {
    return handleCoverLetterPost(request, env);
  }
  if (url.pathname === '/api/resume' && request.method === 'POST') {
    return handleResumePost(request, env);
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}
