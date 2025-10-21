/**
 * @module src/domains/email/services/email-ingestion.service.ts
 * @description
 * Service for ingesting and processing inbound emails via Cloudflare Email Routing.
 */

import type { ForwardableEmailMessage } from "@cloudflare/workers-types";
import PostalMime from "postal-mime";
import { AIEmailResponse, AIEmailResponseSchema } from '../types';

// Assuming Env contains DB, AI, and other necessary bindings
interface EmailEnv {
  DB: D1Database;
  AI: Ai;
  // Add JOB_PROCESSOR_QUEUE if needed
}

export class EmailIngestionService {
  private env: EmailEnv;

  constructor(env: EmailEnv) {
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
        await this.updateLogStatus(emailLogId, "failed", { error: (error as Error).message });
      }
      message.setReject("Email processing failed internally.");
    }
  }

  private async parseEmail(message: ForwardableEmailMessage): Promise<any> {
    const rawEmail = await new Response(message.raw).text();
    return new PostalMime().parse(rawEmail);
  }

  private async classifyEmail(parsedEmail: any): Promise<AIEmailResponse> {
    const textContent = parsedEmail.text || "";
    const userInput = `Subject: ${parsedEmail.subject || "No Subject"}\nFrom: ${parsedEmail.from?.address || "Unknown"}\n\n${textContent.substring(0, 8000)}`;
    
    // Simplified schema for this example
    const schema = { type: "object", properties: { category: { type: "string" }, job_links: { type: "array", items: { type: "string" } } } };

    const response = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [{ role: "system", content: "You are an email classification assistant." }, { role: "user", content: userInput }],
      response_format: { type: "json_schema", schema },
    });

    const structured = JSON.parse(response.response || "{}");
    return AIEmailResponseSchema.parse(structured);
  }

  private async logEmail(message: ForwardableEmailMessage, parsedEmail: any, classification: AIEmailResponse): Promise<number> {
    const { meta } = await this.env.DB.prepare(
      `INSERT INTO email_logs (from_email, to_email, subject, ai_category, ai_job_links, status) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      message.from,
      message.to,
      parsedEmail.subject || "No Subject",
      classification.category,
      JSON.stringify(classification.job_links),
      'processing'
    ).run();
    return meta.last_row_id as number;
  }

  private async routeByClassification(emailLogId: number, classification: AIEmailResponse): Promise<void> {
    switch (classification.category) {
      case "JOB_ALERT":
        // In a real implementation, this would send to a queue.
        console.log(`Found ${classification.job_links.length} job links to process.`);
        await this.updateLogStatus(emailLogId, "completed", { action: "submitted_to_processor" });
        break;
      default:
        await this.updateLogStatus(emailLogId, "completed", { reason: "Logged and archived" });
        break;
    }
  }

  private async updateLogStatus(logId: number, status: 'completed' | 'failed', metadata: object): Promise<void> {
    await this.env.DB.prepare(
      `UPDATE email_logs SET status = ?, processed_at = datetime('now'), metadata = ? WHERE id = ?`
    ).bind(status, JSON.stringify(metadata), logId).run();
  }
}