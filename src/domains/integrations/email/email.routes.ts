/**
 * @fileoverview Email Integration API Routes
 *
 * RESTful API routes for email processing, classification, template generation,
 * and email management functionality.
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
  logger,
  rateLimit,
  validateBody,
} from "../../../core/validation/hono-validation";
import { createEmailService } from "./email.service";

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use("*", logger as any);
app.use("*", rateLimit({ requests: 200, windowMs: 60000 }) as any);

// Validation schemas
const EmailParseRequestSchema = z.object({
  rawEmail: z.string().min(1),
});

const EmailClassificationRequestSchema = z.object({
  emailData: z.object({
    from: z.string(),
    to: z.string(),
    subject: z.string(),
    body: z.string(),
    html: z.string().optional(),
    headers: z.record(z.string(), z.string()),
    messageId: z.string(),
    date: z.string(),
  }),
});

const EmailGenerationRequestSchema = z.object({
  templateName: z.string().min(1),
  data: z.record(z.string(), z.any()),
});

const EmailSearchRequestSchema = z.object({
  query: z.string().min(1),
  limit: z.number().positive().max(100).optional().default(10),
});

const EmailStoreRequestSchema = z.object({
  emailData: z.object({
    from: z.string(),
    to: z.string(),
    subject: z.string(),
    body: z.string(),
    html: z.string().optional(),
    headers: z.record(z.string(), z.string()),
    messageId: z.string(),
    date: z.string(),
    attachments: z.array(
      z.object({
        filename: z.string(),
        contentType: z.string(),
        size: z.number(),
      })
    ),
  }),
  classification: z.object({
    category: z.enum([
      "job_alert",
      "application_response",
      "interview_invite",
      "rejection",
      "otp",
      "other",
    ]),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
    job_links: z.array(z.string()),
    otp_codes: z.array(z.string()),
    priority: z.enum(["low", "normal", "high", "urgent"]),
    action_required: z.boolean(),
    suggested_actions: z.array(z.string()),
  }),
});

// Routes

/**
 * POST /email/parse - Parse raw email content
 */
app.post("/parse", validateBody(EmailParseRequestSchema), async (c) => {
  try {
    const { rawEmail } = getValidatedBody(c);
    const service = createEmailService(c.env);
    const result = await service.parseEmail(rawEmail);

    return c.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Email parsing failed:", error);
    return c.json(
      {
        success: false,
        error: "Email parsing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * POST /email/classify - Classify email content using AI
 */
app.post(
  "/classify",
  validateBody(EmailClassificationRequestSchema),
  async (c) => {
    try {
      const { emailData } = getValidatedBody(c);
      const service = createEmailService(c.env);
      const result = await service.classifyEmail(emailData);

      return c.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Email classification failed:", error);
      return c.json(
        {
          success: false,
          error: "Email classification failed",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

/**
 * POST /email/generate - Generate email content using templates
 */
app.post("/generate", validateBody(EmailGenerationRequestSchema), async (c) => {
  try {
    const { templateName, data } = getValidatedBody(c);
    const service = createEmailService(c.env);
    const result = await service.generateEmail(templateName, data);

    return c.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Email generation failed:", error);
    return c.json(
      {
        success: false,
        error: "Email generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * POST /email/store - Store email in database and R2
 */
app.post("/store", validateBody(EmailStoreRequestSchema), async (c) => {
  try {
    const { emailData, classification } = getValidatedBody(c);
    const service = createEmailService(c.env);
    const result = await service.storeEmail(emailData, classification);

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: result.error || "Failed to store email",
        },
        400
      );
    }

    return c.json({
      success: true,
      emailId: result.emailId,
      message: "Email stored successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Email storage failed:", error);
    return c.json(
      {
        success: false,
        error: "Email storage failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * POST /email/search - Search emails using vector embeddings
 */
app.post("/search", validateBody(EmailSearchRequestSchema), async (c) => {
  try {
    const { query, limit } = getValidatedBody(c);
    const service = createEmailService(c.env);
    const results = await service.searchEmails(query, limit);

    return c.json({
      success: true,
      results,
      count: results.length,
      query,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Email search failed:", error);
    return c.json(
      {
        success: false,
        error: "Email search failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * GET /email/templates - Get available email templates
 */
app.get("/templates", async (c) => {
  try {
    // This would typically fetch from a database or R2
    const templates = [
      {
        id: "job_application",
        name: "Job Application",
        description: "Template for job application emails",
        category: "application",
        variables: [
          "recipient_name",
          "company_name",
          "job_title",
          "position",
          "contact_person",
        ],
      },
      {
        id: "follow_up",
        name: "Follow-up",
        description: "Template for follow-up emails",
        category: "follow_up",
        variables: [
          "recipient_name",
          "company_name",
          "job_title",
          "application_date",
          "contact_person",
        ],
      },
      {
        id: "thank_you",
        name: "Thank You",
        description: "Template for thank you emails",
        category: "thank_you",
        variables: [
          "recipient_name",
          "company_name",
          "interview_date",
          "contact_person",
        ],
      },
    ];

    return c.json({
      success: true,
      templates,
      count: templates.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to get email templates:", error);
    return c.json(
      {
        success: false,
        error: "Failed to get email templates",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * GET /email/status - Get email service status
 */
app.get("/status", async (c) => {
  try {
    const response = {
      status: "active",
      service: "Email Integration Service",
      capabilities: [
        "Email parsing and processing",
        "AI-powered email classification",
        "Template-based email generation",
        "Email storage and retrieval",
        "Vector-based email search",
        "Attachment handling",
        "Email routing and management",
      ],
      endpoints: [
        "POST /parse",
        "POST /classify",
        "POST /generate",
        "POST /store",
        "POST /search",
        "GET /templates",
        "GET /status",
      ],
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    };

    return c.json(response);
  } catch (error) {
    console.error("Failed to get email status:", error);
    return c.json(
      {
        success: false,
        error: "Failed to retrieve email status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * GET /email/health - Get email service health metrics
 */
app.get("/health", async (c) => {
  try {
    // Test email service availability
    const service = createEmailService(c.env);

    // Test database connection
    const dbTest = await c.env.DB.prepare("SELECT 1").first();

    // Test R2 connection
    const r2Test = await c.env.R2.head("health-check");

    const health = {
      status: dbTest && r2Test ? "healthy" : "degraded",
      email_service: "available",
      database: dbTest ? "available" : "unavailable",
      r2_storage: r2Test ? "available" : "unavailable",
      ai_classification: "available",
      last_checked: new Date().toISOString(),
      uptime_seconds: 0, // This would be calculated from service start time
      error_count: 0, // This would be tracked over time
    };

    return c.json(health);
  } catch (error) {
    console.error("Email health check failed:", error);
    return c.json(
      {
        status: "unhealthy",
        email_service: "unavailable",
        database: "unknown",
        r2_storage: "unknown",
        ai_classification: "unknown",
        last_checked: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

export { app as emailRoutes };
