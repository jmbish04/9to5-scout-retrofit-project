/**
 * @file Browser Rendering API Routes
 *
 * This file contains all API routes for browser rendering operations using Cloudflare's
 * Browser Rendering REST API. It provides endpoints for screenshots, content extraction,
 * PDF generation, and comprehensive web scraping with authentication support.
 *
 * Key Components:
 * - `POST /screenshot`: Capture screenshots of webpages
 * - `POST /content`: Extract fully rendered HTML content
 * - `POST /pdf`: Generate PDF documents from webpages
 * - `POST /scrape`: Scrape specific elements from webpages
 * - `POST /markdown`: Extract markdown content from webpages
 * - `POST /json`: Extract structured JSON data using AI
 * - `POST /links`: Extract all links from webpages
 * - `POST /snapshot`: Take screenshots with HTML content
 * - `POST /comprehensive`: Comprehensive scraping with all content types
 * - `GET /status`: Get browser rendering service status
 *
 * Dependencies:
 * - Cloudflare Browser Rendering REST API
 * - R2 Storage for content persistence
 * - D1 Database for metadata storage
 * - Zod validation schemas for type safety
 * - Hono framework for HTTP routing
 */

import { Context, Hono } from "hono";
import {
  createBrowserRenderingClient,
  type BrowserRenderingEnv,
} from "../lib/browser-rendering";
import {
  cors,
  errorHandler,
  logger,
  rateLimit,
  validateBody,
} from "../lib/hono-validation";
import {
  ComprehensiveScrapeRequestSchema,
  ContentRequestSchema,
  JsonRequestSchema,
  LinksRequestSchema,
  MarkdownRequestSchema,
  PdfRequestSchema,
  ScrapeRequestSchema,
  ScreenshotRequestSchema,
  SnapshotRequestSchema,
  type ComprehensiveScrapeRequest,
  type ContentRequest,
  type ErrorResponse,
  type JsonRequest,
  type LinksRequest,
  type MarkdownRequest,
  type PdfRequest,
  type ScrapeRequest,
  type ScreenshotRequest,
  type SnapshotRequest,
} from "../lib/validation";

// Define the Hono context type with proper bindings
type HonoContext = Context<{
  Bindings: BrowserRenderingEnv;
  Variables: {
    validatedBody: Record<string, unknown>;
  };
}>;

const app = new Hono<{
  Bindings: BrowserRenderingEnv;
  Variables: {
    validatedBody: Record<string, unknown>;
  };
}>();

// Apply global middleware
app.use("*", cors());
app.use("*", logger());
app.use("*", rateLimit(50)); // 50 requests per minute for browser rendering
app.use("*", errorHandler());

/**
 * Capture a screenshot of a webpage
 *
 * @param c - The Hono context containing validated request body and environment bindings
 * @returns A JSON response containing the screenshot data or error information
 */
app.post(
  "/screenshot",
  validateBody(ScreenshotRequestSchema),
  async (c: HonoContext) => {
    try {
      const validatedBody = c.get("validatedBody") as ScreenshotRequest;
      const { options } = validatedBody;

      const client = createBrowserRenderingClient(c.env);
      const screenshot = await client.takeScreenshot(options as any);

      // Convert ArrayBuffer to base64 for JSON response
      const base64Screenshot = btoa(
        String.fromCharCode(...new Uint8Array(screenshot))
      );

      return c.json({
        success: true,
        screenshot: base64Screenshot,
        format: options.screenshotOptions?.type || "png",
        size: screenshot.byteLength,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Screenshot failed:", error);
      const errorResponse: ErrorResponse = {
        error: "Screenshot capture failed",
        details: error instanceof Error ? error.message : "Unknown error",
      };
      return c.json(errorResponse, 500);
    }
  }
);

/**
 * Extract fully rendered HTML content from a webpage
 *
 * @param c - The Hono context containing validated request body and environment bindings
 * @returns A JSON response containing the HTML content or error information
 */
app.post(
  "/content",
  validateBody(ContentRequestSchema),
  async (c: HonoContext) => {
    try {
      const validatedBody = c.get("validatedBody") as ContentRequest;
      const { options } = validatedBody;

      const client = createBrowserRenderingClient(c.env);
      const content = await client.getContent(options as any);

      return c.json({
        success: true,
        content,
        length: content.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Content extraction failed:", error);
      const errorResponse: ErrorResponse = {
        error: "Content extraction failed",
        details: error instanceof Error ? error.message : "Unknown error",
      };
      return c.json(errorResponse, 500);
    }
  }
);

/**
 * Generate a PDF document from a webpage
 *
 * @param c - The Hono context containing validated request body and environment bindings
 * @returns A JSON response containing the PDF data or error information
 */
app.post("/pdf", validateBody(PdfRequestSchema), async (c: HonoContext) => {
  try {
    const validatedBody = c.get("validatedBody") as PdfRequest;
    const { options } = validatedBody;

    const client = createBrowserRenderingClient(c.env);
    const pdf = await client.generatePdf(options as any);

    // Convert ArrayBuffer to base64 for JSON response
    const base64Pdf = btoa(String.fromCharCode(...new Uint8Array(pdf)));

    return c.json({
      success: true,
      pdf: base64Pdf,
      size: pdf.byteLength,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    const errorResponse: ErrorResponse = {
      error: "PDF generation failed",
      details: error instanceof Error ? error.message : "Unknown error",
    };
    return c.json(errorResponse, 500);
  }
});

/**
 * Scrape specific elements from a webpage
 *
 * @param c - The Hono context containing validated request body and environment bindings
 * @returns A JSON response containing the scraped elements or error information
 */
app.post(
  "/scrape",
  validateBody(ScrapeRequestSchema),
  async (c: HonoContext) => {
    try {
      const validatedBody = c.get("validatedBody") as ScrapeRequest;
      const { options, elements } = validatedBody;

      const client = createBrowserRenderingClient(c.env);
      const results = await client.scrapeElements({
        ...options,
        elements,
      } as any);

      return c.json({
        success: true,
        results,
        elementCount: results.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Element scraping failed:", error);
      const errorResponse: ErrorResponse = {
        error: "Element scraping failed",
        details: error instanceof Error ? error.message : "Unknown error",
      };
      return c.json(errorResponse, 500);
    }
  }
);

/**
 * Extract markdown content from a webpage
 *
 * @param c - The Hono context containing validated request body and environment bindings
 * @returns A JSON response containing the markdown content or error information
 */
app.post(
  "/markdown",
  validateBody(MarkdownRequestSchema),
  async (c: HonoContext) => {
    try {
      const validatedBody = c.get("validatedBody") as MarkdownRequest;
      const { options } = validatedBody;

      const client = createBrowserRenderingClient(c.env);
      const markdown = await client.extractMarkdown(options as any);

      return c.json({
        success: true,
        markdown,
        length: markdown.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Markdown extraction failed:", error);
      const errorResponse: ErrorResponse = {
        error: "Markdown extraction failed",
        details: error instanceof Error ? error.message : "Unknown error",
      };
      return c.json(errorResponse, 500);
    }
  }
);

/**
 * Extract structured JSON data from a webpage using AI
 *
 * @param c - The Hono context containing validated request body and environment bindings
 * @returns A JSON response containing the structured data or error information
 */
app.post("/json", validateBody(JsonRequestSchema), async (c: HonoContext) => {
  try {
    const validatedBody = c.get("validatedBody") as JsonRequest;
    const { options, prompt, responseFormat } = validatedBody;

    const client = createBrowserRenderingClient(c.env);
    const jsonData = await client.extractJson({
      ...options,
      prompt,
      responseFormat,
    } as any);

    return c.json({
      success: true,
      data: jsonData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("JSON extraction failed:", error);
    const errorResponse: ErrorResponse = {
      error: "JSON extraction failed",
      details: error instanceof Error ? error.message : "Unknown error",
    };
    return c.json(errorResponse, 500);
  }
});

/**
 * Extract all links from a webpage
 *
 * @param c - The Hono context containing validated request body and environment bindings
 * @returns A JSON response containing the links or error information
 */
app.post("/links", validateBody(LinksRequestSchema), async (c: HonoContext) => {
  try {
    const validatedBody = c.get("validatedBody") as LinksRequest;
    const { options } = validatedBody;

    const client = createBrowserRenderingClient(c.env);
    const links = await client.getLinks(options as any);

    return c.json({
      success: true,
      links,
      count: links.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Link extraction failed:", error);
    const errorResponse: ErrorResponse = {
      error: "Link extraction failed",
      details: error instanceof Error ? error.message : "Unknown error",
    };
    return c.json(errorResponse, 500);
  }
});

/**
 * Take a snapshot (screenshot + HTML) of a webpage
 *
 * @param c - The Hono context containing validated request body and environment bindings
 * @returns A JSON response containing the snapshot data or error information
 */
app.post(
  "/snapshot",
  validateBody(SnapshotRequestSchema),
  async (c: HonoContext) => {
    try {
      const validatedBody = c.get("validatedBody") as SnapshotRequest;
      const { options } = validatedBody;

      const client = createBrowserRenderingClient(c.env);
      const snapshot = await client.takeSnapshot(options as any);

      return c.json({
        success: true,
        snapshot: {
          screenshot: snapshot.screenshot,
          content: snapshot.content,
          contentLength: snapshot.content.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Snapshot capture failed:", error);
      const errorResponse: ErrorResponse = {
        error: "Snapshot capture failed",
        details: error instanceof Error ? error.message : "Unknown error",
      };
      return c.json(errorResponse, 500);
    }
  }
);

/**
 * Comprehensive web scraping with all content types and R2 storage
 *
 * This endpoint performs comprehensive web scraping including HTML, screenshots,
 * PDFs, markdown, JSON, links, and more. All content is stored in R2 and metadata
 * is saved to D1 database.
 *
 * @param c - The Hono context containing validated request body and environment bindings
 * @returns A JSON response containing comprehensive scraping results or error information
 */
app.post(
  "/comprehensive",
  validateBody(ComprehensiveScrapeRequestSchema),
  async (c: HonoContext) => {
    try {
      const validatedBody = c.get(
        "validatedBody"
      ) as ComprehensiveScrapeRequest;
      const {
        url,
        includeHtml,
        includeScreenshot,
        includePdf,
        includeMarkdown,
        includeJson,
        includeLinks,
        includeSnapshot,
        includeScraped,
        scrapeElements,
        jsonPrompt,
        jsonSchema,
        authentication,
        viewport,
        screenshotOptions,
        gotoOptions,
        jobId,
        siteId,
      } = validatedBody;

      const client = createBrowserRenderingClient(c.env);

      // Perform comprehensive scraping
      const result = await client.scrapeWebpage(url, {
        includeHtml,
        includeScreenshot,
        includePdf,
        includeMarkdown,
        includeJson,
        includeLinks,
        includeSnapshot,
        includeScraped,
        scrapeElements,
        jsonPrompt,
        jsonSchema,
        authentication: authentication as any,
        viewport,
        screenshotOptions,
        gotoOptions,
      });

      // Store result in D1 database if jobId is provided
      if (jobId) {
        const storeResult = await client.storeResult(
          c.env.DB,
          result,
          jobId,
          siteId
        );
        if (!storeResult.success) {
          console.warn(
            "Failed to store result in database:",
            storeResult.error
          );
        }
      }

      return c.json({
        success: true,
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Comprehensive scraping failed:", error);
      const errorResponse: ErrorResponse = {
        error: "Comprehensive scraping failed",
        details: error instanceof Error ? error.message : "Unknown error",
      };
      return c.json(errorResponse, 500);
    }
  }
);

/**
 * Get browser rendering service status and capabilities
 *
 * @param c - The Hono context containing environment bindings
 * @returns A JSON response containing service status and capabilities
 */
app.get("/status", async (c: HonoContext) => {
  try {
    const response = {
      status: "active",
      service: "Browser Rendering API",
      capabilities: [
        "Screenshot capture",
        "HTML content extraction",
        "PDF generation",
        "Element scraping",
        "Markdown extraction",
        "AI-powered JSON extraction",
        "Link extraction",
        "Snapshot capture",
        "Comprehensive scraping",
        "Authentication support",
        "R2 storage integration",
        "D1 database integration",
      ],
      endpoints: [
        "POST /screenshot",
        "POST /content",
        "POST /pdf",
        "POST /scrape",
        "POST /markdown",
        "POST /json",
        "POST /links",
        "POST /snapshot",
        "POST /comprehensive",
        "GET /status",
      ],
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    };

    return c.json(response);
  } catch (error) {
    console.error("Failed to get status:", error);
    const errorResponse: ErrorResponse = {
      error: "Failed to retrieve status",
      details: error instanceof Error ? error.message : "Unknown error",
    };
    return c.json(errorResponse, 500);
  }
});

export default app;
