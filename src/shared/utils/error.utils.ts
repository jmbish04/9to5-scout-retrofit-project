/**
 * @fileoverview Error Utility Functions
 *
 * Utility functions for error handling, logging, and formatting
 * across all domains in the 9to5 Scout platform.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { ERROR_CODES } from "../constants/api.constants";

/**
 * Custom error classes
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string = ERROR_CODES.INTERNAL_ERROR,
    statusCode: number = 500,
    details?: Record<string, unknown>,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ERROR_CODES.VALIDATION_ERROR, 422, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, ERROR_CODES.AUTHENTICATION_ERROR, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Insufficient permissions") {
    super(message, ERROR_CODES.AUTHORIZATION_ERROR, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with ID '${id}' not found`
      : `${resource} not found`;
    super(message, ERROR_CODES.NOT_FOUND_ERROR, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ERROR_CODES.CONFLICT_ERROR, 409, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Rate limit exceeded", retryAfter?: number) {
    super(message, ERROR_CODES.RATE_LIMIT_ERROR, 429, {
      retry_after: retryAfter,
    });
  }
}

export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(
      `External service error: ${service} - ${message}`,
      ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      502,
      details
    );
  }
}

export class TimeoutError extends AppError {
  constructor(operation: string, timeout: number) {
    super(
      `Operation '${operation}' timed out after ${timeout}ms`,
      ERROR_CODES.TIMEOUT_ERROR,
      504
    );
  }
}

export class NetworkError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(`Network error: ${message}`, ERROR_CODES.NETWORK_ERROR, 502, details);
  }
}

/**
 * Error utility functions
 */
export class ErrorUtils {
  /**
   * Checks if an error is operational
   */
  static isOperationalError(error: Error): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }
    return false;
  }

  /**
   * Checks if an error is a validation error
   */
  static isValidationError(error: Error): boolean {
    return error instanceof ValidationError;
  }

  /**
   * Checks if an error is an authentication error
   */
  static isAuthenticationError(error: Error): boolean {
    return error instanceof AuthenticationError;
  }

  /**
   * Checks if an error is an authorization error
   */
  static isAuthorizationError(error: Error): boolean {
    return error instanceof AuthorizationError;
  }

  /**
   * Checks if an error is a not found error
   */
  static isNotFoundError(error: Error): boolean {
    return error instanceof NotFoundError;
  }

  /**
   * Checks if an error is a conflict error
   */
  static isConflictError(error: Error): boolean {
    return error instanceof ConflictError;
  }

  /**
   * Checks if an error is a rate limit error
   */
  static isRateLimitError(error: Error): boolean {
    return error instanceof RateLimitError;
  }

  /**
   * Checks if an error is an external service error
   */
  static isExternalServiceError(error: Error): boolean {
    return error instanceof ExternalServiceError;
  }

  /**
   * Checks if an error is a timeout error
   */
  static isTimeoutError(error: Error): boolean {
    return error instanceof TimeoutError;
  }

  /**
   * Checks if an error is a network error
   */
  static isNetworkError(error: Error): boolean {
    return error instanceof NetworkError;
  }

  /**
   * Formats an error for logging
   */
  static formatForLogging(
    error: Error,
    context?: Record<string, unknown>
  ): Record<string, unknown> {
    const baseError = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };

    if (error instanceof AppError) {
      return {
        ...baseError,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
        isOperational: error.isOperational,
        context,
      };
    }

    return {
      ...baseError,
      context,
    };
  }

  /**
   * Formats an error for API response
   */
  static formatForApiResponse(
    error: Error,
    includeStack = false
  ): {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    stack?: string;
  } {
    if (error instanceof AppError) {
      return {
        code: error.code,
        message: error.message,
        details: error.details,
        ...(includeStack && { stack: error.stack }),
      };
    }

    return {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: "An unexpected error occurred",
      ...(includeStack && { stack: error.stack }),
    };
  }

  /**
   * Creates a user-friendly error message
   */
  static createUserFriendlyMessage(error: Error): string {
    if (error instanceof AppError) {
      switch (error.code) {
        case ERROR_CODES.VALIDATION_ERROR:
          return "Please check your input and try again";
        case ERROR_CODES.AUTHENTICATION_ERROR:
          return "Please log in to continue";
        case ERROR_CODES.AUTHORIZATION_ERROR:
          return "You don't have permission to perform this action";
        case ERROR_CODES.NOT_FOUND_ERROR:
          return "The requested resource was not found";
        case ERROR_CODES.CONFLICT_ERROR:
          return "This action conflicts with existing data";
        case ERROR_CODES.RATE_LIMIT_ERROR:
          return "Too many requests. Please try again later";
        case ERROR_CODES.EXTERNAL_SERVICE_ERROR:
          return "A service is temporarily unavailable. Please try again later";
        case ERROR_CODES.TIMEOUT_ERROR:
          return "The request timed out. Please try again";
        case ERROR_CODES.NETWORK_ERROR:
          return "Network error. Please check your connection and try again";
        default:
          return error.message;
      }
    }

    return "An unexpected error occurred. Please try again later";
  }

  /**
   * Logs an error with appropriate level
   */
  static logError(error: Error, context?: Record<string, unknown>): void {
    const formattedError = this.formatForLogging(error, context);

    if (this.isOperationalError(error)) {
      console.warn("Operational error:", formattedError);
    } else {
      console.error("Unexpected error:", formattedError);
    }
  }

  /**
   * Handles and logs an error
   */
  static handleError(error: Error, context?: Record<string, unknown>): void {
    this.logError(error, context);

    // In a real application, you might want to:
    // - Send error to monitoring service
    // - Store error in database
    // - Send alert to administrators
    // - etc.
  }

  /**
   * Wraps an async function with error handling
   */
  static async wrapAsync<T>(
    fn: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      this.handleError(error as Error, context);
      throw error;
    }
  }

  /**
   * Wraps a sync function with error handling
   */
  static wrapSync<T>(fn: () => T, context?: Record<string, unknown>): T {
    try {
      return fn();
    } catch (error) {
      this.handleError(error as Error, context);
      throw error;
    }
  }

  /**
   * Creates a retry function with exponential backoff
   */
  static createRetryFunction<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    maxDelay: number = 10000
  ): () => Promise<T> {
    return async (): Promise<T> => {
      let lastError: Error;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await fn();
        } catch (error) {
          lastError = error as Error;

          if (attempt === maxRetries) {
            break;
          }

          // Don't retry on certain error types
          if (
            this.isValidationError(lastError) ||
            this.isAuthenticationError(lastError) ||
            this.isAuthorizationError(lastError) ||
            this.isNotFoundError(lastError)
          ) {
            break;
          }

          // Calculate delay with exponential backoff
          const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      throw lastError!;
    };
  }

  /**
   * Creates a timeout wrapper
   */
  static withTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new TimeoutError("Operation", timeoutMs));
        }, timeoutMs);
      }),
    ]);
  }

  /**
   * Safely executes a function and returns a result or error
   */
  static safeExecute<T>(
    fn: () => T
  ): { success: true; data: T } | { success: false; error: Error } {
    try {
      const data = fn();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * Safely executes an async function and returns a result or error
   */
  static async safeExecuteAsync<T>(
    fn: () => Promise<T>
  ): Promise<{ success: true; data: T } | { success: false; error: Error }> {
    try {
      const data = await fn();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * Creates an error from a string message
   */
  static fromString(message: string, code?: string): AppError {
    return new AppError(message, code);
  }

  /**
   * Creates an error from an unknown value
   */
  static fromUnknown(error: unknown): AppError {
    if (error instanceof Error) {
      return new AppError(error.message, ERROR_CODES.INTERNAL_ERROR, 500, {
        original_error: error.name,
        stack: error.stack,
      });
    }

    if (typeof error === "string") {
      return new AppError(error);
    }

    return new AppError(
      "Unknown error occurred",
      ERROR_CODES.INTERNAL_ERROR,
      500,
      {
        original_error: String(error),
      }
    );
  }
}
