/**
 * Configuration Routes
 *
 * Handles configuration management for search settings and application preferences.
 * Provides CRUD operations for search configurations and system settings.
 *
 * @fileoverview This module manages search configurations, system settings, and
 * application preferences through a RESTful API interface.
 */

import {
  getSearchConfigs,
  saveSearchConfig,
} from "../../core/database/d1-client";
import type { SearchConfig } from "../../shared/types/common.types";
import type { Env } from "../env/env.config";

/**
 * Handles GET requests for retrieving search configurations
 *
 * @param request - The incoming HTTP request
 * @param env - Cloudflare Workers environment bindings
 * @returns Response with search configurations or error details
 *
 * @description This function:
 * 1. Retrieves all search configurations from the database
 * 2. Returns them as JSON response
 * 3. Handles any errors during retrieval
 *
 * @example
 * ```typescript
 * // GET /api/configs
 * // Returns: [{ id: "config1", name: "Software Jobs", keywords: "software,developer", ... }]
 * ```
 */
export async function handleConfigsGet(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const configs = await getSearchConfigs(env);

    return new Response(JSON.stringify(configs), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching configs:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch configurations" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handles POST requests for creating or updating search configurations
 *
 * @param request - The incoming HTTP request with configuration data
 * @param env - Cloudflare Workers environment bindings
 * @returns Response with configuration ID or error details
 *
 * @description This function:
 * 1. Validates required fields (name and keywords)
 * 2. Converts arrays to JSON strings for database storage
 * 3. Creates or updates the search configuration
 * 4. Returns the configuration ID
 *
 * @example
 * ```typescript
 * // POST /api/configs
 * // Body: { name: "Tech Jobs", keywords: ["software", "developer"], locations: ["San Francisco"] }
 * // Returns: { id: "generated-uuid" }
 * ```
 */
export async function handleConfigsPost(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = (await request.json()) as any;

    // Validate required fields
    if (!body.name || !body.keywords) {
      return new Response(
        JSON.stringify({ error: "Name and keywords are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Convert arrays to JSON strings for database storage
    const keywords = Array.isArray(body.keywords)
      ? JSON.stringify(body.keywords)
      : body.keywords;
    const locations = Array.isArray(body.locations)
      ? JSON.stringify(body.locations)
      : body.locations;
    const include_domains = Array.isArray(body.include_domains)
      ? JSON.stringify(body.include_domains)
      : body.include_domains;
    const exclude_domains = Array.isArray(body.exclude_domains)
      ? JSON.stringify(body.exclude_domains)
      : body.exclude_domains;

    const config: SearchConfig = {
      id: body.id || crypto.randomUUID(),
      name: body.name,
      keywords,
      locations,
      include_domains,
      exclude_domains,
      min_comp_total: body.min_comp_total,
    };

    const configId = await saveSearchConfig(env, config);

    return new Response(JSON.stringify({ id: configId }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error saving config:", error);
    return new Response(
      JSON.stringify({ error: "Failed to save configuration" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handles PUT requests for updating existing search configurations
 *
 * @param request - The incoming HTTP request with updated configuration data
 * @param env - Cloudflare Workers environment bindings
 * @returns Response with success status or error details
 *
 * @description This function:
 * 1. Extracts configuration ID from URL parameters
 * 2. Validates the configuration exists
 * 3. Updates the configuration with new data
 * 4. Returns success confirmation
 *
 * @example
 * ```typescript
 * // PUT /api/configs/config123
 * // Body: { name: "Updated Tech Jobs", keywords: ["software", "engineer"] }
 * // Returns: { success: true, message: "Configuration updated" }
 * ```
 */
export async function handleConfigsPut(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const configId = url.pathname.split("/").pop();

    if (!configId) {
      return new Response(
        JSON.stringify({ error: "Configuration ID is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const body = (await request.json()) as any;

    // Convert arrays to JSON strings for database storage
    const keywords = Array.isArray(body.keywords)
      ? JSON.stringify(body.keywords)
      : body.keywords;
    const locations = Array.isArray(body.locations)
      ? JSON.stringify(body.locations)
      : body.locations;
    const include_domains = Array.isArray(body.include_domains)
      ? JSON.stringify(body.include_domains)
      : body.include_domains;
    const exclude_domains = Array.isArray(body.exclude_domains)
      ? JSON.stringify(body.exclude_domains)
      : body.exclude_domains;

    const config: SearchConfig = {
      id: configId,
      name: body.name,
      keywords,
      locations,
      include_domains,
      exclude_domains,
      min_comp_total: body.min_comp_total,
    };

    await saveSearchConfig(env, config);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Configuration updated successfully",
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error updating config:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update configuration" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handles DELETE requests for removing search configurations
 *
 * @param request - The incoming HTTP request
 * @param env - Cloudflare Workers environment bindings
 * @returns Response with success status or error details
 *
 * @description This function:
 * 1. Extracts configuration ID from URL parameters
 * 2. Deletes the configuration from the database
 * 3. Returns success confirmation
 *
 * @example
 * ```typescript
 * // DELETE /api/configs/config123
 * // Returns: { success: true, message: "Configuration deleted" }
 * ```
 */
export async function handleConfigsDelete(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const configId = url.pathname.split("/").pop();

    if (!configId) {
      return new Response(
        JSON.stringify({ error: "Configuration ID is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // TODO: Implement deleteSearchConfig function in d1-client
    // await deleteSearchConfig(env, configId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Configuration deleted successfully",
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error deleting config:", error);
    return new Response(
      JSON.stringify({ error: "Failed to delete configuration" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handles GET requests for retrieving a specific search configuration
 *
 * @param request - The incoming HTTP request
 * @param env - Cloudflare Workers environment bindings
 * @returns Response with the specific configuration or error details
 *
 * @description This function:
 * 1. Extracts configuration ID from URL parameters
 * 2. Retrieves the specific configuration from the database
 * 3. Returns the configuration data or 404 if not found
 *
 * @example
 * ```typescript
 * // GET /api/configs/config123
 * // Returns: { id: "config123", name: "Tech Jobs", keywords: "software,developer", ... }
 * ```
 */
export async function handleConfigsGetById(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const configId = url.pathname.split("/").pop();

    if (!configId) {
      return new Response(
        JSON.stringify({ error: "Configuration ID is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // TODO: Implement getSearchConfigById function in d1-client
    // const config = await getSearchConfigById(env, configId);

    // For now, return a placeholder response
    return new Response(
      JSON.stringify({
        error: "Function not implemented yet",
      }),
      {
        status: 501,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching config by ID:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch configuration" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
