/**
 * @module src/domains/email/services/email-ingestion.service.ts
 * @description
 * Service for ingesting and processing inbound emails via Cloudflare Email Routing.
 */

import type { ForwardableEmailMessage } from "@cloudflare/workers-types";
import PostalMime from "postal-mime";
import type { Env } from "../../../config/env";
import { AIEmailResponse } from "../types";

export class EmailIngestionService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Main handler for processing an inbound email.
   */
  async handle(message: ForwardableEmailMessage): Promise<void> {
    let emailLogId: number | null = null;
    try {
      const parsedEmail = await this.parseEmail(message);
      const classification = await this.classifyEmail(parsedEmail);
      emailLogId = await this.logEmail(message, parsedEmail, classification);

      await this.routeByClassification(emailLogId, classification);

      console.log(`✅ Email processing completed for log ID: ${emailLogId}`);
    } catch (error) {
      console.error("❌ Unhandled error in email ingestion:", error);
      if (emailLogId) {
        await this.updateLogStatus(emailLogId, "failed", {
          error: (error as Error).message,
        });
      }
      message.setReject("Email processing failed internally.");
    }
  }

  private async parseEmail(message: ForwardableEmailMessage): Promise<any> {
    const arrayBuffer = await new Response((message as any).raw).arrayBuffer();
    const parser = new (PostalMime as any).default();
    return await parser.parse(arrayBuffer);
  }

  private async classifyEmail(parsedEmail: any): Promise<AIEmailResponse> {
    // Use the EmailClassificationAgent for classification
    const agentId = this.env.EMAIL_CLASSIFICATION_AGENT?.idFromName("main");
    if (!agentId || !this.env.EMAIL_CLASSIFICATION_AGENT) {
      throw new Error("EMAIL_CLASSIFICATION_AGENT not available");
    }

    const agent = this.env.EMAIL_CLASSIFICATION_AGENT.get(agentId);

    // Prepare email data for the agent
    const emailData = {
      to: parsedEmail.to?.address || "unknown",
      from: parsedEmail.from?.address || "unknown",
      subject: parsedEmail.subject || "No Subject",
      body: parsedEmail.text || "",
    };

    // Call the agent to classify the email
    const response = await agent.fetch(
      new Request("http://internal/classify", {
        method: "POST",
        body: JSON.stringify(emailData),
      })
    );

    const classification = await response.json();

    // Convert agent classification to AIEmailResponse format
    const aiResponse: AIEmailResponse = {
      from: emailData.from,
      subject: emailData.subject,
      body: emailData.body,
      category:
        classification.classification === "JOBS_ALERT"
          ? "JOB_ALERT"
          : classification.classification === "JOB_RELATED_DO_NOT_TAG"
          ? "RECRUITER"
          : "UNKNOWN",
      category_reasoning: classification.reasoning || "",
      job_links: [], // Extract from email body if needed
    };

    return aiResponse;
  }

  private async logEmail(
    message: ForwardableEmailMessage,
    parsedEmail: any,
    classification: AIEmailResponse
  ): Promise<number> {
    const { meta } = await this.env.DB.prepare(
      `INSERT INTO email_logs (from_email, to_email, subject, ai_category, ai_job_links, status) VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(
        message.from,
        message.to,
        parsedEmail.subject || "No Subject",
        classification.category,
        JSON.stringify(classification.job_links),
        "processing"
      )
      .run();
    return meta.last_row_id as number;
  }

  private async routeByClassification(
    emailLogId: number,
    classification: AIEmailResponse
  ): Promise<void> {
    switch (classification.category) {
      case "JOB_ALERT":
        // In a real implementation, this would send to a queue.
        console.log(
          `Found ${classification.job_links.length} job links to process.`
        );
        await this.updateLogStatus(emailLogId, "completed", {
          action: "submitted_to_processor",
        });
        break;
      default:
        await this.updateLogStatus(emailLogId, "completed", {
          reason: "Logged and archived",
        });
        break;
    }
  }

  private async updateLogStatus(
    logId: number,
    status: "completed" | "failed",
    metadata: object
  ): Promise<void> {
    await this.env.DB.prepare(
      `UPDATE email_logs SET status = ?, processed_at = datetime('now'), metadata = ? WHERE id = ?`
    )
      .bind(status, JSON.stringify(metadata), logId)
      .run();
  }
}
