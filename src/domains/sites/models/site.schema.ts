/**
 * @file Site Domain Validation Schemas
 *
 * This file defines Zod validation schemas for the sites domain within the 9to5-Scout platform.
 * It provides runtime validation for all site-related data structures, ensuring type safety
 * and data integrity throughout the application.
 *
 * Key Components:
 * - `SiteSchema`: Core site entity validation with required and optional fields
 * - `SiteWithMetadataSchema`: Extended site validation with Steel SDK capabilities
 * - `SiteConfigurationSchema`: Advanced configuration validation
 * - `SiteSearchParamsSchema`: Search parameter validation with pagination
 * - `CreateSiteRequestSchema`: Site creation request validation
 * - `UpdateSiteRequestSchema`: Site update request validation
 * - `SiteStatisticsSchema`: Site analytics and metrics validation
 * - `SiteHealthCheckSchema`: Health check result validation
 *
 * Dependencies:
 * - Zod for runtime validation and type inference
 * - Site types from site.types.ts for TypeScript integration
 *
 * This module ensures that all site-related data is properly validated before
 * being processed by the application, preventing invalid data from entering
 * the system and providing clear error messages for validation failures.
 *
 * @author 9to5-Scout Development Team
 * @version 1.0.0
 * @since 2025-01-17
 */

import { z } from "zod";

/**
 * Validation schema for site discovery strategies.
 */
export const SiteDiscoveryStrategySchema = z.enum([
  "sitemap",
  "list",
  "search",
  "custom",
]);

/**
 * Validation schema for site operational status.
 */
export const SiteStatusSchema = z.enum([
  "active",
  "inactive",
  "error",
  "maintenance",
]);

/**
 * Validation schema for Steel SDK authentication methods.
 */
export const SteelAuthMethodSchema = z.enum([
  "oauth",
  "basic",
  "api_key",
  "session",
]);

/**
 * Validation schema for Steel SDK site configuration.
 */
export const SteelSiteConfigSchema = z.object({
  requires_auth: z.boolean(),
  auth_method: SteelAuthMethodSchema.optional(),
  rate_limit: z
    .object({
      requests_per_minute: z.number().positive(),
      requests_per_hour: z.number().positive(),
    })
    .optional(),
  scraping_params: z.record(z.string(), z.any()).optional(),
  supported_params: z.array(z.string()).optional(),
  max_jobs_per_request: z.number().positive().optional(),
});

/**
 * Validation schema for site retry configuration.
 */
export const RetryConfigSchema = z.object({
  max_attempts: z.number().positive().max(10),
  backoff_multiplier: z.number().positive().max(5),
  initial_delay: z.number().positive().max(10000),
});

/**
 * Validation schema for site CSS selectors.
 */
export const SiteSelectorsSchema = z.object({
  job_list: z.string().min(1),
  job_title: z.string().min(1),
  job_company: z.string().min(1),
  job_location: z.string().min(1),
  job_url: z.string().min(1),
  next_page: z.string().optional(),
});

/**
 * Validation schema for site pagination configuration.
 */
export const PaginationConfigSchema = z.object({
  type: z.enum(["infinite_scroll", "page_numbers", "load_more"]),
  max_pages: z.number().positive().optional(),
  items_per_page: z.number().positive().optional(),
});

/**
 * Validation schema for site content filters.
 */
export const SiteFiltersSchema = z.object({
  exclude_keywords: z.array(z.string()).optional(),
  include_keywords: z.array(z.string()).optional(),
  min_salary: z.number().positive().optional(),
  max_salary: z.number().positive().optional(),
  locations: z.array(z.string()).optional(),
});

/**
 * Validation schema for advanced site configuration.
 */
export const SiteConfigurationSchema = z.object({
  custom_headers: z.record(z.string(), z.string()).optional(),
  user_agent: z.string().optional(),
  request_timeout: z.number().positive().max(300000).optional(),
  retry_config: RetryConfigSchema.optional(),
  requires_js: z.boolean().optional(),
  selectors: SiteSelectorsSchema.optional(),
  pagination: PaginationConfigSchema.optional(),
  filters: SiteFiltersSchema.optional(),
});

/**
 * Validation schema for the core Site entity.
 */
export const SiteSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  base_url: z.string().url(),
  robots_txt: z.string().url().nullable().optional(),
  sitemap_url: z.string().url().nullable().optional(),
  discovery_strategy: SiteDiscoveryStrategySchema,
  last_discovered_at: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  status: SiteStatusSchema.optional(),
  configuration: SiteConfigurationSchema.optional(),
});

/**
 * Validation schema for SiteWithMetadata (extended site information).
 */
export const SiteWithMetadataSchema = SiteSchema.extend({
  requires_auth: z.boolean(),
  is_steel_supported: z.boolean(),
  steel_config: SteelSiteConfigSchema.optional(),
  last_scraped_at: z.string().datetime().nullable().optional(),
  last_discovery_count: z.number().nonnegative().optional(),
  avg_response_time: z.number().nonnegative().optional(),
  error_rate: z.number().min(0).max(100).optional(),
});

/**
 * Validation schema for site search parameters.
 */
export const SiteSearchParamsSchema = z.object({
  query: z.string().optional(),
  discovery_strategy: SiteDiscoveryStrategySchema.optional(),
  status: SiteStatusSchema.optional(),
  steel_supported: z.boolean().optional(),
  requires_auth: z.boolean().optional(),
  last_discovered_since: z.string().datetime().optional(),
  last_discovered_until: z.string().datetime().optional(),
  page: z.number().positive().default(1),
  limit: z.number().positive().max(100).default(20),
  offset: z.number().min(0).default(0),
  sort_by: z
    .enum(["name", "created_at", "last_discovered_at", "base_url"])
    .default("name"),
  sort_order: z.enum(["asc", "desc"]).default("asc"),
});

/**
 * Validation schema for site search results.
 */
export const SiteSearchResultSchema = z.object({
  sites: z.array(SiteWithMetadataSchema),
  total: z.number().nonnegative(),
  page: z.number().positive(),
  limit: z.number().positive(),
  has_more: z.boolean(),
  next_offset: z.number().min(0).optional(),
  metadata: z
    .object({
      search_time_ms: z.number().nonnegative(),
      filters_applied: z.array(z.string()),
      steel_sites_count: z.number().nonnegative(),
      active_sites_count: z.number().nonnegative(),
    })
    .optional(),
});

/**
 * Validation schema for site creation requests.
 */
export const CreateSiteRequestSchema = z.object({
  name: z.string().min(1).max(255),
  base_url: z.string().url(),
  discovery_strategy: SiteDiscoveryStrategySchema,
  robots_txt: z.string().url().optional(),
  sitemap_url: z.string().url().optional(),
  configuration: SiteConfigurationSchema.optional(),
});

/**
 * Validation schema for site update requests.
 */
export const UpdateSiteRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  base_url: z.string().url().optional(),
  discovery_strategy: SiteDiscoveryStrategySchema.optional(),
  robots_txt: z.string().url().nullable().optional(),
  sitemap_url: z.string().url().nullable().optional(),
  configuration: SiteConfigurationSchema.optional(),
  status: SiteStatusSchema.optional(),
});

/**
 * Validation schema for site statistics and analytics.
 */
export const SiteStatisticsSchema = z.object({
  site_id: z.string().uuid(),
  site_name: z.string(),
  total_jobs_discovered: z.number().nonnegative(),
  jobs_last_24h: z.number().nonnegative(),
  jobs_last_7d: z.number().nonnegative(),
  jobs_last_30d: z.number().nonnegative(),
  avg_jobs_per_run: z.number().nonnegative(),
  success_rate: z.number().min(0).max(100),
  avg_response_time: z.number().nonnegative(),
  last_successful_discovery: z.string().datetime().optional(),
  last_error: z.string().datetime().optional(),
  last_error_message: z.string().optional(),
  discovery_frequency_hours: z.number().positive(),
  consecutive_failures: z.number().nonnegative(),
});

/**
 * Validation schema for site health check results.
 */
export const SiteHealthCheckSchema = z.object({
  site_id: z.string().uuid(),
  checked_at: z.string().datetime(),
  status: z.enum(["healthy", "degraded", "unhealthy", "unknown"]),
  response_time_ms: z.number().nonnegative(),
  http_status: z.number().positive().optional(),
  is_accessible: z.boolean(),
  requires_auth: z.boolean(),
  steel_supported: z.boolean(),
  error_message: z.string().optional(),
  diagnostics: z.record(z.string(), z.any()).optional(),
});

/**
 * Type exports for TypeScript integration.
 * These types are automatically inferred from the Zod schemas.
 */
export type Site = z.infer<typeof SiteSchema>;
export type SiteWithMetadata = z.infer<typeof SiteWithMetadataSchema>;
export type SiteConfiguration = z.infer<typeof SiteConfigurationSchema>;
export type SiteSearchParams = z.infer<typeof SiteSearchParamsSchema>;
export type SiteSearchResult = z.infer<typeof SiteSearchResultSchema>;
export type CreateSiteRequest = z.infer<typeof CreateSiteRequestSchema>;
export type UpdateSiteRequest = z.infer<typeof UpdateSiteRequestSchema>;
export type SiteStatistics = z.infer<typeof SiteStatisticsSchema>;
export type SiteHealthCheck = z.infer<typeof SiteHealthCheckSchema>;
export type SiteDiscoveryStrategy = z.infer<typeof SiteDiscoveryStrategySchema>;
export type SiteStatus = z.infer<typeof SiteStatusSchema>;
