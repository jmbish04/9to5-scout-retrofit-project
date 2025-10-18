/**
 * Stats Domain Routes
 *
 * HTTP route handlers for statistics computation, analysis, and reporting.
 * Provides RESTful API endpoints for benefits analysis, company metrics,
 * and performance reporting within the 9to5 Scout application.
 *
 * @fileoverview This module defines HTTP route handlers for statistical
 * analysis operations including rollup computation, data retrieval, and reporting.
 */

import type { Env } from "../../config/env/env.config";
import {
  StatsComputationService,
  StatsReportingService,
} from "../services/stats.service";
import type { RollupOptions } from "../types/stats.types";

/**
 * Handle statistics rollup computation
 *
 * @param request - The incoming HTTP request
 * @param env - Cloudflare Workers environment bindings
 * @returns Response with rollup computation result
 *
 * @description Triggers a benefits statistics rollup computation for all companies
 * or a specific company, processing snapshots and generating insights.
 *
 * @example
 * ```typescript
 * // POST /api/stats/rollup
 * // Body: { months: 6, dryRun: false, companyId: "optional" }
 * ```
 */
export async function handleStatsRollupPost(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = (await request.json()) as RollupOptions;
    const service = new StatsComputationService();

    const result = await service.benefitsStatsRollup(env, body);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Statistics rollup completed successfully",
        result,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Statistics rollup error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to compute statistics rollup",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handle company statistics retrieval
 *
 * @param request - The incoming HTTP request
 * @param env - Cloudflare Workers environment bindings
 * @param companyId - Company identifier from URL parameters
 * @returns Response with company statistics data
 *
 * @description Retrieves the latest computed statistics for a specific company,
 * including highlights, coverage, and total compensation data.
 *
 * @example
 * ```typescript
 * // GET /api/stats/companies/{companyId}
 * ```
 */
export async function handleCompanyStatsGet(
  request: Request,
  env: Env,
  companyId: string
): Promise<Response> {
  try {
    const service = new StatsComputationService();
    const stats = await service.getLatestStatsForCompany(env, companyId);

    if (!stats) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No statistics found for company",
          companyId,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: stats,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Company statistics retrieval error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to retrieve company statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handle top highlights retrieval
 *
 * @param request - The incoming HTTP request
 * @param env - Cloudflare Workers environment bindings
 * @returns Response with top highlights data
 *
 * @description Retrieves the most recent highlights data from all companies
 * for cross-company analysis and reporting.
 *
 * @example
 * ```typescript
 * // GET /api/stats/highlights?limit=10
 * ```
 */
export async function handleTopHighlightsGet(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get("limit") || "10", 10), 1),
      100
    );

    const service = new StatsComputationService();
    const highlights = await service.getTopHighlights(env, limit);

    return new Response(
      JSON.stringify({
        success: true,
        data: highlights,
        limit,
        count: highlights.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Top highlights retrieval error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to retrieve top highlights",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handle valuations data retrieval
 *
 * @param request - The incoming HTTP request
 * @param env - Cloudflare Workers environment bindings
 * @returns Response with valuations data
 *
 * @description Retrieves the most recent total compensation data from all
 * companies for valuation analysis and benchmarking.
 *
 * @example
 * ```typescript
 * // GET /api/stats/valuations?limit=25
 * ```
 */
export async function handleValuationsGet(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get("limit") || "25", 10), 1),
      200
    );

    const service = new StatsComputationService();
    const valuations = await service.getValuations(env, limit);

    return new Response(
      JSON.stringify({
        success: true,
        data: valuations,
        limit,
        count: valuations.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Valuations retrieval error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to retrieve valuations data",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handle statistics summary report generation
 *
 * @param request - The incoming HTTP request
 * @param env - Cloudflare Workers environment bindings
 * @returns Response with summary report data
 *
 * @description Generates a comprehensive summary report of statistics
 * including key metrics, trends, and insights across all companies.
 *
 * @example
 * ```typescript
 * // GET /api/stats/summary?includeTrends=true
 * ```
 */
export async function handleStatsSummaryGet(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const includeTrends = url.searchParams.get("includeTrends") === "true";

    const service = new StatsReportingService();
    const report = await service.generateSummaryReport(env, { includeTrends });

    return new Response(
      JSON.stringify({
        success: true,
        data: report,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Statistics summary generation error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to generate statistics summary",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handle statistics data export
 *
 * @param request - The incoming HTTP request
 * @param env - Cloudflare Workers environment bindings
 * @returns Response with exported data
 *
 * @description Exports statistics data in various formats for external
 * analysis and reporting purposes.
 *
 * @example
 * ```typescript
 * // GET /api/stats/export?format=json&includeRawData=true
 * ```
 */
export async function handleStatsExportGet(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const format = (url.searchParams.get("format") as "json" | "csv") || "json";
    const includeRawData = url.searchParams.get("includeRawData") === "true";

    const service = new StatsReportingService();
    const data = await service.exportData(env, { format, includeRawData });

    const contentType = format === "json" ? "application/json" : "text/csv";
    const filename = `stats-export-${
      new Date().toISOString().split("T")[0]
    }.${format}`;

    return new Response(
      format === "json" ? JSON.stringify(data, null, 2) : JSON.stringify(data),
      {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      }
    );
  } catch (error) {
    console.error("Statistics export error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to export statistics data",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handle statistics service configuration
 *
 * @param request - The incoming HTTP request
 * @param env - Cloudflare Workers environment bindings
 * @returns Response with service configuration
 *
 * @description Retrieves or updates the statistics service configuration
 * for debugging and monitoring purposes.
 *
 * @example
 * ```typescript
 * // GET /api/stats/config
 * // PUT /api/stats/config
 * ```
 */
export async function handleStatsConfig(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const service = new StatsComputationService();

    if (request.method === "GET") {
      const config = service.getConfig();
      return new Response(
        JSON.stringify({
          success: true,
          data: config,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (request.method === "PUT") {
      const body = (await request.json()) as Partial<any>;
      const updatedConfig = service.updateConfig(body);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Configuration updated successfully",
          data: updatedConfig,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: "Method not allowed",
      }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Statistics configuration error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to handle configuration request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
