/**
 * @fileoverview Response Helper Utilities
 *
 * Utility functions for creating consistent API responses across all domains
 * in the 9to5 Scout platform.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import type { 
  SuccessResponse, 
  ErrorResponse, 
  PaginatedResponse,
  ValidationErrorResponse 
} from "../types/common.types";

/**
 * Creates a success response
 * @param data Response data
 * @param message Optional success message
 * @param meta Optional metadata
 * @returns Success response object
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  meta?: Record<string, any>
): SuccessResponse<T> {
  const response: SuccessResponse<T> = {
    success: true,
    data,
  };
  
  if (message) {
    response.message = message;
  }
  
  if (meta) {
    response.meta = meta;
  }
  
  return response;
}

/**
 * Creates an error response
 * @param error Error message
 * @param code Optional error code
 * @param details Optional error details
 * @param statusCode Optional HTTP status code
 * @returns Error response object
 */
export function createErrorResponse(
  error: string,
  code?: string,
  details?: Record<string, any>,
  statusCode?: number
): ErrorResponse {
  const response: ErrorResponse = {
    success: false,
    error,
    message: error,
  };
  
  if (code) {
    response.code = code;
  }
  
  if (details) {
    response.details = details;
  }
  
  if (statusCode) {
    (response as any).statusCode = statusCode;
  }
  
  return response;
}

/**
 * Creates a paginated response
 * @param data Array of data items
 * @param pagination Pagination metadata
 * @param message Optional success message
 * @returns Paginated response object
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  },
  message?: string
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    pagination,
    message,
  };
}

/**
 * Creates a validation error response
 * @param errors Validation errors
 * @param message Optional error message
 * @returns Validation error response object
 */
export function createValidationErrorResponse(
  errors: Record<string, string[]>,
  message: string = "Validation failed"
): ValidationErrorResponse {
  return {
    success: false,
    error: message,
    message,
    code: "VALIDATION_ERROR",
    details: {
      validation_errors: errors,
    },
  };
}

/**
 * Creates a not found response
 * @param resource Resource that was not found
 * @param id Optional ID of the resource
 * @returns Error response object
 */
export function createNotFoundResponse(
  resource: string,
  id?: string
): ErrorResponse {
  const message = id 
    ? `${resource} with ID '${id}' not found`
    : `${resource} not found`;
    
  return createErrorResponse(
    message,
    "NOT_FOUND",
    { resource, id }
  );
}

/**
 * Creates a conflict response
 * @param message Conflict message
 * @param details Optional conflict details
 * @returns Error response object
 */
export function createConflictResponse(
  message: string,
  details?: Record<string, any>
): ErrorResponse {
  return createErrorResponse(
    message,
    "CONFLICT",
    details
  );
}

/**
 * Creates an unauthorized response
 * @param message Optional unauthorized message
 * @returns Error response object
 */
export function createUnauthorizedResponse(
  message: string = "Unauthorized"
): ErrorResponse {
  return createErrorResponse(
    message,
    "UNAUTHORIZED"
  );
}

/**
 * Creates a forbidden response
 * @param message Optional forbidden message
 * @returns Error response object
 */
export function createForbiddenResponse(
  message: string = "Forbidden"
): ErrorResponse {
  return createErrorResponse(
    message,
    "FORBIDDEN"
  );
}

/**
 * Creates a rate limit response
 * @param retryAfter Seconds to wait before retrying
 * @param message Optional rate limit message
 * @returns Error response object
 */
export function createRateLimitResponse(
  retryAfter: number,
  message: string = "Rate limit exceeded"
): ErrorResponse {
  return createErrorResponse(
    message,
    "RATE_LIMIT_EXCEEDED",
    { retry_after: retryAfter }
  );
}

/**
 * Creates a service unavailable response
 * @param service Service that is unavailable
 * @param retryAfter Optional seconds to wait before retrying
 * @returns Error response object
 */
export function createServiceUnavailableResponse(
  service: string,
  retryAfter?: number
): ErrorResponse {
  const message = `${service} is currently unavailable`;
  const details: Record<string, any> = { service };
  
  if (retryAfter) {
    details.retry_after = retryAfter;
  }
  
  return createErrorResponse(
    message,
    "SERVICE_UNAVAILABLE",
    details
  );
}

/**
 * Creates a timeout response
 * @param operation Operation that timed out
 * @param timeoutMs Timeout in milliseconds
 * @returns Error response object
 */
export function createTimeoutResponse(
  operation: string,
  timeoutMs: number
): ErrorResponse {
  return createErrorResponse(
    `Operation '${operation}' timed out after ${timeoutMs}ms`,
    "TIMEOUT",
    { operation, timeout_ms: timeoutMs }
  );
}

/**
 * Creates a response with metadata
 * @param data Response data
 * @param meta Metadata object
 * @param message Optional success message
 * @returns Success response with metadata
 */
export function createResponseWithMeta<T>(
  data: T,
  meta: Record<string, any>,
  message?: string
): SuccessResponse<T> {
  return {
    success: true,
    data,
    meta,
    message,
  };
}

/**
 * Creates a bulk operation response
 * @param results Array of operation results
 * @param summary Summary of the bulk operation
 * @returns Bulk operation response
 */
export function createBulkOperationResponse<T>(
  results: Array<{ id: string; success: boolean; data?: T; error?: string }>,
  summary: {
    total: number;
    successful: number;
    failed: number;
  }
): SuccessResponse<{
  results: Array<{ id: string; success: boolean; data?: T; error?: string }>;
  summary: { total: number; successful: number; failed: number };
}> {
  return createSuccessResponse(
    { results, summary },
    `Bulk operation completed: ${summary.successful}/${summary.total} successful`
  );
}

/**
 * Creates a health check response
 * @param status Health status
 * @param services Optional service statuses
 * @param timestamp Optional timestamp
 * @returns Health check response
 */
export function createHealthCheckResponse(
  status: "healthy" | "degraded" | "unhealthy",
  services?: Record<string, { status: string; details?: any }>,
  timestamp?: string
): SuccessResponse<{
  status: string;
  services?: Record<string, { status: string; details?: any }>;
  timestamp: string;
}> {
  return createSuccessResponse(
    {
      status,
      services,
      timestamp: timestamp || new Date().toISOString(),
    },
    `System is ${status}`
  );
}

/**
 * Validates response format
 * @param response Response to validate
 * @returns True if valid response format
 */
export function isValidResponse(response: any): boolean {
  return (
    typeof response === "object" &&
    response !== null &&
    typeof response.success === "boolean"
  );
}

/**
 * Extracts data from response
 * @param response Response object
 * @returns Extracted data or null
 */
export function extractResponseData<T>(response: any): T | null {
  if (isValidResponse(response) && response.success && response.data) {
    return response.data;
  }
  return null;
}

/**
 * Extracts error from response
 * @param response Response object
 * @returns Extracted error message or null
 */
export function extractResponseError(response: any): string | null {
  if (isValidResponse(response) && !response.success && response.error) {
    return response.error;
  }
  return null;
}