import type { Env } from "../../../config/env/env.config";

type DurableObjectState = any;

export class SiteCrawler {
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

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

      if (path === "/process-job-url" && req.method === "POST") {
        return await this.processJobUrl(req);
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

    await this.state.storage.put("current_site_id", site_id);
    await this.state.storage.put("base_url", base_url);
    await this.state.storage.put("last_activity", new Date().toISOString());
    await this.state.storage.put("status", "discovering");

    const { discoverJobUrls } = await import("../../../lib/crawl");
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

    const batchUrls = urls.slice(crawledCount, crawledCount + batch_size);

    const { crawlJobs } = await import("../../../lib/crawl");
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

  private async processJobUrl(req: Request): Promise<Response> {
    const { urls, source, source_id, metadata } = (await req.json()) as {
      urls: string[];
      source: string;
      source_id?: string;
      metadata?: Record<string, any>;
    };

    try {
      console.log(`🔗 Processing ${urls.length} job URLs from ${source}...`);

      // Use the new generic job processing service
      const { submitJobUrlsForProcessing } = await import("../../../lib/job-processing");
      const result = await submitJobUrlsForProcessing(this.env, {
        urls,
        source,
        source_id,
        metadata,
      });

      // Update email_job_links table if this is from email processing
      if (source === "email" && source_id) {
        for (const urlResult of result.results) {
          const status = urlResult.success ? "completed" : "failed";
          const jobId = urlResult.success ? urlResult.job_id : null;
          const error = urlResult.success ? null : urlResult.error;

          await this.env.DB.prepare(
            `
            UPDATE email_job_links 
            SET status = ?, job_id = ?, processing_error = ?, updated_at = ?
            WHERE email_id = ? AND job_url = ?
          `
          )
            .bind(
              status,
              jobId,
              error,
              new Date().toISOString(),
              source_id,
              urlResult.url
            )
            .run();
        }
      }

      console.log(
        `✅ Job processing completed: ${result.processed_count} successful, ${result.failed_count} failed`
      );

      return new Response(
        JSON.stringify({
          success: result.success,
          processed_count: result.processed_count,
          failed_count: result.failed_count,
          results: result.results,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error(`❌ Error processing job URLs:`, error);

      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          processed_count: 0,
          failed_count: urls.length,
          results: urls.map((url) => ({
            url,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          })),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
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
