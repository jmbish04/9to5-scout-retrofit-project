/**
 * Jobs API routes for retrieving and managing job data.
 */

import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { Env } from "../../../config/env";
import {
  JobHistorySubmissionSchema,
  JobSearchParamsSchema,
} from "../models/job.schema";
import {
  disableJobMonitoring,
  enableJobMonitoring,
  getMonitoringStats,
  monitorAllJobs,
} from "../services/job-monitoring.service";
import {
  getJobQueueEntries,
  submitJobUrlsForProcessing,
} from "../services/job-processing.service";
import {
  getJob,
  getJobHistoryByApplicant,
  getJobRatingsByApplicant,
  getJobs,
  saveJob,
  saveJobHistoryEntry,
  saveJobHistorySubmission,
  saveJobRating,
  searchJobs,
} from "../services/job-storage.service";

const jobs = new Hono<{ Bindings: Env }>();

// GET /jobs - List jobs with optional filtering
jobs.get("/", async (c) => {
  try {
    const status = c.req.query("status");
    const siteId = c.req.query("site_id");
    const limit = parseInt(c.req.query("limit") || "50");

    const jobs = await getJobs(c.env, { status, site_id: siteId, limit });

    return c.json(jobs);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return c.json({ error: "Failed to fetch jobs" }, 500);
  }
});

// GET /jobs/search - Search jobs with advanced filtering
jobs.get("/search", zValidator("query", JobSearchParamsSchema), async (c) => {
  try {
    const params = c.req.valid("query");
    const result = await searchJobs(c.env, params);

    return c.json(result);
  } catch (error) {
    console.error("Error searching jobs:", error);
    return c.json({ error: "Failed to search jobs" }, 500);
  }
});

// GET /jobs/:id - Get specific job
jobs.get("/:id", async (c) => {
  try {
    const jobId = c.req.param("id");
    const job = await getJob(c.env, jobId);

    if (!job) {
      return c.json({ error: "Job not found" }, 404);
    }

    return c.json(job);
  } catch (error) {
    console.error("Error fetching job:", error);
    return c.json({ error: "Failed to fetch job" }, 500);
  }
});

// POST /jobs - Create new job
jobs.post("/", async (c) => {
  try {
    const jobData = await c.req.json();
    const jobId = await saveJob(c.env, jobData);

    return c.json({ id: jobId, success: true }, 201);
  } catch (error) {
    console.error("Error creating job:", error);
    return c.json({ error: "Failed to create job" }, 500);
  }
});

// POST /jobs/process - Process job URLs
jobs.post("/process", async (c) => {
  try {
    const request = await c.req.json();
    const result = await submitJobUrlsForProcessing(c.env, request);

    return c.json(result);
  } catch (error) {
    console.error("Error processing job URLs:", error);
    return c.json({ error: "Failed to process job URLs" }, 500);
  }
});

// GET /jobs/queue - Get job queue entries
jobs.get("/queue", async (c) => {
  try {
    const status = c.req.query("status");
    const source = c.req.query("source");
    const limit = parseInt(c.req.query("limit") || "50");

    const entries = await getJobQueueEntries(c.env, { status, source, limit });

    return c.json(entries);
  } catch (error) {
    console.error("Error fetching job queue:", error);
    return c.json({ error: "Failed to fetch job queue" }, 500);
  }
});

// POST /jobs/:id/monitor - Enable job monitoring
jobs.post("/:id/monitor", async (c) => {
  try {
    const jobId = c.req.param("id");
    const { frequency_hours } = await c.req.json();

    await enableJobMonitoring(c.env, jobId, frequency_hours || 24);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error enabling job monitoring:", error);
    return c.json({ error: "Failed to enable job monitoring" }, 500);
  }
});

// DELETE /jobs/:id/monitor - Disable job monitoring
jobs.delete("/:id/monitor", async (c) => {
  try {
    const jobId = c.req.param("id");

    await disableJobMonitoring(c.env, jobId);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error disabling job monitoring:", error);
    return c.json({ error: "Failed to disable job monitoring" }, 500);
  }
});

// POST /jobs/monitor/all - Monitor all jobs
jobs.post("/monitor/all", async (c) => {
  try {
    const stats = await monitorAllJobs(c.env);

    return c.json(stats);
  } catch (error) {
    console.error("Error monitoring jobs:", error);
    return c.json({ error: "Failed to monitor jobs" }, 500);
  }
});

// GET /jobs/monitor/stats - Get monitoring statistics
jobs.get("/monitor/stats", async (c) => {
  try {
    const startDate = c.req.query("start_date");
    const endDate = c.req.query("end_date");
    const jobId = c.req.query("job_id");

    const stats = await getMonitoringStats(c.env, {
      start_date: startDate,
      end_date: endDate,
      job_id: jobId,
    });

    return c.json(stats);
  } catch (error) {
    console.error("Error fetching monitoring stats:", error);
    return c.json({ error: "Failed to fetch monitoring stats" }, 500);
  }
});

// Job History Routes

// GET /jobs/:id/history - Get job history for a job
jobs.get("/:id/history", async (c) => {
  try {
    const jobId = c.req.param("id");
    const limit = parseInt(c.req.query("limit") || "30");

    // This would need to be implemented in job-storage.service.ts
    // const history = await getJobHistoryByJob(c.env, jobId, limit);

    return c.json({ message: "Job history endpoint not yet implemented" });
  } catch (error) {
    console.error("Error fetching job history:", error);
    return c.json({ error: "Failed to fetch job history" }, 500);
  }
});

// POST /jobs/:id/history - Add job history entry
jobs.post("/:id/history", async (c) => {
  try {
    const jobId = c.req.param("id");
    const entryData = await c.req.json();

    const entry = await saveJobHistoryEntry(c.env, {
      ...entryData,
      job_id: jobId,
    });

    return c.json(entry, 201);
  } catch (error) {
    console.error("Error creating job history entry:", error);
    return c.json({ error: "Failed to create job history entry" }, 500);
  }
});

// Job Ratings Routes

// GET /jobs/:id/ratings - Get job ratings
jobs.get("/:id/ratings", async (c) => {
  try {
    const jobId = c.req.param("id");

    // This would need to be implemented in job-storage.service.ts
    // const ratings = await getJobRatingsByJob(c.env, jobId);

    return c.json({ message: "Job ratings endpoint not yet implemented" });
  } catch (error) {
    console.error("Error fetching job ratings:", error);
    return c.json({ error: "Failed to fetch job ratings" }, 500);
  }
});

// POST /jobs/:id/ratings - Add job rating
jobs.post("/:id/ratings", async (c) => {
  try {
    const jobId = c.req.param("id");
    const ratingData = await c.req.json();

    const rating = await saveJobRating(c.env, {
      ...ratingData,
      job_id: jobId,
    });

    return c.json(rating, 201);
  } catch (error) {
    console.error("Error creating job rating:", error);
    return c.json({ error: "Failed to create job rating" }, 500);
  }
});

// Applicant Job History Routes

// GET /applicants/:id/jobs - Get job history for applicant
jobs.get("/applicants/:id/jobs", async (c) => {
  try {
    const applicantId = c.req.param("id");
    const history = await getJobHistoryByApplicant(c.env, applicantId);

    return c.json(history);
  } catch (error) {
    console.error("Error fetching applicant job history:", error);
    return c.json({ error: "Failed to fetch applicant job history" }, 500);
  }
});

// POST /applicants/:id/jobs/submissions - Submit job application
jobs.post(
  "/applicants/:id/jobs/submissions",
  zValidator("json", JobHistorySubmissionSchema),
  async (c) => {
    try {
      const applicantId = c.req.param("id");
      const submission = c.req.valid("json");

      await saveJobHistorySubmission(c.env, {
        ...submission,
        user_id: applicantId,
      });

      return c.json({ success: true }, 201);
    } catch (error) {
      console.error("Error submitting job application:", error);
      return c.json({ error: "Failed to submit job application" }, 500);
    }
  }
);

// GET /applicants/:id/ratings - Get applicant job ratings
jobs.get("/applicants/:id/ratings", async (c) => {
  try {
    const applicantId = c.req.param("id");
    const ratings = await getJobRatingsByApplicant(c.env, applicantId);

    return c.json(ratings);
  } catch (error) {
    console.error("Error fetching applicant ratings:", error);
    return c.json({ error: "Failed to fetch applicant ratings" }, 500);
  }
});

export default jobs;
