/**
 * @file Scraping Domain Schemas
 *
 * This file defines Zod validation schemas for the scraping domain within the 9to5-Scout platform.
 * It provides comprehensive validation for all scraping-related data structures including
 * job extraction, browser automation, and scraping configuration.
 *
 * @author 9to5-Scout Development Team
 * @since 1.0.0
 */

import { z } from "zod";

/**
 * Job site selectors schema
 */
export const JobSiteSelectorsSchema = z.object({
  jobList: z.string().min(1, "Job list selector is required"),
  jobTitle: z.string().min(1, "Job title selector is required"),
  jobCompany: z.string().min(1, "Job company selector is required"),
  jobLocation: z.string().min(1, "Job location selector is required"),
  jobSalary: z.string().optional(),
  jobDescription: z.string().optional(),
  jobLink: z.string().min(1, "Job link selector is required"),
  nextPage: z.string().optional(),
  pagination: z.string().optional(),
});

/**
 * Rate limit configuration schema
 */
export const RateLimitConfigSchema = z.object({
  requestsPerMinute: z.number().min(1).max(1000),
  delayBetweenRequests: z.number().min(0).max(60000),
  maxConcurrentRequests: z.number().min(1).max(50),
  backoffMultiplier: z.number().min(1).max(10),
  maxRetries: z.number().min(0).max(10),
});

/**
 * Job site schema
 */
export const JobSiteSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  baseUrl: z.string().url(),
  loginUrl: z.string().url().optional(),
  searchUrl: z.string().url().optional(),
  requiresAuth: z.boolean(),
  authType: z.enum(["form", "oauth", "api", "session"]).optional(),
  selectors: JobSiteSelectorsSchema.optional(),
  rateLimit: RateLimitConfigSchema.optional(),
  userAgent: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

/**
 * Scraping configuration schema
 */
export const ScrapingConfigSchema = z.object({
  maxConcurrent: z.number().min(1).max(20),
  timeout: z.number().min(1000).max(300000),
  retries: z.number().min(0).max(10),
  delay: z.number().min(0).max(10000),
  userAgent: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  cookies: z.string().optional(),
  proxy: z.string().optional(),
  followRedirects: z.boolean().default(true),
  extractImages: z.boolean().default(false),
  extractLinks: z.boolean().default(false),
  waitForSelector: z.string().optional(),
  waitForTimeout: z.number().min(0).max(60000).optional(),
  scrollToBottom: z.boolean().default(false),
  screenshot: z.boolean().default(false),
  pdf: z.boolean().default(false),
});

/**
 * Scraping status schema
 */
export const ScrapingStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
  "paused",
]);

/**
 * Job site credentials schema
 */
export const JobSiteCredentialsSchema = z.object({
  site: JobSiteSchema,
  email: z.string().email().optional(),
  password: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
  apiKey: z.string().min(1).optional(),
  cookies: z.string().optional(),
  sessionId: z.string().optional(),
  token: z.string().optional(),
});

/**
 * Extracted job schema
 */
export const ExtractedJobSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  title: z.string().min(1).max(500),
  company: z.string().min(1).max(255),
  location: z.string().min(1).max(255),
  salary: z.string().optional(),
  description: z.string().min(1),
  requirements: z.string().optional(),
  postedAt: z.string().datetime().optional(),
  scrapedAt: z.string().datetime(),
  source: z.string().min(1),
  confidence: z.number().min(0).max(1),
  rawData: z.record(z.string(), z.any()),
});

/**
 * Scraping error schema
 */
export const ScrapingErrorSchema = z.object({
  url: z.string().url(),
  error: z.string().min(1),
  timestamp: z.string().datetime(),
  retryCount: z.number().min(0),
  type: z.enum([
    "network",
    "parsing",
    "timeout",
    "auth",
    "rate_limit",
    "unknown",
  ]),
});

/**
 * Scraping metadata schema
 */
export const ScrapingMetadataSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  duration: z.number().min(0),
  totalSize: z.number().min(0),
  averageResponseTime: z.number().min(0),
  userAgent: z.string(),
  ipAddress: z.string().optional(),
  proxyUsed: z.boolean().optional(),
});

/**
 * Scraping results schema
 */
export const ScrapingResultsSchema = z.object({
  totalUrls: z.number().min(0),
  successful: z.number().min(0),
  failed: z.number().min(0),
  jobs: z.array(ExtractedJobSchema),
  errors: z.array(ScrapingErrorSchema),
  metadata: ScrapingMetadataSchema,
});

/**
 * Scraping job schema
 */
export const ScrapingJobSchema = z.object({
  id: z.string().uuid(),
  siteId: z.string().uuid(),
  urls: z.array(z.string().url()).min(1),
  credentials: JobSiteCredentialsSchema.optional(),
  config: ScrapingConfigSchema,
  status: ScrapingStatusSchema,
  createdAt: z.string().datetime(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  error: z.string().optional(),
  results: ScrapingResultsSchema.optional(),
});

/**
 * Discovery strategy schema
 */
export const DiscoveryStrategySchema = z.enum([
  "sitemap",
  "crawl",
  "search",
  "api",
  "custom",
]);

/**
 * Discovery configuration schema
 */
export const DiscoveryConfigSchema = z.object({
  strategy: DiscoveryStrategySchema,
  maxDepth: z.number().min(1).max(10),
  maxUrls: z.number().min(1).max(10000),
  allowedDomains: z.array(z.string().min(1)),
  blockedDomains: z.array(z.string().min(1)).default([]),
  allowedPaths: z.array(z.string().min(1)).default([]),
  blockedPaths: z.array(z.string().min(1)).default([]),
  respectRobotsTxt: z.boolean().default(true),
  delayBetweenRequests: z.number().min(0).max(60000),
  userAgent: z.string().min(1),
  customSelectors: z.record(z.string(), z.string()).optional(),
});

/**
 * Browser options schema
 */
export const BrowserOptionsSchema = z.object({
  headless: z.boolean().default(true),
  viewport: z.object({
    width: z.number().min(100).max(4000),
    height: z.number().min(100).max(4000),
  }),
  userAgent: z.string().optional(),
  timeout: z.number().min(1000).max(300000),
  waitForSelector: z.string().optional(),
  waitForTimeout: z.number().min(0).max(60000).optional(),
  scrollToBottom: z.boolean().default(false),
  screenshot: z.boolean().default(false),
  pdf: z.boolean().default(false),
  cookies: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

/**
 * Steel job data schema
 */
export const SteelJobDataSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().min(1),
  salary: z.string().optional(),
  description: z.string().min(1),
  requirements: z.string().optional(),
  postedAt: z.string().datetime().optional(),
  url: z.string().url(),
  source: z.string().min(1),
  rawData: z.record(z.string(), z.any()),
});

/**
 * Steel credentials schema
 */
export const SteelCredentialsSchema = z.object({
  linkedin: z
    .object({
      username: z.string().min(1),
      password: z.string().min(1),
    })
    .optional(),
  indeed: z
    .object({
      email: z.string().email(),
      password: z.string().min(1),
    })
    .optional(),
  monster: z
    .object({
      email: z.string().email(),
      password: z.string().min(1),
    })
    .optional(),
  generic: z
    .object({
      username: z.string().min(1),
      password: z.string().min(1),
      apiKey: z.string().optional(),
    })
    .optional(),
});

/**
 * Scraping message schema
 */
export const ScrapingMessageSchema = z.object({
  type: z.enum(["start", "progress", "complete", "error", "status"]),
  jobId: z.string().uuid(),
  data: z.any().optional(),
  timestamp: z.string().datetime(),
});

/**
 * Scraping progress schema
 */
export const ScrapingProgressSchema = z.object({
  jobId: z.string().uuid(),
  current: z.number().min(0),
  total: z.number().min(0),
  percentage: z.number().min(0).max(100),
  currentUrl: z.string().url(),
  status: ScrapingStatusSchema,
  errors: z.array(ScrapingErrorSchema),
});

/**
 * Scrape queue item schema
 */
export const ScrapeQueueItemSchema = z.object({
  id: z.string().uuid(),
  siteId: z.string().uuid(),
  urls: z.array(z.string().url()).min(1),
  priority: z.number().min(0).max(10),
  createdAt: z.string().datetime(),
  scheduledFor: z.string().datetime().optional(),
  retryCount: z.number().min(0),
  maxRetries: z.number().min(0).max(10),
  config: ScrapingConfigSchema,
  credentials: JobSiteCredentialsSchema.optional(),
});

/**
 * Queue status schema
 */
export const QueueStatusSchema = z.object({
  total: z.number().min(0),
  pending: z.number().min(0),
  running: z.number().min(0),
  completed: z.number().min(0),
  failed: z.number().min(0),
  paused: z.number().min(0),
});

/**
 * Scraping metrics schema
 */
export const ScrapingMetricsSchema = z.object({
  totalJobs: z.number().min(0),
  successfulJobs: z.number().min(0),
  failedJobs: z.number().min(0),
  averageDuration: z.number().min(0),
  averageJobsPerHour: z.number().min(0),
  errorRate: z.number().min(0).max(1),
  topErrors: z.array(
    z.object({
      error: z.string(),
      count: z.number().min(0),
    })
  ),
  sitePerformance: z.array(
    z.object({
      siteId: z.string().uuid(),
      successRate: z.number().min(0).max(1),
      averageDuration: z.number().min(0),
      totalJobs: z.number().min(0),
    })
  ),
});

/**
 * Validation result schema
 */
export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

/**
 * Scraping session schema
 */
export const ScrapingSessionSchema = z.object({
  id: z.string().uuid(),
  siteId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  status: ScrapingStatusSchema,
  urlsProcessed: z.number().min(0),
  jobsExtracted: z.number().min(0),
  errors: z.array(ScrapingErrorSchema),
  credentials: JobSiteCredentialsSchema.optional(),
  config: ScrapingConfigSchema,
});

/**
 * Request/Response schemas for API endpoints
 */

/**
 * Create scraping job request schema
 */
export const CreateScrapingJobRequestSchema = z.object({
  siteId: z.string().uuid(),
  urls: z.array(z.string().url()).min(1).max(1000),
  config: ScrapingConfigSchema.optional(),
  credentials: JobSiteCredentialsSchema.optional(),
});

/**
 * Update scraping job request schema
 */
export const UpdateScrapingJobRequestSchema = z.object({
  status: ScrapingStatusSchema.optional(),
  config: ScrapingConfigSchema.optional(),
  credentials: JobSiteCredentialsSchema.optional(),
});

/**
 * Scraping job response schema
 */
export const ScrapingJobResponseSchema = z.object({
  id: z.string().uuid(),
  siteId: z.string().uuid(),
  status: ScrapingStatusSchema,
  createdAt: z.string().datetime(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  progress: z
    .object({
      current: z.number().min(0),
      total: z.number().min(0),
      percentage: z.number().min(0).max(100),
    })
    .optional(),
  results: ScrapingResultsSchema.optional(),
  error: z.string().optional(),
});

/**
 * Scraping jobs list response schema
 */
export const ScrapingJobsListResponseSchema = z.object({
  jobs: z.array(ScrapingJobResponseSchema),
  pagination: z.object({
    page: z.number().min(1),
    limit: z.number().min(1).max(100),
    total: z.number().min(0),
    totalPages: z.number().min(0),
  }),
});

/**
 * Queue management request schemas
 */
export const AddToQueueRequestSchema = z.object({
  siteId: z.string().uuid(),
  urls: z.array(z.string().url()).min(1).max(1000),
  priority: z.number().min(0).max(10).default(5),
  scheduledFor: z.string().datetime().optional(),
  config: ScrapingConfigSchema.optional(),
  credentials: JobSiteCredentialsSchema.optional(),
});

/**
 * Queue status response schema
 */
export const QueueStatusResponseSchema = z.object({
  status: QueueStatusSchema,
  nextJob: ScrapeQueueItemSchema.optional(),
  estimatedWaitTime: z.number().min(0).optional(),
});

/**
 * Export all schemas for easy importing
 */
export {
  AddToQueueRequestSchema as AddToQueueRequest,
  BrowserOptionsSchema as BrowserOptions,
  CreateScrapingJobRequestSchema as CreateScrapingJobRequest,
  DiscoveryConfigSchema as DiscoveryConfig,
  DiscoveryStrategySchema as DiscoveryStrategy,
  ExtractedJobSchema as ExtractedJob,
  JobSiteSchema as JobSite,
  JobSiteCredentialsSchema as JobSiteCredentials,
  JobSiteSelectorsSchema as JobSiteSelectors,
  QueueStatusSchema as QueueStatus,
  QueueStatusResponseSchema as QueueStatusResponse,
  RateLimitConfigSchema as RateLimitConfig,
  ScrapeQueueItemSchema as ScrapeQueueItem,
  ScrapingConfigSchema as ScrapingConfig,
  ScrapingErrorSchema as ScrapingError,
  ScrapingJobSchema as ScrapingJob,
  ScrapingJobResponseSchema as ScrapingJobResponse,
  ScrapingJobsListResponseSchema as ScrapingJobsListResponse,
  ScrapingMessageSchema as ScrapingMessage,
  ScrapingMetadataSchema as ScrapingMetadata,
  ScrapingMetricsSchema as ScrapingMetrics,
  ScrapingProgressSchema as ScrapingProgress,
  ScrapingResultsSchema as ScrapingResults,
  ScrapingSessionSchema as ScrapingSession,
  ScrapingStatusSchema as ScrapingStatus,
  SteelCredentialsSchema as SteelCredentials,
  SteelJobDataSchema as SteelJobData,
  UpdateScrapingJobRequestSchema as UpdateScrapingJobRequest,
  ValidationResultSchema as ValidationResult,
};
