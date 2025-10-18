/**
 * @file Sites REST API Routes
 *
 * This file provides comprehensive REST API endpoints for the sites domain within the 9to5-Scout platform.
 * It implements a complete CRUD API for site management with advanced features including search,
 * filtering, pagination, and health monitoring capabilities.
 *
 * Key Endpoints:
 * - `GET /api/sites`: List sites with pagination, filtering, and sorting
 * - `POST /api/sites`: Create new site configurations with validation
 * - `GET /api/sites/:id`: Retrieve individual site details with full metadata
 * - `PUT /api/sites/:id`: Update existing site configurations
 * - `DELETE /api/sites/:id`: Remove site configurations with dependency checks
 * - `GET /api/sites/search`: Advanced search with multiple criteria
 * - `GET /api/sites/:id/statistics`: Retrieve site performance analytics
 * - `POST /api/sites/:id/health-check`: Perform site health diagnostics
 * - `GET /api/sites/discovery-ready`: List sites ready for job discovery
 *
 * Dependencies:
 * - Hono framework for lightweight HTTP routing and middleware
 * - Site storage service for database operations
 * - Zod schemas for request/response validation
 * - Authentication middleware for security
 * - Error handling and logging utilities
 *
 * This module serves as the primary HTTP interface for all site management operations,
 * providing a clean, RESTful API that integrates seamlessly with the 9to5-Scout platform.
 *
 * @author 9to5-Scout Development Team
 * @version 1.0.0
 * @since 2025-01-17
 * @maintainer 9to5-Scout Development Team
 */

import { Hono } from "hono";
import { z } from "zod";
import {
  cors,
  errorHandler,
  getValidatedBody,
  getValidatedParams,
  logger,
  rateLimit,
  validateBody,
  validateParams,
} from "../../../core/validation/hono-validation";
import {
  CreateSiteRequestSchema,
  UpdateSiteRequestSchema,
  type CreateSiteRequest,
  type SiteSearchParams,
  type UpdateSiteRequest,
} from "../models/site.schema";
import {
  deleteSite,
  getSiteById,
  getSiteStatistics,
  getSites,
  getSitesForDiscovery,
  performSiteHealthCheck,
  saveSite,
  searchSites,
  updateSiteStatus,
  type SiteStorageEnv,
} from "../services/site-storage.service";

/**
 * Hono application instance for sites API routes.
 * Configured with CORS, error handling, logging, and rate limiting middleware.
 */
const app = new Hono<{ Bindings: SiteStorageEnv }>();

// Apply global middleware
app.use("*", cors());
app.use("*", logger());
app.use("*", errorHandler());
app.use("*", rateLimit({ requests: 100, windowMs: 60000 }));

/**
 * GET /api/sites
 *
 * Retrieves a paginated list of sites with optional filtering and sorting.
 * Supports filtering by status, discovery strategy, and basic text search.
 *
 * Query Parameters:
 * - limit: Number of sites per page (default: 20, max: 100)
 * - offset: Number of sites to skip (default: 0)
 * - status: Filter by site status (active, inactive, error, maintenance)
 * - discovery_strategy: Filter by discovery strategy (sitemap, list, search, custom)
 * - sort_by: Sort field (name, created_at, last_discovered_at)
 * - sort_order: Sort direction (asc, desc)
 *
 * @returns JSON response with sites array and pagination metadata
 */
app.get("/", async (c) => {
  try {
    const url = new URL(c.req.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());

    // Parse and validate query parameters
    const limit = Math.min(parseInt(searchParams.limit || "20", 10), 100);
    const offset = Math.max(parseInt(searchParams.offset || "0", 10), 0);
    const status = searchParams.status as any;
    const discovery_strategy = searchParams.discovery_strategy as any;
    const sort_by = (searchParams.sort_by as any) || "name";
    const sort_order = (searchParams.sort_order as any) || "asc";

    const sites = await getSites(c.env, {
      status,
      discovery_strategy,
      limit,
      offset,
      sort_by,
      sort_order,
    });

    // Get total count for pagination
    const totalResult = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM sites"
    ).first<{ count: number }>();
    const total = totalResult?.count || 0;

    return c.json({
      sites,
      pagination: {
        limit,
        offset,
        total,
        has_more: offset + limit < total,
        next_offset: offset + limit < total ? offset + limit : undefined,
      },
    });
  } catch (error) {
    console.error("Failed to list sites:", error);
    return c.json({ error: "Failed to list sites" }, 500);
  }
});

/**
 * POST /api/sites
 *
 * Creates a new site configuration with comprehensive validation.
 * Validates all required fields and ensures data integrity before saving.
 *
 * Request Body: CreateSiteRequest object with site configuration
 *
 * @returns JSON response with created site data and 201 status code
 */
app.post("/", validateBody(CreateSiteRequestSchema), async (c) => {
  try {
    const siteData = getValidatedBody(c) as CreateSiteRequest;

    // Convert CreateSiteRequest to Site format
    const site = {
      name: siteData.name,
      base_url: siteData.base_url,
      discovery_strategy: siteData.discovery_strategy,
      robots_txt: siteData.robots_txt || null,
      sitemap_url: siteData.sitemap_url || null,
      configuration: siteData.configuration,
      status: "active" as const,
    };

    const siteId = await saveSite(c.env, site);
    const createdSite = await getSiteById(c.env, siteId);

    return c.json(createdSite, 201);
  } catch (error) {
    console.error("Failed to create site:", error);
    return c.json({ error: "Failed to create site" }, 500);
  }
});

/**
 * GET /api/sites/search
 *
 * Performs advanced site search with multiple criteria and comprehensive filtering.
 * Supports text search, status filtering, Steel SDK capability filtering, and more.
 *
 * Query Parameters: SiteSearchParams object with search criteria
 *
 * @returns JSON response with search results and metadata
 */
app.get("/search", async (c) => {
  try {
    const url = new URL(c.req.url);
    const searchParams: SiteSearchParams = {
      query: url.searchParams.get("query") || undefined,
      discovery_strategy: url.searchParams.get("discovery_strategy") as any,
      status: url.searchParams.get("status") as any,
      steel_supported: url.searchParams.get("steel_supported") === "true",
      requires_auth: url.searchParams.get("requires_auth") === "true",
      last_discovered_since:
        url.searchParams.get("last_discovered_since") || undefined,
      last_discovered_until:
        url.searchParams.get("last_discovered_until") || undefined,
      page: parseInt(url.searchParams.get("page") || "1", 10),
      limit: Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 100),
      offset: parseInt(url.searchParams.get("offset") || "0", 10),
      sort_by: (url.searchParams.get("sort_by") as any) || "name",
      sort_order: (url.searchParams.get("sort_order") as any) || "asc",
    };

    const results = await searchSites(c.env, searchParams);
    return c.json(results);
  } catch (error) {
    console.error("Failed to search sites:", error);
    return c.json({ error: "Failed to search sites" }, 500);
  }
});

/**
 * GET /api/sites/discovery-ready
 *
 * Retrieves sites that are ready for job discovery runs.
 * Returns sites that haven't been discovered recently or are due for discovery.
 *
 * @returns JSON response with sites ready for discovery
 */
app.get("/discovery-ready", async (c) => {
  try {
    const sites = await getSitesForDiscovery(c.env);
    return c.json({ sites, count: sites.length });
  } catch (error) {
    console.error("Failed to get discovery-ready sites:", error);
    return c.json({ error: "Failed to get discovery-ready sites" }, 500);
  }
});

/**
 * GET /api/sites/:id
 *
 * Retrieves detailed information for a specific site by ID.
 * Returns complete site configuration and metadata.
 *
 * @param id - Site ID from URL path parameter
 * @returns JSON response with site data or 404 if not found
 */
app.get(
  "/:id",
  validateParams(z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };
      const site = await getSiteById(c.env, id);

      if (!site) {
        return c.json({ error: "Site not found" }, 404);
      }

      return c.json(site);
    } catch (error) {
      console.error("Failed to fetch site:", error);
      return c.json({ error: "Failed to fetch site" }, 500);
    }
  }
);

/**
 * PUT /api/sites/:id
 *
 * Updates an existing site configuration with partial data.
 * Validates the update data and preserves existing values for unspecified fields.
 *
 * @param id - Site ID from URL path parameter
 * @returns JSON response with updated site data
 */
app.put(
  "/:id",
  validateParams(z.object({ id: z.string().uuid() })),
  validateBody(UpdateSiteRequestSchema),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };
      const updateData = getValidatedBody(c) as UpdateSiteRequest;

      // Check if site exists
      const existingSite = await getSiteById(c.env, id);
      if (!existingSite) {
        return c.json({ error: "Site not found" }, 404);
      }

      // Merge existing site with update data
      const updatedSite = {
        ...existingSite,
        ...updateData,
        id, // Ensure ID is preserved
      };

      await saveSite(c.env, updatedSite);
      const result = await getSiteById(c.env, id);

      return c.json(result);
    } catch (error) {
      console.error("Failed to update site:", error);
      return c.json({ error: "Failed to update site" }, 500);
    }
  }
);

/**
 * DELETE /api/sites/:id
 *
 * Removes a site configuration from the system.
 * Performs dependency checks to ensure safe deletion.
 *
 * @param id - Site ID from URL path parameter
 * @returns 204 No Content on success, 404 if not found, 409 if has dependencies
 */
app.delete(
  "/:id",
  validateParams(z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };

      const deleted = await deleteSite(c.env, id);
      if (!deleted) {
        return c.json({ error: "Site not found" }, 404);
      }

      return c.body(null, 204);
    } catch (error) {
      console.error("Failed to delete site:", error);

      if (
        error instanceof Error &&
        error.message.includes("Cannot delete site")
      ) {
        return c.json({ error: error.message }, 409);
      }

      return c.json({ error: "Failed to delete site" }, 500);
    }
  }
);

/**
 * GET /api/sites/:id/statistics
 *
 * Retrieves comprehensive statistics and analytics for a specific site.
 * Returns performance metrics, job discovery rates, and operational health data.
 *
 * @param id - Site ID from URL path parameter
 * @returns JSON response with site statistics
 */
app.get(
  "/:id/statistics",
  validateParams(z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };
      const statistics = await getSiteStatistics(c.env, id);
      return c.json(statistics);
    } catch (error) {
      console.error("Failed to get site statistics:", error);

      if (error instanceof Error && error.message.includes("not found")) {
        return c.json({ error: "Site not found" }, 404);
      }

      return c.json({ error: "Failed to get site statistics" }, 500);
    }
  }
);

/**
 * POST /api/sites/:id/health-check
 *
 * Performs a comprehensive health check for a specific site.
 * Tests connectivity, Steel SDK support, and configuration validity.
 *
 * @param id - Site ID from URL path parameter
 * @returns JSON response with health check results
 */
app.post(
  "/:id/health-check",
  validateParams(z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };
      const healthCheck = await performSiteHealthCheck(c.env, id);
      return c.json(healthCheck);
    } catch (error) {
      console.error("Failed to perform site health check:", error);

      if (error instanceof Error && error.message.includes("not found")) {
        return c.json({ error: "Site not found" }, 404);
      }

      return c.json({ error: "Failed to perform site health check" }, 500);
    }
  }
);

/**
 * PUT /api/sites/:id/status
 *
 * Updates the operational status of a site.
 * Used by monitoring systems and health check processes.
 *
 * @param id - Site ID from URL path parameter
 * @returns JSON response with updated site data
 */
app.put(
  "/:id/status",
  validateParams(z.object({ id: z.string().uuid() })),
  validateBody(
    z.object({
      status: z.enum(["active", "inactive", "error", "maintenance"]),
      last_discovered_at: z.string().datetime().optional(),
    })
  ),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };
      const { status, last_discovered_at } = (c as any).get(
        "validatedBody"
      ) as { status: string; last_discovered_at?: string };

      await updateSiteStatus(c.env, id, status as any, last_discovered_at);
      const updatedSite = await getSiteById(c.env, id);

      return c.json(updatedSite);
    } catch (error) {
      console.error("Failed to update site status:", error);
      return c.json({ error: "Failed to update site status" }, 500);
    }
  }
);

export default app;
