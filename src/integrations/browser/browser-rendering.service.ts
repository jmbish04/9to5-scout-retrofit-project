/**
 * Cloudflare Browser Rendering API Integration Module
 *
 * Provides a comprehensive interface for web scraping using Cloudflare's Browser Rendering REST API.
 * This module handles all browser automation tasks including screenshots, content extraction,
 * PDF generation, and structured data extraction with authentication support.
 */

import { R2Storage } from "../../../lib/r2";

// Environment interface for Browser Rendering
export interface BrowserRenderingEnv {
  BROWSER_RENDERING_TOKEN: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  R2: R2Bucket;
  BUCKET_BASE_URL: string;
  DB: D1Database;
}

// Browser Rendering API response types
export interface BrowserRenderingResponse<T = any> {
  success: boolean;
  result: T;
  errors?: string[];
}

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

export interface ViewportOptions {
  width: number;
  height: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
  isLandscape?: boolean;
}

export interface GotoOptions {
  waitUntil?: "load" | "domcontentloaded" | "networkidle0" | "networkidle2";
  timeout?: number;
}

export interface ScrapeElement {
  selector: string;
  attribute?: string;
  text?: boolean;
  html?: boolean;
}

export interface AuthenticationOptions {
  username?: string;
  password?: string;
  apiKey?: string;
  cookies?: string;
  headers?: Record<string, string>;
}

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

export interface ScrapedElement {
  text: string;
  html: string;
  attributes: Record<string, string>;
  height: number;
  width: number;
  top: number;
  left: number;
}

export interface ScrapeResult {
  selector: string;
  results: ScrapedElement[];
}

export interface SnapshotResult {
  screenshot: string; // Base64 encoded
  content: string; // HTML content
}

export interface LinksResult {
  links: string[];
}

export interface MarkdownResult {
  markdown: string;
}

export interface JsonResult {
  output: any;
}

export interface ContentResult {
  content: string; // HTML content
}

export interface PdfResult {
  pdf: ArrayBuffer;
}

export class BrowserRenderingClient {
  private baseUrl: string;
  private accountId: string;
  private apiToken: string;
  private r2Storage: R2Storage;

  constructor(env: BrowserRenderingEnv) {
    this.baseUrl = "https://api.cloudflare.com/client/v4/accounts";
    this.accountId = env.CLOUDFLARE_ACCOUNT_ID;
    this.apiToken = env.BROWSER_RENDERING_TOKEN;
    this.r2Storage = new R2Storage(env.R2, env.BUCKET_BASE_URL);
  }

  /**
   * Make authenticated request to Browser Rendering API
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<BrowserRenderingResponse<T>> {
    const url = `${this.baseUrl}/${this.accountId}/browser-rendering/${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Browser Rendering API error: ${response.status} ${errorText}`
      );
    }

    return await response.json();
  }

  /**
   * Take a screenshot of a webpage
   */
  async takeScreenshot(
    options: BrowserRenderingOptions & { screenshotOptions?: ScreenshotOptions }
  ): Promise<ArrayBuffer> {
    const response = await this.makeRequest<ArrayBuffer>("screenshot", {
      method: "POST",
      body: JSON.stringify(options),
    });

    if (!response.success) {
      throw new Error("Failed to take screenshot");
    }

    return response.result;
  }

  /**
   * Get fully rendered HTML content
   */
  async getContent(options: BrowserRenderingOptions): Promise<string> {
    const response = await this.makeRequest<ContentResult>("content", {
      method: "POST",
      body: JSON.stringify(options),
    });

    if (!response.success) {
      throw new Error("Failed to get content");
    }

    return response.result.content;
  }

  /**
   * Generate PDF from webpage
   */
  async generatePdf(options: BrowserRenderingOptions): Promise<ArrayBuffer> {
    const response = await this.makeRequest<ArrayBuffer>("pdf", {
      method: "POST",
      body: JSON.stringify(options),
    });

    if (!response.success) {
      throw new Error("Failed to generate PDF");
    }

    return response.result;
  }

  /**
   * Scrape specific elements from webpage
   */
  async scrapeElements(
    options: BrowserRenderingOptions & { elements: ScrapeElement[] }
  ): Promise<ScrapeResult[]> {
    const response = await this.makeRequest<{ results: ScrapeResult[] }>(
      "scrape",
      {
        method: "POST",
        body: JSON.stringify(options),
      }
    );

    if (!response.success) {
      throw new Error("Failed to scrape elements");
    }

    return response.result.results;
  }

  /**
   * Extract markdown from webpage
   */
  async extractMarkdown(options: BrowserRenderingOptions): Promise<string> {
    const response = await this.makeRequest<MarkdownResult>("markdown", {
      method: "POST",
      body: JSON.stringify(options),
    });

    if (!response.success) {
      throw new Error("Failed to extract markdown");
    }

    return response.result.markdown;
  }

  /**
   * Extract structured JSON data using AI
   */
  async extractJson(
    options: BrowserRenderingOptions & {
      prompt: string;
      responseFormat: {
        type: "json_schema";
        schema: any;
      };
    }
  ): Promise<any> {
    const response = await this.makeRequest<JsonResult>("json", {
      method: "POST",
      body: JSON.stringify(options),
    });

    if (!response.success) {
      throw new Error("Failed to extract JSON");
    }

    return response.result.output;
  }

  /**
   * Get all links from webpage
   */
  async getLinks(options: BrowserRenderingOptions): Promise<string[]> {
    const response = await this.makeRequest<LinksResult>("links", {
      method: "POST",
      body: JSON.stringify(options),
    });

    if (!response.success) {
      throw new Error("Failed to get links");
    }

    return response.result.links;
  }

  /**
   * Take a snapshot (screenshot + HTML) of webpage
   */
  async takeSnapshot(
    options: BrowserRenderingOptions
  ): Promise<SnapshotResult> {
    const response = await this.makeRequest<SnapshotResult>("snapshot", {
      method: "POST",
      body: JSON.stringify(options),
    });

    if (!response.success) {
      throw new Error("Failed to take snapshot");
    }

    return response.result;
  }
}

/**
 * Factory function to create BrowserRenderingClient
 */
export function createBrowserRenderingClient(
  env: BrowserRenderingEnv
): BrowserRenderingClient {
  return new BrowserRenderingClient(env);
}
