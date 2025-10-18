/**
 * Discovery Workflow
 *
 * Workflow for discovering job postings from websites using various strategies.
 * Handles sitemap parsing, page crawling, and job URL extraction.
 */

import type { Env } from "../../../config/env";
import type {
  DiscoveryWorkflowConfig,
  WorkflowResult,
} from "../types/workflow.types";

export class DiscoveryWorkflow {
  constructor(private env: Env) {}

  /**
   * Execute the discovery workflow
   */
  async execute(config: DiscoveryWorkflowConfig): Promise<WorkflowResult> {
    const startTime = Date.now();
    const steps = [];
    const errors = [];
    const warnings: string[] = [];

    try {
      // Step 1: Validate site configuration
      steps.push("validating_site_config");
      const site = await this.validateSiteConfig(config.site_id);
      if (!site) {
        throw new Error(`Site not found: ${config.site_id}`);
      }

      // Step 2: Determine discovery strategy
      steps.push("determining_strategy");
      const strategy = config.discovery_strategy || "sitemap";

      // Step 3: Execute discovery based on strategy
      steps.push("executing_discovery");
      let discoveredUrls: string[] = [];

      switch (strategy) {
        case "sitemap":
          discoveredUrls = await this.discoverFromSitemap(site, config);
          break;
        case "list":
          discoveredUrls = await this.discoverFromList(site, config);
          break;
        case "search":
          discoveredUrls = await this.discoverFromSearch(site, config);
          break;
        case "custom":
          discoveredUrls = await this.discoverFromCustom(site, config);
          break;
        default:
          throw new Error(`Unknown discovery strategy: ${strategy}`);
      }

      // Step 4: Filter and validate URLs
      steps.push("filtering_urls");
      const validUrls = await this.filterValidUrls(discoveredUrls, config);

      // Step 5: Extract job information
      steps.push("extracting_job_info");
      const jobData = await this.extractJobInformation(validUrls, config);

      // Step 6: Store results
      steps.push("storing_results");
      await this.storeDiscoveryResults(config.site_id, jobData);

      const duration = Date.now() - startTime;

      return {
        success: true,
        data: {
          discovered_urls: discoveredUrls.length,
          valid_urls: validUrls.length,
          job_data: jobData.length,
          strategy,
          duration_ms: duration,
        },
        metrics: {
          duration_ms: duration,
          steps_completed: steps.length,
          steps_failed: 0,
          resources_used: {
            urls_processed: discoveredUrls.length,
            jobs_extracted: jobData.length,
          },
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      return {
        success: false,
        errors: [errorMessage],
        warnings: warnings,
        metrics: {
          duration_ms: duration,
          steps_completed: steps.length,
          steps_failed: 1,
          resources_used: {},
        },
      };
    }
  }

  /**
   * Validate site configuration
   */
  private async validateSiteConfig(siteId: string): Promise<any> {
    const site = await this.env.DB.prepare(
      `
      SELECT * FROM sites WHERE id = ?
    `
    )
      .bind(siteId)
      .first();

    return site;
  }

  /**
   * Discover URLs from sitemap
   */
  private async discoverFromSitemap(
    site: any,
    config: DiscoveryWorkflowConfig
  ): Promise<string[]> {
    const sitemapUrl = site.sitemap_url;
    if (!sitemapUrl) {
      throw new Error("No sitemap URL configured for site");
    }

    // Use browser rendering to fetch sitemap
    const browser = await this.env.MYBROWSER.launch();
    const page = await browser.newPage();

    try {
      await page.goto(sitemapUrl);
      const content = await page.content();

      // Parse sitemap XML
      const urls = await this.parseSitemapXml(content);
      return urls;
    } finally {
      await browser.close();
    }
  }

  /**
   * Discover URLs from list page
   */
  private async discoverFromList(
    site: any,
    config: DiscoveryWorkflowConfig
  ): Promise<string[]> {
    const browser = await this.env.MYBROWSER.launch();
    const page = await browser.newPage();

    try {
      await page.goto(site.base_url);
      const content = await page.content();

      // Extract URLs using custom selectors or default patterns
      const urls = await this.extractUrlsFromPage(
        content,
        config.custom_selectors
      );
      return urls;
    } finally {
      await browser.close();
    }
  }

  /**
   * Discover URLs from search
   */
  private async discoverFromSearch(
    site: any,
    config: DiscoveryWorkflowConfig
  ): Promise<string[]> {
    // This would typically involve searching for job-related terms
    // and extracting URLs from search results
    const searchTerms = ["jobs", "careers", "employment", "opportunities"];
    const urls: string[] = [];

    for (const term of searchTerms) {
      const searchUrl = `${site.base_url}/search?q=${encodeURIComponent(term)}`;

      const browser = await this.env.MYBROWSER.launch();
      const page = await browser.newPage();

      try {
        await page.goto(searchUrl);
        const content = await page.content();
        const foundUrls = await this.extractUrlsFromPage(
          content,
          config.custom_selectors
        );
        urls.push(...foundUrls);
      } finally {
        await browser.close();
      }
    }

    return urls;
  }

  /**
   * Discover URLs using custom method
   */
  private async discoverFromCustom(
    site: any,
    config: DiscoveryWorkflowConfig
  ): Promise<string[]> {
    // Custom discovery logic would go here
    // This could involve API calls, custom scraping logic, etc.
    return [];
  }

  /**
   * Parse sitemap XML content
   */
  private async parseSitemapXml(content: string): Promise<string[]> {
    // Simple XML parsing to extract URLs
    // In a real implementation, you'd use a proper XML parser
    const urlRegex = /<loc>(.*?)<\/loc>/g;
    const urls: string[] = [];
    let match;

    while ((match = urlRegex.exec(content)) !== null) {
      urls.push(match[1]!);
    }

    return urls;
  }

  /**
   * Extract URLs from page content
   */
  private async extractUrlsFromPage(
    content: string,
    customSelectors?: Record<string, string>
  ): Promise<string[]> {
    // This would use browser rendering to extract URLs
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Filter valid URLs
   */
  private async filterValidUrls(
    urls: string[],
    config: DiscoveryWorkflowConfig
  ): Promise<string[]> {
    // Filter URLs based on job-related patterns
    const jobPatterns = [
      /job/i,
      /career/i,
      /employment/i,
      /position/i,
      /opening/i,
    ];

    return urls.filter((url) => {
      return jobPatterns.some((pattern) => pattern.test(url));
    });
  }

  /**
   * Extract job information from URLs
   */
  private async extractJobInformation(
    urls: string[],
    config: DiscoveryWorkflowConfig
  ): Promise<any[]> {
    const jobData = [];

    for (const url of urls.slice(0, config.max_pages || 100)) {
      try {
        const browser = await this.env.MYBROWSER.launch();
        const page = await browser.newPage();

        try {
          await page.goto(url);
          const content = await page.content();

          // Extract job information using AI
          const jobInfo = await this.extractJobInfoWithAI(content, url);
          if (jobInfo) {
            jobData.push(jobInfo);
          }
        } finally {
          await browser.close();
        }

        // Add delay between requests
        if (config.delay_between_requests_ms) {
          await new Promise((resolve) =>
            setTimeout(resolve, config.delay_between_requests_ms)
          );
        }
      } catch (error) {
        console.error(`Error processing URL ${url}:`, error);
      }
    }

    return jobData;
  }

  /**
   * Extract job information using AI
   */
  private async extractJobInfoWithAI(
    content: string,
    url: string
  ): Promise<any> {
    try {
      const response = await this.env.AI.run(
        this.env.DEFAULT_MODEL_REASONING as keyof AiModels,
        {
          messages: [
            {
              role: "system",
              content:
                "Extract job information from the provided HTML content. Return a JSON object with title, company, location, description, and other relevant fields.",
            },
            {
              role: "user",
              content: `Extract job information from this HTML content:\n\n${content}`,
            },
          ],
          response_format: {
            type: "json_object",
          },
        }
      );

      const jobInfo = JSON.parse(response.response as string);
      return {
        ...jobInfo,
        url,
        extracted_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error extracting job info with AI:", error);
      return null;
    }
  }

  /**
   * Store discovery results
   */
  private async storeDiscoveryResults(
    siteId: string,
    jobData: any[]
  ): Promise<void> {
    for (const job of jobData) {
      try {
        await this.env.DB.prepare(
          `
          INSERT OR REPLACE INTO jobs (
            id, site_id, url, title, company, location, description, 
            status, first_seen_at, last_crawled_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'), datetime('now'))
        `
        )
          .bind(
            crypto.randomUUID(),
            siteId,
            job.url,
            job.title,
            job.company,
            job.location,
            job.description,
            "open"
          )
          .run();
      } catch (error) {
        console.error("Error storing job data:", error);
      }
    }
  }
}
