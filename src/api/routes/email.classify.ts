/**
 * @file src/api/routes/email.classify.ts
指导和路标
 * Email classification endpoint for job alert processing
 */

import { Hono } from "hono";
import type { Env } from "../../config/env";

const app = new Hono<{ Bindings: Env }>();

// Email classification types
type Classification =
  | "JOBS_ALERT"
  | "JOB_RELATED_DO_NOT_TAG"
  | "NOT_JOB_RELATED";

interface EmailData {
  to: string;
  from: string;
  subject: string;
  body: string;
}

interface ClassificationRequest {
  to: string;
  from: string;
  subject: string;
  body: string;
}

interface ClassificationResponse {
  classification: Classification;
  confidence: number;
  reasoning?: string;
}

/**
 * @route POST /api/email/classify
 * @description Classify an email to determine if it's a job alert, job-related, or unrelated
 */
app.post("/classify", async (c) => {
  try {
    // Verify authentication
    const authHeader = c.req.header("Authorization");
    const apiKey = authHeader?.replace("Bearer ", "");

    if (!apiKey || apiKey !== c.env.WORKER_API_KEY) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Parse email data
    const emailData: ClassificationRequest = await c.req.json();

    if (!emailData.from || !emailData.subject || !emailData.body) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Classify email using AI agent
    const classification = await classifyEmail(c.env, emailData);

    return c.json(classification);
  } catch (error) {
    console.error("Error classifying email:", error);
    return c.json(
      {
        error: "Classification failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * Classify email using AI agent
 * @param {Env} env - Worker environment
 * @param {EmailData} emailData - Email data to classify
 * @returns {Promise<ClassificationResponse>} Classification result
 */
async function classifyEmail(
  env: Env,
  emailData: EmailData
): Promise<ClassificationResponse> {
  // Create or get the email classification agent
  const agentId = env.EMAIL_CLASSIFICATION_AGENT.idFromName("main");
  const agent = env.EMAIL_CLASSIFICATION_AGENT.get(agentId);

  // Call the agent to classify the email
  const response = await agent.fetch(
    new Request("http://internal/classify", {
      method: "POST",
      body: JSON.stringify(emailData),
    })
  );

  return await response.json();
}

export default app;
