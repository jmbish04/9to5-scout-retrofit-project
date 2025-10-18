/**
 * @fileoverview Browser Rendering API Routes
 *
 * RESTful API routes for browser rendering operations using Cloudflare's
 * Browser Rendering REST API. Provides endpoints for screenshots, content extraction,
 * PDF generation, and comprehensive web scraping with authentication support.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../../../config/env";
import {
  getValidatedBody,
  logger,
  rateLimit,
  validateBody,
} from "../../../core/validation/hono-validation";
import { createBrowserRenderingService } from "./browser-rendering.service";

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use("*", logger as any);
app.use("*", rateLimit({ requests: 50, windowMs: 60000 }) as any);

// Validation schemas
const ScreenshotRequestSchema = z.object({
  options: z.object({
    url: z.string().url(),
    screenshotOptions: z
      .object({
        fullPage: z.boolean().optional(),
        omitBackground: z.boolean().optional(),
        quality: z.number().min(0).max(100).optional(),
        type: z.enum(["png", "jpeg"]).optional(),
        clip: z
          .object({
            x: z.number(),
            y: z.number(),
            width: z.number(),
            height: z.number(),
          })
          .optional(),
      })
      .optional(),
    viewport: z
      .object({
        width: z.number(),
        height: z.number(),
        deviceScaleFactor: z.number().optional(),
        isMobile: z.boolean().optional(),
        hasTouch: z.boolean().optional(),
        isLandscape: z.boolean().optional(),
      })
      .optional(),
    gotoOptions: z
      .object({
        waitUntil: z
          .enum(["load", "domcontentloaded", "networkidle0", "networkidle2"])
          .optional(),
        timeout: z.number().positive().optional(),
      })
      .optional(),
    authenticate: z
      .object({
        username: z.string().optional(),
        password: z.string().optional(),
        apiKey: z.string().optional(),
        cookies: z.string().optional(),
        headers: z.record(z.string()).optional(),
      })
      .optional(),
  }),
});

const ContentRequestSchema = z.object({
  options: z.object({
    url: z.string().url(),
    viewport: z
      .object({
        width: z.number(),
        height: z.number(),
        deviceScaleFactor: z.number().optional(),
        isMobile: z.boolean().optional(),
        hasTouch: z.boolean().optional(),
        isLandscape: z.boolean().optional(),
      })
      .optional(),
    gotoOptions: z
      .object({
        waitUntil: z
          .enum(["load", "domcontentloaded", "networkidle0", "networkidle2"])
          .optional(),
        timeout: z.number().positive().optional(),
      })
      .optional(),
    authenticate: z
      .object({
        username: z.string().optional(),
        password: z.string().optional(),
        apiKey: z.string().optional(),
        cookies: z.string().optional(),
        headers: z.record(z.string()).optional(),
      })
      .optional(),
  }),
});

const PdfRequestSchema = z.object({
  options: z.object({
    url: z.string().url(),
    viewport: z
      .object({
        width: z.number(),
        height: z.number(),
        deviceScaleFactor: z.number().optional(),
        isMobile: z.boolean().optional(),
        hasTouch: z.boolean().optional(),
        isLandscape: z.boolean().optional(),
      })
      .optional(),
    gotoOptions: z
      .object({
        waitUntil: z
          .enum(["load", "domcontentloaded", "networkidle0", "networkidle2"])
          .optional(),
        timeout: z.number().positive().optional(),
      })
      .optional(),
    authenticate: z
      .object({
        username: z.string().optional(),
        password: z.string().optional(),
        apiKey: z.string().optional(),
        cookies: z.string().optional(),
        headers: z.record(z.string()).optional(),
      })
      .optional(),
  }),
});

const ScrapeRequestSchema = z.object({
  options: z.object({
    url: z.string().url(),
    viewport: z
      .object({
        width: z.number(),
        height: z.number(),
        deviceScaleFactor: z.number().optional(),
        isMobile: z.boolean().optional(),
        hasTouch: z.boolean().optional(),
        isLandscape: z.boolean().optional(),
      })
      .optional(),
    gotoOptions: z
      .object({
        waitUntil: z
          .enum(["load", "domcontentloaded", "networkidle0", "networkidle2"])
          .optional(),
        timeout: z.number().positive().optional(),
      })
      .optional(),
    authenticate: z
      .object({
        username: z.string().optional(),
        password: z.string().optional(),
        apiKey: z.string().optional(),
        cookies: z.string().optional(),
        headers: z.record(z.string()).optional(),
      })
      .optional(),
  }),
  elements: z.array(
    z.object({
      selector: z.string(),
      attribute: z.string().optional(),
      text: z.boolean().optional(),
      html: z.boolean().optional(),
    })
  ),
});

const MarkdownRequestSchema = z.object({
  options: z.object({
    url: z.string().url(),
    viewport: z
      .object({
        width: z.number(),
        height: z.number(),
        deviceScaleFactor: z.number().optional(),
        isMobile: z.boolean().optional(),
        hasTouch: z.boolean().optional(),
        isLandscape: z.boolean().optional(),
      })
      .optional(),
    gotoOptions: z
      .object({
        waitUntil: z
          .enum(["load", "domcontentloaded", "networkidle0", "networkidle2"])
          .optional(),
        timeout: z.number().positive().optional(),
      })
      .optional(),
    authenticate: z
      .object({
        username: z.string().optional(),
        password: z.string().optional(),
        apiKey: z.string().optional(),
        cookies: z.string().optional(),
        headers: z.record(z.string()).optional(),
      })
      .optional(),
  }),
});

const JsonRequestSchema = z.object({
  options: z.object({
    url: z.string().url(),
    viewport: z
      .object({
        width: z.number(),
        height: z.number(),
        deviceScaleFactor: z.number().optional(),
        isMobile: z.boolean().optional(),
        hasTouch: z.boolean().optional(),
        isLandscape: z.boolean().optional(),
      })
      .optional(),
    gotoOptions: z
      .object({
        waitUntil: z
          .enum(["load", "domcontentloaded", "networkidle0", "networkidle2"])
          .optional(),
        timeout: z.number().positive().optional(),
      })
      .optional(),
    authenticate: z
      .object({
        username: z.string().optional(),
        password: z.string().optional(),
        apiKey: z.string().optional(),
        cookies: z.string().optional(),
        headers: z.record(z.string()).optional(),
      })
      .optional(),
  }),
  prompt: z.string(),
  responseFormat: z.object({
    type: z.literal("json_schema"),
    schema: z.any(),
  }),
});

const LinksRequestSchema = z.object({
  options: z.object({
    url: z.string().url(),
    viewport: z
      .object({
        width: z.number(),
        height: z.number(),
        deviceScaleFactor: z.number().optional(),
        isMobile: z.boolean().optional(),
        hasTouch: z.boolean().optional(),
        isLandscape: z.boolean().optional(),
      })
      .optional(),
    gotoOptions: z
      .object({
        waitUntil: z
          .enum(["load", "domcontentloaded", "networkidle0", "networkidle2"])
          .optional(),
        timeout: z.number().positive().optional(),
      })
      .optional(),
    authenticate: z
      .object({
        username: z.string().optional(),
        password: z.string().optional(),
        apiKey: z.string().optional(),
        cookies: z.string().optional(),
        headers: z.record(z.string()).optional(),
      })
      .optional(),
  }),
});

const SnapshotRequestSchema = z.object({
  options: z.object({
    url: z.string().url(),
    viewport: z
      .object({
        width: z.number(),
        height: z.number(),
        deviceScaleFactor: z.number().optional(),
        isMobile: z.boolean().optional(),
        hasTouch: z.boolean().optional(),
        isLandscape: z.boolean().optional(),
      })
      .optional(),
    gotoOptions: z
      .object({
        waitUntil: z
          .enum(["load", "domcontentloaded", "networkidle0", "networkidle2"])
          .optional(),
        timeout: z.number().positive().optional(),
      })
      .optional(),
    authenticate: z
      .object({
        username: z.string().optional(),
        password: z.string().optional(),
        apiKey: z.string().optional(),
        cookies: z.string().optional(),
        headers: z.record(z.string()).optional(),
      })
      .optional(),
  }),
});

const ComprehensiveScrapeRequestSchema = z.object({
  url: z.string().url(),
  includeHtml: z.boolean().optional(),
  includeScreenshot: z.boolean().optional(),
  includePdf: z.boolean().optional(),
  includeMarkdown: z.boolean().optional(),
  includeJson: z.boolean().optional(),
  includeLinks: z.boolean().optional(),
  includeSnapshot: z.boolean().optional(),
  includeScraped: z.boolean().optional(),
  scrapeElements: z
    .array(
      z.object({
        selector: z.string(),
        attribute: z.string().optional(),
        text: z.boolean().optional(),
        html: z.boolean().optional(),
      })
    )
    .optional(),
  jsonPrompt: z.string().optional(),
  jsonSchema: z.any().optional(),
  authentication: z
    .object({
      username: z.string().optional(),
      password: z.string().optional(),
      apiKey: z.string().optional(),
      cookies: z.string().optional(),
      headers: z.record(z.string()).optional(),
    })
    .optional(),
  viewport: z
    .object({
      width: z.number(),
      height: z.number(),
      deviceScaleFactor: z.number().optional(),
      isMobile: z.boolean().optional(),
      hasTouch: z.boolean().optional(),
      isLandscape: z.boolean().optional(),
    })
    .optional(),
  screenshotOptions: z
    .object({
      fullPage: z.boolean().optional(),
      omitBackground: z.boolean().optional(),
      quality: z.number().min(0).max(100).optional(),
      type: z.enum(["png", "jpeg"]).optional(),
      clip: z
        .object({
          x: z.number(),
          y: z.number(),
          width: z.number(),
          height: z.number(),
        })
        .optional(),
    })
    .optional(),
  gotoOptions: z
    .object({
      waitUntil: z
        .enum(["load", "domcontentloaded", "networkidle0", "networkidle2"])
        .optional(),
      timeout: z.number().positive().optional(),
    })
    .optional(),
  jobId: z.string().optional(),
  siteId: z.string().optional(),
});

// Routes

/**
 * POST /browser/screenshot - Capture a screenshot of a webpage
 */
app.post("/screenshot", validateBody(ScreenshotRequestSchema), async (c) => {
  try {
    const { options } = getValidatedBody(c);
    const service = createBrowserRenderingService(c.env);
    const screenshot = await service.takeScreenshot(options as any);

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
    return c.json(
      {
        error: "Screenshot capture failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * POST /browser/content - Extract fully rendered HTML content from a webpage
 */
app.post("/content", validateBody(ContentRequestSchema), async (c) => {
  try {
    const { options } = getValidatedBody(c);
    const service = createBrowserRenderingService(c.env);
    const content = await service.getContent(options as any);

    return c.json({
      success: true,
      content,
      length: content.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Content extraction failed:", error);
    return c.json(
      {
        error: "Content extraction failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * POST /browser/pdf - Generate a PDF document from a webpage
 */
app.post("/pdf", validateBody(PdfRequestSchema), async (c) => {
  try {
    const { options } = getValidatedBody(c);
    const service = createBrowserRenderingService(c.env);
    const pdf = await service.generatePdf(options as any);

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
    return c.json(
      {
        error: "PDF generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * POST /browser/scrape - Scrape specific elements from a webpage
 */
app.post("/scrape", validateBody(ScrapeRequestSchema), async (c) => {
  try {
    const { options, elements } = getValidatedBody(c);
    const service = createBrowserRenderingService(c.env);
    const results = await service.scrapeElements({
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
    return c.json(
      {
        error: "Element scraping failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * POST /browser/markdown - Extract markdown content from a webpage
 */
app.post("/markdown", validateBody(MarkdownRequestSchema), async (c) => {
  try {
    const { options } = getValidatedBody(c);
    const service = createBrowserRenderingService(c.env);
    const markdown = await service.extractMarkdown(options as any);

    return c.json({
      success: true,
      markdown,
      length: markdown.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Markdown extraction failed:", error);
    return c.json(
      {
        error: "Markdown extraction failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * POST /browser/json - Extract structured JSON data from a webpage using AI
 */
app.post("/json", validateBody(JsonRequestSchema), async (c) => {
  try {
    const { options, prompt, responseFormat } = getValidatedBody(c);
    const service = createBrowserRenderingService(c.env);
    const jsonData = await service.extractJson({
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
    return c.json(
      {
        error: "JSON extraction failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * POST /browser/links - Extract all links from a webpage
 */
app.post("/links", validateBody(LinksRequestSchema), async (c) => {
  try {
    const { options } = getValidatedBody(c);
    const service = createBrowserRenderingService(c.env);
    const links = await service.getLinks(options as any);

    return c.json({
      success: true,
      links,
      count: links.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Link extraction failed:", error);
    return c.json(
      {
        error: "Link extraction failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * POST /browser/snapshot - Take a snapshot (screenshot + HTML) of a webpage
 */
app.post("/snapshot", validateBody(SnapshotRequestSchema), async (c) => {
  try {
    const { options } = getValidatedBody(c);
    const service = createBrowserRenderingService(c.env);
    const snapshot = await service.takeSnapshot(options as any);

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
    return c.json(
      {
        error: "Snapshot capture failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * POST /browser/comprehensive - Comprehensive web scraping with all content types and R2 storage
 */
app.post(
  "/comprehensive",
  validateBody(ComprehensiveScrapeRequestSchema),
  async (c) => {
    try {
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
      } = getValidatedBody(c);

      const service = createBrowserRenderingService(c.env);

      // Perform comprehensive scraping
      const result = await service.scrapeWebpage(url, {
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
        const storeResult = await service.storeResult(
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
      return c.json(
        {
          error: "Comprehensive scraping failed",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

/**
 * GET /browser/status - Get browser rendering service status and capabilities
 */
app.get("/status", async (c) => {
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
    return c.json(
      {
        error: "Failed to retrieve status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

export { app as browserRoutes };
