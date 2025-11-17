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
export type {
  ScrapedElement as BrowserScrapedElement,
  ScreenshotOptions as BrowserScreenshotOptions,
} from "./browser/browser.types";

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
export { AIService } from "./ai/ai.service";
export type {
  JobExtractionResult as AIJobExtractionResult,
  AIServiceEnv,
  TextClassificationResult as AITextClassificationResult,
  VectorSearchResult as AIVectorSearchResult,
} from "./ai/ai.types";

// Re-export email integration
export { emailRoutes } from "./email/email.routes";
export { EmailService, type EmailServiceEnv } from "./email/email.service";
export type {
  EmailClassificationResult,
  EmailGenerationResult,
  EmailParseResult,
  EmailTemplateData,
} from "./email/email.types";

// Re-export talent API integration
export { talentRoutes } from "./talent/talent.routes";
export { TalentService, type TalentServiceEnv } from "./talent/talent.service";
export type {
  JobSearchParams,
  JobSearchResponse,
  JobSearchResult,
  SalaryRange,
} from "./talent/talent.types";

// Re-export WebSocket integration
export { websocketRoutes } from "./websocket/websocket.routes";
export {
  WebSocketService,
  type WebSocketConnection,
  type WebSocketMessage,
  type WebSocketMessageType,
  type WebSocketServiceEnv,
} from "./websocket/websocket.service";
export type {
  JobProcessingRequestData,
  JobProcessingResponseData,
  ScrapeRequestData,
  ScrapeResponseData,
  StatusUpdateData,
} from "./websocket/websocket.types";

// Re-export FastAPI integration
export { fastapiRoutes } from "./fastapi/fastapi.routes";
export * from "./fastapi/fastapi.service";

// Re-export Vectorize integration - check if vectorize.routes exports correctly
export * from "./vectorize/vectorize.service";
export type { VectorSearchResult as VectorizeVectorSearchResult } from "./vectorize/vectorize.types";

// Re-export RAG integration - check if rag.routes exports correctly
// export { ragRoutes } from "./rag/rag.routes";

// Re-export PDF integration - check if pdf.routes exports correctly
// export { pdfRoutes } from "./pdf/pdf.routes";

// Re-export shared types
export * from "./types/integration.types";
