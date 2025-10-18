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
  ErrorResponse,
  PaginatedResponse,
  SuccessResponse,
  ValidationErrorResponse,
} from "../types/common.types";

/**
 * Creates a success response
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
