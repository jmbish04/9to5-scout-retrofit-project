/**
 * @fileoverview Render API Types
 *
 * TypeScript type definitions for the Cloudflare Browser Rendering API service.
 * Includes all request/response types for the 8 API endpoints.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * Base request options for all Browser Rendering endpoints
 */
export interface BaseRenderOptions {
  url?: string;
  html?: string;
  gotoOptions?: {
    waitUntil?: "load" | "domcontentloaded" | "networkidle0" | "networkidle2";
    timeout?: number;
  };
  waitForSelector?: string;
  waitForTimeout?: number;
  headers?: Record<string, string>;
  cookies?: Array<{
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
  }>;
  userAgent?: string;
  viewport?: {
    width: number;
    height: number;
    deviceScaleFactor?: number;
    isMobile?: boolean;
    hasTouch?: boolean;
    isLandscape?: boolean;
  };
  bestAttempt?: boolean;
  scripts?: Array<{
    content: string;
    type?: "text/javascript";
  }>;
  styles?: Array<{
    content: string;
    type?: "text/css";
  }>;
  httpAuth?: {
    username: string;
    password: string;
  };
  media?: "screen" | "print";
}

/**
 * Content endpoint response
 */
export interface ContentResponse {
  content: string;
}

/**
 * JSON extraction options
 */
export interface JsonOptions extends BaseRenderOptions {
  prompt?: string;
  schema?: Record<string, any>;
  custom_ai?: string;
}

/**
 * JSON endpoint response
 */
export interface JsonResponse {
  json: any;
}

/**
 * Links extraction options
 */
export interface LinksOptions extends BaseRenderOptions {
  visible?: boolean;
  external?: boolean;
}

/**
 * Link object
 */
export interface Link {
  href: string;
  text: string;
  visible: boolean;
  external: boolean;
}

/**
 * Links endpoint response
 */
export interface LinksResponse {
  links: Link[];
}

/**
 * Markdown endpoint response
 */
export interface MarkdownResponse {
  markdown: string;
}

/**
 * PDF generation options
 */
export interface PDFOptions extends BaseRenderOptions {
  pdfOptions?: {
    format?: "A4" | "A3" | "A2" | "A1" | "A0" | "Letter" | "Legal" | "Tabloid";
    landscape?: boolean;
    margin?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
    displayHeaderFooter?: boolean;
    headerTemplate?: string;
    footerTemplate?: string;
    printBackground?: boolean;
    scale?: number;
    width?: string;
    height?: string;
    preferCSSPageSize?: boolean;
  };
}

/**
 * PDF endpoint response
 */
export interface PDFResponse {
  pdf: string; // base64 encoded PDF
}

/**
 * Scrape options
 */
export interface ScrapeOptions extends BaseRenderOptions {
  selector?: string;
  attributes?: string[];
  includeText?: boolean;
  includeHTML?: boolean;
  includeGeometry?: boolean;
}

/**
 * Scraped element
 */
export interface ScrapedElement {
  selector: string;
  text?: string;
  html?: string;
  attributes?: Record<string, string>;
  geometry?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Scrape endpoint response
 */
export interface ScrapeResponse {
  elements: ScrapedElement[];
}

/**
 * Screenshot options
 */
export interface ScreenshotOptions extends BaseRenderOptions {
  screenshotOptions?: {
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
  };
  selector?: string;
  scrollPage?: boolean;
}

/**
 * Screenshot endpoint response
 */
export interface ScreenshotResponse {
  screenshot: string; // base64 encoded image
}

/**
 * Snapshot endpoint response
 */
export interface SnapshotResponse {
  content: string;
  screenshot: string; // base64 encoded image
}

/**
 * Environment interface for Render API Service
 */
export interface RenderAPIEnv {
  BROWSER_RENDERING_TOKEN: string;
  CLOUDFLARE_ACCOUNT_ID: string;
}

/**
 * API Error response
 */
export interface RenderAPIError {
  success: false;
  errors: string[];
  message?: string;
}

/**
 * API Success response
 */
export interface RenderAPISuccess<T = any> {
  success: true;
  result: T;
}

/**
 * Union type for API responses
 */
export type RenderAPIResponse<T = any> = RenderAPISuccess<T> | RenderAPIError;

/**
 * Health check response
 */
export interface HealthCheckResponse {
  service: string;
  status: "healthy" | "unhealthy";
  endpoints: string[];
  timestamp: string;
}
