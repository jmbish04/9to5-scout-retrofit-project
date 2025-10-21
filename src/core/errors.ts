/**
 * @module src/core/errors.ts
 * @description
 * Defines a robust, hierarchical set of custom error classes for professional-grade error handling.
 */

/**
 * Base error class for all application errors, providing consistent structure.
 */
export class ApplicationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      metadata: this.metadata,
    };
  }
}

/**
 * For errors related to invalid user input (400).
 */
export class ValidationError extends ApplicationError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", 400, metadata);
  }
}

/**
 * For when a requested resource cannot be found (404).
 */
export class NotFoundError extends ApplicationError {
  constructor(resource: string, id: string) {
    super(`${resource} with id '${id}' not found`, "NOT_FOUND", 404, { resource, id });
  }
}

/**
 * For critical, unexpected database errors (500).
 */
export class DatabaseError extends ApplicationError {
  constructor(message: string, originalError?: Error) {
    super(message, "DATABASE_ERROR", 500, {
      originalError: originalError?.message,
      stack: originalError?.stack,
    });
  }
}

/**
 * For errors communicating with external services (502/503).
 */
export class ExternalServiceError extends ApplicationError {
  constructor(service: string, message: string, statusCode: number = 502) {
    super(`${service} error: ${message}`, "EXTERNAL_SERVICE_ERROR", statusCode, { service });
  }
}

/**
 * For when a user exceeds their allowed request rate (429).
 */
export class RateLimitError extends ApplicationError {
  constructor(retryAfter?: number) {
    super("Rate limit exceeded", "RATE_LIMIT_EXCEEDED", 429, { retryAfter });
  }
}

/**
 * For attempts to create a resource that already exists (409).
 */
export class DuplicateError extends ApplicationError {
  constructor(resource: string, field: string, value: string) {
    super(`${resource} with ${field} '${value}' already exists`, "DUPLICATE_RESOURCE", 409, { resource, field, value });
  }
}