/**
 * @fileoverview Browser Integration Domain
 *
 * Comprehensive browser automation and rendering services using Cloudflare's
 * Browser Rendering API. Provides both basic browser functionality and
 * advanced render-api service with all 8 Cloudflare endpoints.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

// Basic Browser Rendering Service
export { BrowserRenderingService } from "./browser-rendering.service";
export type {
  BrowserRenderingEnv,
  BrowserRenderingResponse,
} from "./browser-rendering.service";
export type { ViewportOptions } from "./browser.types";

// Render API Service (All 8 Cloudflare Endpoints)
export { RenderAPIService, createRenderAPIService } from "./render-api.service";
export type {
  BaseRenderOptions,
  ContentResponse,
  JsonOptions,
  JsonResponse,
  LinksOptions,
  LinksResponse,
  MarkdownResponse,
  PDFOptions,
  PDFResponse,
  RenderAPIEnv,
  ScrapeOptions,
  ScrapeResponse,
  ScreenshotOptions,
  ScreenshotResponse,
  SnapshotResponse,
} from "./render-api.types";

// Routes
export { browserRoutes } from "./browser.routes";
export { renderApiRoutes } from "./render-api.routes";

// Types
export type {
  HealthCheckResponse,
  RenderAPIError,
  RenderAPIResponse,
  RenderAPISuccess,
} from "./render-api.types";
