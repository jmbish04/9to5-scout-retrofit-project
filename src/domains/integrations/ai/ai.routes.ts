/**
 * @fileoverview AI Integration API Routes
 *
 * RESTful API routes for AI-powered functionality including job extraction,
 * content analysis, text classification, embeddings, and vector search.
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
import { createAIService } from "./ai.service";
import type { AIServiceEnv } from "./ai.types";

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use("*", logger as any);
app.use("*", rateLimit({ requests: 100, windowMs: 60000 }) as any);

// Validation schemas
const JobExtractionRequestSchema = z.object({
  html: z.string().min(1),
  url: z.string().url(),
  site: z.string().min(1),
});

const ContentAnalysisRequestSchema = z.object({
  content: z.string().min(1),
  contentType: z.string().optional().default("general"),
});

const TextClassificationRequestSchema = z.object({
  text: z.string().min(1),
  categories: z.array(z.string()).min(1),
});

const TextSummarizationRequestSchema = z.object({
  text: z.string().min(1),
  maxLength: z.number().positive().optional().default(200),
});

const EmbeddingRequestSchema = z.object({
  text: z.string().min(1),
});

const VectorSearchRequestSchema = z.object({
  query: z.string().min(1),
  topK: z.number().positive().max(100).optional().default(10),
});

const StoreEmbeddingRequestSchema = z.object({
  text: z.string().min(1),
  metadata: z.record(z.string(), z.any()),
});

// Routes

/**
 * POST /ai/extract-job - Extract structured job data from HTML content
 */
app.post(
  "/extract-job",
  validateBody(JobExtractionRequestSchema),
  async (c) => {
    try {
      const { html, url, site } = getValidatedBody(c);
      const service = createAIService(c.env as AIServiceEnv);
      const result = await service.extractJob(html, url, site);

      if (!result) {
        return c.json(
          {
            success: false,
            error: "Failed to extract job data",
          },
          400
        );
      }

      return c.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Job extraction failed:", error);
      return c.json(
        {
          success: false,
          error: "Job extraction failed",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

/**
 * POST /ai/analyze-content - Analyze content for sentiment, key points, and entities
 */
app.post(
  "/analyze-content",
  validateBody(ContentAnalysisRequestSchema),
  async (c) => {
    try {
      const { content, contentType } = getValidatedBody(c);
      const service = createAIService(c.env as AIServiceEnv);
      const result = await service.analyzeContent(content, contentType);

      return c.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Content analysis failed:", error);
      return c.json(
        {
          success: false,
          error: "Content analysis failed",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

/**
 * POST /ai/classify-text - Classify text into predefined categories
 */
app.post(
  "/classify-text",
  validateBody(TextClassificationRequestSchema),
  async (c) => {
    try {
      const { text, categories } = getValidatedBody(c);
      const service = createAIService(c.env as AIServiceEnv);
      const result = await service.classifyText(text, categories);

      return c.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Text classification failed:", error);
      return c.json(
        {
          success: false,
          error: "Text classification failed",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

/**
 * POST /ai/summarize-text - Generate a summary of text content
 */
app.post(
  "/summarize-text",
  validateBody(TextSummarizationRequestSchema),
  async (c) => {
    try {
      const { text, maxLength } = getValidatedBody(c);
      const service = createAIService(c.env as AIServiceEnv);
      const result = await service.summarizeText(text, maxLength);

      return c.json({
        success: true,
        summary: result,
        length: result.length,
        maxLength,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Text summarization failed:", error);
      return c.json(
        {
          success: false,
          error: "Text summarization failed",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

/**
 * POST /ai/embed-text - Generate embeddings for text
 */
app.post("/embed-text", validateBody(EmbeddingRequestSchema), async (c) => {
  try {
    const { text } = getValidatedBody(c);
    const service = createAIService(c.env as AIServiceEnv);
    const embedding = await service.embedText(text);

    if (!embedding) {
      return c.json(
        {
          success: false,
          error: "Failed to generate embedding",
        },
        400
      );
    }

    return c.json({
      success: true,
      embedding,
      dimensions: embedding.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Embedding generation failed:", error);
    return c.json(
      {
        success: false,
        error: "Embedding generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * POST /ai/search-similar - Search for similar content using vector embeddings
 */
app.post(
  "/search-similar",
  validateBody(VectorSearchRequestSchema),
  async (c) => {
    try {
      const { query, topK } = getValidatedBody(c);
      const service = createAIService(c.env as AIServiceEnv);
      const results = await service.searchSimilar(query, topK);

      return c.json({
        success: true,
        results,
        count: results.length,
        query,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Vector search failed:", error);
      return c.json(
        {
          success: false,
          error: "Vector search failed",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

/**
 * POST /ai/store-embedding - Generate and store embeddings in Vectorize
 */
app.post(
  "/store-embedding",
  validateBody(StoreEmbeddingRequestSchema),
  async (c) => {
    try {
      const { text, metadata } = getValidatedBody(c);
      const service = createAIService(c.env as AIServiceEnv);
      const result = await service.storeEmbedding(text, metadata);

      if (!result.success) {
        return c.json(
          {
            success: false,
            error: result.error || "Failed to store embedding",
          },
          400
        );
      }

      return c.json({
        success: true,
        message: "Embedding stored successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Embedding storage failed:", error);
      return c.json(
        {
          success: false,
          error: "Embedding storage failed",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

/**
 * GET /ai/status - Get AI service status and capabilities
 */
app.get("/status", async (c) => {
  try {
    const response = {
      status: "active",
      service: "AI Integration Service",
      capabilities: [
        "Job extraction from HTML",
        "Content analysis and sentiment",
        "Text classification",
        "Text summarization",
        "Embedding generation",
        "Vector search",
        "Structured data extraction",
        "AI-powered insights",
      ],
      models: {
        web_browser: c.env.DEFAULT_MODEL_WEB_BROWSER,
        reasoning: c.env.DEFAULT_MODEL_REASONING,
        embedding: c.env.EMBEDDING_MODEL,
      },
      endpoints: [
        "POST /extract-job",
        "POST /analyze-content",
        "POST /classify-text",
        "POST /summarize-text",
        "POST /embed-text",
        "POST /search-similar",
        "POST /store-embedding",
        "GET /status",
      ],
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    };

    return c.json(response);
  } catch (error) {
    console.error("Failed to get AI status:", error);
    return c.json(
      {
        success: false,
        error: "Failed to retrieve AI status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * GET /ai/health - Get AI service health metrics
 */
app.get("/health", async (c) => {
  try {
    // Test AI service availability
    const service = createAIService(c.env as AIServiceEnv);
    const testEmbedding = await service.embedText("test");

    const health = {
      status: testEmbedding ? "healthy" : "degraded",
      ai_service: "available",
      vectorize: "available",
      last_checked: new Date().toISOString(),
      uptime_seconds: 0, // This would be calculated from service start time
      error_count: 0, // This would be tracked over time
    };

    return c.json(health);
  } catch (error) {
    console.error("AI health check failed:", error);
    return c.json(
      {
        status: "unhealthy",
        ai_service: "unavailable",
        vectorize: "unknown",
        last_checked: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

export { app as aiRoutes };
