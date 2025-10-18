/**
 * @fileoverview Integration Types
 *
 * Shared type definitions for all integration services including
 * common interfaces, error types, and configuration structures.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * Base integration service environment interface
 */
export interface BaseIntegrationEnv {
  DB: D1Database;
  R2: R2Bucket;
  BUCKET_BASE_URL: string;
}

/**
 * Common API response interface
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: Record<string, any>;
}

/**
 * Pagination parameters interface
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  code?: string;
  details?: Record<string, any>;
}

/**
 * Service health status interface
 */
export interface ServiceHealth {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: Record<string, "available" | "not_available" | "error">;
  details?: string;
}

/**
 * Rate limiting configuration interface
 */
export interface RateLimitConfig {
  requests: number;
  windowMs: number;
  keyGenerator?: (request: Request) => string;
}

/**
 * Authentication context interface
 */
export interface AuthContext {
  user_id?: string;
  session_id?: string;
  permissions?: string[];
  metadata?: Record<string, any>;
}

/**
 * Request context interface
 */
export interface RequestContext {
  request_id: string;
  timestamp: string;
  auth?: AuthContext;
  metadata?: Record<string, any>;
}

/**
 * Integration service configuration interface
 */
export interface IntegrationConfig {
  enabled: boolean;
  timeout_ms?: number;
  retry_attempts?: number;
  retry_delay_ms?: number;
  rate_limit?: RateLimitConfig;
}

/**
 * Service metrics interface
 */
export interface ServiceMetrics {
  requests_total: number;
  requests_success: number;
  requests_error: number;
  average_response_time_ms: number;
  last_request_at?: string;
  uptime_seconds: number;
}

/**
 * Webhook payload interface
 */
export interface WebhookPayload {
  event_type: string;
  timestamp: string;
  data: any;
  signature?: string;
  source: string;
}

/**
 * Batch operation result interface
 */
export interface BatchOperationResult<T> {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    id: string;
    success: boolean;
    data?: T;
    error?: string;
  }>;
}

/**
 * Cache configuration interface
 */
export interface CacheConfig {
  ttl_seconds: number;
  key_prefix: string;
  storage: "memory" | "kv" | "r2";
}

/**
 * Logging configuration interface
 */
export interface LoggingConfig {
  level: "debug" | "info" | "warn" | "error";
  format: "json" | "text";
  include_stack_trace: boolean;
  sensitive_fields: string[];
}
