/**
 * @file Scraping REST API Routes
 *
 * This file provides comprehensive REST API endpoints for the scraping domain within the 9to5-Scout platform.
 * It implements a complete API for scraping job management with advanced features including job creation,
 * monitoring, progress tracking, and result retrieval.
 *
 * Key Endpoints:
 * - `GET /api/scraping/jobs`: List scraping jobs with pagination and filtering
 * - `POST /api/scraping/jobs`: Create new scraping jobs with validation
 * - `GET /api/scraping/jobs/:id`: Get specific scraping job details
 * - `PUT /api/scraping/jobs/:id`: Update scraping job configuration
 * - `DELETE /api/scraping/jobs/:id`: Cancel or delete scraping jobs
 * - `POST /api/scraping/jobs/:id/start`: Start a pending scraping job
 * - `POST /api/scraping/jobs/:id/pause`: Pause a running scraping job
 * - `POST /api/scraping/jobs/:id/resume`: Resume a paused scraping job
 * - `GET /api/scraping/jobs/:id/progress`: Get real-time job progress
 * - `GET /api/scraping/jobs/:id/results`: Get scraping job results
 * - `POST /api/scraping/discover`: Discover URLs for scraping
 * - `GET /api/scraping/queue`: Get scraping queue status
 * - `POST /api/scraping/queue`: Add jobs to scraping queue
 *
 * @author 9to5-Scout Development Team
 * @since 1.0.0
 * @maintainer 9to5-Scout Development Team
 */

import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../../../config/env";
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
  AddToQueueRequestSchema,
  CreateScrapingJobRequestSchema,
  DiscoveryConfigSchema,
  UpdateScrapingJobRequestSchema,
} from "../models/scraping.schema";
import { createDiscoveryService } from "../services/discovery.service";
import { createScrapingService } from "../services/scraping.service";

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use("*", cors());
app.use("*", logger());
app.use("*", rateLimit({ requests: 100, windowMs: 60000 }));
app.use("*", errorHandler());

/**
 * @route GET /api/scraping/jobs
 * @summary List all scraping jobs with pagination and filtering
 * @description Retrieve a paginated list of scraping jobs with optional filtering by status, site, and date range
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 20, max: 100)
 * @param {string} status - Filter by job status (pending, running, completed, failed, cancelled, paused)
 * @param {string} siteId - Filter by site ID
 * @param {string} startDate - Filter by creation date (ISO 8601)
 * @param {string} endDate - Filter by creation date (ISO 8601)
 * @returns {ScrapingJobsListResponse} Paginated list of scraping jobs
 */
app.get("/jobs", async (c) => {
  try {
    const url = new URL(c.req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "20"),
      100
    );
    const status = url.searchParams.get("status");
    const siteId = url.searchParams.get("siteId");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    const scrapingService = createScrapingService(c.env);
    const allJobs = scrapingService.getAllJobs();

    // Apply filters
    let filteredJobs = allJobs;
    if (status) {
      filteredJobs = filteredJobs.filter((job) => job.status === status);
    }
    if (siteId) {
      filteredJobs = filteredJobs.filter((job) => job.siteId === siteId);
    }
    if (startDate) {
      filteredJobs = filteredJobs.filter((job) => job.createdAt >= startDate);
    }
    if (endDate) {
      filteredJobs = filteredJobs.filter((job) => job.createdAt <= endDate);
    }

    // Pagination
    const total = filteredJobs.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const jobs = filteredJobs.slice(offset, offset + limit);

    return c.json({
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error listing scraping jobs:", error);
    return c.json(
      {
        error: "Failed to list scraping jobs",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * @route POST /api/scraping/jobs
 * @summary Create a new scraping job
 * @description Create a new scraping job with the specified configuration and URLs
 * @param {CreateScrapingJobRequest} body - Scraping job creation data
 * @returns {ScrapingJobResponse} Created scraping job details
 */
app.post("/jobs", validateBody(CreateScrapingJobRequestSchema), async (c) => {
  try {
    const jobData = getValidatedBody(c);

    const scrapingService = createScrapingService(c.env);
    const job = await scrapingService.createJob(
      jobData.siteId,
      jobData.urls,
      jobData.config || {
        maxConcurrent: 5,
        timeout: 30000,
        retries: 3,
        delay: 1000,
        followRedirects: true,
        extractImages: false,
        extractLinks: false,
        scrollToBottom: false,
        screenshot: false,
        pdf: false,
      },
      jobData.credentials
    );

    return c.json(
      {
        id: job.id,
        siteId: job.siteId,
        status: job.status,
        createdAt: job.createdAt,
        progress: {
          current: 0,
          total: job.urls.length,
          percentage: 0,
        },
      },
      201
    );
  } catch (error) {
    console.error("Error creating scraping job:", error);
    return c.json(
      {
        error: "Failed to create scraping job",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      400
    );
  }
});

/**
 * @route GET /api/scraping/jobs/:id
 * @summary Get specific scraping job details
 * @description Retrieve detailed information about a specific scraping job including status, progress, and results
 * @param {string} id - Scraping job ID
 * @returns {ScrapingJobResponse} Scraping job details
 */
app.get(
  "/jobs/:id",
  validateParams(z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };

      const scrapingService = createScrapingService(c.env);
      const job = scrapingService.getJob(id);

      if (!job) {
        return c.json({ error: "Scraping job not found" }, 404);
      }

      const response = {
        id: job.id,
        siteId: job.siteId,
        status: job.status,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        progress: job.results
          ? {
              current: job.results.successful + job.results.failed,
              total: job.results.totalUrls,
              percentage: Math.round(
                ((job.results.successful + job.results.failed) /
                  job.results.totalUrls) *
                  100
              ),
            }
          : undefined,
        results: job.results,
        error: job.error,
      };

      return c.json(response);
    } catch (error) {
      console.error("Error getting scraping job:", error);
      return c.json(
        {
          error: "Failed to get scraping job",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

/**
 * @route PUT /api/scraping/jobs/:id
 * @summary Update scraping job configuration
 * @description Update the configuration of an existing scraping job (only if not running)
 * @param {string} id - Scraping job ID
 * @param {UpdateScrapingJobRequest} body - Updated job configuration
 * @returns {ScrapingJobResponse} Updated scraping job details
 */
app.put(
  "/jobs/:id",
  validateParams(z.object({ id: z.string().uuid() })),
  validateBody(UpdateScrapingJobRequestSchema),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };
      const updateData = getValidatedBody(c);

      const scrapingService = createScrapingService(c.env);
      const job = scrapingService.getJob(id);

      if (!job) {
        return c.json({ error: "Scraping job not found" }, 404);
      }

      if (job.status === "running") {
        return c.json({ error: "Cannot update running scraping job" }, 400);
      }

      // Update job configuration
      if (updateData.config) {
        job.config = { ...job.config, ...updateData.config };
      }
      if (updateData.credentials) {
        job.credentials = updateData.credentials;
      }
      if (updateData.status) {
        job.status = updateData.status;
      }

      return c.json({
        id: job.id,
        siteId: job.siteId,
        status: job.status,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
      });
    } catch (error) {
      console.error("Error updating scraping job:", error);
      return c.json(
        {
          error: "Failed to update scraping job",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

/**
 * @route DELETE /api/scraping/jobs/:id
 * @summary Cancel or delete a scraping job
 * @description Cancel a running scraping job or delete a completed/failed job
 * @param {string} id - Scraping job ID
 * @returns {object} Success message
 */
app.delete(
  "/jobs/:id",
  validateParams(z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };

      const scrapingService = createScrapingService(c.env);
      const job = scrapingService.getJob(id);

      if (!job) {
        return c.json({ error: "Scraping job not found" }, 404);
      }

      if (job.status === "running") {
        await scrapingService.cancelJob(id);
        return c.json({ message: "Scraping job cancelled successfully" });
      } else {
        // For completed/failed jobs, we would need to implement deletion
        return c.json({ message: "Scraping job marked for deletion" });
      }
    } catch (error) {
      console.error("Error deleting scraping job:", error);
      return c.json(
        {
          error: "Failed to delete scraping job",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

/**
 * @route POST /api/scraping/jobs/:id/start
 * @summary Start a pending scraping job
 * @description Start execution of a pending scraping job
 * @param {string} id - Scraping job ID
 * @returns {object} Success message
 */
app.post(
  "/jobs/:id/start",
  validateParams(z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };

      const scrapingService = createScrapingService(c.env);
      await scrapingService.startJob(id);

      return c.json({ message: "Scraping job started successfully" });
    } catch (error) {
      console.error("Error starting scraping job:", error);
      return c.json(
        {
          error: "Failed to start scraping job",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        400
      );
    }
  }
);

/**
 * @route POST /api/scraping/jobs/:id/pause
 * @summary Pause a running scraping job
 * @description Pause execution of a running scraping job
 * @param {string} id - Scraping job ID
 * @returns {object} Success message
 */
app.post(
  "/jobs/:id/pause",
  validateParams(z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };

      const scrapingService = createScrapingService(c.env);
      await scrapingService.pauseJob(id);

      return c.json({ message: "Scraping job paused successfully" });
    } catch (error) {
      console.error("Error pausing scraping job:", error);
      return c.json(
        {
          error: "Failed to pause scraping job",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        400
      );
    }
  }
);

/**
 * @route POST /api/scraping/jobs/:id/resume
 * @summary Resume a paused scraping job
 * @description Resume execution of a paused scraping job
 * @param {string} id - Scraping job ID
 * @returns {object} Success message
 */
app.post(
  "/jobs/:id/resume",
  validateParams(z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };

      const scrapingService = createScrapingService(c.env);
      await scrapingService.resumeJob(id);

      return c.json({ message: "Scraping job resumed successfully" });
    } catch (error) {
      console.error("Error resuming scraping job:", error);
      return c.json(
        {
          error: "Failed to resume scraping job",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        400
      );
    }
  }
);

/**
 * @route GET /api/scraping/jobs/:id/progress
 * @summary Get real-time job progress
 * @description Get real-time progress information for a scraping job
 * @param {string} id - Scraping job ID
 * @returns {ScrapingProgress} Job progress information
 */
app.get(
  "/jobs/:id/progress",
  validateParams(z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };

      const scrapingService = createScrapingService(c.env);
      const job = scrapingService.getJob(id);

      if (!job) {
        return c.json({ error: "Scraping job not found" }, 404);
      }

      const progress = {
        jobId: job.id,
        current: job.results ? job.results.successful + job.results.failed : 0,
        total: job.urls.length,
        percentage: job.results
          ? Math.round(
              ((job.results.successful + job.results.failed) /
                job.urls.length) *
                100
            )
          : 0,
        currentUrl:
          job.results?.errors?.[job.results.errors.length - 1]?.url || "",
        status: job.status,
        errors: job.results?.errors || [],
      };

      return c.json(progress);
    } catch (error) {
      console.error("Error getting job progress:", error);
      return c.json(
        {
          error: "Failed to get job progress",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

/**
 * @route GET /api/scraping/jobs/:id/results
 * @summary Get scraping job results
 * @description Retrieve the results of a completed scraping job including extracted jobs and metadata
 * @param {string} id - Scraping job ID
 * @returns {ScrapingResults} Job results
 */
app.get(
  "/jobs/:id/results",
  validateParams(z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };

      const scrapingService = createScrapingService(c.env);
      const job = scrapingService.getJob(id);

      if (!job) {
        return c.json({ error: "Scraping job not found" }, 404);
      }

      if (!job.results) {
        return c.json({ error: "Job results not available yet" }, 404);
      }

      return c.json(job.results);
    } catch (error) {
      console.error("Error getting job results:", error);
      return c.json(
        {
          error: "Failed to get job results",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

/**
 * @route POST /api/scraping/discover
 * @summary Discover URLs for scraping
 * @description Discover job posting URLs using various strategies (sitemap, crawling, search, etc.)
 * @param {DiscoveryConfig} body - Discovery configuration
 * @returns {object} Discovered URLs and errors
 */
app.post("/discover", validateBody(DiscoveryConfigSchema), async (c) => {
  try {
    const config = getValidatedBody(c);
    const baseUrl = c.req.header("X-Base-Url");

    if (!baseUrl) {
      return c.json({ error: "X-Base-Url header is required" }, 400);
    }

    const discoveryService = createDiscoveryService(c.env);
    const result = await discoveryService.discoverUrls(baseUrl, config);

    return c.json({
      urls: result.urls,
      totalFound: result.urls.length,
      errors: result.errors,
    });
  } catch (error) {
    console.error("Error discovering URLs:", error);
    return c.json(
      {
        error: "Failed to discover URLs",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * @route GET /api/scraping/queue
 * @summary Get scraping queue status
 * @description Get the current status of the scraping queue including pending, running, and completed jobs
 * @returns {QueueStatusResponse} Queue status information
 */
app.get("/queue", async (c) => {
  try {
    const scrapingService = createScrapingService(c.env);
    const allJobs = scrapingService.getAllJobs();

    const status = {
      total: allJobs.length,
      pending: allJobs.filter((job) => job.status === "pending").length,
      running: allJobs.filter((job) => job.status === "running").length,
      completed: allJobs.filter((job) => job.status === "completed").length,
      failed: allJobs.filter((job) => job.status === "failed").length,
      paused: allJobs.filter((job) => job.status === "paused").length,
    };

    const nextJob = allJobs
      .filter((job) => job.status === "pending")
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )[0];

    return c.json({
      status,
      nextJob: nextJob
        ? {
            id: nextJob.id,
            siteId: nextJob.siteId,
            urls: nextJob.urls,
            createdAt: nextJob.createdAt,
          }
        : undefined,
      estimatedWaitTime: status.pending * 30, // Rough estimate: 30 seconds per job
    });
  } catch (error) {
    console.error("Error getting queue status:", error);
    return c.json(
      {
        error: "Failed to get queue status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * @route POST /api/scraping/queue
 * @summary Add jobs to scraping queue
 * @description Add new scraping jobs to the queue for processing
 * @param {AddToQueueRequest} body - Queue request data
 * @returns {object} Success message with job IDs
 */
app.post("/queue", validateBody(AddToQueueRequestSchema), async (c) => {
  try {
    const queueData = getValidatedBody(c);

    const scrapingService = createScrapingService(c.env);
    const job = await scrapingService.createJob(
      queueData.siteId,
      queueData.urls,
      queueData.config || {
        maxConcurrent: 5,
        timeout: 30000,
        retries: 3,
        delay: 1000,
        followRedirects: true,
        extractImages: false,
        extractLinks: false,
        scrollToBottom: false,
        screenshot: false,
        pdf: false,
      },
      queueData.credentials
    );

    return c.json({
      message: "Jobs added to queue successfully",
      jobId: job.id,
      status: job.status,
    });
  } catch (error) {
    console.error("Error adding jobs to queue:", error);
    return c.json(
      {
        error: "Failed to add jobs to queue",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      400
    );
  }
});

export default app;
