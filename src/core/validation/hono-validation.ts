/**
 * @file Hono Validation Middleware
 *
 * This file provides validation middleware for Hono applications within the 9to5-Scout platform.
 * It includes CORS, error handling, logging, rate limiting, and request validation utilities.
 *
 * @author 9to5-Scout Development Team
 * @version 1.0.0
 * @since 2025-01-17
 */

import { Context, Next } from "hono";
import { z } from "zod";

// Custom context variables for validation
const VALIDATED_BODY_KEY = "validatedBody";
const VALIDATED_PARAMS_KEY = "validatedParams";

/**
 * Helper function to get validated body from context
 */
export function getValidatedBody(c: Context): any {
  return c.get(VALIDATED_BODY_KEY);
}

/**
 * Helper function to get validated params from context
 */
export function getValidatedParams(c: Context): any {
  return c.get(VALIDATED_PARAMS_KEY);
}

/**
 * CORS middleware for Hono applications
 */
export function cors() {
  return async (c: Context, next: Next): Promise<void | Response> => {
    c.header("Access-Control-Allow-Origin", "*");
    c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (c.req.method === "OPTIONS") {
      return c.text("", 200);
    }

    await next();
  };
}

/**
 * Error handling middleware for Hono applications
 */
export function errorHandler() {
  return async (c: Context, next: Next): Promise<void | Response> => {
    try {
      await next();
    } catch (error) {
      console.error("Request error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  };
}

/**
 * Logging middleware for Hono applications
 */
export function logger() {
  return async (c: Context, next: Next): Promise<void> => {
    const start = Date.now();
    await next();
    const duration = Date.now() - start;
    console.log(
      `${c.req.method} ${c.req.url} - ${c.res.status} (${duration}ms)`
    );
  };
}

/**
 * Rate limiting middleware for Hono applications
 */
export function rateLimit(options: { requests: number; windowMs: number }) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return async (c: Context, next: Next): Promise<void | Response> => {
    const key = c.req.header("cf-connecting-ip") || "unknown";
    const now = Date.now();
    const windowStart = now - options.windowMs;

    const current = requests.get(key);

    if (!current || current.resetTime < windowStart) {
      requests.set(key, { count: 1, resetTime: now });
    } else if (current.count >= options.requests) {
      return c.json({ error: "Rate limit exceeded" }, 429);
    } else {
      current.count++;
    }

    await next();
  };
}

/**
 * Request body validation middleware
 */
export function validateBody(schema: z.ZodSchema) {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json();
      const validated = schema.parse(body);
      c.set(VALIDATED_BODY_KEY, validated);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json(
          { error: "Validation error", details: error.issues },
          400
        );
      }
      return c.json({ error: "Invalid JSON" }, 400);
    }
  };
}

/**
 * Request parameters validation middleware
 */
export function validateParams(schema: z.ZodSchema) {
  return async (c: Context, next: Next) => {
    try {
      const params = c.req.param();
      const validated = schema.parse(params);
      c.set(VALIDATED_PARAMS_KEY, validated);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json(
          { error: "Parameter validation error", details: error.issues },
          400
        );
      }
      return c.json({ error: "Invalid parameters" }, 400);
    }
  };
}

/**
 * Request query validation middleware
 */
export function validateQuery(schema: z.ZodSchema) {
  return async (c: Context, next: Next) => {
    try {
      const query = c.req.query();
      const validated = schema.parse(query);
      c.set("validatedQuery", validated);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json(
          { error: "Query validation error", details: error.issues },
          400
        );
      }
      return c.json({ error: "Invalid query parameters" }, 400);
    }
  };
}

/**
 * Helper function to get validated query from context
 */
export function getValidatedQuery(c: Context): any {
  return c.get("validatedQuery");
}

/**
 * Validates query parameters using Zod schema (standalone function)
 */
export function validateQueryParams<T extends z.ZodTypeAny>(
  schema: T,
  query: Record<string, string | string[] | undefined>
): z.infer<T> {
  return schema.parse(query);
}
