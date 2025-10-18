/**
 * @fileoverview Integrations Domain Entry Point
 *
 * Re-exports all public modules from the integrations domain for easier access.
 * This includes browser rendering, AI services, email processing, talent API,
 * and WebSocket functionality.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

// Re-export browser integration
export { browserRoutes } from "./browser/browser.routes";
export * from "./browser/browser.types";

// Re-export render-api integration (All 8 Cloudflare Browser Rendering endpoints)
export { renderApiRoutes } from "./browser/render-api.routes";
export * from "./browser/render-api.service";
export type {
  BaseRenderOptions,
  ContentResponse,
  HealthCheckResponse,
  JsonOptions,
  JsonResponse,
  Link,
  LinksOptions,
  LinksResponse,
  MarkdownResponse,
  PDFOptions,
  PDFResponse,
  RenderAPIEnv,
  RenderAPIError,
  RenderAPISuccess,
  ScrapeOptions,
  SnapshotResponse,
} from "./browser/render-api.types";

// Re-export AI integration
export { aiRoutes } from "./ai/ai.routes";
export * from "./ai/ai.service";
export * from "./ai/ai.types";

// Re-export email integration
export { emailRoutes } from "./email/email.routes";
export * from "./email/email.service";
export * from "./email/email.types";

// Re-export talent API integration
export { talentRoutes } from "./talent/talent.routes";
export * from "./talent/talent.service";
export * from "./talent/talent.types";

// Re-export WebSocket integration
export { websocketRoutes } from "./websocket/websocket.routes";
export * from "./websocket/websocket.service";
export * from "./websocket/websocket.types";

// Re-export FastAPI integration
export { fastapiRoutes } from "./fastapi/fastapi.routes";
export * from "./fastapi/fastapi.service";

// Re-export shared types
export * from "./types/integration.types";
