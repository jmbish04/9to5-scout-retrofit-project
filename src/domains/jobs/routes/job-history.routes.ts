/**
 * Job History Management Routes
 * Handles applicant profile management, job history submission, and job rating functionality
 */

import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../../../config/env";
import { JobHistorySubmissionSchema } from "../models/job.schema";
import {
  getJobHistoryByApplicant,
  getJobHistorySubmissions,
  getJobRatingsByApplicant,
  saveJobHistoryEntry,
  saveJobHistorySubmission,
  saveJobRating,
  updateJobHistorySubmission,
} from "../services/job-storage.service";

const jobHistory = new Hono<{ Bindings: Env }>();

// Validation schemas
const JobHistoryRequestSchema = z.object({
  user_id: z.string().uuid(),
  raw_content: z.string().min(1),
  job_id: z.string().uuid().optional(),
  status: z
    .enum(["APPLIED", "INTERVIEWED", "REJECTED", "OFFERED", "WITHDRAWN"])
    .optional(),
  notes: z.string().optional(),
  applied_at: z.string().datetime().optional(),
  interview_date: z.string().datetime().optional(),
  rejection_reason: z.string().optional(),
  offer_details: z.string().optional(),
});

const JobHistoryEntrySchema = z.object({
  job_id: z.string().uuid(),
  user_id: z.string().uuid().optional(),
  status: z.enum([
    "APPLIED",
    "INTERVIEWED",
    "REJECTED",
    "OFFERED",
    "WITHDRAWN",
  ]),
  notes: z.string().optional(),
  applied_at: z.string().datetime().optional(),
  interview_date: z.string().datetime().optional(),
  rejection_reason: z.string().optional(),
  offer_details: z.string().optional(),
});

const JobRatingSchema = z.object({
  job_id: z.string().uuid(),
  user_id: z.string().uuid().optional(),
  overall_rating: z.number().min(1).max(5),
  company_rating: z.number().min(1).max(5).optional(),
  role_rating: z.number().min(1).max(5).optional(),
  location_rating: z.number().min(1).max(5).optional(),
  salary_rating: z.number().min(1).max(5).optional(),
  culture_rating: z.number().min(1).max(5).optional(),
  growth_rating: z.number().min(1).max(5).optional(),
  work_life_balance_rating: z.number().min(1).max(5).optional(),
  comments: z.string().optional(),
});

// POST /job-history - Submit job history from raw content
jobHistory.post("/", zValidator("json", JobHistoryRequestSchema), async (c) => {
  try {
    const body = c.req.valid("json");

    // For now, we'll just create a basic job history entry
    // In the real implementation, this would parse the raw_content using AI
    // to extract job details and create appropriate entries

    if (body.job_id) {
      // If job_id is provided, create a direct entry
      const entry = await saveJobHistoryEntry(c.env, {
        job_id: body.job_id,
        user_id: body.user_id,
        status: body.status || "APPLIED",
        notes: body.notes,
        applied_at: body.applied_at,
        interview_date: body.interview_date,
        rejection_reason: body.rejection_reason,
        offer_details: body.offer_details,
      });

      return c.json(
        {
          success: true,
          entry,
          message: "Job history entry created successfully",
        },
        201
      );
    } else {
      // If no job_id, we would need to parse the raw_content
      // This is a placeholder for the AI parsing functionality
      return c.json(
        {
          success: false,
          error:
            "Job ID is required for now. Raw content parsing not yet implemented.",
        },
        400
      );
    }
  } catch (error) {
    console.error("Error creating job history entry:", error);
    return c.json(
      {
        success: false,
        error: "Failed to create job history entry",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// GET /job-history/applicant/:id - Get job history for applicant
jobHistory.get("/applicant/:id", async (c) => {
  try {
    const applicantId = c.req.param("id");
    const history = await getJobHistoryByApplicant(c.env, applicantId);

    return c.json({
      success: true,
      history,
      total: history.length,
    });
  } catch (error) {
    console.error("Error fetching applicant job history:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch applicant job history",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// GET /job-history/applicant/:id/submissions - Get job history submissions for applicant
jobHistory.get("/applicant/:id/submissions", async (c) => {
  try {
    const applicantId = c.req.param("id");
    const submissions = await getJobHistorySubmissions(c.env, applicantId);

    return c.json({
      success: true,
      submissions,
      total: submissions.length,
    });
  } catch (error) {
    console.error("Error fetching applicant job submissions:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch applicant job submissions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// POST /job-history/applicant/:id/submissions - Submit job application
jobHistory.post(
  "/applicant/:id/submissions",
  zValidator("json", JobHistorySubmissionSchema),
  async (c) => {
    try {
      const applicantId = c.req.param("id");
      const submission = c.req.valid("json");

      await saveJobHistorySubmission(c.env, {
        ...submission,
        user_id: applicantId,
      });

      return c.json(
        {
          success: true,
          message: "Job application submitted successfully",
        },
        201
      );
    } catch (error) {
      console.error("Error submitting job application:", error);
      return c.json(
        {
          success: false,
          error: "Failed to submit job application",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

// PUT /job-history/submissions/:id - Update job history submission
jobHistory.put("/submissions/:id", async (c) => {
  try {
    const submissionId = c.req.param("id");
    const updates = await c.req.json();

    await updateJobHistorySubmission(c.env, submissionId, updates);

    return c.json({
      success: true,
      message: "Job history submission updated successfully",
    });
  } catch (error) {
    console.error("Error updating job history submission:", error);
    return c.json(
      {
        success: false,
        error: "Failed to update job history submission",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// POST /job-history/entries - Create job history entry
jobHistory.post(
  "/entries",
  zValidator("json", JobHistoryEntrySchema),
  async (c) => {
    try {
      const entryData = c.req.valid("json");
      const entry = await saveJobHistoryEntry(c.env, entryData);

      return c.json(
        {
          success: true,
          entry,
          message: "Job history entry created successfully",
        },
        201
      );
    } catch (error) {
      console.error("Error creating job history entry:", error);
      return c.json(
        {
          success: false,
          error: "Failed to create job history entry",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

// Job Rating Routes

// GET /job-history/applicant/:id/ratings - Get job ratings for applicant
jobHistory.get("/applicant/:id/ratings", async (c) => {
  try {
    const applicantId = c.req.param("id");
    const ratings = await getJobRatingsByApplicant(c.env, applicantId);

    return c.json({
      success: true,
      ratings,
      total: ratings.length,
    });
  } catch (error) {
    console.error("Error fetching applicant job ratings:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch applicant job ratings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// POST /job-history/ratings - Create job rating
jobHistory.post("/ratings", zValidator("json", JobRatingSchema), async (c) => {
  try {
    const ratingData = c.req.valid("json");
    const rating = await saveJobRating(c.env, ratingData);

    return c.json(
      {
        success: true,
        rating,
        message: "Job rating created successfully",
      },
      201
    );
  } catch (error) {
    console.error("Error creating job rating:", error);
    return c.json(
      {
        success: false,
        error: "Failed to create job rating",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// GET /job-history/stats - Get job history statistics
jobHistory.get("/stats", async (c) => {
  try {
    const applicantId = c.req.query("applicant_id");

    if (!applicantId) {
      return c.json(
        {
          success: false,
          error: "applicant_id query parameter is required",
        },
        400
      );
    }

    const [history, submissions, ratings] = await Promise.all([
      getJobHistoryByApplicant(c.env, applicantId),
      getJobHistorySubmissions(c.env, applicantId),
      getJobRatingsByApplicant(c.env, applicantId),
    ]);

    const stats = {
      total_applications: history.length,
      submissions: submissions.length,
      ratings: ratings.length,
      status_breakdown: history.reduce((acc, entry) => {
        acc[entry.status] = (acc[entry.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      avg_rating:
        ratings.length > 0
          ? ratings.reduce((sum, rating) => sum + rating.overall_rating, 0) /
            ratings.length
          : 0,
    };

    return c.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching job history stats:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch job history stats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

export default jobHistory;
