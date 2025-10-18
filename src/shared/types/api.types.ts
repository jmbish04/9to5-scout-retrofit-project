/**
 * @fileoverview API Types
 *
 * Type definitions for API requests, responses, and middleware
 * in the 9to5 Scout platform.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { ApiResponse, ValidationError } from "./common.types";

/**
 * HTTP method types
 */
export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

/**
 * HTTP status code types
 */
export type HttpStatusCode =
  | 200
  | 201
  | 202
  | 204
  | 301
  | 302
  | 304
  | 400
  | 401
  | 403
  | 404
  | 405
  | 409
  | 422
  | 429
  | 500
  | 501
  | 502
  | 503
  | 504;

/**
 * Request context interface
 */
export interface RequestContext {
  request_id: string;
  user_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  query_params: Record<string, string>;
  path_params: Record<string, string>;
  body?: unknown;
}

/**
 * Response context interface
 */
export interface ResponseContext {
  request_id: string;
  status_code: HttpStatusCode;
  response_time: number;
  timestamp: string;
  headers: Record<string, string>;
  body?: unknown;
  error?: Error;
}

/**
 * Middleware context interface
 */
export interface MiddlewareContext {
  request: RequestContext;
  response?: ResponseContext;
  next: () => Promise<void>;
  skip: () => void;
  stop: () => void;
}

/**
 * Authentication context
 */
export interface AuthContext {
  user_id?: string;
  session_id?: string;
  role?: string;
  permissions: string[];
  authenticated: boolean;
  token?: string;
  expires_at?: string;
}

/**
 * Rate limiting context
 */
export interface RateLimitContext {
  limit: number;
  remaining: number;
  reset: number;
  retry_after?: number;
  window_start: number;
  window_end: number;
}

/**
 * Caching context
 */
export interface CacheContext {
  key: string;
  ttl: number;
  hit: boolean;
  miss: boolean;
  created_at: string;
  expires_at: string;
}

/**
 * Validation context
 */
export interface ValidationContext {
  field: string;
  value: unknown;
  rules: ValidationRule[];
  errors: ValidationError[];
  valid: boolean;
}

/**
 * Validation rule interface
 */
export interface ValidationRule {
  name: string;
  message: string;
  validate: (
    value: unknown,
    context: ValidationContext
  ) => boolean | Promise<boolean>;
  params?: Record<string, unknown>;
}

/**
 * API endpoint definition
 */
export interface ApiEndpoint {
  method: HttpMethod;
  path: string;
  handler: (context: RequestContext) => Promise<ApiResponse>;
  middleware?: MiddlewareFunction[];
  validation?: {
    body?: ValidationRule[];
    query?: ValidationRule[];
    params?: ValidationRule[];
  };
  documentation?: {
    summary: string;
    description?: string;
    tags?: string[];
    parameters?: ApiParameter[];
    responses?: ApiResponseDefinition[];
    examples?: ApiExample[];
  };
}

/**
 * Middleware function type
 */
export type MiddlewareFunction = (context: MiddlewareContext) => Promise<void>;

/**
 * API parameter definition
 */
export interface ApiParameter {
  name: string;
  in: "query" | "path" | "header" | "cookie";
  required: boolean;
  type: "string" | "number" | "boolean" | "array" | "object";
  description?: string;
  example?: unknown;
  schema?: Record<string, unknown>;
}

/**
 * API response definition
 */
export interface ApiResponseDefinition {
  status_code: HttpStatusCode;
  description: string;
  content_type?: string;
  schema?: Record<string, unknown>;
  example?: unknown;
}

/**
 * API example
 */
export interface ApiExample {
  name: string;
  description?: string;
  request?: {
    headers?: Record<string, string>;
    query?: Record<string, string>;
    body?: unknown;
  };
  response?: {
    status_code: HttpStatusCode;
    headers?: Record<string, string>;
    body?: unknown;
  };
}

/**
 * API documentation
 */
export interface ApiDocumentation {
  title: string;
  version: string;
  description?: string;
  base_url: string;
  endpoints: ApiEndpoint[];
  models?: Record<string, Record<string, unknown>>;
  security?: {
    type: "bearer" | "basic" | "api_key" | "oauth2";
    scheme?: string;
    bearer_format?: string;
    name?: string;
    in?: "header" | "query" | "cookie";
  };
}

/**
 * API error definition
 */
export interface ApiError {
  code: string;
  message: string;
  status_code: HttpStatusCode;
  details?: Record<string, unknown>;
  stack?: string;
  timestamp: string;
  request_id: string;
}

/**
 * API success definition
 */
export interface ApiSuccess<T = unknown> {
  data: T;
  status_code: HttpStatusCode;
  timestamp: string;
  request_id: string;
}

/**
 * API pagination definition
 */
export interface ApiPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
  next_page?: number;
  prev_page?: number;
}

/**
 * API filter definition
 */
export interface ApiFilter {
  field: string;
  operator:
    | "eq"
    | "ne"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "in"
    | "nin"
    | "like"
    | "ilike"
    | "regex"
    | "exists"
    | "not_exists";
  value: unknown;
  case_sensitive?: boolean;
}

/**
 * API sort definition
 */
export interface ApiSort {
  field: string;
  order: "asc" | "desc";
  nulls?: "first" | "last";
}

/**
 * API search definition
 */
export interface ApiSearch {
  query: string;
  fields?: string[];
  fuzzy?: boolean;
  case_sensitive?: boolean;
  highlight?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * API include definition
 */
export interface ApiInclude {
  field: string;
  select?: string[];
  where?: ApiFilter[];
  order_by?: ApiSort[];
  limit?: number;
  offset?: number;
}

/**
 * API request options
 */
export interface ApiRequestOptions {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
  retry_delay?: number;
  cache?: {
    ttl: number;
    key?: string;
  };
  auth?: {
    type: "bearer" | "basic" | "api_key";
    token?: string;
    username?: string;
    password?: string;
    api_key?: string;
  };
}

/**
 * API response options
 */
export interface ApiResponseOptions {
  status_code: HttpStatusCode;
  headers?: Record<string, string>;
  body?: unknown;
  cache?: {
    ttl: number;
    etag?: string;
    last_modified?: string;
  };
  compression?: boolean;
  format?: "json" | "xml" | "yaml" | "csv";
}

/**
 * API client configuration
 */
export interface ApiClientConfig {
  base_url: string;
  timeout?: number;
  retries?: number;
  retry_delay?: number;
  default_headers?: Record<string, string>;
  auth?: {
    type: "bearer" | "basic" | "api_key";
    token?: string;
    username?: string;
    password?: string;
    api_key?: string;
  };
  interceptors?: {
    request?: (config: ApiRequestOptions) => ApiRequestOptions;
    response?: (response: ApiResponse) => ApiResponse;
    error?: (error: ApiError) => ApiError;
  };
}

/**
 * API server configuration
 */
export interface ApiServerConfig {
  port: number;
  host: string;
  cors?: {
    origin: string | string[];
    methods: HttpMethod[];
    allowed_headers: string[];
    credentials: boolean;
  };
  rate_limit?: {
    window_ms: number;
    max_requests: number;
    skip_successful_requests: boolean;
    skip_failed_requests: boolean;
  };
  compression?: {
    enabled: boolean;
    level: number;
    threshold: number;
  };
  logging?: {
    enabled: boolean;
    level: "debug" | "info" | "warn" | "error";
    format: "json" | "text";
  };
  security?: {
    helmet: boolean;
    csrf: boolean;
    xss: boolean;
    content_security_policy: boolean;
  };
}

/**
 * API health check
 */
export interface ApiHealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  uptime: number;
  services: Record<string, "healthy" | "degraded" | "unhealthy">;
  metrics?: {
    memory_usage: number;
    cpu_usage: number;
    request_count: number;
    error_count: number;
    response_time_avg: number;
  };
}

/**
 * API metrics
 */
export interface ApiMetrics {
  timestamp: string;
  request_count: number;
  error_count: number;
  response_time_avg: number;
  response_time_p95: number;
  response_time_p99: number;
  status_codes: Record<HttpStatusCode, number>;
  methods: Record<HttpMethod, number>;
  endpoints: Record<string, number>;
  errors: Record<string, number>;
}

/**
 * API audit log
 */
export interface ApiAuditLog {
  id: string;
  request_id: string;
  user_id?: string;
  method: HttpMethod;
  url: string;
  status_code: HttpStatusCode;
  response_time: number;
  ip_address?: string;
  user_agent?: string;
  headers: Record<string, string>;
  query_params: Record<string, string>;
  path_params: Record<string, string>;
  body?: unknown;
  response_body?: unknown;
  error?: string;
  timestamp: string;
}
