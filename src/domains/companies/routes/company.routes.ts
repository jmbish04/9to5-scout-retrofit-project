/**
 * Company Routes
 *
 * RESTful API routes for company management, including company profiles,
 * research, benefits analysis, and intelligence gathering.
 */

import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../../../config/env";
import {
  getValidatedBody,
  getValidatedParams,
  logger,
  rateLimit,
  validateBody,
  validateParams,
} from "../../../core/validation/hono-validation";
import {
  CreateCompanyRequestSchema,
  UpdateCompanyRequestSchema,
} from "../models/company.schema";
import { createCompanyIntelligenceService } from "../services/company-intelligence.service";
import { createCompanyStorageService } from "../services/company-storage.service";

const app = new Hono<{ Bindings: Env }>();

// Apply middleware
app.use("*", logger as any);
app.use("*", rateLimit({ requests: 100, windowMs: 60000 }) as any);

/**
 * @route POST /companies
 * @desc Create a new company
 * @access Private
 * @param {CreateCompanyRequest} body - Company data
 * @returns {CompanyResponse} Created company
 */
app.post("/", validateBody(CreateCompanyRequestSchema), async (c) => {
  try {
    const companyData = getValidatedBody(c);
    const companyService = createCompanyStorageService(c.env);

    const company = await companyService.createCompany(companyData);

    return c.json(
      {
        success: true,
        company,
      },
      201
    );
  } catch (error) {
    console.error("Error creating company:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create company",
      },
      500
    );
  }
});

/**
 * @route GET /companies
 * @desc List companies with search and filtering
 * @access Private
 * @query {string} query - Search query
 * @query {string} industry - Filter by industry
 * @query {string} size - Filter by company size
 * @query {string} location - Filter by location
 * @query {number} limit - Number of companies to return
 * @query {number} offset - Number of companies to skip
 * @returns {CompanyListResponse} List of companies
 */
app.get("/", async (c) => {
  try {
    const url = new URL(c.req.url);
    const query = url.searchParams.get("query") || undefined;
    const industry = url.searchParams.get("industry") || undefined;
    const size = url.searchParams.get("size") || undefined;
    const location = url.searchParams.get("location") || undefined;
    const limit = parseInt(url.searchParams.get("limit") || "25");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const companyService = createCompanyStorageService(c.env);
    const result = await companyService.searchCompanies({
      query,
      industry,
      size,
      location,
      limit,
      offset,
    });

    return c.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error listing companies:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to list companies",
      },
      500
    );
  }
});

/**
 * @route GET /companies/:id
 * @desc Get a specific company
 * @access Private
 * @param {string} id - Company ID
 * @returns {CompanyResponse} Company details
 */
app.get(
  "/:id",
  validateParams(z.object({ id: z.string().min(1) })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };
      const companyService = createCompanyStorageService(c.env);

      const company = await companyService.getCompany(id);
      if (!company) {
        return c.json(
          {
            success: false,
            error: "Company not found",
          },
          404
        );
      }

      return c.json({
        success: true,
        company,
      });
    } catch (error) {
      console.error("Error getting company:", error);
      return c.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to get company",
        },
        500
      );
    }
  }
);

/**
 * @route PUT /companies/:id
 * @desc Update a company
 * @access Private
 * @param {string} id - Company ID
 * @param {UpdateCompanyRequest} body - Update data
 * @returns {CompanyResponse} Updated company
 */
app.put(
  "/:id",
  validateParams(z.object({ id: z.string().min(1) })),
  validateBody(UpdateCompanyRequestSchema),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };
      const updateData = getValidatedBody(c);
      const companyService = createCompanyStorageService(c.env);

      const company = await companyService.updateCompany(id, updateData);
      if (!company) {
        return c.json(
          {
            success: false,
            error: "Company not found",
          },
          404
        );
      }

      return c.json({
        success: true,
        company,
      });
    } catch (error) {
      console.error("Error updating company:", error);
      return c.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to update company",
        },
        500
      );
    }
  }
);

/**
 * @route DELETE /companies/:id
 * @desc Delete a company
 * @access Private
 * @param {string} id - Company ID
 * @returns {object} Success message
 */
app.delete(
  "/:id",
  validateParams(z.object({ id: z.string().min(1) })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };
      const companyService = createCompanyStorageService(c.env);

      const deleted = await companyService.deleteCompany(id);
      if (!deleted) {
        return c.json(
          {
            success: false,
            error: "Company not found",
          },
          404
        );
      }

      return c.json({
        success: true,
        message: "Company deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting company:", error);
      return c.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to delete company",
        },
        500
      );
    }
  }
);

/**
 * @route POST /companies/research
 * @desc Start company research
 * @access Private
 * @param {object} body - Research request
 * @returns {object} Research status
 */
app.post("/research", async (c) => {
  try {
    const { companyName, domain, industry } = await c.req.json();
    const intelligenceService = createCompanyIntelligenceService(c.env);

    if (!companyName) {
      return c.json(
        {
          success: false,
          error: "Company name is required",
        },
        400
      );
    }

    const research = await intelligenceService.researchCompany(
      companyName,
      domain,
      industry
    );

    return c.json({
      success: true,
      research,
    });
  } catch (error) {
    console.error("Error starting company research:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to start company research",
      },
      500
    );
  }
});

/**
 * @route GET /companies/:id/benefits
 * @desc Get company benefits
 * @access Private
 * @param {string} id - Company ID
 * @query {number} limit - Number of snapshots to return
 * @returns {CompanyBenefitsResponse} Company benefits data
 */
app.get(
  "/:id/benefits",
  validateParams(z.object({ id: z.string().min(1) })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };
      const url = new URL(c.req.url);
      const limit = parseInt(url.searchParams.get("limit") || "10");

      const companyService = createCompanyStorageService(c.env);
      const snapshots = await companyService.getCompanySnapshots(id, limit);
      const stats = await companyService.getCompanyStats(id);

      return c.json({
        success: true,
        snapshots,
        stats,
      });
    } catch (error) {
      console.error("Error getting company benefits:", error);
      return c.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to get company benefits",
        },
        500
      );
    }
  }
);

/**
 * @route GET /companies/compare
 * @desc Compare multiple companies
 * @access Private
 * @query {string} company_ids - Comma-separated company IDs
 * @returns {CompanyCompareResponse} Company comparison data
 */
app.get("/compare", async (c) => {
  try {
    const url = new URL(c.req.url);
    const idsParam = url.searchParams.get("company_ids");

    if (!idsParam) {
      return c.json(
        {
          success: false,
          error: "company_ids query parameter is required",
        },
        400
      );
    }

    const companyIds = idsParam
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
    if (companyIds.length === 0) {
      return c.json(
        {
          success: false,
          error: "No valid company_ids provided",
        },
        400
      );
    }

    const companyService = createCompanyStorageService(c.env);
    const companies = [];

    for (const companyId of companyIds) {
      const snapshots = await companyService.getCompanySnapshots(companyId, 5);
      const stats = await companyService.getCompanyStats(companyId);

      companies.push({
        company_id: companyId,
        snapshots,
        stats,
      });
    }

    return c.json({
      success: true,
      companies,
    });
  } catch (error) {
    console.error("Error comparing companies:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to compare companies",
      },
      500
    );
  }
});

/**
 * @route GET /companies/stats/highlights
 * @desc Get top benefits highlights
 * @access Private
 * @query {number} limit - Number of highlights to return
 * @returns {CompanyStatsHighlightsResponse} Top highlights
 */
app.get("/stats/highlights", async (c) => {
  try {
    const url = new URL(c.req.url);
    const limit = parseInt(url.searchParams.get("limit") || "10");

    // Get top highlights from benefits_stats table
    const result = await c.env.DB.prepare(
      `
      SELECT highlights FROM benefits_stats 
      ORDER BY computed_at DESC 
      LIMIT ?
    `
    )
      .bind(limit)
      .all();

    const allHighlights: string[] = [];
    (result || []).forEach((row: any) => {
      if (row.highlights) {
        const highlights = JSON.parse(row.highlights);
        allHighlights.push(...highlights);
      }
    });

    // Get unique highlights and sort by frequency
    const highlightCounts = new Map<string, number>();
    allHighlights.forEach((highlight) => {
      highlightCounts.set(highlight, (highlightCounts.get(highlight) || 0) + 1);
    });

    const topHighlights = Array.from(highlightCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([highlight]) => highlight);

    return c.json({
      success: true,
      highlights: topHighlights,
    });
  } catch (error) {
    console.error("Error getting highlights:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get highlights",
      },
      500
    );
  }
});

/**
 * @route GET /companies/stats/valuations
 * @desc Get company valuations
 * @access Private
 * @query {number} limit - Number of valuations to return
 * @returns {CompanyStatsValuationsResponse} Company valuations
 */
app.get("/stats/valuations", async (c) => {
  try {
    const url = new URL(c.req.url);
    const limit = parseInt(url.searchParams.get("limit") || "25");

    // Get valuations from benefits_stats table
    const result = await c.env.DB.prepare(
      `
      SELECT company_id, total_comp_heuristics, computed_at 
      FROM benefits_stats 
      WHERE total_comp_heuristics IS NOT NULL
      ORDER BY computed_at DESC 
      LIMIT ?
    `
    )
      .bind(limit)
      .all();

    const valuations = (result || []).map((row: any) => ({
      company_id: row.company_id,
      valuation: row.total_comp_heuristics
        ? JSON.parse(row.total_comp_heuristics)
        : null,
      computed_at: row.computed_at,
    }));

    return c.json({
      success: true,
      valuations,
    });
  } catch (error) {
    console.error("Error getting valuations:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get valuations",
      },
      500
    );
  }
});

export default app;
