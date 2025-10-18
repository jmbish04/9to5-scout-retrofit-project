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
 * @param message Error message
 * @param type Error type
 * @param severity Error severity
 * @param options Additional error options
 * @returns Enhanced error object
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
 * Converts a standard error to an enhanced error
 * @param error Standard error
 * @param type Error type
 * @param severity Error severity
 * @param context Additional context
 * @returns Enhanced error object
 */
export function enhanceError(
  error: Error,
  type: ErrorType = ErrorType.INTERNAL,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  context: Record<string, any> = {}
): EnhancedError {
  return createEnhancedError(error.message, type, severity, {
    code: (error as any).code,
    details: (error as any).details,
    context: { ...context, originalError: error.name },
    cause: error,
  });
}

/**
 * Logs an error with appropriate level based on severity
 * @param error Enhanced error to log
 * @param additionalContext Additional context to include
 */
export function logError(
  error: EnhancedError,
  additionalContext: Record<string, any> = {}
): void {
  const logContext = {
    type: error.type,
    severity: error.severity,
    code: error.code,
    message: error.message,
    details: error.details,
    context: { ...error.context, ...additionalContext },
    timestamp: error.timestamp,
    requestId: error.requestId,
    userId: error.userId,
    stack: error.stack,
  };

  switch (error.severity) {
    case ErrorSeverity.CRITICAL:
      console.error("CRITICAL ERROR:", logContext);
      break;
    case ErrorSeverity.HIGH:
      console.error("HIGH SEVERITY ERROR:", logContext);
      break;
    case ErrorSeverity.MEDIUM:
      console.warn("MEDIUM SEVERITY ERROR:", logContext);
      break;
    case ErrorSeverity.LOW:
      console.info("LOW SEVERITY ERROR:", logContext);
      break;
  }
}

/**
 * Creates an error response from an enhanced error
 * @param error Enhanced error
 * @param includeDetails Whether to include error details in response
 * @returns Error response
 */
export function createErrorResponseFromEnhanced(
  error: EnhancedError,
  includeDetails: boolean = false
): ErrorResponse {
  const response: ErrorResponse = {
    success: false,
    error: {
      code: error.code || error.type,
      message: error.message,
      details: error.details,
    },
  };

  if (includeDetails) {
    response.error.details = {
      type: error.type,
      severity: error.severity,
      details: error.details,
      timestamp: error.timestamp,
      requestId: error.requestId,
    };
  }

  return response;
}

/**
 * Handles async operation errors with proper error enhancement
 * @param operation Async operation to execute
 * @param context Context for error handling
 * @returns Promise that resolves to operation result or rejects with enhanced error
 */
export async function handleAsyncError<T>(
  operation: () => Promise<T>,
  context: {
    operation: string;
    type?: ErrorType;
    severity?: ErrorSeverity;
    requestId?: string;
    userId?: string;
  }
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const enhancedError = enhanceError(
      error instanceof Error ? error : new Error(String(error)),
      context.type || ErrorType.INTERNAL,
      context.severity || ErrorSeverity.MEDIUM,
      {
        operation: context.operation,
        requestId: context.requestId,
        userId: context.userId,
      }
    );

    logError(enhancedError);
    throw enhancedError;
  }
}

/**
 * Retries an operation with exponential backoff
 * @param operation Operation to retry
 * @param maxRetries Maximum number of retries
 * @param baseDelay Base delay in milliseconds
 * @param context Context for error handling
 * @returns Promise that resolves to operation result
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  context: {
    operation: string;
    requestId?: string;
    userId?: string;
  }
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        const enhancedError = enhanceError(
          lastError,
          ErrorType.EXTERNAL,
          ErrorSeverity.HIGH,
          {
            operation: context.operation,
            attempts: attempt + 1,
            requestId: context.requestId,
            userId: context.userId,
          }
        );

        logError(enhancedError);
        throw enhancedError;
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Validates error response format
 * @param response Response to validate
 * @returns True if valid error response format
 */
export function isValidErrorResponse(response: any): response is ErrorResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    response.success === false &&
    typeof response.error === "string" &&
    typeof response.message === "string"
  );
}

/**
 * Extracts error message from various error types
 * @param error Error to extract message from
 * @returns Error message string
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && error !== null) {
    const errorObj = error as any;
    if (errorObj.message) {
      return errorObj.message;
    }
    if (errorObj.error) {
      return errorObj.error;
    }
  }

  return "Unknown error occurred";
}

/**
 * Checks if an error is retryable
 * @param error Error to check
 * @returns True if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("timeout") ||
      message.includes("network") ||
      message.includes("connection") ||
      message.includes("rate limit") ||
      message.includes("temporary") ||
      message.includes("unavailable")
    );
  }

  return false;
}

/**
 * Creates a timeout error
 * @param operation Operation that timed out
 * @param timeoutMs Timeout in milliseconds
 * @returns Enhanced timeout error
 */
export function createTimeoutError(
  operation: string,
  timeoutMs: number
): EnhancedError {
  return createEnhancedError(
    `Operation '${operation}' timed out after ${timeoutMs}ms`,
    ErrorType.TIMEOUT,
    ErrorSeverity.MEDIUM,
    {
      code: "TIMEOUT",
      details: { operation, timeoutMs },
    }
  );
}
