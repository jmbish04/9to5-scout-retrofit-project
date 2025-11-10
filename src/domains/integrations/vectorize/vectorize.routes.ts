/**
 * @file src/domains/integrations/vectorize/vectorize.routes.ts
 * @description API routes for Vectorize integration
 */

import { Hono } from "hono";
import type { Env } from "../../../config/env";
import { VectorizeService } from "./vectorize.service";

const app = new Hono<{ Bindings: Env }>();

// Initialize service
const vectorizeService = new VectorizeService();

/**
 * @route POST /api/vectorize/embed
 * @description Generate and store an embedding
 */
app.post("/embed", async (c) => {
  try {
    const { text, metadata } = await c.req.json();

    if (!text) {
      return c.json({ error: "Text is required" }, 400);
    }

    const result = await vectorizeService.computeEmbedding(c.env, text);

    if (!result) {
      return c.json({ error: "Failed to generate embedding" }, 500);
    }

    return c.json({
      success: true,
      embedding: result.embedding,
      hash: result.hash,
      cleanText: result.cleanText,
    });
  } catch (error) {
    console.error("Error generating embedding:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * @route POST /api/vectorize/upsert
 * @description Store or update a vector in Vectorize
 */
app.post("/upsert", async (c) => {
  try {
    const { vectorId, embedding, metadata } = await c.req.json();

    if (!vectorId || !embedding || !metadata) {
      return c.json(
        { error: "vectorId, embedding, and metadata are required" },
        400
      );
    }

    await vectorizeService.upsertVector(c.env, vectorId, embedding, metadata);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error upserting vector:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * @route POST /api/vectorize/search
 * @description Search for similar vectors
 */
app.post("/search", async (c) => {
  try {
    const { query, limit = 10, filter } = await c.req.json();

    if (!query) {
      return c.json({ error: "Query is required" }, 400);
    }

    const results = await vectorizeService.searchSimilar(
      c.env,
      query,
      limit,
      filter
    );

    return c.json({
      success: true,
      results,
      count: results.length,
    });
  } catch (error) {
    console.error("Error searching vectors:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * @route GET /api/vectorize/check/:vectorId
 * @description Check if a vector should be reindexed
 */
app.get("/check/:vectorId", async (c) => {
  try {
    const vectorId = c.req.param("vectorId");
    const { hash } = c.req.query();

    if (!hash) {
      return c.json({ error: "Hash parameter is required" }, 400);
    }

    const shouldReindex = await vectorizeService.shouldReindex(
      c.env,
      vectorId,
      hash
    );

    return c.json({
      success: true,
      shouldReindex,
      vectorId,
      hash,
    });
  } catch (error) {
    console.error("Error checking reindex status:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;

