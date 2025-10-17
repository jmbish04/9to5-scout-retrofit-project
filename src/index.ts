// Placeholder types for Durable Objects until full implementations are added.
type DurableObjectState = any;

// Import GenericAgent for Cloudflare Agents SDK
import { GenericAgent } from "./lib/generic_agent";
// Import RAGAgent for embeddings and RAG functionality
import { RAGAgent } from "./lib/rag_agent";

// Import job scraping functionality
import { crawlJob } from "./lib/crawl";
import { generateEmailInsights, sendInsightsEmail } from "./lib/email";
import { runDailyJobMonitoring } from "./lib/monitoring";
import type { EmailConfig } from "./lib/types";
// Using generated types from wrangler types instead of @cloudflare/workers-types
import { processEmailFromRouting } from "./lib/enhanced-email";
import { handleTestStreamingWebSocket } from "./lib/test-streaming";
import { handleAgentQuery } from "./routes/agent";
import {
  handleAgentDelete,
  handleAgentGet,
  handleAgentPut,
  handleAgentsGet,
  handleAgentsPost,
} from "./routes/agents";
import browserRenderingRoutes from "./routes/browser-rendering";
import { handleBrowserTestWebSocket } from "./routes/browser-test-websocket";
import { handleBrowserTest } from "./routes/browser-testing";
import { handleConfigsGet, handleConfigsPost } from "./routes/configs";
import {
  handleEmailConfigsGet,
  handleEmailConfigsPut,
  handleEmailInsightsSend,
  handleEmailLogsGet
} from "./routes/email";
import {
  handleAIPoweredEmailReceived,
  handleEmailAnalytics,
  handleEmailSearch,
  handleEmailTemplatePost,
  handleEmailTemplatesGet,
  handleEnhancedEmailLogsGet,
  handleEnhancedEmailReceived,
  handleOTPForwardingLogsGet,
  handleOTPTest,
  handleSendHTMLEmail,
  handleSendJobInsights,
  handleSendWelcomeEmail,
  handleTestEmailForward,
} from "./routes/enhanced-email";
import {
  handleBulkFileDelete,
  handleFileDelete,
  handleFileDownload,
  handleFileList,
  handleFileMetadata,
  handleFileUpload,
  handleR2AssetUpload,
  handleStorageStats,
} from "./routes/files";
import {
  handleJobHistoryGet,
  handleJobHistoryPost,
  handleJobRatingPost,
  handleJobRatingsGet,
} from "./routes/job-history";
import {
  handleJobGet,
  handleJobsBatchPost,
  handleJobsGet,
} from "./routes/jobs";
import { logs } from "./routes/logs";
import { handleOpenAPI, handleOpenAPIDocs } from "./routes/openapi";
import { handleRemoteScrapePost } from "./routes/remote-scraper";
import {
  handleDiscoveryRunPost,
  handleMonitorRunPost,
  handleRunsGet,
} from "./routes/runs";
import { handleScrapeFallbackPost } from "./routes/scrape-fallback";
import {
  handleScrapeQueuePatch,
  handleScrapeQueuePendingGet,
  handleScrapeQueuePost,
} from "./routes/scrape-queue";
import sitesRoutes from "./routes/sites";
import { handleScrapeDispatch, handleScrapeSocket } from "./routes/socket";
import steelScraperRoutes from "./routes/steel-scraper";
import talentRoutes from "./routes/talent";
import {
  handleTaskDelete,
  handleTaskGet,
  handleTaskPut,
  handleTasksGet,
  handleTasksPost,
} from "./routes/tasks";
import {
  handleDailyMonitoringPost,
  handleJobMonitoringPut,
  handleJobTrackingGet,
  handleMonitoringQueueGet,
  handleMonitoringStatusGet,
  handleSnapshotContentGet,
} from "./routes/tracking";
import { handleWebhookTest } from "./routes/webhooks";
import {
  handleWorkflowDelete,
  handleWorkflowExecute,
  handleWorkflowGet,
  handleWorkflowPut,
  handleWorkflowsGet,
  handleWorkflowsPost,
} from "./routes/workflows";
// Import embeddings and RAG route handlers
import {
  handleCreateEmbedding,
  handleDeleteEmbedding,
  handleGetEmbeddingOperations,
  handleGetEmbeddingStats,
  handleSearchByUUID,
  handleSearchEmbeddings,
  handleUpdateEmbedding,
} from "./routes/embeddings";
import {
  handleFindMatchingResumes,
  handleFindSimilarJobs,
  handleGenerateCoverLetterSuggestions,
  handleGetJobMarketInsights,
  handleGetRAGAnalytics,
  handleGetRAGQueries,
  handleRAGQuery,
  handleSearchAllContent,
} from "./routes/rag";

/**
 * Cloudflare Worker handling AI-driven cover letter, resume generation, and job scraping.
 */

/**
 * Parse URL path parameters robustly.
 * Examples:
 *   parsePathParams('/api/jobs/123', '/api/jobs/:id') => { id: '123' }
 *   parsePathParams('/api/users/456/posts/789', '/api/users/:userId/posts/:postId') => { userId: '456', postId: '789' }
 */
function parsePathParams(
  pathname: string,
  pattern: string
): Record<string, string> | null {
  const pathParts = pathname.split("/").filter(Boolean);
  const patternParts = pattern.split("/").filter(Boolean);

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

    if (patternPart.startsWith(":")) {
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
 * Describes the request payload expected for cover letter generation.
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
 */
interface CoverLetterContent {
  salutation: string;
  opening_paragraph: string;
  body_paragraph_1: string;
  body_paragraph_2: string;
  closing_paragraph: string;
}

/**
 * Defines the request payload for resume generation.
 */
interface ResumeRequestBody {
  job_title: string;
  company_name: string;
  job_description_text: string;
  candidate_career_summary: string;
}

/**
 * Represents structured resume content returned by the AI model.
 */
interface ResumeContent {
  summary: string;
  experience_bullets: string[];
  skills: string[];
}

/**
 * Environment bindings made available to the Worker at runtime.
 */
export interface Env {
  AI: Ai;
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  VECTORIZE_INDEX: VectorizeIndex;
  JOB_OPENINGS_INDEX: VectorizeIndex;
  RESUMES_INDEX: VectorizeIndex;
  COVER_LETTERS_INDEX: VectorizeIndex;
  GENERAL_CONTENT_INDEX: VectorizeIndex;
  MYBROWSER: Fetcher;
  BROWSER: Fetcher;
  ASSETS: Fetcher;
  WORKER_API_KEY: string;
  BROWSER_RENDERING_TOKEN: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_API_TOKEN: string;
  SLACK_WEBHOOK_URL: string;
  SITE_CRAWLER: DurableObjectNamespace;
  JOB_MONITOR: DurableObjectNamespace;
  RAG_AGENT: DurableObjectNamespace;
  DISCOVERY_WORKFLOW: Workflow;
  JOB_MONITOR_WORKFLOW: Workflow;
  CHANGE_ANALYSIS_WORKFLOW: Workflow;
  SCRAPE_SOCKET: DurableObjectNamespace;
  STEEL_API_KEY: string;
  LINKEDIN_USERNAME: string;
  LINKEDIN_PASSWORD: string;
  USAGE_TRACKER: KVNamespace;
  EMAIL_SENDER: SendEmail;
  DEFAULT_MODEL_WEB_BROWSER: keyof AiModels;
  DEFAULT_MODEL_REASONING: keyof AiModels;
  GITHUB_REPO: string;
  BUCKET_BASE_URL: string;
  NOTIFICATION_EMAIL_ADDRESS: string;
  EMBEDDING_MODEL: keyof AiModels;
  EMAIL_ROUTING_DOMAIN: string;
  PYTHON_SCRAPER_URL: string;
  PYTHON_SCRAPER_API_KEY: string;
}

/**
 * Durable Object coordinating crawling operations for a specific site.
 * Manages job discovery, rate limiting, and status tracking per site.
 */
export class SiteCrawler {
  private state: DurableObjectState;
  private env: Env;

  /**
   * Creates a new SiteCrawler instance.
   * @param state - Durable Object state reference.
   * @param env - Worker environment bindings.
   */
  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  /**
   * Handles API requests for site crawling operations.
   * @param req - Incoming request object.
   */
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    try {
      if (path === "/start-discovery" && req.method === "POST") {
        return await this.startDiscovery(req);
      }

      if (path === "/status" && req.method === "GET") {
        return await this.getStatus();
      }

      if (path === "/crawl-urls" && req.method === "POST") {
        return await this.crawlUrls(req);
      }

      return new Response("Not Found", { status: 404 });
    } catch (error) {
      console.error("SiteCrawler error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  private async startDiscovery(req: Request): Promise<Response> {
    const { site_id, base_url, search_terms } = (await req.json()) as {
      site_id: string;
      base_url: string;
      search_terms?: string[];
    };

    // Store crawl state
    await this.state.storage.put("current_site_id", site_id);
    await this.state.storage.put("base_url", base_url);
    await this.state.storage.put("last_activity", new Date().toISOString());
    await this.state.storage.put("status", "discovering");

    // Import discovery function dynamically to avoid circular imports
    const { discoverJobUrls } = await import("./lib/crawl");
    const urls = await discoverJobUrls(base_url, search_terms || []);

    await this.state.storage.put("discovered_urls", urls);
    await this.state.storage.put("total_discovered", urls.length);
    await this.state.storage.put("crawled_count", 0);

    return new Response(
      JSON.stringify({
        site_id,
        discovered_count: urls.length,
        status: "discovery_complete",
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  private async crawlUrls(req: Request): Promise<Response> {
    const { batch_size = 5 } = (await req.json()) as { batch_size?: number };

    const urls =
      ((await this.state.storage.get("discovered_urls")) as string[]) || [];
    const crawledCount =
      ((await this.state.storage.get("crawled_count")) as number) || 0;
    const siteId = (await this.state.storage.get("current_site_id")) as string;

    if (crawledCount >= urls.length) {
      await this.state.storage.put("status", "completed");
      return new Response(
        JSON.stringify({ status: "completed", message: "All URLs crawled" }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get next batch of URLs
    const batchUrls = urls.slice(crawledCount, crawledCount + batch_size);

    // Import crawl function
    const { crawlJobs } = await import("./lib/crawl");
    const jobs = await crawlJobs(this.env, batchUrls, siteId);

    const newCrawledCount = crawledCount + batchUrls.length;
    await this.state.storage.put("crawled_count", newCrawledCount);
    await this.state.storage.put("last_activity", new Date().toISOString());

    const isComplete = newCrawledCount >= urls.length;
    if (isComplete) {
      await this.state.storage.put("status", "completed");
    }

    return new Response(
      JSON.stringify({
        crawled_in_batch: jobs.length,
        total_crawled: newCrawledCount,
        total_discovered: urls.length,
        status: isComplete ? "completed" : "crawling",
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  private async getStatus(): Promise<Response> {
    const status = (await this.state.storage.get("status")) || "idle";
    const totalDiscovered =
      (await this.state.storage.get("total_discovered")) || 0;
    const crawledCount = (await this.state.storage.get("crawled_count")) || 0;
    const lastActivity = await this.state.storage.get("last_activity");
    const siteId = await this.state.storage.get("current_site_id");

    return new Response(
      JSON.stringify({
        site_id: siteId,
        status,
        total_discovered: totalDiscovered,
        crawled_count: crawledCount,
        last_activity: lastActivity,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Durable Object responsible for monitoring individual job postings.
 * Tracks changes in job postings and detects when jobs are closed or modified.
 */
export class JobMonitor {
  private state: DurableObjectState;
  private env: Env;

  /**
   * Creates a new JobMonitor instance.
   * @param state - Durable Object state reference.
   * @param env - Worker environment bindings.
   */
  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  /**
   * Handles API requests for job monitoring operations.
   * @param req - Incoming request object.
   */
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    try {
      if (path === "/monitor-job" && req.method === "POST") {
        return await this.monitorJob(req);
      }

      if (path === "/check-job" && req.method === "POST") {
        return await this.checkJob(req);
      }

      if (path === "/status" && req.method === "GET") {
        return await this.getStatus();
      }

      return new Response("Not Found", { status: 404 });
    } catch (error) {
      console.error("JobMonitor error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  private async monitorJob(req: Request): Promise<Response> {
    const {
      job_id,
      url,
      check_interval_hours = 24,
    } = (await req.json()) as {
      job_id: string;
      url: string;
      check_interval_hours?: number;
    };

    // Store job monitoring info
    await this.state.storage.put("job_id", job_id);
    await this.state.storage.put("job_url", url);
    await this.state.storage.put("check_interval_hours", check_interval_hours);
    await this.state.storage.put("last_check", new Date().toISOString());
    await this.state.storage.put("status", "monitoring");

    // Schedule next check using alarm
    const nextCheck = new Date(
      Date.now() + check_interval_hours * 60 * 60 * 1000
    );
    await this.state.storage.setAlarm(nextCheck);

    return new Response(
      JSON.stringify({
        job_id,
        status: "monitoring_started",
        next_check: nextCheck.toISOString(),
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  private async checkJob(req: Request): Promise<Response> {
    const jobUrl = (await this.state.storage.get("job_url")) as string;
    const jobId = (await this.state.storage.get("job_id")) as string;

    if (!jobUrl || !jobId) {
      return new Response(
        JSON.stringify({ error: "No job configured for monitoring" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Import crawl function to check job status
    const { crawlJob } = await import("./lib/crawl");
    const currentJob = await crawlJob(this.env, jobUrl);

    const lastCheck = new Date().toISOString();
    await this.state.storage.put("last_check", lastCheck);

    if (!currentJob) {
      // Job might be closed or moved
      await this.state.storage.put("status", "job_not_found");

      // Update job status in database
      await this.env.DB.prepare(
        "UPDATE jobs SET status = ?, closed_at = ? WHERE id = ?"
      )
        .bind("closed", lastCheck, jobId)
        .run();

      return new Response(
        JSON.stringify({
          job_id: jobId,
          status: "job_not_found",
          last_check: lastCheck,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Job is still active, update last seen
    await this.env.DB.prepare(
      "UPDATE jobs SET last_seen_open_at = ?, last_crawled_at = ? WHERE id = ?"
    )
      .bind(lastCheck, lastCheck, jobId)
      .run();

    return new Response(
      JSON.stringify({
        job_id: jobId,
        status: "job_active",
        last_check: lastCheck,
        title: currentJob.title,
        company: currentJob.company,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  private async getStatus(): Promise<Response> {
    const jobId = await this.state.storage.get("job_id");
    const status = (await this.state.storage.get("status")) || "idle";
    const lastCheck = await this.state.storage.get("last_check");
    const checkInterval =
      (await this.state.storage.get("check_interval_hours")) || 24;

    return new Response(
      JSON.stringify({
        job_id: jobId,
        status,
        last_check: lastCheck,
        check_interval_hours: checkInterval,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  /**
   * Alarm handler for scheduled job checks.
   */
  async alarm(): Promise<void> {
    try {
      // Perform scheduled job check
      const response = await this.checkJob(
        new Request("http://localhost/check-job", { method: "POST" })
      );

      // Schedule next check if still monitoring
      const status = await this.state.storage.get("status");
      if (status === "monitoring" || status === "job_active") {
        const checkInterval =
          ((await this.state.storage.get("check_interval_hours")) as number) ||
          24;
        const nextCheck = new Date(Date.now() + checkInterval * 60 * 60 * 1000);
        await this.state.storage.setAlarm(nextCheck);
      }
    } catch (error) {
      console.error("JobMonitor alarm error:", error);
    }
  }
}

/**
 * Workflow for job discovery operations.
 * Orchestrates the discovery of new job postings across configured sites.
 */
export class DiscoveryWorkflow {
  /**
   * Main workflow execution for job discovery.
   */
  async run(env: Env, payload: { config_id?: string }): Promise<any> {
    const { config_id } = payload;

    try {
      // Get search configuration
      const { getSearchConfigs, getSites } = await import("./lib/storage");
      const configs = config_id
        ? [
            await env.DB.prepare("SELECT * FROM search_configs WHERE id = ?")
              .bind(config_id)
              .first(),
          ]
        : await getSearchConfigs(env);

      const sites = await getSites(env);

      const results = [];

      for (const config of configs.filter(Boolean)) {
        if (!config) continue;
        for (const site of sites) {
          // Create Durable Object instance for this site
          const crawlerId = env.SITE_CRAWLER.idFromName(
            `${site.id}-${config.id}`
          );
          const crawler = env.SITE_CRAWLER.get(crawlerId);

          // Start discovery
          const discoveryResponse = await crawler.fetch(
            "http://localhost/start-discovery",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                site_id: site.id,
                base_url: site.base_url,
                search_terms: JSON.parse((config.keywords as string) || "[]"),
              }),
            }
          );

          const discoveryResult = (await discoveryResponse.json()) as Record<
            string,
            unknown
          >;
          results.push({
            site: site.name,
            config: config.name,
            ...discoveryResult,
          });

          // Start crawling discovered URLs
          if ((discoveryResult.discovered_count as number) > 0) {
            await crawler.fetch("http://localhost/crawl-urls", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ batch_size: 5 }),
            });
          }
        }
      }

      return {
        results,
        total_configs: configs.length,
        total_sites: sites.length,
      };
    } catch (error) {
      console.error("Discovery workflow error:", error);
      throw error;
    }
  }
}

/**
 * Workflow for ongoing job monitoring.
 * Monitors existing job postings for changes and status updates.
 */
export class JobMonitorWorkflow {
  /**
   * Main workflow execution for job monitoring.
   */
  async run(env: Env, payload: { job_ids?: string[] }): Promise<any> {
    const { job_ids } = payload;

    try {
      // Get jobs to monitor
      let jobs: Record<string, unknown>[];

      if (job_ids && job_ids.length > 0) {
        const placeholders = job_ids.map(() => "?").join(",");
        const result = await env.DB.prepare(
          `SELECT * FROM jobs WHERE id IN (${placeholders}) AND status = 'open'`
        )
          .bind(...job_ids)
          .all();
        jobs = result.results || [];
      } else {
        // Monitor all active jobs
        const result = await env.DB.prepare(
          "SELECT * FROM jobs WHERE status = ? ORDER BY last_crawled_at ASC LIMIT 50"
        )
          .bind("open")
          .all();
        jobs = result.results || [];
      }

      const results = [];

      for (const job of jobs) {
        // Create JobMonitor Durable Object for this job
        const monitorId = env.JOB_MONITOR.idFromName(job.id as string);
        const monitor = env.JOB_MONITOR.get(monitorId);

        // First, configure the monitor with job details
        const configResponse = await monitor.fetch(
          "http://localhost/monitor-job",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              job_id: job.id,
              job_url: job.url,
            }),
          }
        );

        if (!configResponse.ok) {
          console.error(`Failed to configure monitor for job ${job.id}`);
          continue;
        }

        // Then check job status
        const checkResponse = await monitor.fetch(
          "http://localhost/check-job",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }
        );

        const checkResult = (await checkResponse.json()) as Record<
          string,
          unknown
        >;
        results.push({
          job_id: job.id,
          job_title: job.title,
          company: job.company,
          ...checkResult,
        });
      }

      return { results, total_monitored: jobs.length };
    } catch (error) {
      console.error("Job monitor workflow error:", error);
      throw error;
    }
  }
}

/**
 * Workflow for analyzing changes in job postings.
 * Detects and summarizes changes in job descriptions and requirements.
 */
export class ChangeAnalysisWorkflow {
  /**
   * Main workflow execution for change analysis.
   */
  async run(
    env: Env,
    payload: {
      job_id: string;
      from_snapshot_id: string;
      to_snapshot_id: string;
    }
  ): Promise<any> {
    const { job_id, from_snapshot_id, to_snapshot_id } = payload;

    try {
      // Get snapshots from database
      const fromSnapshot = await env.DB.prepare(
        "SELECT * FROM snapshots WHERE id = ?"
      )
        .bind(from_snapshot_id)
        .first();
      const toSnapshot = await env.DB.prepare(
        "SELECT * FROM snapshots WHERE id = ?"
      )
        .bind(to_snapshot_id)
        .first();

      if (!fromSnapshot || !toSnapshot) {
        throw new Error("Snapshots not found");
      }

      // Compare snapshots (simplified - could use R2 content comparison)
      const diff = {
        content_hash_changed:
          fromSnapshot.content_hash !== toSnapshot.content_hash,
        http_status_changed:
          fromSnapshot.http_status !== toSnapshot.http_status,
        etag_changed: fromSnapshot.etag !== toSnapshot.etag,
      };

      // Generate semantic summary using AI if content changed
      let semanticSummary = "No significant changes detected";

      if (diff.content_hash_changed) {
        // Use AI to analyze changes
        const analysisPrompt = `Analyze the changes between two job posting snapshots and provide a brief summary of what changed.`;

        const messages = [
          {
            role: "system",
            content:
              "You are an expert at analyzing job posting changes. Provide concise summaries of what changed between job postings.",
          },
          {
            role: "user",
            content: `${analysisPrompt}\n\nContent hash changed: ${diff.content_hash_changed}\nHTTP status changed: ${diff.http_status_changed}`,
          },
        ];

        const aiResponse = await env.AI.run(env.DEFAULT_MODEL_REASONING, {
          messages,
        });
        semanticSummary =
          (aiResponse as { response?: string }).response || semanticSummary;
      }

      // Save change record
      const changeId = crypto.randomUUID();
      await env.DB.prepare(
        "INSERT INTO changes(id, job_id, from_snapshot_id, to_snapshot_id, diff_json, semantic_summary) VALUES(?,?,?,?,?,?)"
      )
        .bind(
          changeId,
          job_id,
          from_snapshot_id,
          to_snapshot_id,
          JSON.stringify(diff),
          semanticSummary
        )
        .run();

      return {
        change_id: changeId,
        job_id,
        diff,
        semantic_summary: semanticSummary,
      };
    } catch (error) {
      console.error("Change analysis workflow error:", error);
      throw error;
    }
  }
}

/**
 * Durable Object managing persistent WebSocket connections with local scrapers.
 */
export class ScrapeSocket {
  private state: DurableObjectState;
  private sockets: Set<WebSocket> = new Set();

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/ws" && req.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      server.accept();
      this.sockets.add(server);
      server.addEventListener("close", () => {
        this.sockets.delete(server);
      });
      server.addEventListener("message", (evt) => {
        // simple heartbeat support
        if (evt.data === "ping") {
          server.send("pong");
        }
      });
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === "/dispatch" && req.method === "POST") {
      const message = await req.text();
      for (const ws of this.sockets) {
        try {
          ws.send(message);
        } catch (err) {
          this.sockets.delete(ws);
        }
      }
      return new Response("sent", { status: 200 });
    }

    return new Response("Not Found", { status: 404 });
  }
}

// Export GenericAgent for Cloudflare Agents SDK
export { GenericAgent };
// Export RAGAgent for embeddings and RAG functionality
  export { RAGAgent };

export default {
  /**
   * Main fetch handler routing API requests.
   * @param request - Incoming HTTP request.
   * @param env - Worker environment bindings.
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    console.log(`🌐 Request received: ${request.method} ${url.pathname}`);

    // Serve static files from ASSETS binding
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const response = await env.ASSETS.fetch(
        new Request(new URL("/index.html", url.origin))
      );
      return response;
    }

    // OpenAPI specification endpoints
    if (url.pathname === "/openapi.json") {
      return handleOpenAPI(request, env);
    }

    if (url.pathname === "/docs" || url.pathname === "/api-docs") {
      return handleOpenAPIDocs(request, env);
    }

    // Health check endpoint
    if (url.pathname === "/api/health") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          timestamp: new Date().toISOString(),
          version: "1.0.0",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Simple test route
    if (url.pathname === "/api/test-simple") {
      return new Response(
        JSON.stringify({ message: "Simple test route works!" }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Email routing for Cloudflare Email Routing (no auth required)
    if (request.method === "POST") {
      const contentType = request.headers.get("content-type");
      console.log("🔍 POST request detected, content-type:", contentType);
      
      if (contentType?.includes("multipart/form-data")) {
        console.log("📧 Email webhook detected - routing to AI-powered handler");
        // This is likely an incoming email from Cloudflare Email Routing
        // Use AI-powered email processing for better functionality
        return handleAIPoweredEmailReceived(request, env);
      } else {
        console.log("🔍 Not an email webhook, continuing with other routes");
      }
    }

    if (
      url.pathname === "/ws" &&
      request.headers.get("Upgrade") === "websocket"
    ) {
      return handleScrapeSocket(request, env);
    }

    // Authentication check for API routes (except health and email webhook)
    if (url.pathname.startsWith("/api/") && url.pathname !== "/api/health") {
      const authHeader = request.headers.get("Authorization");
      const expectedToken = `Bearer ${env.WORKER_API_KEY}`;

      if (!authHeader || authHeader !== expectedToken) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    try {
      console.log(`🔍 Inside try block for: ${url.pathname}`);
      
      if (
        url.pathname === "/api/scrape/dispatch" &&
        request.method === "POST"
      ) {
        return handleScrapeDispatch(request, env);
      }

      // Job scraping API routes
      if (url.pathname === "/api/jobs" && request.method === "GET") {
        return handleJobsGet(request, env);
      }

      if (url.pathname === "/api/v1/jobs/batch" && request.method === "POST") {
        return handleJobsBatchPost(request, env);
      }

      if (url.pathname.startsWith("/api/jobs/") && request.method === "GET") {
        // Check for tracking routes first
        if (url.pathname.endsWith("/tracking")) {
          return handleJobTrackingGet(request, env);
        }

        // Check for snapshot content routes
        if (
          url.pathname.includes("/snapshots/") &&
          url.pathname.endsWith("/content")
        ) {
          return handleSnapshotContentGet(request, env);
        }

        // Default job detail route
        const params = parsePathParams(url.pathname, "/api/jobs/:id");
        if (!params || !params.id) {
          return new Response(JSON.stringify({ error: "Job ID is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return handleJobGet(request, env, params.id);
      }

      // Job monitoring endpoints
      if (
        url.pathname.startsWith("/api/jobs/") &&
        url.pathname.endsWith("/monitoring") &&
        request.method === "PUT"
      ) {
        return handleJobMonitoringPut(request, env);
      }

      if (url.pathname === "/api/runs" && request.method === "GET") {
        return handleRunsGet(request, env);
      }

      if (url.pathname === "/api/runs/discovery" && request.method === "POST") {
        return handleDiscoveryRunPost(request, env);
      }

      if (url.pathname === "/api/runs/monitor" && request.method === "POST") {
        return handleMonitorRunPost(request, env);
      }

      if (url.pathname === "/api/configs" && request.method === "GET") {
        return handleConfigsGet(request, env);
      }

      if (url.pathname === "/api/configs" && request.method === "POST") {
        return handleConfigsPost(request, env);
      }

      if (url.pathname === "/api/agent/query" && request.method === "GET") {
        return handleAgentQuery(request, env);
      }

      if (url.pathname === "/api/webhooks/test" && request.method === "POST") {
        return handleWebhookTest(request, env);
      }

      // Email management endpoints
      if (url.pathname === "/api/email/logs" && request.method === "GET") {
        return handleEmailLogsGet(request, env);
      }

      if (url.pathname === "/api/email/configs" && request.method === "GET") {
        return handleEmailConfigsGet(request, env);
      }

      if (url.pathname === "/api/email/configs" && request.method === "PUT") {
        return handleEmailConfigsPut(request, env);
      }

      if (
        url.pathname === "/api/email/insights/send" &&
        request.method === "POST"
      ) {
        return handleEmailInsightsSend(request, env);
      }

      // Enhanced email processing endpoints
      if (url.pathname === "/api/enhanced-email/receive" && request.method === "POST") {
        return handleEnhancedEmailReceived(request, env);
      }

      if (url.pathname === "/api/enhanced-email/logs" && request.method === "GET") {
        return handleEnhancedEmailLogsGet(request, env);
      }

      if (url.pathname === "/api/enhanced-email/otp-logs" && request.method === "GET") {
        return handleOTPForwardingLogsGet(request, env);
      }

      if (url.pathname === "/api/enhanced-email/send" && request.method === "POST") {
        return handleSendHTMLEmail(request, env);
      }

      if (url.pathname === "/api/enhanced-email/templates" && request.method === "GET") {
        return handleEmailTemplatesGet(request, env);
      }

      if (url.pathname === "/api/enhanced-email/templates" && request.method === "POST") {
        return handleEmailTemplatePost(request, env);
      }

      if (url.pathname === "/api/enhanced-email/insights" && request.method === "POST") {
        return handleSendJobInsights(request, env);
      }

      if (url.pathname === "/api/enhanced-email/welcome" && request.method === "POST") {
        return handleSendWelcomeEmail(request, env);
      }

      if (url.pathname === "/api/enhanced-email/search" && request.method === "GET") {
        return handleEmailSearch(request, env);
      }

      if (url.pathname === "/api/enhanced-email/analytics" && request.method === "GET") {
        return handleEmailAnalytics(request, env);
      }

      if (url.pathname === "/api/enhanced-email/otp-test" && request.method === "GET") {
        return handleOTPTest(request, env);
      }

      if (url.pathname === "/api/enhanced-email/ai-receive" && request.method === "POST") {
        return handleAIPoweredEmailReceived(request, env);
      }

      if (url.pathname === "/api/enhanced-email/test-forward" && request.method === "GET") {
        return handleTestEmailForward(request, env);
      }

      // Agent management endpoints
      if (url.pathname === "/api/agents" && request.method === "GET") {
        return handleAgentsGet(request, env);
      }

      if (url.pathname === "/api/agents" && request.method === "POST") {
        return handleAgentsPost(request, env);
      }

      if (url.pathname.startsWith("/api/agents/") && request.method === "GET") {
        const params = parsePathParams(url.pathname, "/api/agents/:id");
        if (!params || !params.id) {
          return new Response(
            JSON.stringify({ error: "Agent ID is required" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        return handleAgentGet(request, env, params.id);
      }

      if (url.pathname.startsWith("/api/agents/") && request.method === "PUT") {
        const params = parsePathParams(url.pathname, "/api/agents/:id");
        if (!params || !params.id) {
          return new Response(
            JSON.stringify({ error: "Agent ID is required" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        return handleAgentPut(request, env, params.id);
      }

      if (
        url.pathname.startsWith("/api/agents/") &&
        request.method === "DELETE"
      ) {
        const params = parsePathParams(url.pathname, "/api/agents/:id");
        if (!params || !params.id) {
          return new Response(
            JSON.stringify({ error: "Agent ID is required" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        return handleAgentDelete(request, env, params.id);
      }

      // Task management endpoints
      if (url.pathname === "/api/tasks" && request.method === "GET") {
        return handleTasksGet(request, env);
      }

      if (url.pathname === "/api/tasks" && request.method === "POST") {
        return handleTasksPost(request, env);
      }

      if (url.pathname.startsWith("/api/tasks/") && request.method === "GET") {
        const params = parsePathParams(url.pathname, "/api/tasks/:id");
        if (!params || !params.id) {
          return new Response(
            JSON.stringify({ error: "Task ID is required" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        return handleTaskGet(request, env, params.id);
      }

      if (url.pathname.startsWith("/api/tasks/") && request.method === "PUT") {
        const params = parsePathParams(url.pathname, "/api/tasks/:id");
        if (!params || !params.id) {
          return new Response(
            JSON.stringify({ error: "Task ID is required" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        return handleTaskPut(request, env, params.id);
      }

      if (
        url.pathname.startsWith("/api/tasks/") &&
        request.method === "DELETE"
      ) {
        const params = parsePathParams(url.pathname, "/api/tasks/:id");
        if (!params || !params.id) {
          return new Response(
            JSON.stringify({ error: "Task ID is required" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        return handleTaskDelete(request, env, params.id);
      }

      // Workflow management endpoints
      if (url.pathname === "/api/workflows" && request.method === "GET") {
        return handleWorkflowsGet(request, env);
      }

      if (url.pathname === "/api/workflows" && request.method === "POST") {
        return handleWorkflowsPost(request, env);
      }

      if (
        url.pathname.startsWith("/api/workflows/") &&
        url.pathname.endsWith("/execute") &&
        request.method === "POST"
      ) {
        const params = parsePathParams(
          url.pathname,
          "/api/workflows/:id/execute"
        );
        if (!params || !params.id) {
          return new Response(
            JSON.stringify({ error: "Workflow ID is required" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        return handleWorkflowExecute(request, env, params.id);
      }

      if (
        url.pathname.startsWith("/api/workflows/") &&
        request.method === "GET"
      ) {
        const params = parsePathParams(url.pathname, "/api/workflows/:id");
        if (!params || !params.id) {
          return new Response(
            JSON.stringify({ error: "Workflow ID is required" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        return handleWorkflowGet(request, env, params.id);
      }

      if (
        url.pathname.startsWith("/api/workflows/") &&
        request.method === "PUT"
      ) {
        const params = parsePathParams(url.pathname, "/api/workflows/:id");
        if (!params || !params.id) {
          return new Response(
            JSON.stringify({ error: "Workflow ID is required" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        return handleWorkflowPut(request, env, params.id);
      }

      if (
        url.pathname.startsWith("/api/workflows/") &&
        request.method === "DELETE"
      ) {
        const params = parsePathParams(url.pathname, "/api/workflows/:id");
        if (!params || !params.id) {
          return new Response(
            JSON.stringify({ error: "Workflow ID is required" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        return handleWorkflowDelete(request, env, params.id);
      }

      // Job History Management endpoints
      if (
        url.pathname === "/api/applicant/history" &&
        request.method === "POST"
      ) {
        return handleJobHistoryPost(request, env);
      }

      if (
        url.pathname.startsWith("/api/applicant/") &&
        url.pathname.endsWith("/history") &&
        request.method === "GET"
      ) {
        const params = parsePathParams(
          url.pathname,
          "/api/applicant/:user_id/history"
        );
        if (!params || !params.user_id) {
          return new Response(
            JSON.stringify({ error: "User ID is required" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        return handleJobHistoryGet(request, env, params);
      }

      if (
        url.pathname === "/api/applicant/job-rating" &&
        request.method === "POST"
      ) {
        return handleJobRatingPost(request, env);
      }

      if (
        url.pathname.startsWith("/api/applicant/") &&
        url.pathname.endsWith("/job-ratings") &&
        request.method === "GET"
      ) {
        const params = parsePathParams(
          url.pathname,
          "/api/applicant/:user_id/job-ratings"
        );
        if (!params || !params.user_id) {
          return new Response(
            JSON.stringify({ error: "User ID is required" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        return handleJobRatingsGet(request, env, params);
      }

      // Job Monitoring and Tracking endpoints
      if (
        url.pathname === "/api/monitoring/daily-run" &&
        request.method === "POST"
      ) {
        return handleDailyMonitoringPost(request, env);
      }

      if (
        url.pathname === "/api/monitoring/status" &&
        request.method === "GET"
      ) {
        return handleMonitoringStatusGet(request, env);
      }

      if (
        url.pathname === "/api/jobs/monitoring-queue" &&
        request.method === "GET"
      ) {
        return handleMonitoringQueueGet(request, env);
      }

      // Sites management routes
      if (url.pathname.startsWith("/api/sites/")) {
        return sitesRoutes.fetch(request, env);
      }

      // Steel scraper routes
      if (url.pathname.startsWith("/api/steel-scraper/")) {
        return steelScraperRoutes.fetch(request, env);
      }

      console.log(`🔍 Checking talent routes for: ${url.pathname}`);
      console.log(`🔍 Path starts with /api/talent/? ${url.pathname.startsWith("/api/talent/")}`);
      
      // Talent API routes (with authentication) - SIMPLIFIED TEST
      if (url.pathname.startsWith("/api/talent")) {
        console.log(`🎯 Talent API route matched: ${url.pathname}`);
        
        // Check authentication for talent routes
        const authHeader = request.headers.get("Authorization");
        const expectedToken = `Bearer ${env.WORKER_API_KEY}`;
        
        console.log(`🔑 Auth header: ${authHeader ? 'Present' : 'Missing'}`);
        console.log(`🔑 Expected token: ${expectedToken}`);
        
        if (!authHeader || authHeader !== expectedToken) {
          console.log(`❌ Talent API authentication failed: ${authHeader ? 'Invalid token' : 'Missing token'}`);
          return new Response(
            JSON.stringify({
              error: "Unauthorized",
              details: "Valid API key required for talent API access",
            }),
            { 
              status: 401,
              headers: { "Content-Type": "application/json" }
            }
          );
        }
        
        console.log(`✅ Talent API authentication successful for ${url.pathname}`);
        console.log(`🚀 Calling talentRoutes.fetch for ${url.pathname}`);
        
        try {
          const result = await (talentRoutes as any).fetch(request, env, {});
          console.log(`✅ Talent routes fetch successful: ${result.status}`);
          return result;
        } catch (error) {
          console.error(`❌ Talent routes fetch failed:`, error);
          return new Response(
            JSON.stringify({ 
              error: "Talent routes error", 
              details: error instanceof Error ? error.message : String(error) 
            }),
            { 
              status: 500,
              headers: { "Content-Type": "application/json" }
            }
          );
        }
      }

      // Test route to verify routing works
      if (url.pathname === "/api/test") {
        console.log(`🧪 Test route matched: ${url.pathname}`);
        return new Response(JSON.stringify({ message: "Test route works!" }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      // Scrape queue routes for Python integration
      if (
        url.pathname === "/api/v1/scrape-queue" &&
        request.method === "POST"
      ) {
        return handleScrapeQueuePost(request, env);
      }

      if (
        url.pathname === "/api/v1/scrape-queue/pending" &&
        request.method === "GET"
      ) {
        return handleScrapeQueuePendingGet(request, env);
      }

      if (
        url.pathname.startsWith("/api/v1/scrape-queue/") &&
        request.method === "PATCH"
      ) {
        const params = parsePathParams(
          url.pathname,
          "/api/v1/scrape-queue/:id"
        );
        if (!params || !params.id) {
          return new Response(JSON.stringify({ error: "Job ID is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return handleScrapeQueuePatch(request, env, params.id);
      }

      // Remote scraper routes for Python integration
      if (
        url.pathname === "/api/v1/remote-scrape" &&
        request.method === "POST"
      ) {
        return handleRemoteScrapePost(request, env);
      }

      // Scrape fallback routes for when browser rendering fails
      if (
        url.pathname === "/api/v1/scrape-fallback" &&
        request.method === "POST"
      ) {
        return handleScrapeFallbackPost(request, env);
      }

      // Browser rendering routes
      if (url.pathname.startsWith("/api/browser-rendering/")) {
        return browserRenderingRoutes.fetch(request, env);
      }

      // Browser testing routes
      if (url.pathname.startsWith("/api/browser-test/")) {
        if (url.pathname === "/api/browser-test/ws") {
          return handleBrowserTestWebSocket(request, env);
        }
        return handleBrowserTest(request, env);
      }

      // Test streaming WebSocket routes
      if (url.pathname === "/api/test-streaming/ws") {
        return handleTestStreamingWebSocket(request, env);
      }

      // Logs API routes
      if (url.pathname.startsWith("/api/logs/")) {
        // Check authentication for logs routes
        const authHeader = request.headers.get("Authorization");
        const expectedToken = `Bearer ${env.WORKER_API_KEY}`;
        
        if (!authHeader || authHeader !== expectedToken) {
          console.log(`❌ Logs API authentication failed: ${authHeader ? 'Invalid token' : 'Missing token'}`);
          return new Response(
            JSON.stringify({
              error: "Unauthorized",
              details: "Valid API key required for logs API access",
            }),
            { 
              status: 401,
              headers: { "Content-Type": "application/json" }
            }
          );
        }
        
        console.log(`✅ Logs API authentication successful for ${url.pathname}`);
        return logs.fetch(request, env);
      }

      // Manual crawl endpoint
      if (url.pathname === "/api/crawl" && request.method === "POST") {
        const body = (await request.json()) as {
          url: string;
          site_id?: string;
        };
        if (!body.url) {
          return new Response(JSON.stringify({ error: "URL is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const job = await crawlJob(env, body.url, body.site_id);
        if (job) {
          return new Response(JSON.stringify(job), {
            headers: { "Content-Type": "application/json" },
          });
        } else {
          return new Response(
            JSON.stringify({ error: "Failed to crawl job" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      }

      // Existing cover letter and resume routes
      if (url.pathname === "/api/cover-letter" && request.method === "POST") {
        const body = (await request.json()) as CoverLetterRequestBody;
        if (
          !body.job_title ||
          !body.company_name ||
          !body.job_description_text ||
          !body.candidate_career_summary
        ) {
          return new Response(
            JSON.stringify({
              error: "Missing required fields in request body",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const coverLetterSchema = {
          type: "object",
          properties: {
            salutation: {
              type: "string",
              description:
                'A professional salutation, addressing the hiring manager by name if provided, otherwise using a general title like "Dear Hiring Manager,".',
            },
            opening_paragraph: {
              type: "string",
              description:
                "A compelling opening paragraph that clearly states the position being applied for, where it was seen, and a powerful 1-2 sentence summary of the candidate's fitness for the role, creating immediate interest.",
            },
            body_paragraph_1: {
              type: "string",
              description:
                "The first body paragraph. Connects the candidate's key experiences and skills directly to the most important requirements from the job description. Should highlight 1-2 specific, quantifiable achievements.",
            },
            body_paragraph_2: {
              type: "string",
              description:
                "The second body paragraph. Focuses on the candidate's alignment with the company's mission, culture, or recent projects. Demonstrates genuine interest and shows how the candidate will add value to the team and company goals.",
            },
            closing_paragraph: {
              type: "string",
              description:
                "A strong closing paragraph that reiterates interest in the role, expresses enthusiasm for the opportunity, and includes a clear call to action, such as requesting an interview to discuss their qualifications further.",
            },
          },
          required: [
            "salutation",
            "opening_paragraph",
            "body_paragraph_1",
            "body_paragraph_2",
            "closing_paragraph",
          ],
        };

        const messages = [
          {
            role: "system",
            content:
              "You are an expert career coach and professional cover letter writer. Your task is to generate the content for a compelling, tailored cover letter based on the provided job description and candidate summary. You must strictly adhere to the provided JSON schema for your response, filling in each field with high-quality, relevant content.",
          },
          {
            role: "user",
            content: `Please craft the content for a cover letter with the following details:\n\n- Job Title: ${
              body.job_title
            }\n- Company: ${body.company_name}\n- Hiring Manager: ${
              body.hiring_manager_name || "Not specified"
            }\n\n--- Job Description ---\n${
              body.job_description_text
            }\n\n--- Candidate Career Summary ---\n${
              body.candidate_career_summary
            }\n\nGenerate the response following the required JSON schema.`,
          },
        ];

        const inputs = { messages, guided_json: coverLetterSchema };
        const response = await env.AI.run(env.DEFAULT_MODEL_REASONING, inputs);
        return new Response(JSON.stringify(response), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.pathname === "/api/resume" && request.method === "POST") {
        const body = (await request.json()) as ResumeRequestBody;
        if (
          !body.job_title ||
          !body.company_name ||
          !body.job_description_text ||
          !body.candidate_career_summary
        ) {
          return new Response(
            JSON.stringify({
              error: "Missing required fields in request body",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const resumeSchema = {
          type: "object",
          properties: {
            summary: {
              type: "string",
              description: "Professional summary tailored to the job.",
            },
            experience_bullets: {
              type: "array",
              description:
                "Three concise bullet points highlighting relevant achievements.",
              items: { type: "string" },
            },
            skills: {
              type: "array",
              description: "Key skills relevant to the job description.",
              items: { type: "string" },
            },
          },
          required: ["summary", "experience_bullets", "skills"],
        };

        const messages = [
          {
            role: "system",
            content:
              "You are an expert resume writer. Generate a resume summary, three experience bullet points, and a list of key skills tailored to the job description and candidate background. Use the provided JSON schema.",
          },
          {
            role: "user",
            content: `Generate resume content for the following details:\n\n- Job Title: ${body.job_title}\n- Company: ${body.company_name}\n\n--- Job Description ---\n${body.job_description_text}\n\n--- Candidate Career Summary ---\n${body.candidate_career_summary}\n\nFollow the JSON schema strictly.`,
          },
        ];

        const inputs = { messages, guided_json: resumeSchema };
        const response = await env.AI.run(env.DEFAULT_MODEL_REASONING, inputs);
        return new Response(JSON.stringify(response), {
          headers: { "Content-Type": "application/json" },
        });
      }

      // File management API routes
      if (url.pathname === "/api/files/upload" && request.method === "POST") {
        return handleFileUpload(request, env);
      }

      if (url.pathname === "/api/files/download" && request.method === "GET") {
        return handleFileDownload(request, env);
      }

      if (url.pathname === "/api/files" && request.method === "GET") {
        return handleFileList(request, env);
      }

      if (url.pathname === "/api/files/delete" && request.method === "DELETE") {
        return handleFileDelete(request, env);
      }

      if (
        url.pathname === "/api/files/bulk-delete" &&
        request.method === "POST"
      ) {
        return handleBulkFileDelete(request, env);
      }

      if (url.pathname === "/api/files/stats" && request.method === "GET") {
        return handleStorageStats(request, env);
      }

      if (url.pathname === "/api/files/metadata" && request.method === "GET") {
        return handleFileMetadata(request, env);
      }

      // R2 asset upload for browser rendering tests
      if (url.pathname === "/api/r2/upload" && request.method === "POST") {
        return handleR2AssetUpload(request, env);
      }

      // Embeddings API routes
      if (url.pathname === "/api/embeddings" && request.method === "POST") {
        return handleCreateEmbedding(request, env);
      }

      if (url.pathname.startsWith("/api/embeddings/") && request.method === "PUT") {
        const params = parsePathParams(url.pathname, "/api/embeddings/:uuid");
        if (!params || !params.uuid) {
          return new Response(JSON.stringify({ error: "UUID is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return handleUpdateEmbedding(request, env, params.uuid);
      }

      if (url.pathname.startsWith("/api/embeddings/") && request.method === "DELETE") {
        const params = parsePathParams(url.pathname, "/api/embeddings/:uuid");
        if (!params || !params.uuid) {
          return new Response(JSON.stringify({ error: "UUID is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return handleDeleteEmbedding(request, env, params.uuid);
      }

      if (url.pathname === "/api/embeddings/search" && request.method === "GET") {
        return handleSearchEmbeddings(request, env);
      }

      if (url.pathname.startsWith("/api/embeddings/similar/") && request.method === "GET") {
        const params = parsePathParams(url.pathname, "/api/embeddings/similar/:uuid");
        if (!params || !params.uuid) {
          return new Response(JSON.stringify({ error: "UUID is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return handleSearchByUUID(request, env, params.uuid);
      }

      if (url.pathname === "/api/embeddings/stats" && request.method === "GET") {
        return handleGetEmbeddingStats(request, env);
      }

      if (url.pathname === "/api/embeddings/operations" && request.method === "GET") {
        return handleGetEmbeddingOperations(request, env);
      }

      // RAG API routes
      if (url.pathname === "/api/rag/query" && request.method === "POST") {
        return handleRAGQuery(request, env);
      }

      if (url.pathname === "/api/rag/similar-jobs" && request.method === "POST") {
        return handleFindSimilarJobs(request, env);
      }

      if (url.pathname === "/api/rag/matching-resumes" && request.method === "POST") {
        return handleFindMatchingResumes(request, env);
      }

      if (url.pathname === "/api/rag/cover-letter-suggestions" && request.method === "POST") {
        return handleGenerateCoverLetterSuggestions(request, env);
      }

      if (url.pathname === "/api/rag/job-market-insights" && request.method === "GET") {
        return handleGetJobMarketInsights(request, env);
      }

      if (url.pathname === "/api/rag/search-all" && request.method === "GET") {
        return handleSearchAllContent(request, env);
      }

      if (url.pathname === "/api/rag/analytics" && request.method === "GET") {
        return handleGetRAGAnalytics(request, env);
      }

      if (url.pathname === "/api/rag/queries" && request.method === "GET") {
        return handleGetRAGQueries(request, env);
      }

      // Route not found
      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: unknown) {
      console.error("Error processing request:", error);
      return new Response(
        JSON.stringify({ error: "An internal server error occurred." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },

  /**
   * Email handler for Cloudflare Email Routing.
   * This function will be triggered for incoming emails.
   */
  async email(
    message: ForwardableEmailMessage,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    try {
      console.log(`Email received from: ${message.from}, to: ${message.to}`);

      // Process email directly using AI-powered processing
      const rawEmail = await new Response(message.raw).text();
      const result = await processEmailFromRouting(
        env,
        rawEmail,
        message.from,
        message.to
      );

      if (!result.success) {
        // If processing fails, reject the email to notify the sender.
        message.setReject("Email processing failed");
        console.error("Failed to process email with AI");
      } else {
        console.log(`Email processed successfully: ID ${result.emailId}, Classification: ${result.classification}, Job Links: ${result.jobLinksExtracted}`);
      }
    } catch (error) {
      console.error("Error in email handler:", error);
      message.setReject("An internal error occurred during email processing.");
    }
  },

  /**
   * Scheduled handler for automated job monitoring and email insights.
   * Runs on a cron schedule to monitor jobs and send periodic job reports.
   */
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    console.log("Running scheduled job monitoring and email insights...");

    try {
      // Run daily job monitoring first
      console.log("Starting daily job monitoring...");
      const monitoringResult = await runDailyJobMonitoring(env);
      console.log("Daily monitoring completed:", monitoringResult);

      // Then run email insights
      console.log("Starting email insights...");

      // Get all enabled email configurations
      const result = await env.DB.prepare(
        `
        SELECT * FROM email_configs
        WHERE enabled = 1
        AND (last_sent_at IS NULL OR
             datetime(last_sent_at, '+' || frequency_hours || ' hours') <= datetime('now'))
      `
      ).all();

      const configs = result.results || [];
      console.log(`Found ${configs.length} email configs ready to send`);

      for (const config of configs) {
        try {
          // Generate insights for this config
          const insights = await generateEmailInsights(
            env,
            config as unknown as EmailConfig
          );

          // Send the email
          const emailSent = await sendInsightsEmail(
            insights,
            config as unknown as EmailConfig,
            env
          );

          if (emailSent) {
            // Update last sent timestamp
            await env.DB.prepare(
              `
              UPDATE email_configs SET last_sent_at = CURRENT_TIMESTAMP WHERE id = ?
            `
            )
              .bind(config.id)
              .run();

            console.log(
              `Email insights sent successfully to ${config.recipient_email}`
            );
          } else {
            console.error(
              `Failed to send email insights to ${config.recipient_email}`
            );
          }
        } catch (error) {
          console.error(`Error processing email config ${config.id}:`, error);
        }
      }

      console.log("Scheduled task completed successfully");
    } catch (error) {
      console.error("Error in scheduled task:", error);
    }
  },
};
