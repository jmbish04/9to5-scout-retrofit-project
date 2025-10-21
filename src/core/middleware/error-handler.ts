/**
 * @module src/core/middleware/error-handler.ts
 * @description
 * A global error handler middleware to ensure all errors are caught and
 * returned in a consistent, structured format.
 */

import { ApplicationError } from '../errors';

export async function errorHandler(error: Error, request: Request): Promise<Response> {
  // In a real app, you would also log the error here using a Logger service
  
  if (error instanceof ApplicationError) {
    console.error("[Application Error]", {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      metadata: error.metadata,
      url: request.url,
    });

    return new Response(JSON.stringify(error.toJSON()), {
      status: error.statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }

  // For unexpected errors
  console.error("[Unexpected Error]", {
    message: error.message,
    stack: error.stack,
    url: request.url,
  });

  return new Response(JSON.stringify({
    name: "InternalServerError",
    message: "An unexpected error occurred",
    code: "INTERNAL_SERVER_ERROR",
  }), { status: 500, headers: { "Content-Type": "application/json" } });
}
