/**
 * Applicant Routes
 *
 * RESTful API routes for applicant management, job history, and matching.
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
  CreateApplicantRequestSchema,
  JobHistoryEntrySchema,
  JobHistorySubmissionSchema,
  JobRatingSchema,
  UpdateApplicantRequestSchema,
} from "../models/applicant.schema";
import {
  createApplicantMatchingService,
  createApplicantStorageService,
} from "../services";

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use("*", logger as any);
app.use("*", rateLimit({ requests: 100, windowMs: 60000 }) as any);

// Applicant Profile Routes
app.post("/", validateBody(CreateApplicantRequestSchema), async (c) => {
  try {
    const request = getValidatedBody(c);
    const storageService = createApplicantStorageService(c.env);

    const applicant = await storageService.createApplicant(request);

    return c.json(
      {
        success: true,
        data: applicant,
      },
      201
    );
  } catch (error) {
    console.error("Error creating applicant:", error);
    return c.json(
      {
        success: false,
        error: "Failed to create applicant",
      },
      500
    );
  }
});

app.get(
  "/:id",
  validateParams(z.object({ id: z.string().min(1) })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };
      const storageService = createApplicantStorageService(c.env);

      const applicant = await storageService.getApplicant(id);

      if (!applicant) {
        return c.json(
          {
            success: false,
            error: "Applicant not found",
          },
          404
        );
      }

      return c.json({
        success: true,
        data: applicant,
      });
    } catch (error) {
      console.error("Error getting applicant:", error);
      return c.json(
        {
          success: false,
          error: "Failed to get applicant",
        },
        500
      );
    }
  }
);

app.get(
  "/user/:userId",
  validateParams(z.object({ userId: z.string().min(1) })),
  async (c) => {
    try {
      const { userId } = getValidatedParams(c) as { userId: string };
      const storageService = createApplicantStorageService(c.env);

      const applicant = await storageService.getApplicantByUserId(userId);

      if (!applicant) {
        return c.json(
          {
            success: false,
            error: "Applicant not found",
          },
          404
        );
      }

      return c.json({
        success: true,
        data: applicant,
      });
    } catch (error) {
      console.error("Error getting applicant by user ID:", error);
      return c.json(
        {
          success: false,
          error: "Failed to get applicant",
        },
        500
      );
    }
  }
);

app.put(
  "/:id",
  validateBody(UpdateApplicantRequestSchema),
  validateParams(z.object({ id: z.string().min(1) })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };
      const request = getValidatedBody(c);
      const storageService = createApplicantStorageService(c.env);

      const applicant = await storageService.updateApplicant(id, request);

      if (!applicant) {
        return c.json(
          {
            success: false,
            error: "Applicant not found",
          },
          404
        );
      }

      return c.json({
        success: true,
        data: applicant,
      });
    } catch (error) {
      console.error("Error updating applicant:", error);
      return c.json(
        {
          success: false,
          error: "Failed to update applicant",
        },
        500
      );
    }
  }
);

app.delete(
  "/:id",
  validateParams(z.object({ id: z.string().min(1) })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };
      const storageService = createApplicantStorageService(c.env);

      const deleted = await storageService.deleteApplicant(id);

      if (!deleted) {
        return c.json(
          {
            success: false,
            error: "Applicant not found",
          },
          404
        );
      }

      return c.json({
        success: true,
        message: "Applicant deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting applicant:", error);
      return c.json(
        {
          success: false,
          error: "Failed to delete applicant",
        },
        500
      );
    }
  }
);

// Search Routes
app.get("/", async (c) => {
  try {
    const query = c.req.query();
    const storageService = createApplicantStorageService(c.env);

    const result = await storageService.searchApplicants(query);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error searching applicants:", error);
    return c.json(
      {
        success: false,
        error: "Failed to search applicants",
      },
      500
    );
  }
});

// Job History Routes
app.post(
  "/:id/job-history",
  validateBody(JobHistoryEntrySchema),
  validateParams(z.object({ id: z.string().min(1) })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };
      const request = getValidatedBody(c);
      const storageService = createApplicantStorageService(c.env);

      const entry = await storageService.createJobHistoryEntry({
        ...request,
        applicant_id: id,
      });

      return c.json(
        {
          success: true,
          data: entry,
        },
        201
      );
    } catch (error) {
      console.error("Error creating job history entry:", error);
      return c.json(
        {
          success: false,
          error: "Failed to create job history entry",
        },
        500
      );
    }
  }
);

app.get(
  "/:id/job-history",
  validateParams(z.object({ id: z.string().min(1) })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };
      const storageService = createApplicantStorageService(c.env);

      const entries = await storageService.getJobHistoryByApplicant(id);

      return c.json({
        success: true,
        data: entries,
      });
    } catch (error) {
      console.error("Error getting job history:", error);
      return c.json(
        {
          success: false,
          error: "Failed to get job history",
        },
        500
      );
    }
  }
);

// Job History Submission Routes
app.post(
  "/:id/job-history/submissions",
  validateBody(JobHistorySubmissionSchema),
  validateParams(z.object({ id: z.string().min(1) })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };
      const request = getValidatedBody(c);
      const storageService = createApplicantStorageService(c.env);

      const submission = await storageService.createJobHistorySubmission({
        ...request,
        applicant_id: id,
      });

      return c.json(
        {
          success: true,
          data: submission,
        },
        201
      );
    } catch (error) {
      console.error("Error creating job history submission:", error);
      return c.json(
        {
          success: false,
          error: "Failed to create job history submission",
        },
        500
      );
    }
  }
);

app.get(
  "/:id/job-history/submissions",
  validateParams(z.object({ id: z.string().min(1) })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };
      const storageService = createApplicantStorageService(c.env);

      const submissions = await storageService.getJobHistorySubmissions(id);

      return c.json({
        success: true,
        data: submissions,
      });
    } catch (error) {
      console.error("Error getting job history submissions:", error);
      return c.json(
        {
          success: false,
          error: "Failed to get job history submissions",
        },
        500
      );
    }
  }
);

// Job Rating Routes
app.post(
  "/:id/ratings",
  validateBody(JobRatingSchema),
  validateParams(z.object({ id: z.string().min(1) })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };
      const request = getValidatedBody(c);
      const storageService = createApplicantStorageService(c.env);

      const rating = await storageService.createJobRating({
        ...request,
        applicant_id: id,
      });

      return c.json(
        {
          success: true,
          data: rating,
        },
        201
      );
    } catch (error) {
      console.error("Error creating job rating:", error);
      return c.json(
        {
          success: false,
          error: "Failed to create job rating",
        },
        500
      );
    }
  }
);

app.get(
  "/:id/ratings",
  validateParams(z.object({ id: z.string().min(1) })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };
      const storageService = createApplicantStorageService(c.env);

      const ratings = await storageService.getJobRatingsByApplicant(id);

      return c.json({
        success: true,
        data: ratings,
      });
    } catch (error) {
      console.error("Error getting job ratings:", error);
      return c.json(
        {
          success: false,
          error: "Failed to get job ratings",
        },
        500
      );
    }
  }
);

// Matching Routes
app.post(
  "/:id/match/:jobId",
  validateParams(
    z.object({
      id: z.string().min(1),
      jobId: z.string().min(1),
    })
  ),
  async (c) => {
    try {
      const { id, jobId } = getValidatedParams(c) as {
        id: string;
        jobId: string;
      };
      const criteria = getValidatedBody(c);
      const matchingService = createApplicantMatchingService(c.env);

      const match = await matchingService.matchApplicantWithJob(
        id,
        jobId,
        criteria
      );

      return c.json({
        success: true,
        data: match,
      });
    } catch (error) {
      console.error("Error matching applicant with job:", error);
      return c.json(
        {
          success: false,
          error: "Failed to match applicant with job",
        },
        500
      );
    }
  }
);

app.get(
  "/:id/recommendations",
  validateParams(z.object({ id: z.string().min(1) })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };
      const limit = parseInt(c.req.query("limit") || "10");
      const criteria = getValidatedBody(c);
      const matchingService = createApplicantMatchingService(c.env);

      const recommendations = await matchingService.findJobRecommendations(
        id,
        limit,
        criteria
      );

      return c.json({
        success: true,
        data: recommendations,
      });
    } catch (error) {
      console.error("Error getting job recommendations:", error);
      return c.json(
        {
          success: false,
          error: "Failed to get job recommendations",
        },
        500
      );
    }
  }
);

// Statistics Routes
app.get("/stats", async (c) => {
  try {
    const storageService = createApplicantStorageService(c.env);

    const stats = await storageService.getApplicantStats();

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error getting applicant stats:", error);
    return c.json(
      {
        success: false,
        error: "Failed to get applicant stats",
      },
      500
    );
  }
});

export default app;
