/**
 * @module src/domains/workflows/workflow-classes/company-careers-scraping-workflow.ts
 * @description
 * Scheduled workflow for scraping company career pages using Browser Rendering API.
 */

import {
  WorkflowEntrypoint,
  WorkflowEvent,
  WorkflowStep,
} from "cloudflare:workers";
import { CompanyScrapingService } from "../../scraping/services/company-scraping.service";

type Env = {
  DB: D1Database;
  MYBROWSER: Fetcher;
  AI: any;
  DEFAULT_MODEL_WEB_BROWSER: keyof AiModels;
  VECTORIZE_INDEX: any;
  R2: R2Bucket;
};

type Params = {
  schedule?: string; // Cron schedule (optional, defaults to daily)
  maxCompanies?: number; // Maximum companies to scrape per run
  companyIds?: string[]; // Specific company IDs to scrape (optional)
};

export class CompanyCareersScrapingWorkflow extends WorkflowEntrypoint<
  Env,
  Params
> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const params = event.payload || {};
    const schedule = params.schedule || "0 2 * * *"; // Default: daily at 2 AM
    const maxCompanies = params.maxCompanies || 50;
    const specificCompanyIds = params.companyIds;

    // Step 1: Get companies to scrape
    const companiesToScrape = await step.do(
      "get-companies-to-scrape",
      async () => {
        const service = new CompanyScrapingService(this.env);

        if (specificCompanyIds && specificCompanyIds.length > 0) {
          // Scrape specific companies
          return specificCompanyIds.slice(0, maxCompanies);
        } else {
          // Get all companies with careers URLs
          const companies = await this.env.DB.prepare(
            `SELECT id FROM companies WHERE careers_url IS NOT NULL AND careers_url != '' ORDER BY updated_at ASC LIMIT ?`
          )
            .bind(maxCompanies)
            .all();

          return companies.results?.map((row) => (row as any).id) || [];
        }
      }
    );

    if (companiesToScrape.length === 0) {
      console.log("No companies to scrape");
      return { success: true, companies_scraped: 0, jobs_queued: 0 };
    }

    // Step 2: Scrape each company
    const scrapingResults = await step.do("scrape-companies", async () => {
      const service = new CompanyScrapingService(this.env);
      const results = [];

      for (const companyId of companiesToScrape) {
        try {
          console.log(`Scraping company ${companyId}`);
          const result = await service.scrapeCompanyCareers(companyId);
          results.push(result);

          // Small delay between companies to be respectful
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Failed to scrape company ${companyId}:`, error);
          results.push({
            company_id: companyId,
            careers_url: "",
            scraped_at: new Date().toISOString(),
            job_links_found: 0,
            jobs_scraped: 0,
            jobs_queued: 0,
            errors: [
              `Scraping failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            ],
          });
        }
      }

      return results;
    });

    // Step 3: Aggregate results and log summary
    const summary = await step.do("aggregate-results", async () => {
      const totalCompanies = scrapingResults.length;
      const successfulCompanies = scrapingResults.filter(
        (r) => r.errors.length === 0
      ).length;
      const totalJobsQueued = scrapingResults.reduce(
        (sum, r) => sum + r.jobs_queued,
        0
      );
      const totalErrors = scrapingResults.reduce(
        (sum, r) => sum + r.errors.length,
        0
      );

      console.log(`Company careers scraping completed:`, {
        total_companies: totalCompanies,
        successful_companies: successfulCompanies,
        total_jobs_queued: totalJobsQueued,
        total_errors: totalErrors,
      });

      return {
        success: totalErrors === 0,
        total_companies: totalCompanies,
        successful_companies: successfulCompanies,
        total_jobs_queued: totalJobsQueued,
        total_errors: totalErrors,
        results: scrapingResults,
      };
    });

    // Step 4: Schedule next run (if this was a cron job)
    if (!specificCompanyIds) {
      await step.do("schedule-next-run", async () => {
        // Schedule the next run based on the cron schedule
        // This would be handled by the workflow system
        console.log(`Next run scheduled with cron: ${schedule}`);
      });
    }

    return summary;
  }
}
