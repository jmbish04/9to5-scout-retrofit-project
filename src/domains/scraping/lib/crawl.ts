/**
 * @file Crawl Library
 *
 * This module provides utility functions for crawling job postings.
 * It serves as a wrapper around the ScrapingService for common crawling operations.
 *
 * @author 9to5-Scout Development Team
 * @since 1.0.0
 */

import { ScrapingService } from '../services/scraping.service';
import type { ExtractedJob, ScrapingEnv } from '../types/scraping.types';

/**
 * Crawl a single job posting from a URL
 *
 * @param env - Cloudflare Workers environment bindings
 * @param url - URL of the job posting to crawl
 * @returns ExtractedJob object if successful, null if failed or no job found
 */
export async function crawlJob(
  env: ScrapingEnv,
  url: string
): Promise<ExtractedJob | null> {
  try {
    const service = new ScrapingService(env);

    // Create a scraping job with default configuration
    const jobId = await service.createJob({
      siteId: 'temp', // Temporary site ID for single job crawling
      urls: [url],
      config: {
        maxConcurrent: 1,
        timeout: 30000,
        retries: 2,
        delay: 1000,
        followRedirects: true,
        extractImages: false,
        extractLinks: false,
        scrollToBottom: true,
        screenshot: false,
        pdf: false,
      },
    });

    // Execute the scraping job
    const results = await service.getJobResults(jobId);

    if (results && results.jobs && results.jobs.length > 0) {
      return results.jobs[0]; // Return the first job found
    }

    return null;
  } catch (error) {
    console.error(`Failed to crawl job from ${url}:`, error);
    return null;
  }
}

/**
 * Crawl multiple job postings from URLs
 *
 * @param env - Cloudflare Workers environment bindings
 * @param urls - Array of URLs to crawl
 * @param siteId - Site ID for tracking and configuration
 * @returns Array of ExtractedJob objects
 */
export async function crawlJobs(
  env: ScrapingEnv,
  urls: string[],
  siteId: string
): Promise<ExtractedJob[]> {
  try {
    const service = new ScrapingService(env);

    // Create a scraping job with default configuration
    const jobId = await service.createJob({
      siteId,
      urls,
      config: {
        maxConcurrent: 3,
        timeout: 30000,
        retries: 2,
        delay: 2000, // 2 second delay between requests to be respectful
        followRedirects: true,
        extractImages: false,
        extractLinks: false,
        scrollToBottom: true,
        screenshot: false,
        pdf: false,
      },
    });

    // Execute the scraping job
    const results = await service.getJobResults(jobId);

    if (results && results.jobs) {
      return results.jobs;
    }

    return [];
  } catch (error) {
    console.error(`Failed to crawl jobs from ${urls.length} URLs:`, error);
    return [];
  }
}

/**
 * Discover job URLs from a site (e.g., from a sitemap or list page)
 *
 * @param env - Cloudflare Workers environment bindings
 * @param siteUrl - Base URL of the site to discover jobs from
 * @returns Array of discovered job URLs
 */
export async function discoverJobUrls(
  env: ScrapingEnv,
  siteUrl: string
): Promise<string[]> {
  try {
    // This is a placeholder implementation
    // In a real implementation, this would:
    // 1. Check for sitemap.xml
    // 2. Crawl the site's job listing pages
    // 3. Extract job URLs from the listings
    // 4. Return the discovered URLs

    console.log(`Discovering job URLs from ${siteUrl}`);

    // For now, return an empty array
    // This should be implemented based on the site's structure
    return [];
  } catch (error) {
    console.error(`Failed to discover job URLs from ${siteUrl}:`, error);
    return [];
  }
}
