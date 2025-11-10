/**
 * @file src/api/middleware/request-logging.middleware.ts
 * @description Middleware for logging all worker requests
 */

import type { Context } from "hono";

export async function requestLoggingMiddleware(
  c: Context,
  next: () => Promise<void>
) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  try {
    // Get request details
    const endpoint = c.req.path;
    const method = c.req.method;
    const source = c.req.header("User-Agent") || "unknown";

    // Clone the request to read the body
    const clonedRequest = c.req.raw.clone();
    let requestBody = "";
    try {
      requestBody = await clonedRequest.text();
    } catch (error) {
      console.warn("Could not read request body:", error);
    }

    // Store request info in context for later logging
    c.set("requestId", requestId);
    c.set("requestStartTime", startTime);

    // Continue with the request
    await next();

    // Calculate processing time
    const processingTime = Date.now() - startTime;

    // Get response details
    const response = c.res;
    const responseBody = await response.clone().text();

    // Log to D1 (async, don't wait)
    c.executionCtx.waitUntil(
      logRequest(c.env, {
        id: requestId,
        timestamp,
        endpoint,
        method,
        source,
        requestBody,
        responseCode: response.status,
        responseBody: responseBody.substring(0, 5000), // Limit size
        processingTimeMs: processingTime,
      })
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;

    // Log error
    c.executionCtx.waitUntil(
      logRequest(c.env, {
        id: requestId,
        timestamp,
        endpoint: c.req.path,
        method: c.req.method,
        source: c.req.header("User-Agent") || "unknown",
        requestBody: "",
        responseCode: 500,
        processingTimeMs: processingTime,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      })
    );

    throw error;
  }
}

/**
 * Log a request to D1 database
 */
async function logRequest(
  env: any,
  logData: {
    id: string;
    timestamp: string;
    endpoint: string;
    method: string;
    source: string;
    requestBody: string;
    responseCode: number;
    responseBody?: string;
    processingTimeMs: number;
    errorMessage?: string;
  }
) {
  try {
    await env.DB.prepare(
      `INSERT INTO worker_request_logs (
        id, timestamp, endpoint, method, source, request_body, 
        response_code, response_body, processing_time_ms, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        logData.id,
        logData.timestamp,
        logData.endpoint,
        logData.method,
        logData.source,
        logData.requestBody.substring(0, 10000), // Limit size
        logData.responseCode,
        logData.responseBody || null,
        logData.processingTimeMs,
        logData.errorMessage || null
      )
      .run();
  } catch (error) {
    console.error("Failed to log request to database:", error);
  }
}
