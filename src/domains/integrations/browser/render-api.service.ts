/**
 * @fileoverview Cloudflare Browser Rendering API Service
 *
 * Comprehensive implementation of all 8 Cloudflare Browser Rendering REST API endpoints:
 * - Content: Returns rendered HTML content as a string
 * - Json: Extracts JSON using an LLM via prompt or schema
 * - Links: Returns arrays of links with visibility and external-filtering options
 * - Markdown: Returns page content as Markdown
 * - PDF: Streams a PDF render with pdfOptions
 * - Scrape: Returns element-level meta (text, html, attributes, geometry)
 * - Screenshot: Performs screenshots with screenshotOptions
 * - Snapshot: Returns both HTML content and a base64 screenshot
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import type { Env } from "../../config/env/env.config";

/**
 * Environment interface for Render API Service
 */
export interface RenderAPIEnv extends Env {
  BROWSER_RENDERING_TOKEN: string;
  CLOUDFLARE_ACCOUNT_ID: string;
}

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
 * Render API Service
 *
 * Provides comprehensive access to all 8 Cloudflare Browser Rendering API endpoints
 * with proper authentication, error handling, and response formatting.
 */
export class RenderAPIService {
  private env: RenderAPIEnv;
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(env: RenderAPIEnv) {
    this.env = env;
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering`;
    this.headers = {
      Authorization: `Bearer ${env.BROWSER_RENDERING_TOKEN}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Get rendered HTML content from a URL or HTML
   *
   * @param options - Content extraction options
   * @returns Promise<ContentResponse>
   */
  async getContent(options: BaseRenderOptions): Promise<ContentResponse> {
    const response = await this.makeRequest("/content", options);
    return response as ContentResponse;
  }

  /**
   * Extract JSON from a webpage using LLM
   *
   * @param options - JSON extraction options
   * @returns Promise<JsonResponse>
   */
  async getJson(options: JsonOptions): Promise<JsonResponse> {
    const response = await this.makeRequest("/json", options);
    return response as JsonResponse;
  }

  /**
   * Get links from a webpage
   *
   * @param options - Links extraction options
   * @returns Promise<LinksResponse>
   */
  async getLinks(options: LinksOptions): Promise<LinksResponse> {
    const response = await this.makeRequest("/links", options);
    return response as LinksResponse;
  }

  /**
   * Get page content as Markdown
   *
   * @param options - Markdown conversion options
   * @returns Promise<MarkdownResponse>
   */
  async getMarkdown(options: BaseRenderOptions): Promise<MarkdownResponse> {
    const response = await this.makeRequest("/markdown", options);
    return response as MarkdownResponse;
  }

  /**
   * Generate PDF from a webpage
   *
   * @param options - PDF generation options
   * @returns Promise<PDFResponse>
   */
  async getPDF(options: PDFOptions): Promise<PDFResponse> {
    const response = await this.makeRequest("/pdf", options);
    return response as PDFResponse;
  }

  /**
   * Scrape element metadata from a webpage
   *
   * @param options - Scraping options
   * @returns Promise<ScrapeResponse>
   */
  async scrape(options: ScrapeOptions): Promise<ScrapeResponse> {
    const response = await this.makeRequest("/scrape", options);
    return response as ScrapeResponse;
  }

  /**
   * Take a screenshot of a webpage
   *
   * @param options - Screenshot options
   * @returns Promise<ScreenshotResponse>
   */
  async getScreenshot(options: ScreenshotOptions): Promise<ScreenshotResponse> {
    const response = await this.makeRequest("/screenshot", options);
    return response as ScreenshotResponse;
  }

  /**
   * Get both HTML content and screenshot
   *
   * @param options - Snapshot options
   * @returns Promise<SnapshotResponse>
   */
  async getSnapshot(options: BaseRenderOptions): Promise<SnapshotResponse> {
    const response = await this.makeRequest("/snapshot", options);
    return response as SnapshotResponse;
  }

  /**
   * Make a request to the Cloudflare Browser Rendering API
   *
   * @param endpoint - API endpoint path
   * @param options - Request options
   * @returns Promise<any>
   */
  private async makeRequest(endpoint: string, options: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Browser Rendering API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const result = (await response.json()) as any;

      if (!result.success) {
        throw new Error(
          `Browser Rendering API failed: ${
            result.errors?.join(", ") || "Unknown error"
          }`
        );
      }

      return result.result;
    } catch (error) {
      console.error(`Error calling Browser Rendering API ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Validate required environment variables
   *
   * @param env - Environment object
   * @returns boolean
   */
  static validateEnvironment(env: any): env is RenderAPIEnv {
    return !!(env.BROWSER_RENDERING_TOKEN && env.CLOUDFLARE_ACCOUNT_ID);
  }
}

/**
 * Factory function to create a RenderAPIService instance
 *
 * @param env - Environment object
 * @returns RenderAPIService
 */
export function createRenderAPIService(env: RenderAPIEnv): RenderAPIService {
  if (!RenderAPIService.validateEnvironment(env)) {
    throw new Error(
      "Missing required environment variables for Render API Service"
    );
  }
  return new RenderAPIService(env);
}
