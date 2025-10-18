/**
 * @fileoverview Career Coach Agent Routes
 *
 * API routes for the Career Coach and Talent Agent.
 * Provides endpoints for profile management, document analysis, and interview preparation.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { Hono } from "hono";
import { z } from "zod";
import { ResponseUtils } from "../../shared/utils/response.utils";
import type { CareerCoachAgentEnv } from "./career-coach-agent";

/**
 * Request validation schemas
 */
const ProfileCreateSchema = z.object({
  user_id: z.string().min(1),
  email: z.string().email(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  linkedin_url: z.string().url().optional(),
  github_url: z.string().url().optional(),
  portfolio_url: z.string().url().optional(),
  location: z.string().optional(),
  timezone: z.string().optional(),
  current_title: z.string().optional(),
  current_company: z.string().optional(),
  years_experience: z.number().int().min(0).optional(),
});

const ProfileUpdateSchema = z.object({
  user_id: z.string().min(1),
  updates: z.record(z.any()),
});

const DocumentAnalysisSchema = z.object({
  profile_id: z.string().optional(),
  document_type: z.enum(["resume", "cover_letter", "portfolio"]),
  content: z.string().min(1),
  analysis_type: z.enum(["general", "job_specific"]).optional(),
  job_description: z.string().optional(),
});

const InterviewPrepSchema = z.object({
  profile_id: z.string().optional(),
  job_id: z.string().optional(),
  prep_type: z.enum(["general", "technical", "behavioral", "company_specific"]),
  job_description: z.string().optional(),
  company_name: z.string().optional(),
});

const LinkedInConsultationSchema = z.object({
  linkedin_url: z.string().url(),
  current_profile: z.record(z.any()).optional(),
});

const ApproveChangesSchema = z.object({
  change_ids: z.array(z.string()),
  approver_id: z.string().optional(),
  comments: z.string().optional(),
});

const ChatSchema = z.object({
  message: z.string().min(1),
  user_id: z.string().min(1),
  context: z.record(z.any()).optional(),
});

/**
 * Career Coach Agent Routes
 */
export const careerCoachRoutes = new Hono<{ Bindings: CareerCoachAgentEnv }>();

/**
 * GET /api/career-coach/profile
 *
 * Gets an applicant profile with all related data.
 */
careerCoachRoutes.get("/api/career-coach/profile", async (c) => {
  try {
    const query = c.req.query();
    const validatedQuery = z
      .object({
        user_id: z.string().min(1),
      })
      .parse(query);

    // Get the Career Coach agent
    const agentId = c.env.CAREER_COACH_AGENT.idFromName(validatedQuery.user_id);
    const agent = c.env.CAREER_COACH_AGENT.get(agentId);

    // Forward request to agent
    const agentRequest = new Request(
      `https://dummy/profile?user_id=${validatedQuery.user_id}`,
      {
        method: "GET",
      }
    );

    return await agent.fetch(agentRequest);
  } catch (error) {
    console.error("Error in get profile endpoint:", error);

    if (error instanceof z.ZodError) {
      return c.json(
        ResponseUtils.validationError(
          "Invalid query parameters",
          error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          }))
        ),
        400
      );
    }

    return c.json(
      ResponseUtils.error(
        "PROFILE_GET_FAILED",
        `Failed to get profile: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        500
      ),
      500
    );
  }
});

/**
 * POST /api/career-coach/profile
 *
 * Creates a new applicant profile.
 */
careerCoachRoutes.post("/api/career-coach/profile", async (c) => {
  try {
    const body = await c.req.json();
    const validatedBody = ProfileCreateSchema.parse(body);

    // Get the Career Coach agent
    const agentId = c.env.CAREER_COACH_AGENT.idFromName(validatedBody.user_id);
    const agent = c.env.CAREER_COACH_AGENT.get(agentId);

    // Forward request to agent
    const agentRequest = new Request("https://dummy/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validatedBody),
    });

    return await agent.fetch(agentRequest);
  } catch (error) {
    console.error("Error in create profile endpoint:", error);

    if (error instanceof z.ZodError) {
      return c.json(
        ResponseUtils.validationError(
          "Invalid request body",
          error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          }))
        ),
        400
      );
    }

    return c.json(
      ResponseUtils.error(
        "PROFILE_CREATE_FAILED",
        `Failed to create profile: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        500
      ),
      500
    );
  }
});

/**
 * PUT /api/career-coach/profile
 *
 * Updates an existing applicant profile.
 */
careerCoachRoutes.put("/api/career-coach/profile", async (c) => {
  try {
    const body = await c.req.json();
    const validatedBody = ProfileUpdateSchema.parse(body);

    // Get the Career Coach agent
    const agentId = c.env.CAREER_COACH_AGENT.idFromName(validatedBody.user_id);
    const agent = c.env.CAREER_COACH_AGENT.get(agentId);

    // Forward request to agent
    const agentRequest = new Request("https://dummy/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validatedBody),
    });

    return await agent.fetch(agentRequest);
  } catch (error) {
    console.error("Error in update profile endpoint:", error);

    if (error instanceof z.ZodError) {
      return c.json(
        ResponseUtils.validationError(
          "Invalid request body",
          error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          }))
        ),
        400
      );
    }

    return c.json(
      ResponseUtils.error(
        "PROFILE_UPDATE_FAILED",
        `Failed to update profile: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        500
      ),
      500
    );
  }
});

/**
 * DELETE /api/career-coach/profile
 *
 * Soft deletes an applicant profile.
 */
careerCoachRoutes.delete("/api/career-coach/profile", async (c) => {
  try {
    const query = c.req.query();
    const validatedQuery = z
      .object({
        user_id: z.string().min(1),
      })
      .parse(query);

    // Get the Career Coach agent
    const agentId = c.env.CAREER_COACH_AGENT.idFromName(validatedQuery.user_id);
    const agent = c.env.CAREER_COACH_AGENT.get(agentId);

    // Forward request to agent
    const agentRequest = new Request(
      `https://dummy/profile?user_id=${validatedQuery.user_id}`,
      {
        method: "DELETE",
      }
    );

    return await agent.fetch(agentRequest);
  } catch (error) {
    console.error("Error in delete profile endpoint:", error);

    if (error instanceof z.ZodError) {
      return c.json(
        ResponseUtils.validationError(
          "Invalid query parameters",
          error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          }))
        ),
        400
      );
    }

    return c.json(
      ResponseUtils.error(
        "PROFILE_DELETE_FAILED",
        `Failed to delete profile: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        500
      ),
      500
    );
  }
});

/**
 * POST /api/career-coach/analyze-document
 *
 * Analyzes a resume, cover letter, or portfolio document.
 */
careerCoachRoutes.post("/api/career-coach/analyze-document", async (c) => {
  try {
    const body = await c.req.json();
    const validatedBody = DocumentAnalysisSchema.parse(body);

    // Get the Career Coach agent
    const agentId = c.env.CAREER_COACH_AGENT.idFromName(
      validatedBody.profile_id || "default"
    );
    const agent = c.env.CAREER_COACH_AGENT.get(agentId);

    // Forward request to agent
    const agentRequest = new Request("https://dummy/analyze-document", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validatedBody),
    });

    return await agent.fetch(agentRequest);
  } catch (error) {
    console.error("Error in analyze document endpoint:", error);

    if (error instanceof z.ZodError) {
      return c.json(
        ResponseUtils.validationError(
          "Invalid request body",
          error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          }))
        ),
        400
      );
    }

    return c.json(
      ResponseUtils.error(
        "DOCUMENT_ANALYSIS_FAILED",
        `Failed to analyze document: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        500
      ),
      500
    );
  }
});

/**
 * POST /api/career-coach/interview-prep
 *
 * Prepares for an interview with AI-generated questions and guidance.
 */
careerCoachRoutes.post("/api/career-coach/interview-prep", async (c) => {
  try {
    const body = await c.req.json();
    const validatedBody = InterviewPrepSchema.parse(body);

    // Get the Career Coach agent
    const agentId = c.env.CAREER_COACH_AGENT.idFromName(
      validatedBody.profile_id || "default"
    );
    const agent = c.env.CAREER_COACH_AGENT.get(agentId);

    // Forward request to agent
    const agentRequest = new Request("https://dummy/interview-prep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validatedBody),
    });

    return await agent.fetch(agentRequest);
  } catch (error) {
    console.error("Error in interview prep endpoint:", error);

    if (error instanceof z.ZodError) {
      return c.json(
        ResponseUtils.validationError(
          "Invalid request body",
          error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          }))
        ),
        400
      );
    }

    return c.json(
      ResponseUtils.error(
        "INTERVIEW_PREP_FAILED",
        `Failed to prepare for interview: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        500
      ),
      500
    );
  }
});

/**
 * POST /api/career-coach/linkedin-consultation
 *
 * Provides LinkedIn profile consultation and optimization advice.
 */
careerCoachRoutes.post("/api/career-coach/linkedin-consultation", async (c) => {
  try {
    const body = await c.req.json();
    const validatedBody = LinkedInConsultationSchema.parse(body);

    // Get the Career Coach agent
    const agentId = c.env.CAREER_COACH_AGENT.idFromName(
      "linkedin-consultation"
    );
    const agent = c.env.CAREER_COACH_AGENT.get(agentId);

    // Forward request to agent
    const agentRequest = new Request("https://dummy/linkedin-consultation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validatedBody),
    });

    return await agent.fetch(agentRequest);
  } catch (error) {
    console.error("Error in LinkedIn consultation endpoint:", error);

    if (error instanceof z.ZodError) {
      return c.json(
        ResponseUtils.validationError(
          "Invalid request body",
          error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          }))
        ),
        400
      );
    }

    return c.json(
      ResponseUtils.error(
        "LINKEDIN_CONSULTATION_FAILED",
        `Failed to provide LinkedIn consultation: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        500
      ),
      500
    );
  }
});

/**
 * POST /api/career-coach/approve-changes
 *
 * Approves pending profile changes (human-in-the-loop).
 */
careerCoachRoutes.post("/api/career-coach/approve-changes", async (c) => {
  try {
    const body = await c.req.json();
    const validatedBody = ApproveChangesSchema.parse(body);

    // Get the Career Coach agent
    const agentId = c.env.CAREER_COACH_AGENT.idFromName("approval-system");
    const agent = c.env.CAREER_COACH_AGENT.get(agentId);

    // Forward request to agent
    const agentRequest = new Request("https://dummy/approve-changes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validatedBody),
    });

    return await agent.fetch(agentRequest);
  } catch (error) {
    console.error("Error in approve changes endpoint:", error);

    if (error instanceof z.ZodError) {
      return c.json(
        ResponseUtils.validationError(
          "Invalid request body",
          error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          }))
        ),
        400
      );
    }

    return c.json(
      ResponseUtils.error(
        "APPROVE_CHANGES_FAILED",
        `Failed to approve changes: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        500
      ),
      500
    );
  }
});

/**
 * POST /api/career-coach/chat
 *
 * Chat with the Career Coach agent for profile updates and advice.
 */
careerCoachRoutes.post("/api/career-coach/chat", async (c) => {
  try {
    const body = await c.req.json();
    const validatedBody = ChatSchema.parse(body);

    // Get the Career Coach agent
    const agentId = c.env.CAREER_COACH_AGENT.idFromName(validatedBody.user_id);
    const agent = c.env.CAREER_COACH_AGENT.get(agentId);

    // Forward request to agent
    const agentRequest = new Request("https://dummy/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validatedBody),
    });

    return await agent.fetch(agentRequest);
  } catch (error) {
    console.error("Error in chat endpoint:", error);

    if (error instanceof z.ZodError) {
      return c.json(
        ResponseUtils.validationError(
          "Invalid request body",
          error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          }))
        ),
        400
      );
    }

    return c.json(
      ResponseUtils.error(
        "CHAT_FAILED",
        `Failed to process chat message: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        500
      ),
      500
    );
  }
});
