/**
 * @fileoverview Common Types
 *
 * Shared type definitions used across all domains
 * in the 9to5 Scout platform.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * Base entity interface with common fields
 */
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Pagination response
 */
export interface PaginationResponse<T> {
  data: T[];
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
 * Sort parameters
 */
export interface SortParams {
  field: string;
  order: "asc" | "desc";
}

/**
 * Filter parameters
 */
export interface FilterParams {
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
    | "regex";
  value: unknown;
}

/**
 * Search parameters
 */
export interface SearchParams {
  query: string;
  fields?: string[];
  fuzzy?: boolean;
  case_sensitive?: boolean;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: string;
    request_id: string;
    version: string;
    [key: string]: unknown;
  };
}

/**
 * Error response
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    stack?: string;
  };
  meta?: {
    timestamp: string;
    request_id: string;
    version: string;
    [key: string]: unknown;
  };
}

/**
 * Success response
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    request_id: string;
    version: string;
    [key: string]: unknown;
  };
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
  code?: string;
}

/**
 * Validation response
 */
export interface ValidationResponse {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * File upload response
 */
export interface FileUploadResponse {
  id: string;
  filename: string;
  original_name: string;
  size: number;
  mime_type: string;
  url: string;
  uploaded_at: string;
}

/**
 * File metadata
 */
export interface FileMetadata {
  filename: string;
  original_name: string;
  size: number;
  mime_type: string;
  hash: string;
  uploaded_at: string;
  expires_at?: string;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: "create" | "update" | "delete" | "read";
  user_id?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  metadata?: Record<string, unknown>;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    database: "healthy" | "degraded" | "unhealthy";
    storage: "healthy" | "degraded" | "unhealthy";
    ai: "healthy" | "degraded" | "unhealthy";
    browser: "healthy" | "degraded" | "unhealthy";
  };
  metrics?: {
    memory_usage: number;
    cpu_usage: number;
    request_count: number;
    error_count: number;
  };
}

/**
 * Configuration value
 */
export interface ConfigValue {
  key: string;
  value: unknown;
  type: "string" | "number" | "boolean" | "object" | "array";
  description?: string;
  required: boolean;
  default?: unknown;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: unknown[];
  };
}

/**
 * Feature flag
 */
export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description?: string;
  rollout_percentage?: number;
  target_users?: string[];
  target_groups?: string[];
  conditions?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Webhook payload
 */
export interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
  signature?: string;
  id: string;
}

/**
 * Webhook subscription
 */
export interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Rate limit info
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retry_after?: number;
}

/**
 * Cache entry
 */
export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  ttl: number;
  created_at: string;
  expires_at: string;
}

/**
 * Job queue entry
 */
export interface JobQueueEntry {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  priority: number;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
  retry_count: number;
  max_retries: number;
}

/**
 * Notification
 */
export interface Notification {
  id: string;
  user_id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, unknown>;
  created_at: string;
  read_at?: string;
}

/**
 * User session
 */
export interface UserSession {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
  last_accessed_at: string;
  ip_address?: string;
  user_agent?: string;
  active: boolean;
}

/**
 * API key
 */
export interface ApiKey {
  id: string;
  name: string;
  key: string;
  secret: string;
  permissions: string[];
  rate_limit?: {
    requests_per_minute: number;
    requests_per_hour: number;
    requests_per_day: number;
  };
  expires_at?: string;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
  active: boolean;
}

/**
 * System metrics
 */
export interface SystemMetrics {
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_in: number;
  network_out: number;
  request_count: number;
  error_count: number;
  response_time_avg: number;
  response_time_p95: number;
  response_time_p99: number;
}

/**
 * Geographic location
 */
export interface GeoLocation {
  latitude: number;
  longitude: number;
  country?: string;
  region?: string;
  city?: string;
  postal_code?: string;
  timezone?: string;
}

/**
 * Contact information
 */
export interface ContactInfo {
  email?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  website?: string;
  social_media?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    facebook?: string;
  };
}

/**
 * Time range
 */
export interface TimeRange {
  start: string;
  end: string;
}

/**
 * Date range
 */
export interface DateRange {
  start_date: string;
  end_date: string;
}

/**
 * Numeric range
 */
export interface NumericRange {
  min: number;
  max: number;
}

/**
 * Key-value pair
 */
export interface KeyValuePair<K = string, V = unknown> {
  key: K;
  value: V;
}

/**
 * Option for select inputs
 */
export interface SelectOption<T = string> {
  label: string;
  value: T;
  disabled?: boolean;
  description?: string;
}

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

/**
 * Tab item
 */
export interface TabItem {
  id: string;
  label: string;
  content: unknown;
  disabled?: boolean;
  badge?: string | number;
}

/**
 * Menu item
 */
export interface MenuItem {
  id: string;
  label: string;
  href?: string;
  icon?: string;
  children?: MenuItem[];
  disabled?: boolean;
  badge?: string | number;
}

/**
 * Table column
 */
export interface TableColumn<T = unknown> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (value: unknown, row: T) => unknown;
}

/**
 * Table row
 */
export interface TableRow<T = unknown> {
  id: string;
  data: T;
  selected?: boolean;
  expanded?: boolean;
}

/**
 * Form field
 */
export interface FormField {
  name: string;
  label: string;
  type:
    | "text"
    | "email"
    | "password"
    | "number"
    | "tel"
    | "url"
    | "textarea"
    | "select"
    | "checkbox"
    | "radio"
    | "file"
    | "date"
    | "time"
    | "datetime";
  required?: boolean;
  placeholder?: string;
  description?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: (value: unknown) => string | null;
  };
  options?: SelectOption[];
  multiple?: boolean;
  disabled?: boolean;
  readonly?: boolean;
}

/**
 * Form validation rule
 */
export interface FormValidationRule {
  field: string;
  rule: "required" | "email" | "url" | "min" | "max" | "pattern" | "custom";
  value?: unknown;
  message: string;
}

/**
 * Form state
 */
export interface FormState<T = Record<string, unknown>> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  dirty: boolean;
  valid: boolean;
  submitting: boolean;
  submitted: boolean;
}

/**
 * Search configuration
 */
export interface SearchConfig {
  id: string;
  name: string;
  keywords: string;
  locations: string;
  include_domains: string;
  exclude_domains: string;
  min_salary?: number;
  max_salary?: number;
  job_type?: string;
  experience_level?: string;
  posted_date?: string;
  remote?: boolean;
  company_name?: string;
  search_engine?: string;
  gl?: string;
  hl?: string;
  age?: number;
  start?: number;
  num?: number;
  min_comp_total?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Paginated response (alias for PaginationResponse)
 */
export type PaginatedResponse<T> = PaginationResponse<T>;

/**
 * Validation error response (alias for ValidationResponse)
 */
export type ValidationErrorResponse = ValidationResponse;
