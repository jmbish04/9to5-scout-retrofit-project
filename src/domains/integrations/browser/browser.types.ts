/**
 * @fileoverview Browser Integration Types
 *
 * Type definitions for browser rendering and automation functionality.
 * Includes interfaces for screenshots, content extraction, PDF generation,
 * and structured data extraction with authentication support.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * Browser rendering environment configuration
 */
export interface BrowserRenderingEnv {
  BROWSER_RENDERING_TOKEN: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  R2: R2Bucket;
  BUCKET_BASE_URL: string;
  DB: D1Database;
}

/**
 * Generic API response wrapper
 */
export interface BrowserRenderingResponse<T = any> {
  success: boolean;
  result: T;
  errors?: string[];
}

/**
 * Screenshot capture options
 */
export interface ScreenshotOptions {
  fullPage?: boolean;
  omitBackground?: boolean;
  quality?: number;
  type?: "png" | "jpeg";
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Browser viewport configuration
 */
export interface ViewportOptions {
  width: number;
  height: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
  isLandscape?: boolean;
}

/**
 * Page navigation options
 */
export interface GotoOptions {
  waitUntil?: "load" | "domcontentloaded" | "networkidle0" | "networkidle2";
  timeout?: number;
}

/**
 * Element scraping configuration
 */
export interface ScrapeElement {
  selector: string;
  attribute?: string;
  text?: boolean;
  html?: boolean;
}

/**
 * Authentication options for protected pages
 */
export interface AuthenticationOptions {
  username?: string;
  password?: string;
  apiKey?: string;
  cookies?: string;
  headers?: Record<string, string>;
}

/**
 * Browser rendering request options
 */
export interface BrowserRenderingOptions {
  url?: string;
  html?: string;
  userAgent?: string;
  viewport?: ViewportOptions;
  screenshotOptions?: ScreenshotOptions;
  gotoOptions?: GotoOptions;
  authenticate?: AuthenticationOptions;
  rejectResourceTypes?: string[];
  rejectRequestPattern?: string[];
  allowResourceTypes?: string[];
  allowRequestPattern?: string[];
  visibleLinksOnly?: boolean;
  addScriptTag?: Array<{ content: string } | { url: string }>;
  addStyleTag?: Array<{ content: string } | { url: string }>;
  setJavaScriptEnabled?: boolean;
}

/**
 * Scraped element data
 */
export interface ScrapedElement {
  text: string;
  html: string;
  attributes: Record<string, string>;
  height: number;
  width: number;
  top: number;
  left: number;
}

/**
 * Element scraping result
 */
export interface ScrapeResult {
  selector: string;
  results: ScrapedElement[];
}

/**
 * Snapshot result (screenshot + HTML)
 */
export interface SnapshotResult {
  screenshot: string; // Base64 encoded
  content: string; // HTML content
}

/**
 * Links extraction result
 */
export interface LinksResult {
  links: string[];
}

/**
 * Markdown extraction result
 */
export interface MarkdownResult {
  markdown: string;
}

/**
 * JSON extraction result
 */
export interface JsonResult {
  output: any;
}

/**
 * Content extraction result
 */
export interface ContentResult {
  content: string; // HTML content
}

/**
 * PDF generation result
 */
export interface PdfResult {
  pdf: ArrayBuffer;
}

/**
 * Comprehensive browser rendering result
 */
export interface BrowserRenderingResult {
  id: string;
  url: string;
  timestamp: string;
  html?: {
    r2Key: string;
    r2Url: string;
    size: number;
  };
  screenshot?: {
    r2Key: string;
    r2Url: string;
    size: number;
  };
  pdf?: {
    r2Key: string;
    r2Url: string;
    size: number;
  };
  markdown?: {
    r2Key: string;
    r2Url: string;
    size: number;
  };
  json?: {
    r2Key: string;
    r2Url: string;
    size: number;
    data: any;
  };
  links?: {
    r2Key: string;
    r2Url: string;
    size: number;
    links: string[];
  };
  snapshot?: {
    r2Key: string;
    r2Url: string;
    size: number;
    screenshot: string;
    content: string;
  };
  scraped?: {
    r2Key: string;
    r2Url: string;
    size: number;
    results: ScrapeResult[];
  };
  httpStatus?: number;
  error?: string;
}

/**
 * Web scraping job configuration
 */
export interface ScrapingJob {
  id: string;
  url: string;
  options: BrowserRenderingOptions;
  priority: "low" | "normal" | "high" | "urgent";
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  scheduledFor?: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  result?: BrowserRenderingResult;
  error?: string;
}

/**
 * Browser automation session
 */
export interface BrowserSession {
  id: string;
  userAgent: string;
  viewport: ViewportOptions;
  cookies: Record<string, string>;
  headers: Record<string, string>;
  createdAt: string;
  lastUsedAt: string;
  isActive: boolean;
}

/**
 * Browser performance metrics
 */
export interface BrowserMetrics {
  pageLoadTime: number;
  domContentLoadedTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  totalBlockingTime: number;
  memoryUsage: number;
  networkRequests: number;
  failedRequests: number;
}

/**
 * Browser error information
 */
export interface BrowserError {
  type: "network" | "javascript" | "timeout" | "authentication" | "unknown";
  message: string;
  stack?: string;
  url?: string;
  timestamp: string;
  retryable: boolean;
}
