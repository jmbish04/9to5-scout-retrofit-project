/**
 * @file Scraping Domain Types
 *
 * This file defines all TypeScript types and interfaces for the scraping domain
 * within the 9to5-Scout platform. It includes types for web crawling, job extraction,
 * browser automation, and scraping configuration.
 *
 * @author 9to5-Scout Development Team
 * @since 1.0.0
 */

/**
 * Environment interface for scraping operations
 */
export interface ScrapingEnv {
  DB: D1Database;
  R2: R2Bucket;
  AI: Ai;
  VECTORIZE_INDEX: VectorizeIndex;
  MYBROWSER: Fetcher;
  DEFAULT_MODEL_WEB_BROWSER: string;
  EMBEDDING_MODEL: string;
  STEEL_API_KEY?: string;
  LINKEDIN_USERNAME?: string;
  LINKEDIN_PASSWORD?: string;
}

/**
 * Job site credentials for authenticated scraping
 */
export interface JobSiteCredentials {
  site: JobSite;
  email?: string;
  password?: string;
  username?: string;
  apiKey?: string;
  cookies?: string;
  sessionId?: string;
  token?: string;
}

/**
 * Job site configuration
 */
export interface JobSite {
  id: string;
  name: string;
  baseUrl: string;
  loginUrl?: string;
  searchUrl?: string;
  requiresAuth: boolean;
  authType?: "form" | "oauth" | "api" | "session";
  selectors?: JobSiteSelectors;
  rateLimit?: RateLimitConfig;
  userAgent?: string;
  headers?: Record<string, string>;
}

/**
 * CSS selectors for job extraction
 */
export interface JobSiteSelectors {
  jobList: string;
  jobTitle: string;
  jobCompany: string;
  jobLocation: string;
  jobSalary?: string;
  jobDescription?: string;
  jobLink: string;
  nextPage?: string;
  pagination?: string;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  requestsPerMinute: number;
  delayBetweenRequests: number;
  maxConcurrentRequests: number;
  backoffMultiplier: number;
  maxRetries: number;
}

/**
 * Scraping job configuration
 */
export interface ScrapingJob {
  id: string;
  siteId: string;
  urls: string[];
  credentials?: JobSiteCredentials;
  config: ScrapingConfig;
  status: ScrapingStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  results?: ScrapingResults;
}

/**
 * Scraping configuration options
 */
export interface ScrapingConfig {
  maxConcurrent: number;
  timeout: number;
  retries: number;
  delay: number;
  userAgent?: string;
  headers?: Record<string, string>;
  cookies?: string;
  proxy?: string;
  followRedirects: boolean;
  extractImages: boolean;
  extractLinks: boolean;
  waitForSelector?: string;
  waitForTimeout?: number;
  scrollToBottom: boolean;
  screenshot: boolean;
  pdf: boolean;
}

/**
 * Scraping status enumeration
 */
export enum ScrapingStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
  PAUSED = "paused",
}

/**
 * Scraping results container
 */
export interface ScrapingResults {
  totalUrls: number;
  successful: number;
  failed: number;
  jobs: ExtractedJob[];
  errors: ScrapingError[];
  metadata: ScrapingMetadata;
}

/**
 * Extracted job data from scraping
 */
export interface ExtractedJob {
  id: string;
  url: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  requirements?: string;
  postedAt?: string;
  scrapedAt: string;
  source: string;
  confidence: number;
  rawData: Record<string, any>;
}

/**
 * Scraping error information
 */
export interface ScrapingError {
  url: string;
  error: string;
  timestamp: string;
  retryCount: number;
  type: "network" | "parsing" | "timeout" | "auth" | "rate_limit" | "unknown";
}

/**
 * Scraping metadata
 */
export interface ScrapingMetadata {
  startTime: string;
  endTime: string;
  duration: number;
  totalSize: number;
  averageResponseTime: number;
  userAgent: string;
  ipAddress?: string;
  proxyUsed?: boolean;
}

/**
 * Sitemap parsing result
 */
export interface SitemapResult {
  urls: string[];
  totalFound: number;
  lastModified?: string;
  hasIndex: boolean;
  subSitemaps?: string[];
}

/**
 * URL discovery strategy
 */
export enum DiscoveryStrategy {
  SITEMAP = "sitemap",
  CRAWL = "crawl",
  SEARCH = "search",
  API = "api",
  CUSTOM = "custom",
}

/**
 * Discovery configuration
 */
export interface DiscoveryConfig {
  strategy: DiscoveryStrategy;
  maxDepth: number;
  maxUrls: number;
  allowedDomains: string[];
  blockedDomains: string[];
  allowedPaths: string[];
  blockedPaths: string[];
  respectRobotsTxt: boolean;
  delayBetweenRequests: number;
  userAgent: string;
  customSelectors?: Record<string, string>;
}

/**
 * Browser automation options
 */
export interface BrowserOptions {
  headless: boolean;
  viewport: {
    width: number;
    height: number;
  };
  userAgent?: string;
  timeout: number;
  waitForSelector?: string;
  waitForTimeout?: number;
  scrollToBottom: boolean;
  screenshot: boolean;
  pdf: boolean;
  cookies?: string;
  headers?: Record<string, string>;
}

/**
 * Steel SDK specific types
 */
export interface SteelJobData {
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  requirements?: string;
  postedAt?: string;
  url: string;
  source: string;
  rawData: Record<string, any>;
}

export interface SteelCredentials {
  linkedin?: {
    username: string;
    password: string;
  };
  indeed?: {
    email: string;
    password: string;
  };
  monster?: {
    email: string;
    password: string;
  };
  generic?: {
    username: string;
    password: string;
    apiKey?: string;
  };
}

/**
 * WebSocket message types for real-time scraping
 */
export interface ScrapingMessage {
  type: "start" | "progress" | "complete" | "error" | "status";
  jobId: string;
  data?: any;
  timestamp: string;
}

export interface ScrapingProgress {
  jobId: string;
  current: number;
  total: number;
  percentage: number;
  currentUrl: string;
  status: ScrapingStatus;
  errors: ScrapingError[];
}

/**
 * Queue management types
 */
export interface ScrapeQueueItem {
  id: string;
  siteId: string;
  urls: string[];
  priority: number;
  createdAt: string;
  scheduledFor?: string;
  retryCount: number;
  maxRetries: number;
  config: ScrapingConfig;
  credentials?: JobSiteCredentials;
}

export interface QueueStatus {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  paused: number;
}

/**
 * Monitoring and analytics types
 */
export interface ScrapingMetrics {
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  averageDuration: number;
  averageJobsPerHour: number;
  errorRate: number;
  topErrors: Array<{
    error: string;
    count: number;
  }>;
  sitePerformance: Array<{
    siteId: string;
    successRate: number;
    averageDuration: number;
    totalJobs: number;
  }>;
}

/**
 * Configuration validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Scraping session information
 */
export interface ScrapingSession {
  id: string;
  siteId: string;
  startTime: string;
  endTime?: string;
  status: ScrapingStatus;
  urlsProcessed: number;
  jobsExtracted: number;
  errors: ScrapingError[];
  credentials?: JobSiteCredentials;
  config: ScrapingConfig;
}
