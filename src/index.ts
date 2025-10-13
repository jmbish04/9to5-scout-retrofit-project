/**
 * @fileoverview Cloudflare Worker for the Colby AI Agent Ecosystem.
 * * This Worker acts as the central API gateway and orchestration layer for a suite of AI-driven tools,
 * focusing on job search, monitoring, applicant services (cover letter/resume generation), and agent management.
 * It utilizes Cloudflare's serverless primitives:
 * - **Worker (`fetch`, `email`, `scheduled` handlers):** The main request router and cron runner.
 * - **Durable Objects (`SiteCrawler`, `JobMonitor`, `ScrapeSocket`):** Provides stateful, highly-consistent
 * coordination for long-running processes like site-specific crawling, individual job monitoring,
 * and persistent WebSocket connections for external scrapers (e.g., Python scripts).
 * - **Durable Object Workflows (`DiscoveryWorkflow`, `JobMonitorWorkflow`, `ChangeAnalysisWorkflow`):**
 * Encapsulates complex, multi-step business logic for autonomous operations, designed for execution
 * by other agents or triggered by API/scheduled events.
 * * **Target Audience:** Human Developers & AI Agents (e.g., Colby CLI, CrewAI, LangGraph nodes).
 * * **Key Features:**
 * - **Agent Management:** CRUD for `agents` and `tasks` (handled via route imports).
 * - **Job Discovery & Monitoring:** Stateful crawling and monitoring using Durable Objects.
 * - **AI Generation:** On-demand generation of tailored cover letters and resumes using the `env.AI` binding.
 * - **Data Storage Integration:** Direct use of `env.DB` (D1/SQLite), `env.KV`, and `env.R2`.
 * - **Extensible Orchestration:** Exposes explicit workflow endpoints for agentic team coordination.
 * - **Secure API:** Enforces `API_AUTH_TOKEN` authentication for most administrative/internal API routes.
 */

// Placeholder types for Durable Objects until full implementations are added.
type DurableObjectState = any;

// Import job scraping functionality
import { handleJobsGet, handleJobGet } from './routes/jobs';
import { handleRunsGet, handleDiscoveryRunPost, handleMonitorRunPost } from './routes/runs';
import { handleConfigsGet, handleConfigsPost } from './routes/configs';
import { handleAgentQuery } from './routes/agent';
import { handleWebhookTest } from './routes/webhooks';
import { handleEmailReceived, handleEmailLogsGet, handleEmailConfigsGet, handleEmailConfigsPut, handleEmailInsightsSend } from './routes/email';
import { generateEmailInsights, sendInsightsEmail } from './lib/email';
import { handleAgentsGet, handleAgentsPost, handleAgentGet, handleAgentPut, handleAgentDelete } from './routes/agents';
import { handleTasksGet, handleTasksPost, handleTaskGet, handleTaskPut, handleTaskDelete } from './routes/tasks';
import { handleWorkflowsGet, handleWorkflowsPost, handleWorkflowGet, handleWorkflowPut, handleWorkflowDelete, handleWorkflowExecute } from './routes/workflows';
import { handleJobHistoryPost, handleJobHistoryGet, handleJobRatingPost, handleJobRatingsGet } from './routes/job-history';
import { handleJobTrackingGet, handleSnapshotContentGet, handleDailyMonitoringPost, handleMonitoringStatusGet, handleMonitoringQueueGet, handleJobMonitoringPut } from './routes/tracking';
import { crawlJob } from './lib/crawl';
import { runDailyJobMonitoring } from './lib/monitoring';
import { handleScrapeSocket, handleScrapeDispatch } from './routes/socket';
import {
  handleScrapeQueuePost,
  handleScrapeQueuePendingGet,
  handleScrapeQueueUnrecordedGet,
  handleScrapedJobDetailsPost,
  handleScraperMonitoredJobsGet,
  handleScraperOptions
} from './routes/scraper';
import { handleLogsPost, handleLogsGet, handleLogsMetaGet, handleLogsOptions } from './routes/logs';

/**
 * Parses a URL pathname against a routing pattern to extract path parameters.
 * * This utility function is essential for robust API routing within the Worker, allowing
 * agents and developers to reliably target resources using dynamic IDs (e.g., `/api/jobs/123`).
 * * @param {string} pathname - The actual URL pathname (e.g., '/api/jobs/123').
 * @param {string} pattern - The path pattern containing parameter placeholders (e.g., '/api/jobs/:id').
 * @returns {Record<string, string> | null} An object mapping parameter names to their values, or null if the path doesn't match the pattern.
 * * @example
 * // Agent Use Case: Extracting job ID for /api/jobs/:id
 * const params = parsePathParams('/api/jobs/123', '/api/jobs/:id');
 * // params: { id: '123' }
 * * @example
 * // Agent Use Case: Extracting nested parameters
 * const params = parsePathParams('/api/users/456/posts/789', '/api/users/:userId/posts/:postId');
 * // params: { userId: '456', postId: '789' }
 */
function parsePathParams(pathname: string, pattern: string): Record<string, string> | null {
  const pathParts = pathname.split('/').filter(Boolean);
  const patternParts = pattern.split('/').filter(Boolean);
  
  if (pathParts.length !== patternParts.length) {
    return null;
  }
  
  const params: Record<string, string> = {};
  
  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];
    
    if (!patternPart || !pathPart) {
      return null;
    }
    
    if (patternPart.startsWith(':')) {
      // Parameter segment
      const paramName = patternPart.slice(1);
      params[paramName] = decodeURIComponent(pathPart);
    } else if (patternPart !== pathPart) {
      // Literal segment doesn't match
      return null;
    }
  }
  
  return params;
}

/**
 * Describes the request payload expected for AI-driven cover letter generation.
 * * Used by agents to call the `/api/cover-letter` endpoint.
 * * @interface CoverLetterRequestBody
 * @property {string} job_title - The title of the job being applied for.
 * @property {string} company_name - The name of the hiring company.
 * @property {string} [hiring_manager_name] - Optional name of the hiring manager for salutation.
 * @property {string} job_description_text - The full text of the job description.
 * @property {string} candidate_career_summary - The candidate's full career history and summary for tailoring.
 */
interface CoverLetterRequestBody {
  job_title: string;
  company_name: string;
  hiring_manager_name?: string;
  job_description_text: string;
  candidate_career_summary: string;
}

/**
 * Represents structured cover letter content returned by the AI model.
 * * The AI generates content structured by these fields, which are designed to be easily
 * assembled into a complete, well-formatted letter by the consuming application/agent.
 * * @interface CoverLetterContent
 * @property {string} salutation - The opening greeting (e.g., "Dear Ms. Smith,").
 * @property {string} opening_paragraph - Compelling introduction and statement of intent.
 * @property {string} body_paragraph_1 - Highlights key, quantified experience relevant to the job.
 * @property {string} body_paragraph_2 - Focuses on company/culture fit and added value.
 * @property {string} closing_paragraph - Call to action and sign-off.
 */
interface CoverLetterContent {
  salutation: string;
  opening_paragraph: string;
  body_paragraph_1: string;
  body_paragraph_2: string;
  closing_paragraph: string;
}

/**
 * Defines the request payload for AI-driven resume section generation.
 * * Used by agents to call the `/api/resume` endpoint.
 * * @interface ResumeRequestBody
 * @property {string} job_title - The target job title for tailoring.
 * @property {string} company_name - The target company name.
 * @property {string} job_description_text - The job description for relevance scoring.
 * @property {string} candidate_career_summary - The raw candidate summary to extract content from.
 */
interface ResumeRequestBody {
  job_title: string;
  company_name: string;
  job_description_text: string;
  candidate_career_summary: string;
}

/**
 * Represents structured resume content returned by the AI model.
 * * The AI generates content tailored to the requested job and designed for a modern resume format.
 * * @interface ResumeContent
 * @property {string} summary - A concise, professional summary tailored to the job.
 * @property {string[]} experience_bullets - Three concise, high-impact bullet points for the experience section.
 * @property {string[]} skills - A list of key skills extracted from the candidate summary and matched to the job description.
 */
interface ResumeContent {
  summary: string;
  experience_bullets: string[];
  skills: string[];
}

/**
 * Environment bindings made available to the Worker at runtime.
 * * Agents relying on this worker must ensure their execution environment (e.g., `codex` full-auto mode)
 * provides the necessary credentials and bindings for Cloudflare D1/AI/DO.
 * * @interface Env
 * @property {any} AI - Cloudflare AI binding for LLM inference (e.g., `@cf/meta/llama-3.1-8b-instruct`).
 * @property {any} DB - Cloudflare D1/Database binding for persistent storage (jobs, configs, logs).
 * @property {any} KV - Cloudflare KV binding for simple key-value storage.
 * @property {any} R2 - Cloudflare R2 binding for large object/snapshot storage.
 * @property {any} VECTORIZE_INDEX - Cloudflare Vectorize binding for vector search.
 * @property {any} MYBROWSER - Cloudflare Browser Rendering binding for web crawling.
 * @property {any} ASSETS - Worker Sites binding for serving static content (UI, OpenAPI spec).
 * @property {string} API_AUTH_TOKEN - Secret token for API authentication.
 * @property {string} BROWSER_RENDERING_TOKEN - Token for internal browser rendering calls.
 * @property {string} SLACK_WEBHOOK_URL - Webhook URL for internal alerts.
 * @property {string} SMTP_ENDPOINT - SMTP server for sending emails.
 * @property {string} SMTP_USERNAME - SMTP username.
 * @property {string} SMTP_PASSWORD - SMTP password.
 * @property {any} SITE_CRAWLER - Durable Object binding for `SiteCrawler` (Site-specific job discovery).
 * @property {any} JOB_MONITOR - Durable Object binding for `JobMonitor` (Individual job tracking).
 * @property {any} DISCOVERY_WORKFLOW - Durable Object binding for `DiscoveryWorkflow` (Autonomous discovery orchestration).
 * @property {any} JOB_MONITOR_WORKFLOW - Durable Object binding for `JobMonitorWorkflow` (Autonomous monitoring orchestration).
 * @property {any} CHANGE_ANALYSIS_WORKFLOW - Durable Object binding for `ChangeAnalysisWorkflow` (Autonomous change detection).
 * @property {any} SCRAPE_SOCKET - Durable Object binding for `ScrapeSocket` (WebSocket management for external scrapers).
 */
export interface Env {
  AI: any;
  DB: any;
  KV: any;
  R2: any;
  VECTORIZE_INDEX: any;
  MYBROWSER: any;
  ASSETS: any;
  API_AUTH_TOKEN: string;
  BROWSER_RENDERING_TOKEN: string;
  SLACK_WEBHOOK_URL: string;
  SMTP_ENDPOINT: string;
  SMTP_USERNAME: string;
  SMTP_PASSWORD: string;
  SITE_CRAWLER: any;
  JOB_MONITOR: any;
  DISCOVERY_WORKFLOW: any;
  JOB_MONITOR_WORKFLOW: any;
  CHANGE_ANALYSIS_WORKFLOW: any;
  SCRAPE_SOCKET: any;
}

/**
 * Durable Object coordinating crawling operations for a specific job site configuration.
 * * Ensures single-threaded, stateful execution for site-specific discovery and crawling.
 * Critical for managing rate limiting and maintaining crawl state across multiple Worker invocations.
 * * **Endpoints (Internal DO API):**
 * - `POST /start-discovery`: Initiates URL discovery based on search terms.
 * - `POST /crawl-urls`: Processes a batch of discovered URLs to extract job details.
 * - `GET /status`: Retrieves the current crawling status and metrics for the site.
 * * @class SiteCrawler
 * @param {DurableObjectState} state - Durable Object state reference.
 * @param {Env} env - Worker environment bindings.
 */
export class SiteCrawler {
  private state: DurableObjectState;
  private env: Env;

  /**
   * Creates a new SiteCrawler instance.
   * @param {DurableObjectState} state - Durable Object state reference.
   * @param {Env} env - Worker environment bindings.
   */
  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  /**
   * Handles API requests for site crawling operations.
   * @param {Request} req - Incoming request object.
   * @returns {Promise<Response>} The response for the operation.
   */
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    try {
      if (path === '/start-discovery' && req.method === 'POST') {
        return await this.startDiscovery(req);
      }

      if (path === '/status' && req.method === 'GET') {
        return await this.getStatus();
      }

      if (path === '/crawl-urls' && req.method === 'POST') {
        return await this.crawlUrls(req);
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('SiteCrawler error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  /**
   * Initiates the job URL discovery process for the configured site.
   * Stores the initial state and discovered URLs in Durable Object storage.
   * * @private
   * @param {Request} req - The request containing site_id, base_url, and search_terms.
   * @returns {Promise<Response>} Status of the discovery process.
   */
  private async startDiscovery(req: Request): Promise<Response> {
    const { site_id, base_url, search_terms } = await req.json() as {
      site_id: string;
      base_url: string;
      search_terms?: string[];
    };

    // Store crawl state
    await this.state.storage.put('current_site_id', site_id);
    await this.state.storage.put('base_url', base_url);
    await this.state.storage.put('last_activity', new Date().toISOString());
    await this.state.storage.put('status', 'discovering');

    // Import discovery function dynamically to avoid circular imports
    const { discoverJobUrls } = await import('./lib/crawl');
    const urls = await discoverJobUrls(base_url, search_terms || []);

    await this.state.storage.put('discovered_urls', urls);
    await this.state.storage.put('total_discovered', urls.length);
    await this.state.storage.put('crawled_count', 0);

    return new Response(JSON.stringify({
      site_id,
      discovered_count: urls.length,
      status: 'discovery_complete',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Processes a batch of discovered URLs to scrape detailed job information.
   * Updates the crawled count and status in Durable Object storage.
   * * @private
   * @param {Request} req - The request specifying the batch size.
   * @returns {Promise<Response>} Status and progress of the batch crawl.
   */
  private async crawlUrls(req: Request): Promise<Response> {
    const { batch_size = 5 } = await req.json() as { batch_size?: number };
    
    const urls = await this.state.storage.get('discovered_urls') as string[] || [];
    const crawledCount = await this.state.storage.get('crawled_count') as number || 0;
    const siteId = await this.state.storage.get('current_site_id') as string;

    if (crawledCount >= urls.length) {
      await this.state.storage.put('status', 'completed');
      return new Response(JSON.stringify({ status: 'completed', message: 'All URLs crawled' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get next batch of URLs
    const batchUrls = urls.slice(crawledCount, crawledCount + batch_size);
    
    // Import crawl function
    const { crawlJobs } = await import('./lib/crawl');
    const jobs = await crawlJobs(this.env, batchUrls, siteId);

    const newCrawledCount = crawledCount + batchUrls.length;
    await this.state.storage.put('crawled_count', newCrawledCount);
    await this.state.storage.put('last_activity', new Date().toISOString());

    const isComplete = newCrawledCount >= urls.length;
    if (isComplete) {
      await this.state.storage.put('status', 'completed');
    }

    return new Response(JSON.stringify({
      crawled_in_batch: jobs.length,
      total_crawled: newCrawledCount,
      total_discovered: urls.length,
      status: isComplete ? 'completed' : 'crawling',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Retrieves the current status and statistics of the site crawl.
   * * @private
   * @returns {Promise<Response>} JSON response with crawl status.
   */
  private async getStatus(): Promise<Response> {
    const status = await this.state.storage.get('status') || 'idle';
    const totalDiscovered = await this.state.storage.get('total_discovered') || 0;
    const crawledCount = await this.state.storage.get('crawled_count') || 0;
    const lastActivity = await this.state.storage.get('last_activity');
    const siteId = await this.state.storage.get('current_site_id');

    return new Response(JSON.stringify({
      site_id: siteId,
      status,
      total_discovered: totalDiscovered,
      crawled_count: crawledCount,
      last_activity: lastActivity,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Durable Object responsible for monitoring individual job postings.
 * * Provides highly-available, scheduled, stateful monitoring of a single job URL.
 * Automatically uses Durable Object Alarms for recurring checks.
 * * **Endpoints (Internal DO API):**
 * - `POST /monitor-job`: Starts monitoring a job and schedules the first check.
 * - `POST /check-job`: Manually triggers a check, crawls the URL, updates DB, and handles job closure.
 * - `GET /status`: Retrieves the current monitoring status and next check time.
 * * @class JobMonitor
 * @param {DurableObjectState} state - Durable Object state reference.
 * @param {Env} env - Worker environment bindings.
 */
export class JobMonitor {
  private state: DurableObjectState;
  private env: Env;

  /**
   * Creates a new JobMonitor instance.
   * @param {DurableObjectState} state - Durable Object state reference.
   * @param {Env} env - Worker environment bindings.
   */
  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  /**
   * Handles API requests for job monitoring operations.
   * @param {Request} req - Incoming request object.
   * @returns {Promise<Response>} The response for the operation.
   */
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    try {
      if (path === '/monitor-job' && req.method === 'POST') {
        return await this.monitorJob(req);
      }

      if (path === '/check-job' && req.method === 'POST') {
        return await this.checkJob(req);
      }

      if (path === '/status' && req.method === 'GET') {
        return await this.getStatus();
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('JobMonitor error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  /**
   * Configures and starts monitoring for a specific job. Schedules the next check via DO Alarm.
   * * @private
   * @param {Request} req - The request containing job details (id, url, interval).
   * @returns {Promise<Response>} Monitoring status and scheduled time.
   */
  private async monitorJob(req: Request): Promise<Response> {
    const { job_id, url, check_interval_hours = 24 } = await req.json() as {
      job_id: string;
      url: string;
      check_interval_hours?: number;
    };

    // Store job monitoring info
    await this.state.storage.put('job_id', job_id);
    await this.state.storage.put('job_url', url);
    await this.state.storage.put('check_interval_hours', check_interval_hours);
    await this.state.storage.put('last_check', new Date().toISOString());
    await this.state.storage.put('status', 'monitoring');

    // Schedule next check using alarm
    const nextCheck = new Date(Date.now() + check_interval_hours * 60 * 60 * 1000);
    await this.state.storage.setAlarm(nextCheck);

    return new Response(JSON.stringify({
      job_id,
      status: 'monitoring_started',
      next_check: nextCheck.toISOString(),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Performs the actual job check: crawls the URL, updates the last check time, and
   * marks the job as closed in the database if the posting is no longer found.
   * * @private
   * @param {Request} req - The request object (used primarily to ensure proper signature).
   * @returns {Promise<Response>} Result of the job check.
   */
  private async checkJob(req: Request): Promise<Response> {
    const jobUrl = await this.state.storage.get('job_url') as string;
    const jobId = await this.state.storage.get('job_id') as string;

    if (!jobUrl || !jobId) {
      return new Response(JSON.stringify({ error: 'No job configured for monitoring' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Import crawl function to check job status
    const { crawlJob } = await import('./lib/crawl');
    const currentJob = await crawlJob(this.env, jobUrl);

    const lastCheck = new Date().toISOString();
    await this.state.storage.put('last_check', lastCheck);

    if (!currentJob) {
      // Job might be closed or moved
      await this.state.storage.put('status', 'job_not_found');
      
      // Update job status in database
      await this.env.DB.prepare('UPDATE jobs SET status = ?, closed_at = ? WHERE id = ?')
        .bind('closed', lastCheck, jobId)
        .run();

      return new Response(JSON.stringify({
        job_id: jobId,
        status: 'job_not_found',
        last_check: lastCheck,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Job is still active, update last seen
    await this.env.DB.prepare('UPDATE jobs SET last_seen_open_at = ?, last_crawled_at = ? WHERE id = ?')
      .bind(lastCheck, lastCheck, jobId)
      .run();

    return new Response(JSON.stringify({
      job_id: jobId,
      status: 'job_active',
      last_check: lastCheck,
      title: currentJob.title,
      company: currentJob.company,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Retrieves the current monitoring status of the job.
   * * @private
   * @returns {Promise<Response>} JSON response with monitoring status and scheduling info.
   */
  private async getStatus(): Promise<Response> {
    const jobId = await this.state.storage.get('job_id');
    const status = await this.state.storage.get('status') || 'idle';
    const lastCheck = await this.state.storage.get('last_check');
    const checkInterval = await this.state.storage.get('check_interval_hours') || 24;

    return new Response(JSON.stringify({
      job_id: jobId,
      status,
      last_check: lastCheck,
      check_interval_hours: checkInterval,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Alarm handler for scheduled job checks. Triggered automatically by the Durable Object.
   * Re-schedules the next alarm if the job is still active.
   * * @returns {Promise<void>}
   */
  async alarm(): Promise<void> {
    try {
      // Perform scheduled job check
      const response = await this.checkJob(new Request('http://localhost/check-job', { method: 'POST' }));
      
      // Schedule next check if still monitoring
      const status = await this.state.storage.get('status');
      if (status === 'monitoring' || status === 'job_active') {
        const checkInterval = await this.state.storage.get('check_interval_hours') as number || 24;
        const nextCheck = new Date(Date.now() + checkInterval * 60 * 60 * 1000);
        await this.state.storage.setAlarm(nextCheck);
      }
    } catch (error) {
      console.error('JobMonitor alarm error:', error);
    }
  }
}

/**
 * Durable Object Workflow for the job discovery operation.
 * * Orchestrates the full process of job discovery: fetches site configurations from the database,
 * instantiates and calls the appropriate `SiteCrawler` Durable Objects, and triggers the
 * subsequent URL crawling process. Designed to be executed by the `codex` CLI or other agents
 * for large-scale, autonomous site scraping.
 * * **Execution Route:** `POST /api/runs/discovery`
 * * @class DiscoveryWorkflow
 */
export class DiscoveryWorkflow {
  /**
   * Main workflow execution for job discovery.
   * @param {Env} env - Worker environment bindings.
   * @param {object} payload - Configuration for the run.
   * @param {string} [payload.config_id] - Optional ID of a specific configuration to run. If not provided, all active configurations are used.
   * @returns {Promise<any>} Summary of the discovery results.
   */
  async run(env: Env, payload: { config_id?: string }): Promise<any> {
    const { config_id } = payload;
    
    try {
      // Get search configuration
      const { getSearchConfigs, getSites } = await import('./lib/storage');
      const configs = config_id
        ? [(await env.DB.prepare('SELECT * FROM search_configs WHERE id = ?').bind(config_id).first())]
        : await getSearchConfigs(env);
      
      const sites = await getSites(env);
      
      const results = [];
      
      for (const config of configs.filter(Boolean)) {
        for (const site of sites) {
          // Create Durable Object instance for this site
          const crawlerId = env.SITE_CRAWLER.idFromName(`${site.id}-${config.id}`);
          const crawler = env.SITE_CRAWLER.get(crawlerId);
          
          // Start discovery
          const discoveryResponse = await crawler.fetch('http://localhost/start-discovery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              site_id: site.id,
              base_url: site.base_url,
              search_terms: JSON.parse(config.keywords || '[]'),
            }),
          });
          
          const discoveryResult = await discoveryResponse.json();
          results.push({
            site: site.name,
            config: config.name,
            ...discoveryResult,
          });
          
          // Start crawling discovered URLs
          if (discoveryResult.discovered_count > 0) {
            await crawler.fetch('http://localhost/crawl-urls', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ batch_size: 5 }),
            });
          }
        }
      }
      
      return { results, total_configs: configs.length, total_sites: sites.length };
    } catch (error) {
      console.error('Discovery workflow error:', error);
      throw error;
    }
  }
}

/**
 * Durable Object Workflow for ongoing job monitoring.
 * * Selects a batch of open jobs from the database and coordinates individual checks
 * by calling the appropriate `JobMonitor` Durable Object for each job. Designed for
 * continuous background operation, typically triggered by the `scheduled` handler.
 * * **Execution Route:** `POST /api/runs/monitor`
 * * @class JobMonitorWorkflow
 */
export class JobMonitorWorkflow {
  /**
   * Main workflow execution for job monitoring.
   * @param {Env} env - Worker environment bindings.
   * @param {object} payload - Configuration for the run.
   * @param {string[]} [payload.job_ids] - Optional array of specific job IDs to monitor. If not provided, queries a batch of 50 open jobs.
   * @returns {Promise<any>} Summary of the monitoring results.
   */
  async run(env: Env, payload: { job_ids?: string[] }): Promise<any> {
    const { job_ids } = payload;
    
    try {
      // Get jobs to monitor
      let jobs: any[];
      
      if (job_ids && job_ids.length > 0) {
        const placeholders = job_ids.map(() => '?').join(',');
        const result = await env.DB.prepare(
          `SELECT * FROM jobs WHERE id IN (${placeholders}) AND status = 'open'`
        ).bind(...job_ids).all();
        jobs = result.results || [];
      } else {
        // Monitor all active jobs, prioritizing oldest crawl
        const result = await env.DB.prepare(
          'SELECT * FROM jobs WHERE status = ? ORDER BY last_crawled_at ASC LIMIT 50'
        ).bind('open').all();
        jobs = result.results || [];
      }
      
      const results = [];
      
      for (const job of jobs) {
        // Create JobMonitor Durable Object for this job
        const monitorId = env.JOB_MONITOR.idFromName(job.id);
        const monitor = env.JOB_MONITOR.get(monitorId);
        
        // First, configure the monitor with job details (also schedules the alarm)
        const configResponse = await monitor.fetch('http://localhost/monitor-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_id: job.id,
            url: job.url,
          }),
        });
        
        if (!configResponse.ok) {
          console.error(`Failed to configure monitor for job ${job.id}`);
          continue;
        }
        
        // Then check job status immediately (first check)
        const checkResponse = await monitor.fetch('http://localhost/check-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        
        const checkResult = await checkResponse.json();
        results.push({
          job_id: job.id,
          job_title: job.title,
          company: job.company,
          ...checkResult,
        });
      }
      
      return { results, total_monitored: jobs.length };
    } catch (error) {
      console.error('Job monitor workflow error:', error);
      throw error;
    }
  }
}

/**
 * Durable Object Workflow for analyzing changes in job postings.
 * * Retrieves two historical job snapshots, performs a comparison (metadata check, R2 content hash),
 * and uses the `env.AI` binding to generate a concise, human-readable semantic summary of the changes.
 * Saves the change record to the database. Essential for notifying applicants of major shifts in a role.
 * * @class ChangeAnalysisWorkflow
 */
export class ChangeAnalysisWorkflow {
  /**
   * Main workflow execution for change analysis.
   * @param {Env} env - Worker environment bindings.
   * @param {object} payload - Snapshot IDs to compare.
   * @param {string} payload.job_id - The ID of the job being analyzed.
   * @param {string} payload.from_snapshot_id - The ID of the older snapshot for comparison.
   * @param {string} payload.to_snapshot_id - The ID of the newer snapshot for comparison.
   * @returns {Promise<any>} The new change record details.
   */
  async run(env: Env, payload: { job_id: string; from_snapshot_id: string; to_snapshot_id: string }): Promise<any> {
    const { job_id, from_snapshot_id, to_snapshot_id } = payload;
    
    try {
      // Get snapshots from database
      const fromSnapshot = await env.DB.prepare('SELECT * FROM snapshots WHERE id = ?')
        .bind(from_snapshot_id).first();
      const toSnapshot = await env.DB.prepare('SELECT * FROM snapshots WHERE id = ?')
        .bind(to_snapshot_id).first();
      
      if (!fromSnapshot || !toSnapshot) {
        throw new Error('Snapshots not found');
      }
      
      // Compare snapshots (simplified - could use R2 content comparison)
      const diff = {
        content_hash_changed: fromSnapshot.content_hash !== toSnapshot.content_hash,
        http_status_changed: fromSnapshot.http_status !== toSnapshot.http_status,
        etag_changed: fromSnapshot.etag !== toSnapshot.etag,
      };
      
      // Generate semantic summary using AI if content changed
      let semanticSummary = 'No significant changes detected';
      
      if (diff.content_hash_changed) {
        // Use AI to analyze changes
        const analysisPrompt = `Analyze the changes between two job posting snapshots and provide a brief summary of what changed.`;
        
        const messages = [
          {
            role: 'system',
            content: 'You are an expert at analyzing job posting changes. Provide concise summaries of what changed between job postings.',
          },
          {
            role: 'user',
            content: `${analysisPrompt}\n\nContent hash changed: ${diff.content_hash_changed}\nHTTP status changed: ${diff.http_status_changed}`,
          },
        ];
        
        const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', { messages });
        semanticSummary = aiResponse.response || semanticSummary;
      }
      
      // Save change record
      const changeId = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT INTO changes(id, job_id, from_snapshot_id, to_snapshot_id, diff_json, semantic_summary) VALUES(?,?,?,?,?,?)'
      ).bind(
        changeId,
        job_id,
        from_snapshot_id,
        to_snapshot_id,
        JSON.stringify(diff),
        semanticSummary
      ).run();
      
      return {
        change_id: changeId,
        job_id,
        diff,
        semantic_summary: semanticSummary,
      };
    } catch (error) {
      console.error('Change analysis workflow error:', error);
      throw error;
    }
  }
}

/**
 * Durable Object managing persistent WebSocket connections with local scrapers and clients.
 * * Facilitates real-time communication for distributed scraping, enabling external scrapers
 * (e.g., Python scripts running via the user's `colby` CLI) to register, receive dispatch
 * commands, and send back status/data.
 * * **Endpoints (Internal DO API):**
 * - `GET /ws`: Handles WebSocket upgrade for new client connections.
 * - `POST /dispatch`: Broadcasts a message to all connected clients.
 * - `GET /status`: Reports the number of connections and connectivity of key client types (e.g., 'python').
 * * @class ScrapeSocket
 * @param {DurableObjectState} state - Durable Object state reference.
 */
export class ScrapeSocket {
  private state: DurableObjectState;
  private clients: Map<WebSocket, { type: string; lastPing: number }> = new Map();

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  /**
   * Handles all incoming HTTP and WebSocket requests for the ScrapeSocket.
   * @param {Request} req - Incoming request object.
   * @returns {Promise<Response>} HTTP or WebSocket response.
   */
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === '/ws' && req.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      server.accept();
      const clientType = url.searchParams.get('client') || 'unknown';
      this.clients.set(server, { type: clientType, lastPing: Date.now() });
      server.addEventListener('close', () => {
        this.clients.delete(server);
      });
      server.addEventListener('message', (evt) => {
        if (evt.data === 'ping') {
          server.send(JSON.stringify({ type: 'pong' }));
          const info = this.clients.get(server);
          if (info) {
            info.lastPing = Date.now();
          }
          return;
        }
        // Broadcast any other messages to all connected clients
        for (const ws of this.clients.keys()) {
          if (ws !== server) {
            try {
              ws.send(evt.data);
            } catch {
              this.clients.delete(ws);
            }
          }
        }
      });
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === '/dispatch' && req.method === 'POST') {
      const message = await req.text();
      for (const ws of this.clients.keys()) {
        try {
          ws.send(message);
        } catch {
          this.clients.delete(ws);
        }
      }
      return new Response('sent', { status: 200 });
    }

    if (url.pathname === '/status' && req.method === 'GET') {
      const now = Date.now();
      const CLIENT_TIMEOUT_MS = 60_000;
      const pythonConnected = Array.from(this.clients.entries()).some(([, info]) =>
        info.type === 'python' && now - info.lastPing < CLIENT_TIMEOUT_MS,
      );
      return new Response(
        JSON.stringify({
          pythonConnected,
          connections: this.clients.size,
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response('Not Found', { status: 404 });
  }
}

export default {
  /**
   * Main Worker fetch handler. Routes all incoming HTTP/S requests to the appropriate handler.
   * * **Agent/Developer Notes:**
   * - **Authentication:** Most `/api/` routes require a Bearer token matching `env.API_AUTH_TOKEN`.
   * - **API Surface:** Handles CRUD for Agents, Tasks, Workflows, Configs, Logs, and manages Job data.
   * - **Static Assets:** Serves UI and the `openapi.json` tool definition from the `ASSETS` binding.
   * - **Core Service:** The primary interface for `colbyadmin-agent-worker.hacolby.workers.dev`.
   * * @param {Request} request - Incoming HTTP request.
   * @param {Env} env - Worker environment bindings.
   * @returns {Promise<Response>} The HTTP response.
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Serve static files from ASSETS binding
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const response = await env.ASSETS.fetch(new Request(new URL('/index.html', url.origin)));
      return response;
    }

    if (url.pathname === '/openapi.json') {
      const response = await env.ASSETS.fetch(request);
      if (response.ok) {
        return new Response(response.body, {
          headers: {
            ...response.headers,
            'Content-Type': 'application/json',
          },
        });
      }
    }

    // WebSocket troubleshooting page
    if (url.pathname === '/ws-debug' || url.pathname === '/ws-debug.html') {
      const response = await env.ASSETS.fetch(new Request(new URL('/ws-debug.html', url.origin)));
      return response;
    }

    // Health check endpoint (unauthenticated)
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Email routing for Cloudflare Email Routing (no auth required, handles multipart/form-data)
    if (request.method === 'POST' && request.headers.get('content-type')?.includes('multipart/form-data')) {
      // This is likely an incoming email from Cloudflare Email Routing
      return handleEmailReceived(request, env);
    }

    // WebSocket upgrade request (no auth required)
    if (url.pathname === '/ws' && request.headers.get('Upgrade') === 'websocket') {
      // Delegates to the ScrapeSocket Durable Object
      return handleScrapeSocket(request, env);
    }

    // Serve all other non-API paths as static assets
    if (!url.pathname.startsWith('/api/')) {
      try {
        const response = await env.ASSETS.fetch(request);
        if (response.ok) {
          return response;
        }
      } catch (error) {
        console.error("Error fetching from ASSETS:", error);
      }

      return new Response('Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Handle OPTIONS requests for CORS (Scraper and Logs endpoints)
    const isScraperEndpoint = url.pathname.startsWith('/api/scraper/');
    if (request.method === 'OPTIONS' && isScraperEndpoint) {
      return handleScraperOptions();
    }

    const isLogsEndpoint = url.pathname.startsWith('/api/logs');
    if (request.method === 'OPTIONS' && isLogsEndpoint) {
      return handleLogsOptions();
    }

    // Define unauthenticated API routes (primarily for scrapers/loggers)
    const unauthenticatedApiRoutes = [
      { method: 'POST', path: '/api/scraper/job-details' },
      { method: 'GET', path: '/api/scraper/queue/pending' },
      { method: 'GET', path: '/api/scraper/queue/unrecorded' },
      { method: 'GET', path: '/api/scraper/monitored-jobs' },
      { method: 'POST', path: '/api/logs' },
      { method: 'GET', path: '/api/logs' },
      { method: 'GET', path: '/api/logs/meta' }
    ];

    // Authorization check
    const requiresAuth = url.pathname.startsWith('/api/') &&
      url.pathname !== '/api/health' &&
      !unauthenticatedApiRoutes.some((route) => route.method === request.method && route.path === url.pathname);

    if (requiresAuth) {
      const authHeader = request.headers.get('Authorization');
      const expectedToken = `Bearer ${env.API_AUTH_TOKEN}`;

      if (!authHeader || authHeader !== expectedToken) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Dedicated status endpoint for ScrapeSocket DO
    if (url.pathname === '/api/socket/status' && request.method === 'GET') {
      const id = env.SCRAPE_SOCKET.idFromName('default');
      const stub = env.SCRAPE_SOCKET.get(id);
      return stub.fetch('https://dummy/status');
    }

    try {
      // --- Route Mapping (grouped by functionality) ---

      // Scraper / Logs Endpoints
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
      if (url.pathname === '/api/scraper/queue' && request.method === 'POST') {
        return handleScrapeQueuePost(request, env);
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

      // Job Scraping & Monitoring API Routes
      if (url.pathname === '/api/jobs' && request.method === 'GET') {
        return handleJobsGet(request, env);
      }
      if (url.pathname.startsWith('/api/jobs/') && request.method === 'GET') {
        // Tracking, Snapshot Content, and Job Detail Routes
        if (url.pathname.endsWith('/tracking')) {
          return handleJobTrackingGet(request, env);
        }
        if (url.pathname.includes('/snapshots/') && url.pathname.endsWith('/content')) {
          return handleSnapshotContentGet(request, env);
        }
        // Default job detail route
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
      if (url.pathname === '/api/monitoring/daily-run' && request.method === 'POST') {
        return handleDailyMonitoringPost(request, env);
      }
      if (url.pathname === '/api/monitoring/status' && request.method === 'GET') {
        return handleMonitoringStatusGet(request, env);
      }
      if (url.pathname === '/api/jobs/monitoring-queue' && request.method === 'GET') {
        return handleMonitoringQueueGet(request, env);
      }

      // Run & Config Endpoints (Orchestration/Control)
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

      // Agent Management Endpoints
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

      // Task Management Endpoints
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

      // Workflow Management Endpoints
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

      // Job History & Rating Endpoints
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

      // Email Management Endpoints
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

      // Manual Crawl Endpoint
      if (url.pathname === '/api/crawl' && request.method === 'POST') {
        const body = await request.json() as { url: string; site_id?: string };
        if (!body.url) {
          return new Response(JSON.stringify({ error: 'URL is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const job = await crawlJob(env, body.url, body.site_id);
        if (job) {
          return new Response(JSON.stringify(job), {
            headers: { 'Content-Type': 'application/json' },
          });
        } else {
          return new Response(JSON.stringify({ error: 'Failed to crawl job' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      // AI Document Generation Routes
      if (url.pathname === '/api/cover-letter' && request.method === 'POST') {
        const body = (await request.json()) as CoverLetterRequestBody;
        if (!body.job_title || !body.company_name || !body.job_description_text || !body.candidate_career_summary) {
          return new Response(JSON.stringify({ error: 'Missing required fields in request body' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const coverLetterSchema = {
          type: 'object',
          properties: {
            salutation: {
              type: 'string',
              description:
                'A professional salutation, addressing the hiring manager by name if provided, otherwise using a general title like "Dear Hiring Manager,".',
            },
            opening_paragraph: {
              type: 'string',
              description:
                "A compelling opening paragraph that clearly states the position being applied for, where it was seen, and a powerful 1-2 sentence summary of the candidate's fitness for the role, creating immediate interest.",
            },
            body_paragraph_1: {
              type: 'string',
              description:
                "The first body paragraph. Connects the candidate's key experiences and skills directly to the most important requirements from the job description. Should highlight 1-2 specific, quantifiable achievements.",
            },
            body_paragraph_2: {
              type: 'string',
              description:
                "The second body paragraph. Focuses on the candidate's alignment with the company's mission, culture, or recent projects. Demonstrates genuine interest and shows how the candidate will add value to the team and company goals.",
            },
            closing_paragraph: {
              type: 'string',
              description:
                'A strong closing paragraph that reiterates interest in the role, expresses enthusiasm for the opportunity, and includes a clear call to action, such as requesting an interview to discuss their qualifications further.',
            },
          },
          required: ['salutation', 'opening_paragraph', 'body_paragraph_1', 'body_paragraph_2', 'closing_paragraph'],
        };

        const messages = [
          {
            role: 'system',
            content:
              'You are an expert career coach and professional cover letter writer. Your task is to generate the content for a compelling, tailored cover letter based on the provided job description and candidate summary. You must strictly adhere to the provided JSON schema for your response, filling in each field with high-quality, relevant content.',
          },
          {
            role: 'user',
            content: `Please craft the content for a cover letter with the following details:\n\n- Job Title: ${body.job_title}\n- Company: ${body.company_name}\n- Hiring Manager: ${body.hiring_manager_name || 'Not specified'}\n\n--- Job Description ---\n${body.job_description_text}\n\n--- Candidate Career Summary ---\n${body.candidate_career_summary}\n\nGenerate the response following the required JSON schema.`,
          },
        ];

        const inputs = { messages, guided_json: coverLetterSchema };
        const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', inputs);
        return new Response(JSON.stringify(response), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname === '/api/resume' && request.method === 'POST') {
        const body = (await request.json()) as ResumeRequestBody;
        if (!body.job_title || !body.company_name || !body.job_description_text || !body.candidate_career_summary) {
          return new Response(JSON.stringify({ error: 'Missing required fields in request body' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const resumeSchema = {
          type: 'object',
          properties: {
            summary: { type: 'string', description: 'Professional summary tailored to the job.' },
            experience_bullets: {
              type: 'array',
              description: 'Three concise bullet points highlighting relevant achievements.',
              items: { type: 'string' },
            },
            skills: {
              type: 'array',
              description: 'Key skills relevant to the job description.',
              items: { type: 'string' },
            },
          },
          required: ['summary', 'experience_bullets', 'skills'],
        };

        const messages = [
          {
            role: 'system',
            content:
              'You are an expert resume writer. Generate a resume summary, three experience bullet points, and a list of key skills tailored to the job description and candidate background. Use the provided JSON schema.',
          },
          {
            role: 'user',
            content: `Generate resume content for the following details:\n\n- Job Title: ${body.job_title}\n- Company: ${body.company_name}\n\n--- Job Description ---\n${body.job_description_text}\n\n--- Candidate Career Summary ---\n${body.candidate_career_summary}\n\nFollow the JSON schema strictly.`,
          },
        ];

        const inputs = { messages, guided_json: resumeSchema };
        const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', inputs);
        return new Response(JSON.stringify(response), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Route not found
      return new Response(JSON.stringify({ error: 'Not Found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: unknown) {
      console.error('Error processing request:', error);
      return new Response(
        JSON.stringify({ error: 'An internal server error occurred.' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
  },

  /**
   * Email handler for Cloudflare Email Routing.
   * * Triggered by incoming emails configured in Cloudflare. This handler delegates processing
   * to `handleEmailReceived`, which is expected to parse the email and process it (e.g.,
   * ingest job leads or track application statuses).
   * * @param {ForwardableEmailMessage} message - The incoming email message object.
   * @param {Env} env - Worker environment bindings.
   * @param {ExecutionContext} ctx - Worker execution context.
   * @returns {Promise<void>}
   */
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
    try {
      console.log(`Email received from: ${message.from}, to: ${message.to}`);
      
      // Create a mock Request object to pass the necessary email data to the HTTP handler
      // This is a common pattern to reuse HTTP-based routing/logic for email events.
      const request = new Request('http://localhost/email-ingestion', {
        method: 'POST',
        headers: message.headers,
        body: message.raw,
      });

      // Call your existing email processing logic
      const response = await handleEmailReceived(request, env);

      if (!response.ok) {
        // If processing fails, reject the email to notify the sender.
        const errorBody = await response.text();
        message.setReject(`Email processing failed: ${errorBody}`);
        console.error(`Failed to process email: ${errorBody}`);
      }
      
    } catch (error) {
      console.error('Error in email handler:', error);
      message.setReject('An internal error occurred during email processing.');
    }
  }, 	

  /**
   * Scheduled handler for automated job monitoring and email insights.
   * * Runs on a configured cron schedule. Orchestrates two major autonomous tasks:
   * 1. **Daily Job Monitoring:** Triggers checks on existing jobs via `runDailyJobMonitoring`.
   * 2. **Email Insights:** Queries active `email_configs` and sends periodic job search reports.
   * * **Agent/Developer Notes:** This is the primary entry point for **autonomous execution** of
   * the monitoring and reporting agents within the `codex` ecosystem.
   * * @param {object} event - The scheduled event object.
   * @param {Env} env - Worker environment bindings.
   * @returns {Promise<void>}
   */
  async scheduled(event: any, env: Env): Promise<void> {
    console.log('Running scheduled job monitoring and email insights...');
    
    try {
      // Run daily job monitoring first (orchestrates JobMonitorWorkflow)
      console.log('Starting daily job monitoring...');
      const monitoringResult = await runDailyJobMonitoring(env);
      console.log('Daily monitoring completed:', monitoringResult);
      
      // Then run email insights
      console.log('Starting email insights...');
      
      // Get all enabled email configurations that are due to be sent
      const result = await env.DB.prepare(`
        SELECT * FROM email_configs 
        WHERE enabled = 1 
        AND (last_sent_at IS NULL OR 
             datetime(last_sent_at, '+' || frequency_hours || ' hours') <= datetime('now'))
      `).all();

      const configs = result.results || [];
      console.log(`Found ${configs.length} email configs ready to send`);

      for (const config of configs) {
        try {
          // Generate insights for this config
          const insights = await generateEmailInsights(env, config);
          
          // Send the email
          const emailSent = await sendInsightsEmail(insights, config, env);
          
          if (emailSent) {
            // Update last sent timestamp in the database
            await env.DB.prepare(`
              UPDATE email_configs SET last_sent_at = CURRENT_TIMESTAMP WHERE id = ?
            `).bind(config.id).run();
            
            console.log(`Email insights sent successfully to ${config.recipient_email}`);
          } else {
            console.error(`Failed to send email insights to ${config.recipient_email}`);
          }
        } catch (error) {
          console.error(`Error processing email config ${config.id}:`, error);
        }
      }
      
      console.log('Scheduled task completed successfully');
      
    } catch (error) {
      console.error('Error in scheduled task:', error);
    }
  },
};
