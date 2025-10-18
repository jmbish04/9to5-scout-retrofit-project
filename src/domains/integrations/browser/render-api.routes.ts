/**
 * @fileoverview Render API Routes
 *
 * Hono routes for all 8 Cloudflare Browser Rendering API endpoints.
 * Provides a comprehensive REST API interface for browser automation tasks.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { Hono } from "hono";
import { z } from "zod";
import { ResponseUtils } from "../../../shared/utils/response.utils";
import {
  createRenderAPIService,
  type RenderAPIEnv,
} from "./render-api.service";

const renderApiRoutes = new Hono<{ Bindings: RenderAPIEnv }>();

// Validation schemas
const BaseRenderOptionsSchema = z.object({
  url: z.string().url().optional(),
  html: z.string().optional(),
  gotoOptions: z
    .object({
      waitUntil: z
        .enum(["load", "domcontentloaded", "networkidle0", "networkidle2"])
        .optional(),
      timeout: z.number().optional(),
    })
    .optional(),
  waitForSelector: z.string().optional(),
  waitForTimeout: z.number().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  cookies: z
    .array(
      z.object({
        name: z.string(),
        value: z.string(),
        domain: z.string().optional(),
        path: z.string().optional(),
        expires: z.number().optional(),
        httpOnly: z.boolean().optional(),
        secure: z.boolean().optional(),
        sameSite: z.enum(["Strict", "Lax", "None"]).optional(),
      })
    )
    .optional(),
  userAgent: z.string().optional(),
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
  bestAttempt: z.boolean().optional(),
  scripts: z
    .array(
      z.object({
        content: z.string(),
        type: z.literal("text/javascript").optional(),
      })
    )
    .optional(),
  styles: z
    .array(
      z.object({
        content: z.string(),
        type: z.literal("text/css").optional(),
      })
    )
    .optional(),
  httpAuth: z
    .object({
      username: z.string(),
      password: z.string(),
    })
    .optional(),
  media: z.enum(["screen", "print"]).optional(),
});

const JsonOptionsSchema = BaseRenderOptionsSchema.extend({
  prompt: z.string().optional(),
  schema: z.record(z.string(), z.any()).optional(),
  custom_ai: z.string().optional(),
});

const LinksOptionsSchema = BaseRenderOptionsSchema.extend({
  visible: z.boolean().optional(),
  external: z.boolean().optional(),
});

const PDFOptionsSchema = BaseRenderOptionsSchema.extend({
  pdfOptions: z
    .object({
      format: z
        .enum(["A4", "A3", "A2", "A1", "A0", "Letter", "Legal", "Tabloid"])
        .optional(),
      landscape: z.boolean().optional(),
      margin: z
        .object({
          top: z.string().optional(),
          right: z.string().optional(),
          bottom: z.string().optional(),
          left: z.string().optional(),
        })
        .optional(),
      displayHeaderFooter: z.boolean().optional(),
      headerTemplate: z.string().optional(),
      footerTemplate: z.string().optional(),
      printBackground: z.boolean().optional(),
      scale: z.number().optional(),
      width: z.string().optional(),
      height: z.string().optional(),
      preferCSSPageSize: z.boolean().optional(),
    })
    .optional(),
});

const ScrapeOptionsSchema = BaseRenderOptionsSchema.extend({
  selector: z.string().optional(),
  attributes: z.array(z.string()).optional(),
  includeText: z.boolean().optional(),
  includeHTML: z.boolean().optional(),
  includeGeometry: z.boolean().optional(),
});

const ScreenshotOptionsSchema = BaseRenderOptionsSchema.extend({
  screenshotOptions: z
    .object({
      fullPage: z.boolean().optional(),
      omitBackground: z.boolean().optional(),
      quality: z.number().optional(),
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
  selector: z.string().optional(),
  scrollPage: z.boolean().optional(),
});

/**
 * GET /api/render/content - Get rendered HTML content
 */
renderApiRoutes.post("/api/render/content", async (c) => {
  try {
    const body = await c.req.json();
    const options = BaseRenderOptionsSchema.parse(body);

    const renderService = createRenderAPIService(c.env as RenderAPIEnv);
    const result = await renderService.getContent(options);

    return c.json(
      ResponseUtils.success(result, "Content extracted successfully"),
      200
    );
  } catch (error) {
    console.error("Error in content endpoint:", error);
    return c.json(
      ResponseUtils.error(
        "CONTENT_EXTRACTION_ERROR",
        "Failed to extract content",
        500,
        { error: error instanceof Error ? error.message : String(error) }
      ),
      500
    );
  }
});

/**
 * POST /api/render/json - Extract JSON from webpage using LLM
 */
renderApiRoutes.post("/api/render/json", async (c) => {
  try {
    const body = await c.req.json();
    const options = JsonOptionsSchema.parse(body);

    const renderService = createRenderAPIService(c.env as RenderAPIEnv);
    const result = await renderService.getJson(options);

    return c.json(
      ResponseUtils.success(result, "JSON extracted successfully"),
      200
    );
  } catch (error) {
    console.error("Error in json endpoint:", error);
    return c.json(
      ResponseUtils.error(
        "JSON_EXTRACTION_ERROR",
        "Failed to extract JSON",
        500,
        { error: error instanceof Error ? error.message : String(error) }
      ),
      500
    );
  }
});

/**
 * POST /api/render/links - Get links from webpage
 */
renderApiRoutes.post("/api/render/links", async (c) => {
  try {
    const body = await c.req.json();
    const options = LinksOptionsSchema.parse(body);

    const renderService = createRenderAPIService(c.env as RenderAPIEnv);
    const result = await renderService.getLinks(options);

    return c.json(
      ResponseUtils.success(result, "Links extracted successfully"),
      200
    );
  } catch (error) {
    console.error("Error in links endpoint:", error);
    return c.json(
      ResponseUtils.error(
        "LINKS_EXTRACTION_ERROR",
        "Failed to extract links",
        500,
        { error: error instanceof Error ? error.message : String(error) }
      ),
      500
    );
  }
});

/**
 * POST /api/render/markdown - Get page content as Markdown
 */
renderApiRoutes.post("/api/render/markdown", async (c) => {
  try {
    const body = await c.req.json();
    const options = BaseRenderOptionsSchema.parse(body);

    const renderService = createRenderAPIService(c.env as RenderAPIEnv);
    const result = await renderService.getMarkdown(options);

    return c.json(
      ResponseUtils.success(result, "Markdown generated successfully"),
      200
    );
  } catch (error) {
    console.error("Error in markdown endpoint:", error);
    return c.json(
      ResponseUtils.error(
        "MARKDOWN_GENERATION_ERROR",
        "Failed to generate markdown",
        500,
        { error: error instanceof Error ? error.message : String(error) }
      ),
      500
    );
  }
});

/**
 * POST /api/render/pdf - Generate PDF from webpage
 */
renderApiRoutes.post("/api/render/pdf", async (c) => {
  try {
    const body = await c.req.json();
    const options = PDFOptionsSchema.parse(body);

    const renderService = createRenderAPIService(c.env as RenderAPIEnv);
    const result = await renderService.getPDF(options);

    return c.json(
      ResponseUtils.success(result, "PDF generated successfully"),
      200
    );
  } catch (error) {
    console.error("Error in pdf endpoint:", error);
    return c.json(
      ResponseUtils.error(
        "PDF_GENERATION_ERROR",
        "Failed to generate PDF",
        500,
        { error: error instanceof Error ? error.message : String(error) }
      ),
      500
    );
  }
});

/**
 * POST /api/render/scrape - Scrape element metadata from webpage
 */
renderApiRoutes.post("/api/render/scrape", async (c) => {
  try {
    const body = await c.req.json();
    const options = ScrapeOptionsSchema.parse(body);

    const renderService = createRenderAPIService(c.env as RenderAPIEnv);
    const result = await renderService.scrape(options);

    return c.json(
      ResponseUtils.success(result, "Elements scraped successfully"),
      200
    );
  } catch (error) {
    console.error("Error in scrape endpoint:", error);
    return c.json(
      ResponseUtils.error("SCRAPE_ERROR", "Failed to scrape elements", 500, {
        error: error instanceof Error ? error.message : String(error),
      }),
      500
    );
  }
});

/**
 * POST /api/render/screenshot - Take screenshot of webpage
 */
renderApiRoutes.post("/api/render/screenshot", async (c) => {
  try {
    const body = await c.req.json();
    const options = ScreenshotOptionsSchema.parse(body);

    const renderService = createRenderAPIService(c.env as RenderAPIEnv);
    const result = await renderService.getScreenshot(options);

    return c.json(
      ResponseUtils.success(result, "Screenshot captured successfully"),
      200
    );
  } catch (error) {
    console.error("Error in screenshot endpoint:", error);
    return c.json(
      ResponseUtils.error(
        "SCREENSHOT_ERROR",
        "Failed to capture screenshot",
        500,
        { error: error instanceof Error ? error.message : String(error) }
      ),
      500
    );
  }
});

/**
 * POST /api/render/snapshot - Get both HTML content and screenshot
 */
renderApiRoutes.post("/api/render/snapshot", async (c) => {
  try {
    const body = await c.req.json();
    const options = BaseRenderOptionsSchema.parse(body);

    const renderService = createRenderAPIService(c.env as RenderAPIEnv);
    const result = await renderService.getSnapshot(options);

    return c.json(
      ResponseUtils.success(result, "Snapshot captured successfully"),
      200
    );
  } catch (error) {
    console.error("Error in snapshot endpoint:", error);
    return c.json(
      ResponseUtils.error("SNAPSHOT_ERROR", "Failed to capture snapshot", 500, {
        error: error instanceof Error ? error.message : String(error),
      }),
      500
    );
  }
});

/**
 * GET /api/render/health - Health check endpoint
 */
renderApiRoutes.get("/api/render/health", async (c) => {
  try {
    const renderService = createRenderAPIService(c.env as RenderAPIEnv);

    return c.json(
      ResponseUtils.success(
        {
          service: "render-api",
          status: "healthy",
          endpoints: [
            "POST /api/render/content",
            "POST /api/render/json",
            "POST /api/render/links",
            "POST /api/render/markdown",
            "POST /api/render/pdf",
            "POST /api/render/scrape",
            "POST /api/render/screenshot",
            "POST /api/render/snapshot",
          ],
        },
        "Render API service is healthy"
      ),
      200
    );
  } catch (error) {
    console.error("Error in health check:", error);
    return c.json(
      ResponseUtils.error(
        "HEALTH_CHECK_ERROR",
        "Render API service is unhealthy",
        500,
        { error: error instanceof Error ? error.message : String(error) }
      ),
      500
    );
  }
});

export { renderApiRoutes };
