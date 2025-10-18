/**
 * @fileoverview Error Helper Utilities
 *
 * Utility functions for error handling, logging, and error response formatting
 * across all domains in the 9to5 Scout platform.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import type { ErrorResponse } from "../types/common.types";

/**
 * Error types for categorization
 */
export enum ErrorType {
  VALIDATION = "VALIDATION_ERROR",
  AUTHENTICATION = "AUTHENTICATION_ERROR",
  AUTHORIZATION = "AUTHORIZATION_ERROR",
  NOT_FOUND = "NOT_FOUND_ERROR",
  CONFLICT = "CONFLICT_ERROR",
  RATE_LIMIT = "RATE_LIMIT_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE_ERROR",
  INTERNAL = "INTERNAL_ERROR",
  EXTERNAL = "EXTERNAL_ERROR",
  NETWORK = "NETWORK_ERROR",
  TIMEOUT = "TIMEOUT_ERROR",
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Enhanced error interface
 */
export interface EnhancedError extends Error {
  type: ErrorType;
  severity: ErrorSeverity;
  code?: string;
  details?: Record<string, any>;
  context?: Record<string, any>;
  timestamp: string;
  requestId?: string;
  userId?: string;
}

/**
 * Creates an enhanced error object
 */
export function createEnhancedError(
  message: string,
  type: ErrorType,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  options: {
    code?: string;
    details?: Record<string, any>;
    context?: Record<string, any>;
    requestId?: string;
    userId?: string;
    cause?: Error;
  } = {}
): EnhancedError {
  const error = new Error(message) as EnhancedError;
  error.type = type;
  error.severity = severity;
  error.code = options.code;
  error.details = options.details;
  error.context = options.context;
  error.timestamp = new Date().toISOString();
  error.requestId = options.requestId;
  error.userId = options.userId;

  if (options.cause) {
    error.cause = options.cause;
  }

  return error;
}

/**
 * Creates an error response from an enhanced error
 */
export function createErrorResponseFromEnhanced(
  error: EnhancedError,
  includeDetails: boolean = false
): ErrorResponse {
  const response: ErrorResponse = {
    success: false,
    error: error.message,
    message: error.message,
    code: error.code || error.type,
  };

  if (includeDetails) {
    response.details = {
      type: error.type,
      severity: error.severity,
      details: error.details,
      timestamp: error.timestamp,
      requestId: error.requestId,
    };
  }

  return response;
}
