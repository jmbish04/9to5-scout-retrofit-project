/**
 * @file Site Domain Types and Interfaces
 *
 * This file defines comprehensive TypeScript interfaces and types for the sites domain
 * within the 9to5-Scout platform. It provides type-safe data structures for managing
 * job site configurations, discovery strategies, and scraping metadata.
 *
 * Key Components:
 * - `Site`: Core site entity with configuration and metadata
 * - `SiteWithMetadata`: Extended site information with Steel SDK capabilities
 * - `SiteDiscoveryStrategy`: Enumeration of supported discovery methods
 * - `SiteStatus`: Site operational status and health indicators
 * - `SiteConfiguration`: Advanced site configuration options
 * - `SiteSearchParams`: Query parameters for site filtering and search
 * - `SiteSearchResult`: Paginated search results with metadata
 *
 * Dependencies:
 * - Cloudflare Workers types for D1Database integration
 * - Steel SDK types for job scraping capabilities
 * - Zod schemas for runtime validation (see site.schema.ts)
 *
 * This module serves as the foundation for all site-related operations including
 * configuration management, discovery strategy implementation, and scraping coordination.
 *
 * @author 9to5-Scout Development Team
 * @version 1.0.0
 * @since 2025-01-17
 */

/**
 * Supported discovery strategies for job site crawling and data extraction.
 * Each strategy represents a different approach to finding and accessing job postings.
 */
export type SiteDiscoveryStrategy =
  | "sitemap" // Use XML sitemaps to discover job URLs
  | "list" // Parse job listing pages for individual job links
  | "search" // Use site-specific search functionality
  | "custom"; // Custom discovery logic for specialized sites

/**
 * Site operational status indicators for monitoring and health checks.
 */
export type SiteStatus =
  | "active" // Site is operational and accessible
  | "inactive" // Site is temporarily unavailable
  | "error" // Site has encountered errors
  | "maintenance"; // Site is under maintenance

/**
 * Core site entity representing a job posting website configuration.
 *
 * This interface defines the essential properties needed to configure and manage
 * job sites within the 9to5-Scout platform. It includes both basic identification
 * information and advanced configuration options for discovery and scraping.
 */
export interface Site {
  /** Unique identifier for the site */
  id?: string;

  /** Human-readable name of the job site */
  name: string;

  /** Base URL of the job site (e.g., "https://jobs.example.com") */
  base_url: string;

  /** URL to the site's robots.txt file for crawling guidelines */
  robots_txt?: string | null;

  /** URL to the site's XML sitemap for job discovery */
  sitemap_url?: string | null;

  /** Strategy used to discover job postings on this site */
  discovery_strategy: SiteDiscoveryStrategy;

  /** Timestamp of the last successful job discovery run */
  last_discovered_at?: string | null;

  /** Timestamp when the site record was created */
  created_at?: string;

  /** Timestamp when the site record was last updated */
  updated_at?: string;

  /** Current operational status of the site */
  status?: SiteStatus;

  /** Additional configuration options for site-specific behavior */
  configuration?: SiteConfiguration;
}

/**
 * Extended site information with Steel SDK capabilities and metadata.
 *
 * This interface combines database-stored site information with real-time
 * Steel SDK capability information, providing comprehensive site metadata
 * for scraping decisions and client applications.
 */
export interface SiteWithMetadata extends Site {
  /** Whether the site requires authentication for scraping */
  requires_auth: boolean;

  /** Whether the site is currently supported by the Steel SDK */
  is_steel_supported: boolean;

  /** Steel SDK configuration for this site */
  steel_config?: SteelSiteConfig;

  /** Last successful scraping timestamp */
  last_scraped_at?: string | null;

  /** Number of jobs discovered in the last run */
  last_discovery_count?: number;

  /** Average response time for site requests (in milliseconds) */
  avg_response_time?: number;

  /** Error rate percentage for recent scraping attempts */
  error_rate?: number;
}

/**
 * Steel SDK configuration for a specific job site.
 *
 * This interface defines the configuration options available through the Steel SDK
 * for job scraping, including authentication requirements and site-specific settings.
 */
export interface SteelSiteConfig {
  /** Whether authentication is required for this site */
  requires_auth: boolean;

  /** Authentication method if required */
  auth_method?: "oauth" | "basic" | "api_key" | "session";

  /** Rate limiting configuration */
  rate_limit?: {
    requests_per_minute: number;
    requests_per_hour: number;
  };

  /** Site-specific scraping parameters */
  scraping_params?: Record<string, any>;

  /** Supported job search parameters */
  supported_params?: string[];

  /** Maximum number of jobs that can be scraped per request */
  max_jobs_per_request?: number;
}

/**
 * Advanced site configuration options for specialized behavior.
 *
 * This interface provides additional configuration options that can be used
 * to customize site behavior beyond the basic discovery strategy.
 */
export interface SiteConfiguration {
  /** Custom headers to include in requests to this site */
  custom_headers?: Record<string, string>;

  /** User agent string to use for requests */
  user_agent?: string;

  /** Request timeout in milliseconds */
  request_timeout?: number;

  /** Retry configuration for failed requests */
  retry_config?: {
    max_attempts: number;
    backoff_multiplier: number;
    initial_delay: number;
  };

  /** JavaScript execution requirements */
  requires_js?: boolean;

  /** Custom CSS selectors for job extraction */
  selectors?: {
    job_list: string;
    job_title: string;
    job_company: string;
    job_location: string;
    job_url: string;
    next_page?: string;
  };

  /** Pagination configuration */
  pagination?: {
    type: "infinite_scroll" | "page_numbers" | "load_more";
    max_pages?: number;
    items_per_page?: number;
  };

  /** Content filtering rules */
  filters?: {
    exclude_keywords?: string[];
    include_keywords?: string[];
    min_salary?: number;
    max_salary?: number;
    locations?: string[];
  };
}

/**
 * Search parameters for filtering and querying sites.
 *
 * This interface defines the parameters that can be used to search and filter
 * sites based on various criteria including status, discovery strategy, and metadata.
 */
export interface SiteSearchParams {
  /** Text search query for site names and URLs */
  query?: string;

  /** Filter by discovery strategy */
  discovery_strategy?: SiteDiscoveryStrategy;

  /** Filter by operational status */
  status?: SiteStatus;

  /** Filter by Steel SDK support */
  steel_supported?: boolean;

  /** Filter by authentication requirements */
  requires_auth?: boolean;

  /** Filter by last discovery date */
  last_discovered_since?: string;
  last_discovered_until?: string;

  /** Pagination parameters */
  page?: number;
  limit?: number;
  offset?: number;

  /** Sorting parameters */
  sort_by?: "name" | "created_at" | "last_discovered_at" | "base_url";
  sort_order?: "asc" | "desc";
}

/**
 * Paginated search results for site queries.
 *
 * This interface provides the structure for paginated search results,
 * including the sites array, pagination metadata, and total counts.
 */
export interface SiteSearchResult {
  /** Array of sites matching the search criteria */
  sites: SiteWithMetadata[];

  /** Total number of sites matching the search criteria */
  total: number;

  /** Current page number */
  page: number;

  /** Number of sites per page */
  limit: number;

  /** Whether there are more results available */
  has_more: boolean;

  /** Offset for the next page of results */
  next_offset?: number;

  /** Search metadata and statistics */
  metadata?: {
    search_time_ms: number;
    filters_applied: string[];
    steel_sites_count: number;
    active_sites_count: number;
  };
}

/**
 * Site creation request payload.
 *
 * This interface defines the required and optional fields for creating
 * a new site configuration.
 */
export interface CreateSiteRequest {
  /** Human-readable name of the site */
  name: string;

  /** Base URL of the job site */
  base_url: string;

  /** Discovery strategy to use */
  discovery_strategy: SiteDiscoveryStrategy;

  /** Optional robots.txt URL */
  robots_txt?: string;

  /** Optional sitemap URL */
  sitemap_url?: string;

  /** Optional site configuration */
  configuration?: SiteConfiguration;
}

/**
 * Site update request payload.
 *
 * This interface defines the fields that can be updated for an existing site.
 * All fields are optional to support partial updates.
 */
export interface UpdateSiteRequest {
  /** Updated site name */
  name?: string;

  /** Updated base URL */
  base_url?: string;

  /** Updated discovery strategy */
  discovery_strategy?: SiteDiscoveryStrategy;

  /** Updated robots.txt URL */
  robots_txt?: string | null;

  /** Updated sitemap URL */
  sitemap_url?: string | null;

  /** Updated site configuration */
  configuration?: SiteConfiguration;

  /** Updated operational status */
  status?: SiteStatus;
}

/**
 * Site statistics and analytics data.
 *
 * This interface provides aggregated statistics about site performance,
 * job discovery rates, and operational metrics.
 */
export interface SiteStatistics {
  /** Site identifier */
  site_id: string;

  /** Site name */
  site_name: string;

  /** Total number of jobs discovered from this site */
  total_jobs_discovered: number;

  /** Number of jobs discovered in the last 24 hours */
  jobs_last_24h: number;

  /** Number of jobs discovered in the last 7 days */
  jobs_last_7d: number;

  /** Number of jobs discovered in the last 30 days */
  jobs_last_30d: number;

  /** Average jobs discovered per discovery run */
  avg_jobs_per_run: number;

  /** Success rate of discovery runs (percentage) */
  success_rate: number;

  /** Average response time for site requests (milliseconds) */
  avg_response_time: number;

  /** Last successful discovery timestamp */
  last_successful_discovery?: string;

  /** Last error timestamp */
  last_error?: string;

  /** Most recent error message */
  last_error_message?: string;

  /** Discovery run frequency (hours) */
  discovery_frequency_hours: number;

  /** Number of consecutive failed runs */
  consecutive_failures: number;
}

/**
 * Site health check result.
 *
 * This interface provides the result of a site health check operation,
 * including status, response time, and any error information.
 */
export interface SiteHealthCheck {
  /** Site identifier */
  site_id: string;

  /** Health check timestamp */
  checked_at: string;

  /** Overall health status */
  status: "healthy" | "degraded" | "unhealthy" | "unknown";

  /** Response time in milliseconds */
  response_time_ms: number;

  /** HTTP status code of the health check request */
  http_status?: number;

  /** Whether the site is accessible */
  is_accessible: boolean;

  /** Whether the site requires authentication */
  requires_auth: boolean;

  /** Whether the site is supported by Steel SDK */
  steel_supported: boolean;

  /** Error message if health check failed */
  error_message?: string;

  /** Additional diagnostic information */
  diagnostics?: Record<string, any>;
}
