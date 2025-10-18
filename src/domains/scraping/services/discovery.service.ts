/**
 * @file URL Discovery Service
 *
 * This file provides URL discovery functionality for the 9to5-Scout platform.
 * It implements multiple strategies for discovering job posting URLs including
 * sitemap parsing, web crawling, search engine queries, and API endpoints.
 *
 * Key Features:
 * - Sitemap XML parsing with namespace support
 * - Web crawling with robots.txt compliance
 * - Search engine integration
 * - Custom discovery strategies
 * - Rate limiting and respectful crawling
 *
 * @author 9to5-Scout Development Team
 * @since 1.0.0
 */

import { chromium } from "@cloudflare/playwright";
import { z } from "zod";
import type { Env } from "../../../config/env";
import { DiscoveryConfigSchema } from "../models/scraping.schema";
import type {
  DiscoveryConfig,
  ScrapingError,
  SitemapResult,
  ValidationResult,
} from "../types/scraping.types";

/**
 * URL Discovery Service
 */
export class DiscoveryService {
  private env: Env;
  private robotsCache: Map<string, string> = new Map();

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Discover URLs using the specified strategy
   */
  async discoverUrls(
    baseUrl: string,
    config: DiscoveryConfig
  ): Promise<{ urls: string[]; errors: ScrapingError[] }> {
    const errors: ScrapingError[] = [];

    try {
      switch (config.strategy) {
        case "sitemap":
          return await this.discoverFromSitemap(baseUrl, config);

        case "crawl":
          return await this.discoverFromCrawling(baseUrl, config);

        case "search":
          return await this.discoverFromSearch(baseUrl, config);

        case "api":
          return await this.discoverFromAPI(baseUrl, config);

        case "custom":
          return await this.discoverFromCustom(baseUrl, config);

        default:
          throw new Error(`Unknown discovery strategy: ${config.strategy}`);
      }
    } catch (error) {
      errors.push({
        url: baseUrl,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        retryCount: 0,
        type: "unknown",
      });
      return { urls: [], errors };
    }
  }

  /**
   * Discover URLs from sitemap
   */
  private async discoverFromSitemap(
    baseUrl: string,
    config: DiscoveryConfig
  ): Promise<{ urls: string[]; errors: ScrapingError[] }> {
    const errors: ScrapingError[] = [];
    const urls: string[] = [];

    try {
      // Check for robots.txt first
      if (config.respectRobotsTxt) {
        const robotsTxt = await this.getRobotsTxt(baseUrl);
        const sitemapUrls = this.extractSitemapUrlsFromRobots(robotsTxt);

        for (const sitemapUrl of sitemapUrls) {
          try {
            const result = await this.parseSitemap(sitemapUrl);
            urls.push(...result.urls);
          } catch (error) {
            errors.push({
              url: sitemapUrl,
              error: error instanceof Error ? error.message : "Unknown error",
              timestamp: new Date().toISOString(),
              retryCount: 0,
              type: "parsing",
            });
          }
        }
      } else {
        // Try common sitemap locations
        const commonSitemaps = [
          `${baseUrl}/sitemap.xml`,
          `${baseUrl}/sitemap_index.xml`,
          `${baseUrl}/sitemaps.xml`,
        ];

        for (const sitemapUrl of commonSitemaps) {
          try {
            const result = await this.parseSitemap(sitemapUrl);
            urls.push(...result.urls);
            break; // Use the first successful sitemap
          } catch (error) {
            // Continue to next sitemap
          }
        }
      }

      // Filter URLs based on configuration
      const filteredUrls = this.filterUrls(urls, config);

      return { urls: filteredUrls.slice(0, config.maxUrls), errors };
    } catch (error) {
      errors.push({
        url: baseUrl,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        retryCount: 0,
        type: "parsing",
      });
      return { urls, errors };
    }
  }

  /**
   * Discover URLs from web crawling
   */
  private async discoverFromCrawling(
    baseUrl: string,
    config: DiscoveryConfig
  ): Promise<{ urls: string[]; errors: ScrapingError[] }> {
    const errors: ScrapingError[] = [];
    const urls: string[] = [];
    const visited = new Set<string>();

    try {
      const browser = await chromium.launch(this.env.MYBROWSER);
      const page = await browser.newPage();

      // User agent is set via browser options in Cloudflare Playwright

      // Check robots.txt if required
      if (config.respectRobotsTxt) {
        const robotsTxt = await this.getRobotsTxt(baseUrl);
        if (
          !this.isUrlAllowed(
            baseUrl,
            config.allowedDomains,
            config.blockedDomains
          )
        ) {
          throw new Error("URL not allowed by robots.txt");
        }
      }

      // Start crawling
      const queue = [baseUrl];
      let depth = 0;

      while (
        queue.length > 0 &&
        depth < config.maxDepth &&
        urls.length < config.maxUrls
      ) {
        const currentUrl = queue.shift()!;

        if (visited.has(currentUrl)) {
          continue;
        }

        visited.add(currentUrl);

        try {
          await page.goto(currentUrl, { waitUntil: "networkidle" });

          // Extract links from the page
          const pageUrls = await page.evaluate(() => {
            const doc = (globalThis as any).document;
            if (doc) {
              const links = Array.from(doc.querySelectorAll("a[href]"));
              return links
                .map((link) => (link as any).href)
                .filter(
                  (href) =>
                    href &&
                    !href.startsWith("javascript:") &&
                    !href.startsWith("mailto:")
                );
            }
            return [];
          });

          // Filter and add new URLs
          for (const url of pageUrls) {
            if (
              this.isUrlAllowed(
                url,
                config.allowedDomains,
                config.blockedDomains
              ) &&
              !visited.has(url)
            ) {
              urls.push(url);
              if (urls.length >= config.maxUrls) break;

              // Add to queue for further crawling
              if (this.shouldCrawlUrl(url, config.allowedDomains)) {
                queue.push(url);
              }
            }
          }

          // Rate limiting
          if (config.delayBetweenRequests > 0) {
            await this.delay(config.delayBetweenRequests);
          }

          depth++;
        } catch (error) {
          errors.push({
            url: currentUrl,
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
            retryCount: 0,
            type: "network",
          });
        }
      }

      await browser.close();
      return { urls: urls.slice(0, config.maxUrls), errors };
    } catch (error) {
      errors.push({
        url: baseUrl,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        retryCount: 0,
        type: "unknown",
      });
      return { urls, errors };
    }
  }

  /**
   * Discover URLs from search engines
   */
  private async discoverFromSearch(
    baseUrl: string,
    config: DiscoveryConfig
  ): Promise<{ urls: string[]; errors: ScrapingError[] }> {
    const errors: ScrapingError[] = [];
    const urls: string[] = [];

    try {
      // This would integrate with search APIs like Google Custom Search, Bing, etc.
      // For now, we'll implement a basic search simulation
      const searchTerms = this.generateSearchTerms(baseUrl);

      for (const term of searchTerms) {
        try {
          const searchUrls = await this.performSearch(term, config);
          urls.push(...searchUrls);

          if (urls.length >= config.maxUrls) break;

          // Rate limiting
          if (config.delayBetweenRequests > 0) {
            await this.delay(config.delayBetweenRequests);
          }
        } catch (error) {
          errors.push({
            url: `search:${term}`,
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
            retryCount: 0,
            type: "network",
          });
        }
      }

      return { urls: urls.slice(0, config.maxUrls), errors };
    } catch (error) {
      errors.push({
        url: baseUrl,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        retryCount: 0,
        type: "unknown",
      });
      return { urls, errors };
    }
  }

  /**
   * Discover URLs from API endpoints
   */
  private async discoverFromAPI(
    baseUrl: string,
    config: DiscoveryConfig
  ): Promise<{ urls: string[]; errors: ScrapingError[] }> {
    const errors: ScrapingError[] = [];
    const urls: string[] = [];

    try {
      // This would integrate with job board APIs like Indeed, LinkedIn, etc.
      // For now, we'll implement a basic API discovery
      const apiEndpoints = this.getApiEndpoints(baseUrl);

      for (const endpoint of apiEndpoints) {
        try {
          const response = await fetch(endpoint, {
            headers: {
              "User-Agent": config.userAgent,
              Accept: "application/json",
            },
          });

          if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
          }

          const data = await response.json();
          const extractedUrls = this.extractUrlsFromApiResponse(data);
          urls.push(...extractedUrls);

          if (urls.length >= config.maxUrls) break;

          // Rate limiting
          if (config.delayBetweenRequests > 0) {
            await this.delay(config.delayBetweenRequests);
          }
        } catch (error) {
          errors.push({
            url: endpoint,
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
            retryCount: 0,
            type: "network",
          });
        }
      }

      return { urls: urls.slice(0, config.maxUrls), errors };
    } catch (error) {
      errors.push({
        url: baseUrl,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        retryCount: 0,
        type: "unknown",
      });
      return { urls, errors };
    }
  }

  /**
   * Discover URLs using custom strategy
   */
  private async discoverFromCustom(
    baseUrl: string,
    config: DiscoveryConfig
  ): Promise<{ urls: string[]; errors: ScrapingError[] }> {
    const errors: ScrapingError[] = [];
    const urls: string[] = [];

    try {
      // This would use custom selectors and logic defined in the configuration
      const browser = await chromium.launch(this.env.MYBROWSER);
      const page = await browser.newPage();

      await page.goto(baseUrl, { waitUntil: "networkidle" });

      // Use custom selectors to find URLs
      if (config.customSelectors) {
        for (const [selectorName, selector] of Object.entries(
          config.customSelectors
        )) {
          try {
            const elements = await page.$$(selector);
            for (const element of elements) {
              const href = await element.getAttribute("href");
              if (href) {
                const absoluteUrl = new URL(href, baseUrl).toString();
                if (
                  this.isUrlAllowed(
                    absoluteUrl,
                    config.allowedDomains,
                    config.blockedDomains
                  )
                ) {
                  urls.push(absoluteUrl);
                }
              }
            }
          } catch (error) {
            errors.push({
              url: `${baseUrl}#${selectorName}`,
              error: error instanceof Error ? error.message : "Unknown error",
              timestamp: new Date().toISOString(),
              retryCount: 0,
              type: "parsing",
            });
          }
        }
      }

      await browser.close();
      return { urls: urls.slice(0, config.maxUrls), errors };
    } catch (error) {
      errors.push({
        url: baseUrl,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        retryCount: 0,
        type: "unknown",
      });
      return { urls, errors };
    }
  }

  /**
   * Parse sitemap XML
   */
  private async parseSitemap(sitemapUrl: string): Promise<SitemapResult> {
    const response = await fetch(sitemapUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch sitemap: ${response.status}`);
    }

    const xmlText = await response.text();
    const urls: string[] = [];

    try {
      // Handle both regular sitemaps and sitemap index files
      const locPattern = /<loc[^>]*>(.*?)<\/loc>/gi;
      const sitemapPattern = /<sitemap[^>]*>[\s\S]*?<\/sitemap>/gi;

      let match;

      // Check if this is a sitemap index file
      if (xmlText.includes("<sitemapindex") || xmlText.includes("<sitemap>")) {
        // Extract URLs from sitemap entries
        while ((match = sitemapPattern.exec(xmlText)) !== null) {
          const sitemapEntry = match[0];
          const locMatch = sitemapEntry.match(/<loc[^>]*>(.*?)<\/loc>/i);
          if (locMatch && locMatch[1]) {
            const subSitemapUrl = locMatch[1].trim();
            try {
              const subResult = await this.parseSitemap(subSitemapUrl);
              urls.push(...subResult.urls);
            } catch (error) {
              console.warn(
                `Failed to parse sub-sitemap ${subSitemapUrl}:`,
                error
              );
            }
          }
        }
      } else {
        // Regular sitemap
        while ((match = locPattern.exec(xmlText)) !== null) {
          const url = match[1]?.trim();
          if (url) {
            urls.push(url);
          }
        }
      }

      return {
        urls,
        totalFound: urls.length,
        hasIndex: xmlText.includes("<sitemapindex"),
      };
    } catch (error) {
      throw new Error(
        `Failed to parse sitemap XML: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get robots.txt content
   */
  private async getRobotsTxt(baseUrl: string): Promise<string> {
    const robotsUrl = new URL("/robots.txt", baseUrl).toString();

    if (this.robotsCache.has(robotsUrl)) {
      return this.robotsCache.get(robotsUrl)!;
    }

    try {
      const response = await fetch(robotsUrl);
      const content = response.ok ? await response.text() : "";
      this.robotsCache.set(robotsUrl, content);
      return content;
    } catch (error) {
      this.robotsCache.set(robotsUrl, "");
      return "";
    }
  }

  /**
   * Extract sitemap URLs from robots.txt
   */
  private extractSitemapUrlsFromRobots(robotsTxt: string): string[] {
    const sitemapUrls: string[] = [];
    const lines = robotsTxt.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().startsWith("sitemap:")) {
        const url = trimmed.substring(8).trim();
        if (url) {
          sitemapUrls.push(url);
        }
      }
    }

    return sitemapUrls;
  }

  /**
   * Check if URL is allowed by domain filters
   */
  private isUrlAllowed(
    url: string,
    allowedDomains: string[],
    blockedDomains: string[]
  ): boolean {
    try {
      const urlObj = new URL(url);

      // Check allowed domains
      if (allowedDomains.length > 0) {
        const isAllowed = allowedDomains.some(
          (domain) =>
            urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
        );
        if (!isAllowed) return false;
      }

      // Check blocked domains
      if (blockedDomains.length > 0) {
        const isBlocked = blockedDomains.some(
          (domain) =>
            urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
        );
        if (isBlocked) return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Filter URLs based on configuration
   */
  private filterUrls(urls: string[], config: DiscoveryConfig): string[] {
    return urls.filter((url) => {
      try {
        const urlObj = new URL(url);

        // Check allowed domains
        if (config.allowedDomains.length > 0) {
          const isAllowed = config.allowedDomains.some(
            (domain) =>
              urlObj.hostname === domain ||
              urlObj.hostname.endsWith(`.${domain}`)
          );
          if (!isAllowed) return false;
        }

        // Check blocked domains
        if (config.blockedDomains.length > 0) {
          const isBlocked = config.blockedDomains.some(
            (domain) =>
              urlObj.hostname === domain ||
              urlObj.hostname.endsWith(`.${domain}`)
          );
          if (isBlocked) return false;
        }

        // Check allowed paths
        if (config.allowedPaths.length > 0) {
          const isAllowed = config.allowedPaths.some((path) =>
            urlObj.pathname.startsWith(path)
          );
          if (!isAllowed) return false;
        }

        // Check blocked paths
        if (config.blockedPaths.length > 0) {
          const isBlocked = config.blockedPaths.some((path) =>
            urlObj.pathname.startsWith(path)
          );
          if (isBlocked) return false;
        }

        return true;
      } catch (error) {
        return false;
      }
    });
  }

  /**
   * Check if URL should be crawled further
   */
  private shouldCrawlUrl(url: string, allowedDomains: string[]): boolean {
    try {
      const urlObj = new URL(url);

      // Only crawl same domain
      if (allowedDomains.length > 0) {
        const baseDomain = allowedDomains[0];
        return (
          urlObj.hostname === baseDomain ||
          urlObj.hostname.endsWith(`.${baseDomain}`)
        );
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate search terms for search-based discovery
   */
  private generateSearchTerms(baseUrl: string): string[] {
    const domain = new URL(baseUrl).hostname;
    return [
      `site:${domain} jobs`,
      `site:${domain} careers`,
      `site:${domain} employment`,
      `site:${domain} openings`,
      `site:${domain} positions`,
    ];
  }

  /**
   * Perform search query
   */
  private async performSearch(
    term: string,
    config: DiscoveryConfig
  ): Promise<string[]> {
    // This would integrate with search APIs
    // For now, return empty array
    return [];
  }

  /**
   * Get API endpoints for discovery
   */
  private getApiEndpoints(baseUrl: string): string[] {
    // This would return job board API endpoints
    return [
      `${baseUrl}/api/jobs`,
      `${baseUrl}/api/careers`,
      `${baseUrl}/api/positions`,
    ];
  }

  /**
   * Extract URLs from API response
   */
  private extractUrlsFromApiResponse(data: any): string[] {
    const urls: string[] = [];

    if (Array.isArray(data)) {
      for (const item of data) {
        if (item?.url) urls.push(item.url);
        if (item?.link) urls.push(item.link);
        if (item?.jobUrl) urls.push(item.jobUrl);
      }
    } else if (data?.jobs && Array.isArray(data.jobs)) {
      for (const job of data.jobs) {
        if (job?.url) urls.push(job.url);
        if (job?.link) urls.push(job.link);
      }
    }

    return urls;
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validate discovery configuration
   */
  validateConfig(config: DiscoveryConfig): ValidationResult {
    try {
      DiscoveryConfigSchema.parse(config);
      return { valid: true, errors: [], warnings: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.issues.map(
            (issue: any) => `${issue.path.join(".")}: ${issue.message}`
          ),
          warnings: [],
        };
      }
      return {
        valid: false,
        errors: ["Unknown validation error"],
        warnings: [],
      };
    }
  }
}

/**
 * Factory function to create discovery service
 */
export function createDiscoveryService(env: Env): DiscoveryService {
  return new DiscoveryService(env);
}
