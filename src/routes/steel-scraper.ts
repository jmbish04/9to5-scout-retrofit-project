/**
 * @file This file contains all API routes and logic for job scraping using the Steel SDK within the 9to5-Scout platform. It provides a comprehensive REST API for discovering, searching, and extracting job postings from multiple job sites including LinkedIn, Indeed, Monster, and Cloudflare Careers.
 *
 * Key Components:
 * - `GET /sites`: Retrieves available job sites from the D1 database with Steel SDK metadata and capabilities
 * - `POST /search/:site`: Searches for job URLs on a specific site using validated search parameters
 * - `POST /scrape/:site`: Performs batch job scraping with HTML, screenshot, and PDF capture
 * - `POST /scrape-job/:site`: Scrapes a single job by URL with full content extraction
 * - `POST /bulk-scrape`: Executes multi-site job scraping with parallel processing
 * - `GET /status`: Returns scraper status, supported sites, and feature information
 *
 * Dependencies:
 * - Steel SDK for multi-platform job scraping and browser automation
 * - D1 Database for site configuration management and job data storage
 * - R2 Storage for HTML, screenshot, and PDF content persistence
 * - Zod validation schemas for request/response type safety
 * - Hono framework for lightweight HTTP routing and middleware
 *
 * This module is a critical component of the job discovery pipeline, providing the primary interface
 * for automated job data collection and storage within the 9to5-Scout ecosystem.
 */

import { Context, Hono } from "hono";
import { z } from "zod";
import { insertJob, insertSnapshot } from "../lib/d1-utils";
import {
  cors,
  errorHandler,
  logger,
  rateLimit,
  validateBody,
  validateParams,
} from "../lib/hono-validation";
import { JobSite, createJobScraper, type SteelEnv } from "../lib/steel";
import {
  BulkScrapeRequestSchema,
  JobSiteSchema,
  ScrapeJobRequestSchema,
  ScrapeJobsRequestSchema,
  SearchJobsRequestSchema,
  type BulkScrapeRequest,
  type BulkScrapeResponse,
  type BulkScrapeResult,
  type ErrorResponse,
  type ScrapeJobRequest,
  type ScrapeJobsRequest,
  type SearchJobsRequest,
} from "../lib/validation";

// Database types
interface DBSite {
  id: string;
  name: string;
  base_url: string;
  robots_txt: string | null;
  sitemap_url: string | null;
  discovery_strategy: "sitemap" | "list" | "search" | "custom";
  last_discovered_at: string | null;
  created_at: string;
  updated_at?: string;
}

interface SiteWithMetadata {
  id: string;
  name: string;
  baseUrl: string;
  discoveryStrategy: string;
  robotsTxt: string | null;
  sitemapUrl: string | null;
  lastDiscoveredAt: string | null;
  requiresAuth: boolean;
  isSteelSupported: boolean;
  createdAt: string;
}

// Define the Hono context type with proper bindings and custom variables
type HonoContext = Context<{
  Bindings: SteelEnv;
  Variables: {
    validatedParams: Record<string, unknown>;
    validatedBody: Record<string, unknown>;
    validatedQuery: Record<string, unknown>;
  };
}>;

const app = new Hono<{
  Bindings: SteelEnv;
  Variables: {
    validatedParams: Record<string, unknown>;
    validatedBody: Record<string, unknown>;
    validatedQuery: Record<string, unknown>;
  };
}>();

// Apply global middleware
app.use("*", cors());
app.use("*", logger());
app.use("*", rateLimit(100)); // 100 requests per minute
app.use("*", errorHandler());

/**
 * Retrieves all available job sites from the D1 database with comprehensive metadata including Steel SDK capabilities.
 *
 * This endpoint serves as the primary source of truth for available job scraping targets. It queries the D1 database
 * to retrieve site configurations and enriches them with Steel SDK metadata such as authentication requirements
 * and supported features. The response includes both database-stored site information and real-time Steel SDK
 * compatibility status, providing clients with complete information needed for job scraping operations.
 *
 * The endpoint performs two main operations:
 * 1. Queries the D1 database for all configured sites with their discovery strategies and metadata
 * 2. Cross-references with Steel SDK to determine current support status and capabilities
 *
 * @param c - The Hono context containing environment bindings and request information
 * @returns A JSON response containing an array of site objects with metadata, Steel SDK support status, and timestamp
 * @throws Will throw an error if database connection fails or Steel SDK initialization fails
 * @example
 * GET /api/steel-scraper/sites
 *
 * Response:
 * {
 *   "sites": [
 *     {
 *       "id": "linkedin",
 *       "name": "LinkedIn",
 *       "baseUrl": "https://www.linkedin.com",
 *       "discoveryStrategy": "search",
 *       "requiresAuth": true,
 *       "isSteelSupported": true,
 *       "createdAt": "2024-01-01T00:00:00.000Z"
 *     }
 *   ],
 *   "steelSupportedSites": ["linkedin", "indeed", "monster"],
 *   "timestamp": "2024-01-01T00:00:00.000Z"
 * }
 */
app.get("/sites", async (c: HonoContext) => {
  try {
    // Query the D1 database to retrieve all configured job sites with their metadata.
    // We order by name to ensure consistent response ordering for client applications.
    // This provides the authoritative source of truth for available scraping targets.
    const dbSites = await c.env.DB.prepare(
      "SELECT * FROM sites ORDER BY name"
    ).all();

    // Initialize the Steel SDK scraper to obtain real-time capability information.
    // This allows us to cross-reference database-stored sites with actual Steel SDK support,
    // providing clients with accurate information about which sites are currently functional.
    const scraper = createJobScraper(c.env.STEEL_API_KEY, c.env);
    const steelSites = scraper.getAvailableSites();

    // Transform database site records into enriched metadata objects that combine
    // database-stored configuration with real-time Steel SDK capability information.
    // This provides clients with comprehensive site information needed for scraping decisions.
    const response = {
      sites: (dbSites.results as unknown as DBSite[]).map(
        (site: DBSite): SiteWithMetadata => {
          // Retrieve Steel SDK configuration for this specific site to determine
          // authentication requirements and other capabilities that aren't stored in the database.
          const steelConfig = scraper.getSiteConfig(site.id as JobSite);

          // Build a comprehensive site metadata object that combines database information
          // with Steel SDK capabilities, providing clients with all necessary information
          // for making informed scraping decisions and understanding site requirements.
          return {
            id: site.id,
            name: site.name,
            baseUrl: site.base_url,
            discoveryStrategy: site.discovery_strategy,
            robotsTxt: site.robots_txt,
            sitemapUrl: site.sitemap_url,
            lastDiscoveredAt: site.last_discovered_at,
            requiresAuth: steelConfig?.requiresAuth || false,
            isSteelSupported: steelSites.includes(site.id as JobSite),
            createdAt: site.created_at,
          };
        }
      ),
      // Include the raw list of Steel SDK supported sites for clients that need
      // to perform their own filtering or validation logic.
      steelSupportedSites: steelSites,
      // Add timestamp for cache invalidation and monitoring purposes.
      timestamp: new Date().toISOString(),
    };

    return c.json(response);
  } catch (error) {
    console.error("Failed to get sites:", error);
    const errorResponse: ErrorResponse = {
      error: "Failed to retrieve job sites",
      details: error instanceof Error ? error.message : "Unknown error",
    };
    return c.json(errorResponse, 500);
  }
});

/**
 * Searches for job postings on a specific job site using validated search parameters and optional authentication.
 *
 * This endpoint performs job discovery by executing search queries against the specified job site using the Steel SDK.
 * It validates that the target site exists in the D1 database before attempting to search, ensuring data consistency
 * and preventing operations on unconfigured sites. The search process includes authentication handling for sites that
 * require login credentials, rate limiting protection, and comprehensive error handling.
 *
 * The search operation follows this workflow:
 * 1. Validates the site parameter against the JobSite enum and checks database existence
 * 2. Initializes the Steel SDK scraper with optional authentication credentials
 * 3. Executes the search using the provided search parameters (keywords, location, filters)
 * 4. Returns a list of discovered job URLs with metadata
 * 5. Performs cleanup to release browser resources
 *
 * @param c - The Hono context containing validated parameters, request body, and environment bindings
 * @returns A JSON response containing the site ID, discovered job URLs, count, and timestamp
 * @throws Will throw a 404 error if the specified site is not found in the database
 * @throws Will throw a 500 error if Steel SDK initialization fails or search execution fails
 * @example
 * POST /api/steel-scraper/search/linkedin
 *
 * Request Body:
 * {
 *   "searchParams": {
 *     "keywords": "software engineer",
 *     "location": "San Francisco",
 *     "employmentType": "full-time",
 *     "remote": true
 *   },
 *   "credentials": {
 *     "email": "user@example.com",
 *     "password": "password123"
 *   }
 * }
 *
 * Response:
 * {
 *   "site": "linkedin",
 *   "jobUrls": [
 *     "https://linkedin.com/jobs/view/123456",
 *     "https://linkedin.com/jobs/view/789012"
 *   ],
 *   "count": 2,
 *   "timestamp": "2024-01-01T00:00:00.000Z"
 * }
 */
app.post(
  "/search/:site",
  validateParams(z.object({ site: JobSiteSchema })),
  validateBody(SearchJobsRequestSchema),
  async (c: HonoContext) => {
    // Get validated data from context - TypeScript safe access
    const validatedParams = c.get("validatedParams") as { site: JobSite };
    const validatedBody = c.get("validatedBody") as SearchJobsRequest;
    const { site } = validatedParams;
    const { searchParams, credentials } = validatedBody;

           // Initialize the Steel SDK scraper instance using the API key from environment variables.
           // This creates a fresh scraper instance for this specific search operation to ensure
           // clean state and proper resource management.
           const scraper = createJobScraper(c.env.STEEL_API_KEY, c.env);

    try {
      // Perform database validation to ensure the requested site is properly configured
      // and available for scraping operations. This prevents attempts to scrape unconfigured
      // or non-existent sites, maintaining data consistency and preventing runtime errors.
      const siteRecord = await c.env.DB.prepare(
        "SELECT * FROM sites WHERE id = ?"
      )
        .bind(site)
        .first();

      // If the site is not found in the database, return a 404 error with detailed information.
      // This ensures clients receive clear feedback about configuration issues rather than
      // cryptic Steel SDK errors that might occur later in the process.
      if (!siteRecord) {
        const errorResponse: ErrorResponse = {
          error: "Site not found",
          details: `Site '${site}' is not configured in the database`,
        };
        return c.json(errorResponse, 404);
      }

      // Prepare authentication credentials for sites that require login.
      // The credentials object includes the site ID to match Steel SDK expectations,
      // and we only pass credentials if they were provided in the request.
      const siteCredentials = credentials
        ? { ...credentials, site }
        : undefined;

             // Initialize the Steel SDK scraper with the target site and optional credentials.
             // This sets up browser automation and authentication state needed for job searching.
             await scraper.initialize(site, siteCredentials, c.env);

      // Execute the job search using the Steel SDK with the validated search parameters.
      // This performs the actual job discovery by querying the target site's search interface
      // and returning a list of discovered job URLs for further processing.
      const jobUrls = await scraper.searchJobs(site, searchParams);

      // Perform cleanup to release browser resources and prevent memory leaks.
      // This is critical for maintaining performance in a serverless environment where
      // resources are shared across multiple requests.
      await scraper.cleanup();

      return c.json({
        site,
        jobUrls,
        count: jobUrls.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Job search failed:", error);
      await scraper.cleanup();

      const errorResponse: ErrorResponse = {
        error: "Job search failed",
        details: error instanceof Error ? error.message : "Unknown error",
      };
      return c.json(errorResponse, 500);
    }
  }
);

/**
 * Performs comprehensive job scraping from a specific site with batch processing and database storage.
 *
 * This endpoint executes a complete job scraping workflow that includes job discovery, content extraction,
 * and persistent storage. It searches for jobs using the provided search parameters, then scrapes each
 * discovered job to extract detailed information including HTML content, screenshots, and PDF captures.
 * All scraped data is stored in the D1 database with associated snapshots for future analysis.
 *
 * The scraping process follows this comprehensive workflow:
 * 1. Validates the site exists in the database and initializes the Steel SDK scraper
 * 2. Executes job search using validated search parameters with optional authentication
 * 3. Processes jobs in configurable batches to manage memory and performance
 * 4. For each job, extracts detailed information including title, company, location, salary, and description
 * 5. Captures HTML content, screenshots, and generates PDF versions for archival purposes
 * 6. Stores job data and snapshots in the D1 database with proper error handling
 * 7. Returns comprehensive results including success counts and stored job metadata
 *
 * Side Effects:
 * - Creates new records in the 'jobs' table with extracted job information
 * - Creates new records in the 'snapshots' table with content captures
 * - Uploads HTML, screenshot, and PDF content to R2 storage
 * - May trigger browser automation and network requests to job sites
 *
 * @param c - The Hono context containing validated parameters, request body, and environment bindings
 * @returns A JSON response containing scraping results, job counts, and stored job metadata
 * @throws Will throw a 404 error if the specified site is not found in the database
 * @throws Will throw a 500 error if Steel SDK initialization fails or scraping execution fails
 * @example
 * POST /api/steel-scraper/scrape/indeed
 *
 * Request Body:
 * {
 *   "searchParams": {
 *     "keywords": "react developer",
 *     "location": "New York",
 *     "employmentType": "full-time",
 *     "salaryMin": 80000
 *   },
 *   "batchSize": 5,
 *   "credentials": {
 *     "email": "user@example.com",
 *     "password": "password123"
 *   }
 * }
 *
 * Response:
 * {
 *   "site": "indeed",
 *   "totalFound": 15,
 *   "totalScraped": 12,
 *   "results": [
 *     {
 *       "jobId": "job_123456",
 *       "title": "Senior React Developer",
 *       "company": "Tech Corp",
 *       "location": "New York, NY",
 *       "url": "https://indeed.com/viewjob?jk=123456",
 *       "snapshotId": "snapshot_789012"
 *     }
 *   ],
 *   "timestamp": "2024-01-01T00:00:00.000Z"
 * }
 */
app.post(
  "/scrape/:site",
  validateParams(z.object({ site: JobSiteSchema })),
  validateBody(ScrapeJobsRequestSchema),
  async (c: HonoContext) => {
    // Get validated data from context - TypeScript safe access
    const validatedParams = c.get("validatedParams") as { site: JobSite };
    const validatedBody = c.get("validatedBody") as ScrapeJobsRequest;
    const { site } = validatedParams;
    const { searchParams, batchSize, credentials } = validatedBody;

    const scraper = createJobScraper(c.env.STEEL_API_KEY, c.env);

    try {
      // Verify site exists in database
      const siteRecord = await c.env.DB.prepare(
        "SELECT * FROM sites WHERE id = ?"
      )
        .bind(site)
        .first();

      if (!siteRecord) {
        const errorResponse: ErrorResponse = {
          error: "Site not found",
          details: `Site '${site}' is not configured in the database`,
        };
        return c.json(errorResponse, 404);
      }

      // Initialize scraper
      const siteCredentials = credentials
        ? { ...credentials, site }
        : undefined;
      await scraper.initialize(site, siteCredentials, c.env);

      // Search for jobs
      const jobUrls = await scraper.searchJobs(site, searchParams);

      if (jobUrls.length === 0) {
        await scraper.cleanup();
        return c.json({
          site,
          message: "No jobs found",
          results: [],
          timestamp: new Date().toISOString(),
        });
      }

      // Scrape jobs
      const results = await scraper.scrapeJobsBatch(
        site,
        jobUrls,
        c.env,
        batchSize
      );

      // Store results in D1 database
      const storedResults = [];
      for (const result of results) {
        try {
          // Insert job data
          const jobResult = await insertJob(c.env.DB, {
            id: result.job.id,
            site_id: site,
            url: result.job.url,
            title: result.job.title,
            company: result.job.company,
            location: result.job.location,
            description_md: result.job.description_md,
            salary_raw: result.job.salary_raw,
            posted_at: result.job.posted_at,
            status: "open",
          });

          if (jobResult.success) {
            // Insert snapshot data
            await insertSnapshot(c.env.DB, {
              id: result.snapshot.id,
              job_id: result.job.id,
              content_hash: result.snapshot.content_hash,
              html_r2_key: result.snapshot.html_r2_key,
              json_r2_key: result.snapshot.json_r2_key,
              screenshot_r2_key: result.snapshot.screenshot_r2_key,
              pdf_r2_key: result.snapshot.pdf_r2_key,
              markdown_r2_key: result.snapshot.markdown_r2_key,
              http_status: result.snapshot.http_status,
              etag: result.snapshot.etag,
            });

            storedResults.push({
              jobId: result.job.id,
              title: result.job.title,
              company: result.job.company,
              location: result.job.location,
              url: result.job.url,
              snapshotId: result.snapshot.id,
            });
          }
        } catch (dbError) {
          console.error("Failed to store job in database:", dbError);
          // Continue with other jobs even if one fails
        }
      }

      await scraper.cleanup();

      return c.json({
        site,
        totalFound: jobUrls.length,
        totalScraped: storedResults.length,
        results: storedResults,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Job scraping failed:", error);
      await scraper.cleanup();

      const errorResponse: ErrorResponse = {
        error: "Job scraping failed",
        details: error instanceof Error ? error.message : "Unknown error",
      };
      return c.json(errorResponse, 500);
    }
  }
);

/**
 * Scrapes a single job posting by URL with comprehensive content extraction and database storage.
 *
 * This endpoint performs targeted job scraping for a specific job URL, extracting detailed information
 * and creating persistent snapshots. It's designed for scenarios where you have a specific job URL
 * and need to extract comprehensive data including HTML content, screenshots, and PDF captures.
 * The endpoint validates the target site configuration and handles authentication requirements.
 *
 * The single job scraping process follows this workflow:
 * 1. Validates the site exists in the database and the job URL is properly formatted
 * 2. Initializes the Steel SDK scraper with optional authentication credentials
 * 3. Navigates to the specific job URL and extracts comprehensive job information
 * 4. Captures HTML content, generates screenshots, and creates PDF versions
 * 5. Stores the job data and snapshot information in the D1 database
 * 6. Returns detailed information about the scraped job and captured content
 *
 * Side Effects:
 * - Creates a new record in the 'jobs' table with the extracted job information
 * - Creates a new record in the 'snapshots' table with content captures
 * - Uploads HTML, screenshot, and PDF content to R2 storage
 * - May trigger browser automation and network requests to the specific job URL
 *
 * @param c - The Hono context containing validated parameters, request body, and environment bindings
 * @returns A JSON response containing the scraped job details, snapshot information, and content availability
 * @throws Will throw a 404 error if the specified site is not found in the database
 * @throws Will throw a 500 error if Steel SDK initialization fails or job scraping fails
 * @example
 * POST /api/steel-scraper/scrape-job/linkedin
 *
 * Request Body:
 * {
 *   "jobUrl": "https://linkedin.com/jobs/view/123456789",
 *   "credentials": {
 *     "email": "user@example.com",
 *     "password": "password123"
 *   }
 * }
 *
 * Response:
 * {
 *   "site": "linkedin",
 *   "job": {
 *     "id": "job_123456789",
 *     "title": "Senior Software Engineer",
 *     "company": "Tech Company Inc",
 *     "location": "San Francisco, CA",
 *     "url": "https://linkedin.com/jobs/view/123456789",
 *     "description": "We are looking for a senior software engineer...",
 *     "salary": "$120,000 - $150,000",
 *     "postedAt": "2024-01-01T00:00:00.000Z"
 *   },
 *   "snapshot": {
 *     "id": "snapshot_987654321",
 *     "hasHtml": true,
 *     "hasScreenshot": true,
 *     "hasPdf": true,
 *     "hasMarkdown": true
 *   },
 *   "timestamp": "2024-01-01T00:00:00.000Z"
 * }
 */
app.post(
  "/scrape-job/:site",
  validateParams(z.object({ site: JobSiteSchema })),
  validateBody(ScrapeJobRequestSchema),
  async (c: HonoContext) => {
    // Get validated data from context - TypeScript safe access
    const validatedParams = c.get("validatedParams") as { site: JobSite };
    const validatedBody = c.get("validatedBody") as ScrapeJobRequest;
    const { site } = validatedParams;
    const { jobUrl, credentials } = validatedBody;

    const scraper = createJobScraper(c.env.STEEL_API_KEY, c.env);

    try {
      // Verify site exists in database
      const siteRecord = await c.env.DB.prepare(
        "SELECT * FROM sites WHERE id = ?"
      )
        .bind(site)
        .first();

      if (!siteRecord) {
        const errorResponse: ErrorResponse = {
          error: "Site not found",
          details: `Site '${site}' is not configured in the database`,
        };
        return c.json(errorResponse, 404);
      }

      // Initialize scraper
      const siteCredentials = credentials
        ? { ...credentials, site }
        : undefined;
      await scraper.initialize(site, siteCredentials, c.env);

      // Scrape the job
      const result = await scraper.scrapeJob(site, jobUrl, c.env);

      // Store in D1 database
      try {
        const jobResult = await insertJob(c.env.DB, {
          id: result.job.id,
          site_id: site,
          url: result.job.url,
          title: result.job.title,
          company: result.job.company,
          location: result.job.location,
          description_md: result.job.description_md,
          salary_raw: result.job.salary_raw,
          posted_at: result.job.posted_at,
          status: "open",
        });

        if (jobResult.success) {
          await insertSnapshot(c.env.DB, {
            id: result.snapshot.id,
            job_id: result.job.id,
            content_hash: result.snapshot.content_hash,
            html_r2_key: result.snapshot.html_r2_key,
            json_r2_key: result.snapshot.json_r2_key,
            screenshot_r2_key: result.snapshot.screenshot_r2_key,
            pdf_r2_key: result.snapshot.pdf_r2_key,
            markdown_r2_key: result.snapshot.markdown_r2_key,
            http_status: result.snapshot.http_status,
            etag: result.snapshot.etag,
          });
        }
      } catch (dbError) {
        console.error("Failed to store job in database:", dbError);
        // Continue even if database storage fails
      }

      await scraper.cleanup();

      return c.json({
        site,
        job: {
          id: result.job.id,
          title: result.job.title,
          company: result.job.company,
          location: result.job.location,
          url: result.job.url,
          description: result.job.description_md,
          salary: result.job.salary_raw,
          postedAt: result.job.posted_at,
        },
        snapshot: {
          id: result.snapshot.id,
          hasHtml: !!result.html,
          hasScreenshot: !!result.screenshot,
          hasPdf: !!result.pdf,
          hasMarkdown: !!result.markdown,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Single job scraping failed:", error);
      await scraper.cleanup();

      const errorResponse: ErrorResponse = {
        error: "Job scraping failed",
        details: error instanceof Error ? error.message : "Unknown error",
      };
      return c.json(errorResponse, 500);
    }
  }
);

/**
 * Executes comprehensive job scraping across multiple sites with parallel processing and aggregated results.
 *
 * This endpoint performs the most powerful scraping operation, allowing simultaneous job discovery and extraction
 * from multiple job sites in a single request. It validates all target sites before beginning operations,
 * processes each site independently with its own authentication and configuration, and aggregates results
 * into a comprehensive response. This is ideal for large-scale job market analysis and comprehensive
 * job discovery across multiple platforms.
 *
 * The bulk scraping process follows this sophisticated workflow:
 * 1. Validates all specified sites exist in the database before starting any operations
 * 2. Processes each site sequentially to avoid overwhelming external services
 * 3. For each site, initializes the Steel SDK scraper with site-specific authentication
 * 4. Executes job search using the provided search parameters across all sites
 * 5. Performs batch scraping with configurable batch sizes for optimal performance
 * 6. Stores all discovered jobs and snapshots in the D1 database with proper error handling
 * 7. Aggregates results across all sites into a comprehensive summary response
 *
 * Side Effects:
 * - Creates multiple records in the 'jobs' table for each discovered job across all sites
 * - Creates multiple records in the 'snapshots' table for each scraped job
 * - Uploads HTML, screenshot, and PDF content to R2 storage for all jobs
 * - May trigger extensive browser automation and network requests across multiple job sites
 * - May consume significant memory and processing resources due to parallel operations
 *
 * @param c - The Hono context containing validated request body and environment bindings
 * @returns A JSON response containing aggregated results from all sites with success/failure status
 * @throws Will throw a 404 error if any specified sites are not found in the database
 * @throws Will throw a 500 error if Steel SDK initialization fails or bulk scraping execution fails
 * @example
 * POST /api/steel-scraper/bulk-scrape
 *
 * Request Body:
 * {
 *   "sites": [
 *     {
 *       "site": "linkedin",
 *       "credentials": {
 *         "email": "user@example.com",
 *         "password": "password123"
 *       }
 *     },
 *     {
 *       "site": "indeed"
 *     },
 *     {
 *       "site": "monster"
 *     }
 *   ],
 *   "searchParams": {
 *     "keywords": "machine learning engineer",
 *     "location": "Remote",
 *     "employmentType": "full-time",
 *     "salaryMin": 100000
 *   },
 *   "batchSize": 3
 * }
 *
 * Response:
 * {
 *   "summary": {
 *     "totalSites": 3,
 *     "successfulSites": 2,
 *     "totalJobsScraped": 25
 *   },
 *   "results": [
 *     {
 *       "site": "linkedin",
 *       "success": true,
 *       "totalFound": 15,
 *       "totalScraped": 12,
 *       "jobs": [...]
 *     },
 *     {
 *       "site": "indeed",
 *       "success": true,
 *       "totalFound": 20,
 *       "totalScraped": 13,
 *       "jobs": [...]
 *     },
 *     {
 *       "site": "monster",
 *       "success": false,
 *       "error": "Authentication failed"
 *     }
 *   ]
 * }
 */
app.post(
  "/bulk-scrape",
  validateBody(BulkScrapeRequestSchema),
  async (c: HonoContext) => {
    // Get validated data from context - TypeScript safe access
    const validatedBody = c.get("validatedBody") as BulkScrapeRequest;
    const { sites, searchParams, batchSize } = validatedBody;
    const results: BulkScrapeResult[] = [];

    // Validate all sites exist in database before starting
    const siteIds = sites.map((s) => s.site);
    const siteRecords = await c.env.DB.prepare(
      `SELECT id FROM sites WHERE id IN (${siteIds.map(() => "?").join(",")})`
    )
      .bind(...siteIds)
      .all();

    const existingSiteIds = new Set(
      (siteRecords.results as Array<{ id: string }>).map((r) => r.id)
    );
    const missingSites = siteIds.filter((id) => !existingSiteIds.has(id));

    if (missingSites.length > 0) {
      const errorResponse: ErrorResponse = {
        error: "Sites not found",
        details: `The following sites are not configured in the database: ${missingSites.join(
          ", "
        )}`,
      };
      return c.json(errorResponse, 404);
    }

    for (const siteConfig of sites) {
      const { site, credentials } = siteConfig;
      const scraper = createJobScraper(c.env.STEEL_API_KEY, c.env);

      try {
        // Initialize scraper
        const siteCredentials = credentials
          ? { ...credentials, site: site as JobSite }
          : undefined;
        await scraper.initialize(site as JobSite, siteCredentials, c.env);

        // Search for jobs
        const jobUrls = await scraper.searchJobs(site as JobSite, searchParams);

        if (jobUrls.length === 0) {
          results.push({
            site,
            message: "No jobs found",
            success: true,
            totalFound: 0,
            totalScraped: 0,
          });
          continue;
        }

        // Scrape jobs
        const scrapeResults = await scraper.scrapeJobsBatch(
          site as JobSite,
          jobUrls,
          c.env,
          batchSize
        );

        // Store results in D1 database
        const storedJobs = [];
        for (const result of scrapeResults) {
          try {
            const jobResult = await insertJob(c.env.DB, {
              id: result.job.id,
              site_id: site,
              url: result.job.url,
              title: result.job.title,
              company: result.job.company,
              location: result.job.location,
              description_md: result.job.description_md,
              salary_raw: result.job.salary_raw,
              posted_at: result.job.posted_at,
              status: "open",
            });

            if (jobResult.success) {
              await insertSnapshot(c.env.DB, {
                id: result.snapshot.id,
                job_id: result.job.id,
                content_hash: result.snapshot.content_hash,
                html_r2_key: result.snapshot.html_r2_key,
                json_r2_key: result.snapshot.json_r2_key,
                screenshot_r2_key: result.snapshot.screenshot_r2_key,
                pdf_r2_key: result.snapshot.pdf_r2_key,
                markdown_r2_key: result.snapshot.markdown_r2_key,
                http_status: result.snapshot.http_status,
                etag: result.snapshot.etag,
              });

              if (result.job.id && result.job.title && result.job.company) {
                storedJobs.push({
                  jobId: result.job.id,
                  title: result.job.title,
                  company: result.job.company,
                  location: result.job.location || "",
                  url: result.job.url,
                  snapshotId: result.snapshot.id,
                });
              }
            }
          } catch (dbError) {
            console.error(
              `Failed to store job ${result.job.id} in database:`,
              dbError
            );
            // Continue with other jobs
          }
        }

        results.push({
          site,
          success: true,
          totalFound: jobUrls.length,
          totalScraped: storedJobs.length,
          jobs: storedJobs,
        });
      } catch (error) {
        console.error(`Bulk scraping failed for ${site}:`, error);
        results.push({
          site,
          error: error instanceof Error ? error.message : "Unknown error",
          success: false,
        });
      } finally {
        await scraper.cleanup();
      }
    }

    const totalScraped = results.reduce(
      (sum, result) => sum + (result.totalScraped || 0),
      0
    );

    const response: BulkScrapeResponse = {
      summary: {
        totalSites: sites.length,
        successfulSites: results.filter((r) => r.success).length,
        totalJobsScraped: totalScraped,
      },
      results,
    };

    return c.json(response);
  }
);

/**
 * Retrieves comprehensive status information about the steel scraper service and its capabilities.
 *
 * This endpoint provides a health check and capability overview for the steel scraper service.
 * It returns information about the current service status, supported job sites, available features,
 * and version information. This is useful for monitoring service health, understanding available
 * capabilities, and debugging configuration issues.
 *
 * The status response includes:
 * - Current service operational status
 * - Complete list of supported job sites from the JobSite enum
 * - Comprehensive feature list including scraping capabilities and integrations
 * - Service version information for compatibility checking
 * - Timestamp for cache invalidation and monitoring purposes
 *
 * This endpoint does not perform any database queries or external API calls, making it suitable
 * for frequent health checks and monitoring without impacting performance or rate limits.
 *
 * @param c - The Hono context containing environment bindings and request information
 * @returns A JSON response containing service status, supported sites, features, and version information
 * @throws Will not throw errors as this is a read-only status endpoint
 * @example
 * GET /api/steel-scraper/status
 *
 * Response:
 * {
 *   "status": "active",
 *   "supportedSites": ["linkedin", "indeed", "monster", "cloudflare", "generic"],
 *   "features": [
 *     "Multi-platform job scraping",
 *     "Authentication persistence",
 *     "HTML, screenshot, and PDF capture",
 *     "Markdown content extraction",
 *     "Batch processing",
 *     "Rate limiting protection",
 *     "D1 database integration",
 *     "Zod validation",
 *     "Type-safe operations"
 *   ],
 *   "version": "2.0.0",
 *   "timestamp": "2024-01-01T00:00:00.000Z"
 * }
 */
app.get("/status", async (c: HonoContext) => {
  try {
    const response = {
      status: "active",
      supportedSites: Object.values(JobSite),
      features: [
        "Multi-platform job scraping",
        "Authentication persistence",
        "HTML, screenshot, and PDF capture",
        "Markdown content extraction",
        "Batch processing",
        "Rate limiting protection",
        "D1 database integration",
        "Zod validation",
        "Type-safe operations",
      ],
      version: "2.0.0",
      timestamp: new Date().toISOString(),
    };

    return c.json(response);
  } catch (error) {
    console.error("Failed to get status:", error);
    const errorResponse: ErrorResponse = {
      error: "Failed to retrieve status",
      details: error instanceof Error ? error.message : "Unknown error",
    };
    return c.json(errorResponse, 500);
  }
});

export default app;
