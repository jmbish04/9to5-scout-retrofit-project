/**
 * Talent API routes for Google Jobs API integration
 * Provides endpoints for job search and suggestions using Google's Talent API
 */

import { Context, Hono } from "hono";
import { z } from "zod";
import {
  cors,
  errorHandler,
  logger,
  rateLimit,
  validateBody,
} from "../lib/hono-validation";
import { GoogleJobsService, SearchJobsRequest } from "../lib/talent";

// Create Hono app for talent routes
const app = new Hono();

// Middleware
app.use("*", cors());
app.use("*", logger());
app.use("*", rateLimit(100)); // 100 requests per minute
app.use("*", errorHandler());

// Request validation schemas
const SearchRequestSchema = z.object({
  query: z.string().min(1, "Query is required"),
  pageSize: z.number().min(1).max(100).default(10),
  location: z.string().optional(),
  jobCategories: z.array(z.string()).optional(),
  employmentTypes: z.array(z.string()).optional(),
  languageCode: z.string().default("en"),
});

const SuggestionsRequestSchema = z.object({
  query: z.string().min(1, "Query is required"),
  pageSize: z.number().min(1).max(50).default(5),
  languageCode: z.string().default("en"),
});

type SearchRequest = z.infer<typeof SearchRequestSchema>;
type SuggestionsRequest = z.infer<typeof SuggestionsRequestSchema>;

/**
 * Search for jobs using Google Jobs API
 * POST /api/talent/search
 */
app.post("/search", validateBody(SearchRequestSchema), async (c: Context) => {
  console.log("🎯 Talent API: Job search request received");

  try {
    const body = c.get("validatedBody") as SearchRequest;
    const {
      query,
      pageSize,
      location,
      jobCategories,
      employmentTypes,
      languageCode,
    } = body;

    console.log(`📝 Search parameters:`, {
      query,
      pageSize,
      location,
      jobCategories,
      employmentTypes,
      languageCode,
    });

    // Create Google Jobs service
    console.log("🔧 Creating Google Jobs service...");
    const jobsService = new GoogleJobsService(c.env);

    // Build search request
    const searchRequest: SearchJobsRequest = {
      requestMetadata: {
        domain: "9to5-scout.com",
        sessionId: crypto.randomUUID(),
        userId: "worker",
      },
      jobQuery: {
        query,
        queryLanguageCode: languageCode,
        locationFilters: location
          ? [
              {
                address: location,
              },
            ]
          : undefined,
        jobCategories: jobCategories,
        employmentTypes: employmentTypes,
      },
      jobView: "JOB_VIEW_FULL",
      pageSize,
    };

    console.log("🔍 Executing Google Jobs API search...");
    // Perform search
    const result = await jobsService.searchJobs(searchRequest);

    if (!result) {
      console.error("❌ Google Jobs API returned null result");
      return c.json(
        { error: "Failed to search jobs. Please try again later." },
        500
      );
    }

    console.log(
      `✅ Search completed successfully. Found ${
        result.matchingJobs?.length || 0
      } jobs`
    );

    // Transform response to match expected format
    const response = {
      matchingJobs: result.matchingJobs || [],
      totalCount: result.totalSize || result.estimatedTotalSize || 0,
      nextPageToken: result.nextPageToken,
      metadata: {
        requestId: result.metadata?.requestId,
      },
    };

    console.log(
      `📊 Returning response with ${response.matchingJobs.length} jobs`
    );
    return c.json(response);
  } catch (error) {
    console.error("💥 Talent search error:", error);
    return c.json({ error: "Internal server error during job search" }, 500);
  }
});

/**
 * Get job search suggestions using Google Jobs API
 * GET /api/talent/suggestions
 */
app.get("/suggestions", async (c: Context) => {
  console.log("💡 Talent API: Suggestions request received");

  try {
    const query = c.req.query("query");
    const pageSize = parseInt(c.req.query("pageSize") || "5");
    const languageCode = c.req.query("languageCode") || "en";

    console.log(`📝 Suggestions parameters:`, {
      query,
      pageSize,
      languageCode,
    });

    if (!query) {
      console.error("❌ Missing required query parameter");
      return c.json({ error: "Query parameter is required" }, 400);
    }

    // Validate query parameters
    const validation = SuggestionsRequestSchema.safeParse({
      query,
      pageSize,
      languageCode,
    });

    if (!validation.success) {
      console.error("❌ Parameter validation failed:", validation.error.issues);
      return c.json(
        { error: "Invalid parameters", details: validation.error.issues },
        400
      );
    }

    console.log("✅ Parameter validation passed");

    // Create Google Jobs service
    console.log("🔧 Creating Google Jobs service for suggestions...");
    const jobsService = new GoogleJobsService(c.env);

    // For suggestions, we'll use a simplified search with the query
    // Google Jobs API doesn't have a dedicated suggestions endpoint in v3p1beta1
    const searchRequest: SearchJobsRequest = {
      requestMetadata: {
        domain: "9to5-scout.com",
        sessionId: crypto.randomUUID(),
        userId: "worker",
      },
      jobQuery: {
        query,
        queryLanguageCode: languageCode,
      },
      jobView: "JOB_VIEW_FULL",
      pageSize,
    };

    console.log("🔍 Executing search for suggestions...");
    // Perform search to get suggestions
    const result = await jobsService.searchJobs(searchRequest);

    if (!result) {
      console.error("❌ Google Jobs API returned null result for suggestions");
      return c.json(
        { error: "Failed to get suggestions. Please try again later." },
        500
      );
    }

    console.log(
      `✅ Search completed for suggestions. Found ${
        result.matchingJobs?.length || 0
      } jobs`
    );

    // Transform to suggestions format
    const suggestions = (result.matchingJobs || []).map((job) => ({
      suggestion: job.job?.title || "",
      type: "job_title",
      jobName: job.job?.name,
      companyName: job.job?.companyName,
    }));

    const response = {
      completionResults: suggestions,
      metadata: {
        requestId: result.metadata?.requestId,
      },
    };

    console.log(`💡 Returning ${suggestions.length} suggestions`);
    return c.json(response);
  } catch (error) {
    console.error("💥 Talent suggestions error:", error);
    return c.json(
      { error: "Internal server error during suggestions retrieval" },
      500
    );
  }
});

/**
 * Get talent API status and configuration
 * GET /api/talent/status
 */
app.get("/status", async (c: Context) => {
  try {
    const status = {
      service: "Google Jobs API",
      version: "v3p1beta1",
      status: "active",
      features: [
        "job_search",
        "job_suggestions",
        "location_filtering",
        "category_filtering",
        "employment_type_filtering",
      ],
      limits: {
        maxPageSize: 100,
        maxSuggestions: 50,
        rateLimit: "100 requests per minute",
      },
      supportedLanguages: [
        "en",
        "es",
        "fr",
        "de",
        "it",
        "pt",
        "ja",
        "ko",
        "zh",
      ],
      timestamp: new Date().toISOString(),
    };

    return c.json(status);
  } catch (error) {
    console.error("Talent status error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
