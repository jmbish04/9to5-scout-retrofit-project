/**
 * @fileoverview Response Utility Functions
 *
 * Utility functions for creating consistent API responses
 * across all domains in the 9to5 Scout platform.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { API_MESSAGES, HTTP_STATUS } from "../constants/api.constants";
import {
  ApiResponse,
  ErrorResponse,
  PaginationResponse,
  SuccessResponse,
} from "../types/common.types";

/**
 * Response utility functions
 */
export class ResponseUtils {
  /**
   * Creates a success response
   */
  static success<T>(
    data: T,
    message?: string,
    statusCode = HTTP_STATUS.OK
  ): SuccessResponse<T> {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: crypto.randomUUID(),
        version: "1.0.0",
      },
    };
  }

  /**
   * Creates an error response
   */
  static error(
    code: string,
    message: string,
    statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    details?: Record<string, unknown>
  ): ErrorResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: crypto.randomUUID(),
        version: "1.0.0",
      },
    };
  }

  /**
   * Creates a validation error response
   */
  static validationError(
    errors: Array<{ field: string; message: string; value?: unknown }>,
    message = API_MESSAGES.VALIDATION_ERROR
  ): ErrorResponse {
    return this.error(
      "VALIDATION_ERROR",
      message,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      {
        validation_errors: errors,
      }
    );
  }

  /**
   * Creates a not found error response
   */
  static notFound(resource: string, id?: string): ErrorResponse {
    const message = id
      ? `${resource} with ID '${id}' not found`
      : `${resource} not found`;
    return this.error("NOT_FOUND", message, HTTP_STATUS.NOT_FOUND);
  }

  /**
   * Creates an unauthorized error response
   */
  static unauthorized(message = API_MESSAGES.UNAUTHORIZED): ErrorResponse {
    return this.error("UNAUTHORIZED", message, HTTP_STATUS.UNAUTHORIZED);
  }

  /**
   * Creates a forbidden error response
   */
  static forbidden(message = API_MESSAGES.FORBIDDEN): ErrorResponse {
    return this.error("FORBIDDEN", message, HTTP_STATUS.FORBIDDEN);
  }

  /**
   * Creates a conflict error response
   */
  static conflict(
    message = API_MESSAGES.CONFLICT,
    details?: Record<string, unknown>
  ): ErrorResponse {
    return this.error("CONFLICT", message, HTTP_STATUS.CONFLICT, details);
  }

  /**
   * Creates a rate limit error response
   */
  static rateLimited(
    message = API_MESSAGES.RATE_LIMITED,
    retryAfter?: number
  ): ErrorResponse {
    const response = this.error(
      "RATE_LIMIT_EXCEEDED",
      message,
      HTTP_STATUS.TOO_MANY_REQUESTS
    );
    if (retryAfter) {
      response.meta = {
        ...response.meta,
        retry_after: retryAfter,
      };
    }
    return response;
  }

  /**
   * Creates a paginated response
   */
  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    message?: string
  ): PaginationResponse<T> {
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    };
  }

  /**
   * Creates a created response
   */
  static created<T>(
    data: T,
    message = API_MESSAGES.CREATED
  ): SuccessResponse<T> {
    return this.success(data, message, HTTP_STATUS.CREATED);
  }

  /**
   * Creates an updated response
   */
  static updated<T>(
    data: T,
    message = API_MESSAGES.UPDATED
  ): SuccessResponse<T> {
    return this.success(data, message, HTTP_STATUS.OK);
  }

  /**
   * Creates a deleted response
   */
  static deleted(message = API_MESSAGES.DELETED): SuccessResponse<null> {
    return this.success(null, message, HTTP_STATUS.NO_CONTENT);
  }

  /**
   * Creates a no content response
   */
  static noContent(): SuccessResponse<null> {
    return this.success(null, "", HTTP_STATUS.NO_CONTENT);
  }

  /**
   * Creates a bad request error response
   */
  static badRequest(
    message = API_MESSAGES.INVALID_REQUEST,
    details?: Record<string, unknown>
  ): ErrorResponse {
    return this.error("BAD_REQUEST", message, HTTP_STATUS.BAD_REQUEST, details);
  }

  /**
   * Creates an internal server error response
   */
  static internalError(
    message = API_MESSAGES.INTERNAL_ERROR,
    details?: Record<string, unknown>
  ): ErrorResponse {
    return this.error(
      "INTERNAL_ERROR",
      message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      details
    );
  }

  /**
   * Creates a service unavailable error response
   */
  static serviceUnavailable(
    message = "Service temporarily unavailable",
    details?: Record<string, unknown>
  ): ErrorResponse {
    return this.error(
      "SERVICE_UNAVAILABLE",
      message,
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      details
    );
  }

  /**
   * Creates a gateway timeout error response
   */
  static gatewayTimeout(
    message = "Gateway timeout",
    details?: Record<string, unknown>
  ): ErrorResponse {
    return this.error(
      "GATEWAY_TIMEOUT",
      message,
      HTTP_STATUS.GATEWAY_TIMEOUT,
      details
    );
  }

  /**
   * Creates a method not allowed error response
   */
  static methodNotAllowed(
    method: string,
    allowedMethods: string[],
    message?: string
  ): ErrorResponse {
    const errorMessage = message || `Method '${method}' not allowed`;
    return this.error(
      "METHOD_NOT_ALLOWED",
      errorMessage,
      HTTP_STATUS.METHOD_NOT_ALLOWED,
      {
        allowed_methods: allowedMethods,
      }
    );
  }

  /**
   * Creates a not implemented error response
   */
  static notImplemented(feature?: string): ErrorResponse {
    const message = feature
      ? `Feature '${feature}' not implemented`
      : "Not implemented";
    return this.error("NOT_IMPLEMENTED", message, HTTP_STATUS.NOT_IMPLEMENTED);
  }

  /**
   * Creates a custom error response
   */
  static customError(
    code: string,
    message: string,
    statusCode: number,
    details?: Record<string, unknown>
  ): ErrorResponse {
    return this.error(code, message, statusCode, details);
  }

  /**
   * Creates a custom success response
   */
  static customSuccess<T>(
    data: T,
    message: string,
    statusCode: number
  ): SuccessResponse<T> {
    return this.success(data, message, statusCode);
  }

  /**
   * Wraps a response with additional metadata
   */
  static withMetadata<T>(
    response: ApiResponse<T>,
    metadata: Record<string, unknown>
  ): ApiResponse<T> {
    return {
      ...response,
      meta: {
        ...response.meta,
        ...metadata,
      },
    };
  }

  /**
   * Creates a response with cache headers
   */
  static withCache<T>(
    response: ApiResponse<T>,
    ttl: number,
    etag?: string,
    lastModified?: string
  ): ApiResponse<T> {
    return {
      ...response,
      meta: {
        ...response.meta,
        cache: {
          ttl,
          etag,
          last_modified: lastModified,
        },
      },
    };
  }

  /**
   * Creates a response with rate limit info
   */
  static withRateLimit<T>(
    response: ApiResponse<T>,
    limit: number,
    remaining: number,
    reset: number
  ): ApiResponse<T> {
    return {
      ...response,
      meta: {
        ...response.meta,
        rate_limit: {
          limit,
          remaining,
          reset,
        },
      },
    };
  }

  /**
   * Creates a response with pagination info
   */
  static withPagination<T>(
    response: ApiResponse<T>,
    page: number,
    limit: number,
    total: number
  ): ApiResponse<T> {
    const totalPages = Math.ceil(total / limit);

    return {
      ...response,
      meta: {
        ...response.meta,
        pagination: {
          page,
          limit,
          total,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1,
        },
      },
    };
  }

  /**
   * Creates a response with error details
   */
  static withErrorDetails<T>(
    response: ErrorResponse,
    field: string,
    message: string,
    value?: unknown
  ): ErrorResponse {
    if (!response.error.details) {
      response.error.details = {};
    }

    if (!response.error.details.validation_errors) {
      response.error.details.validation_errors = [];
    }

    (
      response.error.details.validation_errors as Array<{
        field: string;
        message: string;
        value?: unknown;
      }>
    ).push({
      field,
      message,
      value,
    });

    return response;
  }

  /**
   * Creates a response with success details
   */
  static withSuccessDetails<T>(
    response: SuccessResponse<T>,
    key: string,
    value: unknown
  ): SuccessResponse<T> {
    if (!response.meta) {
      response.meta = {
        timestamp: new Date().toISOString(),
        request_id: crypto.randomUUID(),
        version: "1.0.0",
      };
    }

    (response.meta as Record<string, unknown>)[key] = value;

    return response;
  }
}
