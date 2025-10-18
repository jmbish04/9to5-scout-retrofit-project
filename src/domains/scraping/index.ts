/**
 * @file Scraping Domain Index
 *
 * This file serves as the main entry point for the scraping domain within the 9to5-Scout platform.
 * It exports all public types, services, models, and routes for external consumption.
 *
 * @author 9to5-Scout Development Team
 * @since 1.0.0
 */

// Export types
export * from "./types/scraping.types";

// Export schemas (avoid duplicate exports by using specific exports)
export {
  AddToQueueRequest,
  BrowserOptions,
  CreateScrapingJobRequest,
  DiscoveryConfig,
  DiscoveryStrategy,
  ExtractedJob,
  JobSite,
  JobSiteCredentials,
  JobSiteSelectors,
  QueueStatus,
  QueueStatusResponse,
  RateLimitConfig,
  ScrapeQueueItem,
  ScrapingConfig,
  ScrapingError,
  ScrapingJob,
  ScrapingJobResponse,
  ScrapingJobsListResponse,
  ScrapingMessage,
  ScrapingMetadata,
  ScrapingMetrics,
  ScrapingProgress,
  ScrapingResults,
  ScrapingSession,
  ScrapingStatus,
  SteelCredentials,
  SteelJobData,
  UpdateScrapingJobRequest,
  ValidationResult,
} from "./models/scraping.schema";

// Export services
export {
  DiscoveryService,
  createDiscoveryService,
} from "./services/discovery.service";
export {
  ScrapingService,
  createScrapingService,
} from "./services/scraping.service";

// Export routes
export { default as scrapingRoutes } from "./routes/scraping.routes";

// Export durable objects
export { JobMonitor } from "./durable-objects/job-monitor";
export { ScrapeSocket } from "./durable-objects/scrape-socket";
export { SiteCrawler } from "./durable-objects/site-crawler";
