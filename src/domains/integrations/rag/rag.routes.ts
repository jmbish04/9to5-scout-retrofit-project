/**
 * @file src/domains/integrations/rag/rag.routes.ts
 * @description RAG API routes for document processing and querying
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "../../../config/env";
import { createRAGTool } from "../../../shared/tools";

const app = new Hono<{ Bindings: Env }>();

// Add CORS middleware
app.use("*", cors());

/**
 * @route POST /api/rag/documents
 * @description Store a new document for RAG processing
 */
app.post("/documents", async (c) => {
  try {
    const { text, metadata, enableChunking = true } = await c.req.json();

    if (!text) {
      return c.json({ error: "Text is required" }, 400);
    }

    // Trigger RAG workflow for processing
    const documentId = crypto.randomUUID();
    const workflow = await c.env.RAG_WORKFLOW.create({
      id: documentId,
      params: {
        text,
        documentId,
        metadata,
        enableChunking,
      },
    });

    return c.json({
      success: true,
      documentId,
      workflowId: workflow.id,
      message: "Document queued for processing",
    });
  } catch (error) {
    console.error("Error storing document:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * @route GET /api/rag/query
 * @description Query documents using RAG
 */
app.get("/query", async (c) => {
  try {
    const query = c.req.query("q");
    const contentType = c.req.query("type") || "document";
    const limit = parseInt(c.req.query("limit") || "5");

    if (!query) {
      return c.json({ error: 'Query parameter "q" is required' }, 400);
    }

    const ragTool = createRAGTool(c.env);
    const context = await ragTool.retrieveContext(query, contentType, limit);

    return c.json({
      success: true,
      query,
      contentType,
      results: context.results,
      totalResults: context.totalResults,
    });
  } catch (error) {
    console.error("Error querying documents:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * @route POST /api/rag/generate
 * @description Generate AI response with RAG context
 */
app.post("/generate", async (c) => {
  try {
    const {
      query,
      contentType = "document",
      contextLimit = 3,
      systemPrompt,
    } = await c.req.json();

    if (!query) {
      return c.json({ error: "Query is required" }, 400);
    }

    const ragTool = createRAGTool(c.env);
    const response = await ragTool.generateWithContext(
      query,
      contentType,
      contextLimit,
      systemPrompt
    );

    return c.json({
      success: true,
      query,
      response: response.response,
      modelUsed: response.modelUsed,
    });
  } catch (error) {
    console.error("Error generating response:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * @route POST /api/rag/chunk
 * @description Chunk text for processing
 */
app.post("/chunk", async (c) => {
  try {
    const { text, chunkSize = 1000, chunkOverlap = 200 } = await c.req.json();

    if (!text) {
      return c.json({ error: "Text is required" }, 400);
    }

    const ragTool = createRAGTool(c.env);
    const chunks = await ragTool.chunkText(text, chunkSize, chunkOverlap);

    return c.json({
      success: true,
      chunks: chunks.length,
      textLength: text.length,
      chunks: chunks,
    });
  } catch (error) {
    console.error("Error chunking text:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * @route GET /api/rag/insights
 * @description Get job market insights using RAG
 */
app.get("/insights", async (c) => {
  try {
    const query = c.req.query("q");

    if (!query) {
      return c.json({ error: 'Query parameter "q" is required' }, 400);
    }

    const ragTool = createRAGTool(c.env);
    const insights = await ragTool.getJobMarketInsights(query);

    return c.json({
      success: true,
      query,
      insights,
    });
  } catch (error) {
    console.error("Error getting insights:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * @route GET /api/rag/health
 * @description Health check for RAG service
 */
app.get("/health", async (c) => {
  try {
    const ragTool = createRAGTool(c.env);

    // Test basic functionality
    const testQuery = "test query";
    const context = await ragTool.retrieveContext(testQuery, "document", 1);

    return c.json({
      success: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
      testQuery: testQuery,
      contextRetrieved: context.results.length > 0,
    });
  } catch (error) {
    console.error("RAG health check failed:", error);
    return c.json(
      {
        success: false,
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

export default app;

