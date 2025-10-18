/**
 * @fileoverview API Constants
 *
 * Common constants used across API endpoints and responses
 * in the 9to5 Scout platform.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // Redirection
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,

  // Client Error
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // Server Error
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * HTTP Methods
 */
export const HTTP_METHODS = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  PATCH: "PATCH",
  DELETE: "DELETE",
  HEAD: "HEAD",
  OPTIONS: "OPTIONS",
} as const;

/**
 * Content Types
 */
export const CONTENT_TYPES = {
  JSON: "application/json",
  XML: "application/xml",
  HTML: "text/html",
  TEXT: "text/plain",
  CSV: "text/csv",
  PDF: "application/pdf",
  ZIP: "application/zip",
  OCTET_STREAM: "application/octet-stream",
  FORM_DATA: "multipart/form-data",
  URL_ENCODED: "application/x-www-form-urlencoded",
} as const;

/**
 * Common Headers
 */
export const HEADERS = {
  CONTENT_TYPE: "Content-Type",
  AUTHORIZATION: "Authorization",
  ACCEPT: "Accept",
  USER_AGENT: "User-Agent",
  CACHE_CONTROL: "Cache-Control",
  ETAG: "ETag",
  LAST_MODIFIED: "Last-Modified",
  IF_NONE_MATCH: "If-None-Match",
  IF_MODIFIED_SINCE: "If-Modified-Since",
  X_REQUEST_ID: "X-Request-ID",
  X_CORRELATION_ID: "X-Correlation-ID",
  X_RATE_LIMIT_LIMIT: "X-Rate-Limit-Limit",
  X_RATE_LIMIT_REMAINING: "X-Rate-Limit-Remaining",
  X_RATE_LIMIT_RESET: "X-Rate-Limit-Reset",
} as const;

/**
 * Cache Control Directives
 */
export const CACHE_CONTROL = {
  NO_CACHE: "no-cache",
  NO_STORE: "no-store",
  PRIVATE: "private",
  PUBLIC: "public",
  MAX_AGE: "max-age",
  MUST_REVALIDATE: "must-revalidate",
  PROXY_REVALIDATE: "proxy-revalidate",
} as const;

/**
 * API Response Messages
 */
export const API_MESSAGES = {
  SUCCESS: "Success",
  CREATED: "Resource created successfully",
  UPDATED: "Resource updated successfully",
  DELETED: "Resource deleted successfully",
  NOT_FOUND: "Resource not found",
  UNAUTHORIZED: "Unauthorized access",
  FORBIDDEN: "Access forbidden",
  VALIDATION_ERROR: "Validation error",
  INTERNAL_ERROR: "Internal server error",
  RATE_LIMITED: "Rate limit exceeded",
  INVALID_REQUEST: "Invalid request",
  CONFLICT: "Resource conflict",
} as const;

/**
 * Pagination Constants
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
} as const;

/**
 * Rate Limiting Constants
 */
export const RATE_LIMITS = {
  DEFAULT_REQUESTS: 100,
  DEFAULT_WINDOW_MS: 60000, // 1 minute
  STRICT_REQUESTS: 10,
  STRICT_WINDOW_MS: 60000, // 1 minute
  LOOSE_REQUESTS: 1000,
  LOOSE_WINDOW_MS: 60000, // 1 minute
} as const;

/**
 * Error Codes
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
  NOT_FOUND_ERROR: "NOT_FOUND_ERROR",
  CONFLICT_ERROR: "CONFLICT_ERROR",
  RATE_LIMIT_ERROR: "RATE_LIMIT_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
  TIMEOUT_ERROR: "TIMEOUT_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
} as const;

/**
 * API Version Constants
 */
export const API_VERSIONS = {
  V1: "v1",
  V2: "v2",
  LATEST: "v1",
} as const;

/**
 * Common Query Parameters
 */
export const QUERY_PARAMS = {
  PAGE: "page",
  LIMIT: "limit",
  SORT: "sort",
  ORDER: "order",
  SEARCH: "search",
  FILTER: "filter",
  INCLUDE: "include",
  EXCLUDE: "exclude",
  FIELDS: "fields",
  EXPAND: "expand",
} as const;

/**
 * Sort Orders
 */
export const SORT_ORDERS = {
  ASC: "asc",
  DESC: "desc",
} as const;

/**
 * Common Field Names
 */
export const COMMON_FIELDS = {
  ID: "id",
  CREATED_AT: "created_at",
  UPDATED_AT: "updated_at",
  DELETED_AT: "deleted_at",
  NAME: "name",
  TITLE: "title",
  DESCRIPTION: "description",
  STATUS: "status",
  TYPE: "type",
  URL: "url",
  EMAIL: "email",
  PHONE: "phone",
  ADDRESS: "address",
} as const;

/**
 * Status Values
 */
export const STATUS_VALUES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
  DELETED: "deleted",
} as const;

/**
 * Type Values
 */
export const TYPE_VALUES = {
  USER: "user",
  ADMIN: "admin",
  MODERATOR: "moderator",
  GUEST: "guest",
  SYSTEM: "system",
  API: "api",
  WEBHOOK: "webhook",
  SCHEDULED: "scheduled",
  MANUAL: "manual",
  AUTOMATIC: "automatic",
} as const;
