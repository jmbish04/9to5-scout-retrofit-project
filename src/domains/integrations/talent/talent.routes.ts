/**
 * @fileoverview Talent API Integration Routes
 *
 * RESTful API routes for talent API integration including job search,
 * company-specific searches, skill-based searches, and usage tracking.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../../../config/env";
import {
  getValidatedBody,
  getValidatedQuery,
  logger,
  rateLimit,
  validateBody,
  validateQuery,
} from "../../../core/validation/hono-validation";
import { createTalentService } from "./talent.service";
import type { JobSearchParams } from "./talent.types";

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use("*", logger as any);
app.use("*", rateLimit({ requests: 50, windowMs: 60000 }) as any);

// Validation schemas
const JobSearchRequestSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  location: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(10),
  salary_min: z.number().int().min(0).optional(),
  salary_max: z.number().int().min(0).optional(),
  employment_type: z.string().optional(),
  date_posted: z
    .enum(["today", "week", "month", "any"])
    .optional()
    .default("any"),
  remote: z.boolean().optional().default(false),
  company: z.string().optional(),
});

const CompanySearchRequestSchema = z.object({
  company: z.string().min(1, "Company name is required"),
  location: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(10),
});

const SkillsSearchRequestSchema = z.object({
  skills: z.array(z.string().min(1)).min(1, "At least one skill is required"),
  location: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(10),
});

const RemoteSearchRequestSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  limit: z.number().int().min(1).max(100).optional().default(10),
});

const SalarySearchRequestSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  salary_min: z.number().int().min(0, "Minimum salary must be non-negative"),
  salary_max: z.number().int().min(0, "Maximum salary must be non-negative"),
  location: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(10),
});

const JobDetailsRequestSchema = z.object({
  url: z.string().url("Valid job URL is required"),
});

const UsageStatsQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
});

// Routes

/**
 * POST /talent/search - Search jobs with comprehensive filters
 */
app.post("/search", validateBody(JobSearchRequestSchema), async (c) => {
  try {
    const params = getValidatedBody(c) as JobSearchParams;
    const talentService = createTalentService(c.env);

    const results = await talentService.searchJobs(params);

    return c.json({
      success: true,
      data: results,
      meta: {
        query: params.query,
        location: params.location,
        filters: {
          limit: params.limit,
          salary_min: params.salary_min,
          salary_max: params.salary_max,
          employment_type: params.employment_type,
          date_posted: params.date_posted,
          remote: params.remote,
          company: params.company,
        },
      },
    });
  } catch (error) {
    console.error("Error searching jobs:", error);
    return c.json(
      {
        success: false,
        error: "Failed to search jobs",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * POST /talent/search/company - Search jobs by company
 */
app.post(
  "/search/company",
  validateBody(CompanySearchRequestSchema),
  async (c) => {
    try {
      const { company, location, limit } = getValidatedBody(c) as {
        company: string;
        location?: string;
        limit?: number;
      };

      const talentService = createTalentService(c.env);
      const results = await talentService.searchJobsByCompany(
        company,
        location,
        limit
      );

      return c.json({
        success: true,
        data: results,
        meta: {
          company,
          location,
          limit,
        },
      });
    } catch (error) {
      console.error("Error searching jobs by company:", error);
      return c.json(
        {
          success: false,
          error: "Failed to search jobs by company",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

/**
 * POST /talent/search/skills - Search jobs by skills
 */
app.post(
  "/search/skills",
  validateBody(SkillsSearchRequestSchema),
  async (c) => {
    try {
      const { skills, location, limit } = getValidatedBody(c) as {
        skills: string[];
        location?: string;
        limit?: number;
      };

      const talentService = createTalentService(c.env);
      const results = await talentService.searchJobsBySkills(
        skills,
        location,
        limit
      );

      return c.json({
        success: true,
        data: results,
        meta: {
          skills,
          location,
          limit,
        },
      });
    } catch (error) {
      console.error("Error searching jobs by skills:", error);
      return c.json(
        {
          success: false,
          error: "Failed to search jobs by skills",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

/**
 * POST /talent/search/remote - Search remote jobs
 */
app.post(
  "/search/remote",
  validateBody(RemoteSearchRequestSchema),
  async (c) => {
    try {
      const { query, limit } = getValidatedBody(c) as {
        query: string;
        limit?: number;
      };

      const talentService = createTalentService(c.env);
      const results = await talentService.searchRemoteJobs(query, limit);

      return c.json({
        success: true,
        data: results,
        meta: {
          query,
          remote: true,
          limit,
        },
      });
    } catch (error) {
      console.error("Error searching remote jobs:", error);
      return c.json(
        {
          success: false,
          error: "Failed to search remote jobs",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

/**
 * POST /talent/search/salary - Search jobs with salary range
 */
app.post(
  "/search/salary",
  validateBody(SalarySearchRequestSchema),
  async (c) => {
    try {
      const { query, salary_min, salary_max, location, limit } =
        getValidatedBody(c) as {
          query: string;
          salary_min: number;
          salary_max: number;
          location?: string;
          limit?: number;
        };

      if (salary_min >= salary_max) {
        return c.json(
          {
            success: false,
            error: "Invalid salary range",
            message: "Minimum salary must be less than maximum salary",
          },
          400
        );
      }

      const talentService = createTalentService(c.env);
      const results = await talentService.searchJobsWithSalary(
        query,
        salary_min,
        salary_max,
        location,
        limit
      );

      return c.json({
        success: true,
        data: results,
        meta: {
          query,
          salary_min,
          salary_max,
          location,
          limit,
        },
      });
    } catch (error) {
      console.error("Error searching jobs with salary:", error);
      return c.json(
        {
          success: false,
          error: "Failed to search jobs with salary",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

/**
 * GET /talent/job-details - Get job details by URL
 */
app.get("/job-details", validateQuery(JobDetailsRequestSchema), async (c) => {
  try {
    const { url } = getValidatedQuery(c) as { url: string };
    const talentService = createTalentService(c.env);
    const jobDetails = await talentService.getJobDetails(url);

    if (!jobDetails) {
      return c.json(
        {
          success: false,
          error: "Job not found",
          message: "Unable to retrieve job details for the provided URL",
        },
        404
      );
    }

    return c.json({
      success: true,
      data: jobDetails,
      meta: {
        url,
      },
    });
  } catch (error) {
    console.error("Error getting job details:", error);
    return c.json(
      {
        success: false,
        error: "Failed to get job details",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * GET /talent/usage - Get API usage statistics
 */
app.get("/usage", validateQuery(UsageStatsQuerySchema), async (c) => {
  try {
    const { date } = getValidatedQuery(c) as { date?: string };
    const talentService = createTalentService(c.env);
    const usageStats = await talentService.getUsageStats(date);

    if (!usageStats) {
      return c.json(
        {
          success: false,
          error: "No usage data found",
          message: `No usage data found for ${date || "today"}`,
        },
        404
      );
    }

    return c.json({
      success: true,
      data: usageStats,
      meta: {
        date: usageStats.date,
      },
    });
  } catch (error) {
    console.error("Error getting usage stats:", error);
    return c.json(
      {
        success: false,
        error: "Failed to get usage statistics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * GET /talent/health - Health check endpoint
 */
app.get("/health", async (c) => {
  try {
    const isConfigured = !!c.env.SERPAPI_API_KEY;

    return c.json({
      success: true,
      data: {
        status: "healthy",
        configured: isConfigured,
        timestamp: new Date().toISOString(),
        services: {
          serpapi: isConfigured ? "configured" : "not_configured",
          usage_tracker: c.env.USAGE_TRACKER ? "available" : "not_available",
          database: c.env.DB ? "available" : "not_available",
        },
      },
    });
  } catch (error) {
    console.error("Error checking health:", error);
    return c.json(
      {
        success: false,
        error: "Health check failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

export { app as talentRoutes };
