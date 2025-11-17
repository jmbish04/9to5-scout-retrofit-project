/**
 * @file Crawl Library
 *
 * This module provides utility functions for crawling job postings.
 * It serves as a wrapper around the ScrapingService for common crawling operations.
 *
 * @author 9to5-Scout Development Team
 * @since 1.0.0
 */

import type { Env } from "../../../config/env";
import { Logger } from "../../../core/services/logger.service";
// --- Imports added from main branch, paths adjusted ---
import { ScrapingService } from "../../../domains/scraping/services/scraping.service";
import type { ExtractedJob } from "../../../domains/scraping/types/scraping.types";
// --- Mocked import for DiscoveryService ---
import { DiscoveryService } from "../../../domains/discovery/services/discovery.service";

/**
 * Base scraping configuration shared across crawl functions.
 * This reduces duplication and makes it easier to maintain consistent settings.
 */
const baseScrapingConfig = {
  timeout: 30000,
  retries: 2,
  followRedirects: true,
  extractImages: false,
  extractLinks: false,
  scrollToBottom: true,
  screenshot: false,
  pdf: false,
} as const;

/**
 * Discover job URLs from a given base URL and search terms.
 *
 * This implementation uses a mocked DiscoveryService to find URLs.
 */
export async function discoverJobUrls(
  baseUrl: string,
  searchTerms: string[] = [],
  env: Env
): Promise<string[]> {
  const logger = new Logger("CrawlLibrary", env as any);

  logger.info("Discovering job URLs", {
    baseUrl,
    searchTermsCount: searchTerms.length,
  });

  try {
    // --- Mocked DiscoveryService implementation ---
    const discoveryService = new DiscoveryService(env as any);
    
    // 1. Load site configuration (mocked)
    const siteConfig = await discoveryService.getSiteConfig(baseUrl);
    if (!siteConfig) {
      logger.warn("No site config found for baseUrl", { baseUrl });
      return [];
    }

    // 2. Use DiscoveryService based on strategy (mocked)
    const discoveredUrls = await discoveryService.discover(siteConfig, searchTerms);
    
    logger.info(`Discovered ${discoveredUrls.length} URLs`, { baseUrl });
    return discoveredUrls;
  } catch (error) {
    logger.error("Failed to discover job URLs", error as Error, { baseUrl });
    throw error;
  }
}

/**
 * Crawl a single job posting from a URL.
 *
 * This uses the ScrapingService to extract job data from the URL.
 */
export async function crawlJob(env: Env, url: string): Promise<ExtractedJob | null> {
  const logger = new Logger("CrawlLibrary", env as any);

  logger.info("Crawling single job", { url });

  try {
    // --- Implementation based on logic from 'main' branch ---
    const service = new ScrapingService(env as any);

    // 1. Create a scraping job
    const jobId = await service.createJob({
      siteId: "single_crawl", // Use a generic ID for single crawls
      urls: [url],
      config: {
        ...baseScrapingConfig,
        maxConcurrent: 1,
        delay: 1000, // Add a small delay
      },
    });

    // 2. Execute the job and wait for results
    const results = await service.getJobResults(jobId);

    // 3. Extract and return the job data
    if (results && results.jobs && results.jobs.length > 0) {
      logger.info("Successfully crawled job", { url });
      return results.jobs[0] as ExtractedJob;
    }

    logger.warn("Job crawling returned no data", { url });
    return null;
  } catch (error) {
    logger.error("Failed to crawl job", error as Error, { url });
    return null;
  }
}

/**
 * Crawl multiple job postings from URLs.
 *
 * This batch processes multiple URLs efficiently using the ScrapingService.
 */
export async function crawlJobs(
  env: Env,
  urls: string[],
  siteId: string
): Promise<ExtractedJob[]> {
  const logger = new Logger("CrawlLibrary", env as any);

  logger.info("Crawling multiple jobs", {
    urlCount: urls.length,
    siteId,
  });

  if (urls.length === 0) {
  	logger.warn("No URLs provided to crawlJobs, returning empty array", { siteId });
  	return [];
  }

  try {
    // --- Implementation based on logic from 'main' branch ---
    const service = new ScrapingService(env as any);

    // 1. Create a scraping job with batch configuration
    const jobId = await service.createJob({
      siteId,
      urls,
      config: {
        ...baseScrapingConfig,
        maxConcurrent: 3, // Use higher concurrency for batch
        delay: 2000, // Be respectful with a 2s delay
      },
    });

    // 2. Execute the job and wait for results
  	const results = await service.getJobResults(jobId);

    // 3. Return array of extracted job data
    if (results && results.jobs) {
      logger.info(`Successfully crawled ${results.jobs.length} jobs`, { siteId });
      return results.jobs as ExtractedJob[];
    }

    logger.warn("Batch job crawling returned no data", { siteId });
    return [];
  } catch (error) {
    logger.error("Failed to crawl jobs", error as Error, {
      urlCount: urls.length,
      siteId,
    });
    return [];
  }
}