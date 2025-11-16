/**
 * @module src/domains/scraping/services/company-scraping.service.ts
 * @description
 * Service for scraping company career pages using Cloudflare Browser Rendering API.
 */

import { z } from "zod";
import { CompanyService } from "./company.service";
import { ScrapeQueueService } from "./scrape-queue.service";

export interface BrowserRenderingEnv {
  DB: D1Database;
  MYBROWSER: Fetcher;
  AI: any; // Workers AI binding
  DEFAULT_MODEL_WEB_BROWSER: keyof AiModels;
  CF_API_TOKEN?: string;
}

export const JobScrapingSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  employment_type: z.string().optional(),
  department: z.string().optional(),
  salary_min: z.number().optional(),
  salary_max: z.number().optional(),
  salary_currency: z.string().optional(),
  description: z.string(),
  requirements: z.string().optional(),
  posted_at: z.string().optional(),
  application_url: z.string(),
});

export type JobScrapingResult = z.infer<typeof JobScrapingSchema>;

export const ScrapingStatusSchema = z.object({
  company_id: z.string(),
  careers_url: z.string(),
  scraped_at: z.string(),
  job_links_found: z.number(),
  jobs_scraped: z.number(),
  jobs_queued: z.number(),
  errors: z.array(z.string()),
});

export type ScrapingStatus = z.infer<typeof ScrapingStatusSchema>;

export class CompanyScrapingService {
  private env: BrowserRenderingEnv;
  private companyService: CompanyService;
  private scrapeQueueService: ScrapeQueueService;

  constructor(env: BrowserRenderingEnv) {
    this.env = env;
    this.companyService = new CompanyService(env);
    this.scrapeQueueService = new ScrapeQueueService(env);
  }

  /**
   * Scrape a specific company's career page.
   */
  async scrapeCompanyCareers(companyId: string): Promise<ScrapingStatus> {
    const company = await this.companyService.getCompany(companyId);
    if (!company) {
      throw new Error(`Company ${companyId} not found`);
    }

    if (!company.careers_url) {
      throw new Error(`Company ${company.name} has no careers URL configured`);
    }

    const status: ScrapingStatus = {
      company_id: companyId,
      careers_url: company.careers_url,
      scraped_at: new Date().toISOString(),
      job_links_found: 0,
      jobs_scraped: 0,
      jobs_queued: 0,
      errors: [],
    };

    try {
      // Step 1: Get all links from the career page
      const links = await this.getCareerPageLinks(company.careers_url);
      status.job_links_found = links.length;

      // Step 2: Filter for job-related links
      const jobLinks = this.filterJobLinks(links, company.careers_url);

      // Step 3: Scrape each job page
      for (const jobLink of jobLinks) {
        try {
          const jobData = await this.scrapeJobPage(jobLink, company);
          if (jobData) {
            await this.queueJobForProcessing(jobData);
            status.jobs_scraped++;
            status.jobs_queued++;
          }
        } catch (error) {
          status.errors.push(
            `Failed to scrape job ${jobLink}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    } catch (error) {
      status.errors.push(
        `Failed to scrape career page: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    return status;
  }

  /**
   * Scrape all companies that have careers URLs configured.
   */
  async scrapeAllCompanies(): Promise<{
    total_companies: number;
    scraped_companies: number;
    total_jobs_queued: number;
    results: ScrapingStatus[];
  }> {
    const companies = await this.companyService.getCompaniesWithCareersUrls();
    const results: ScrapingStatus[] = [];
    let totalJobsQueued = 0;

    for (const company of companies) {
      try {
        const status = await this.scrapeCompanyCareers(company.id);
        results.push(status);
        totalJobsQueued += status.jobs_queued;
      } catch (error) {
        results.push({
          company_id: company.id,
          careers_url: company.careers_url!,
          scraped_at: new Date().toISOString(),
          job_links_found: 0,
          jobs_scraped: 0,
          jobs_queued: 0,
          errors: [
            `Failed to scrape company: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ],
        });
      }
    }

    return {
      total_companies: companies.length,
      scraped_companies: results.filter((r) => r.errors.length === 0).length,
      total_jobs_queued: totalJobsQueued,
      results,
    };
  }

  /**
   * Get scraping status for a company.
   */
  async getScrapingStatus(companyId: string): Promise<ScrapingStatus | null> {
    // This would typically query a scraping history table
    // For now, return null as we don't have persistent status tracking
    return null;
  }

  /**
   * Get all links from a career page using Browser Rendering API.
   */
  private async getCareerPageLinks(careersUrl: string): Promise<string[]> {
    const response = await this.env.MYBROWSER.fetch(
      "https://api.cloudflare.com/client/v4/accounts/CF_ACCOUNT_ID/browser-rendering/links",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.env.CF_API_TOKEN || "dummy-token"}`,
        },
        body: JSON.stringify({
          url: careersUrl,
          visibleLinksOnly: true, // Only get visible links
          excludeExternalLinks: true, // Stay within the same domain
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Browser Rendering API error: ${response.status}`);
    }

    const data = (await response.json()) as any;
    return data.result || [];
  }

  /**
   * Filter links to find job-related URLs.
   */
  private filterJobLinks(links: string[], careersUrl: string): string[] {
    const careersDomain = new URL(careersUrl).hostname;

    return links.filter((link) => {
      try {
        const url = new URL(link);
        // Must be on the same domain
        if (url.hostname !== careersDomain) return false;

        const path = url.pathname.toLowerCase();
        const search = url.search.toLowerCase();

        // Common job page patterns
        const jobPatterns = [
          /\/jobs?\//,
          /\/careers?\/.*job/i,
          /\/positions?\//,
          /\/openings?\//,
          /\/vacancies?\//,
          /\/employment\//,
          /\/job-details?/,
          /\/position-details?/,
        ];

        // Check path patterns
        if (jobPatterns.some((pattern) => pattern.test(path))) return true;

        // Check query parameters for job IDs
        if (search.includes("jobid=") || search.includes("job_id="))
          return true;
        if (search.includes("position=") || search.includes("positionid="))
          return true;

        return false;
      } catch {
        return false; // Invalid URL
      }
    });
  }

  /**
   * Scrape an individual job page using Browser Rendering API.
   */
  private async scrapeJobPage(
    jobUrl: string,
    company: any
  ): Promise<JobScrapingResult | null> {
    try {
      const response = await this.env.MYBROWSER.fetch(
        "https://api.cloudflare.com/client/v4/accounts/CF_ACCOUNT_ID/browser-rendering/json",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.env.CF_API_TOKEN || "dummy-token"}`,
          },
          body: JSON.stringify({
            url: jobUrl,
            prompt:
              "Extract the job posting details including title, company, location, salary, description, requirements, and application information.",
            response_format: {
              type: "json_schema",
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  company: { type: "string" },
                  location: { type: "string" },
                  employment_type: {
                    type: "string",
                    enum: [
                      "full-time",
                      "part-time",
                      "contract",
                      "temporary",
                      "internship",
                    ],
                  },
                  department: { type: "string" },
                  salary_min: { type: "number" },
                  salary_max: { type: "number" },
                  salary_currency: { type: "string", default: "USD" },
                  description: { type: "string" },
                  requirements: { type: "string" },
                  posted_at: { type: "string" },
                  application_url: { type: "string" },
                },
                required: ["title", "description", "application_url"],
              },
            },
          }),
        }
      );

      if (!response.ok) {
        console.error(
          `Browser Rendering API error for ${jobUrl}: ${response.status}`
        );
        return null;
      }

      const data = (await response.json()) as any;
      const jobData = JobScrapingSchema.parse(data.result);

      // Override company name with our known company
      jobData.company = company.name;
      jobData.application_url = jobUrl;

      return jobData;
    } catch (error) {
      console.error(`Failed to scrape job page ${jobUrl}:`, error);
      return null;
    }
  }

  /**
   * Queue a scraped job for processing in the normal job processing pipeline.
   */
  private async queueJobForProcessing(
    jobData: JobScrapingResult
  ): Promise<void> {
    await this.scrapeQueueService.enqueue({
      job_url: jobData.application_url,
      source: "company-careers",
      company: jobData.company,
      title: jobData.title,
      location: jobData.location,
      employment_type: jobData.employment_type,
      department: jobData.department,
      salary_min: jobData.salary_min,
      salary_max: jobData.salary_max,
      salary_currency: jobData.salary_currency,
      description: jobData.description,
      requirements: jobData.requirements,
      posted_at: jobData.posted_at,
      metadata: JSON.stringify({
        scraped_via: "company-careers-api",
        scraped_at: new Date().toISOString(),
      }),
    });
  }
}
