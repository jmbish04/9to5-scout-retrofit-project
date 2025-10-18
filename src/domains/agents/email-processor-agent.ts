/**
 * @fileoverview A Cloudflare Agent for AI-powered email processing and routing.
 *
 * This agent performs the following steps:
 * 1. Receives an email via Cloudflare Email Routing.
 * 2. Parses the raw email to extract content and headers.
 * 3. Uses Llama 3.3 to classify the email and extract structured data (JSON).
 * 4. Logs every processed email to the `email_logs` D1 database table.
 * 5. Routes the task based on its classification (e.g., sends job alerts to a queue).
 */

import type { ForwardableEmailMessage } from "@cloudflare/workers-types";
import { Agent } from "agents";
import PostalMime from "postal-mime";
import { v4 as uuidv4 } from "uuid";
import type { Env } from "../config/env/env.config";

// ====================================================================================
// TYPE DEFINITIONS
// ====================================================================================

interface AIEmailResponse {
  from: string;
  subject: string;
  body: string;
  category:
    | "SPAM"
    | "JOB_ALERT"
    | "MESSAGE"
    | "RECRUITER"
    | "NETWORKING"
    | "MARKETING_SPAM"
    | "OTP"
    | "SYSTEM"
    | "UNKNOWN";
  category_reasoning: string;
  job_links: string[];
}

interface EmailProcessingMetadata {
  action?: string;
  reason?: string;
  note?: string;
  job_links_count?: number;
  processed_count?: number;
  failed_count?: number;
  error?: string;
  otp_detected?: boolean;
  otp_code?: string;
  otp_forwarded_to?: string;
}

// ====================================================================================
// AI CONFIGURATION
// ====================================================================================

const AI_PROMPT_SYSTEM_MESSAGE = `
You are an expert email routing assistant for the 9to5-scout job application system. Your task is to analyze an email and return a structured JSON object.

CATEGORY DESCRIPTIONS:
- SPAM: Malicious content, phishing, or unsolicited commercial emails.
- JOB_ALERT: Automated notifications from job boards or aggregators (LinkedIn, Indeed, Glassdoor, etc.).
- MESSAGE: Direct personal or professional correspondence.
- RECRUITER: Direct outreach from recruiters or talent acquisition professionals.
- NETWORKING: Professional networking requests, e.g., from LinkedIn connections.
- MARKETING_SPAM: Non-malicious promotional emails or newsletters.
- OTP: One-time passwords or verification codes from services.
- SYSTEM: Automated system notifications or account alerts.
- UNKNOWN: Anything that does not fit the other categories.

RULES:
1. Extract the sender's email address from headers or content.
2. Clean the email body by removing HTML tags and formatting.
3. Extract ALL job posting URLs (look for common patterns like /jobs/, /careers/, /opportunities/).
4. Provide a brief justification for your category choice.
5. If you detect an OTP code, include it in the job_links array as "OTP: [code]".
6. Respond ONLY with a valid JSON object matching the provided schema.

JOB URL PATTERNS TO LOOK FOR:
- LinkedIn: /jobs/view/
- Indeed: /viewjob?jk=
- Glassdoor: /job-listing/
- Company sites: /careers/, /jobs/, /opportunities/
- Generic patterns: contains "job", "position", "opening", "hiring"
`;

const AI_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    from: { type: "string", description: "The sender's email address." },
    subject: { type: "string", description: "The email subject line." },
    body: {
      type: "string",
      description: "The cleaned, plain-text email body.",
    },
    category: {
      type: "string",
      enum: [
        "SPAM",
        "JOB_ALERT",
        "MESSAGE",
        "RECRUITER",
        "NETWORKING",
        "MARKETING_SPAM",
        "OTP",
        "SYSTEM",
        "UNKNOWN",
      ],
    },
    category_reasoning: {
      type: "string",
      description: "Brief reason for the chosen category.",
    },
    job_links: {
      type: "array",
      items: {
        type: "string",
        description: "A URL to a job posting or OTP code.",
      },
    },
  },
  required: [
    "from",
    "subject",
    "body",
    "category",
    "category_reasoning",
    "job_links",
  ],
};

// ====================================================================================
// EMAIL PROCESSOR AGENT
// ====================================================================================

export class EmailProcessorAgent extends Agent<Env> {
  private classification!: AIEmailResponse;
  private emailId!: number;
  private parsedEmail: any;

  constructor(state: any, env: Env) {
    super(state, env);
  }

  /**
   * Main entry point triggered by Cloudflare Email Routing.
   */
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    console.log(`📧 Email received from: ${message.from}, to: ${message.to}`);

    try {
      // Parse the raw email content
      this.parsedEmail = await this.parseEmail(message);

      // Classify the email using AI
      this.classification = await this.classifyEmail();

      // Log the email to database
      this.emailId = await this.logEmail(message);

      // Route based on classification
      await this.routeByClassification();

      console.log(`✅ Email processing completed for ID: ${this.emailId}`);
    } catch (error) {
      console.error("❌ Unhandled error in email processing agent:", error);
      if (this.emailId) {
        await this.updateLogStatus("failed", {
          error: error instanceof Error ? error.message : "Unknown agent error",
        });
      }
      // Reject the email if processing fails
      message.setReject("Email processing failed");
    }
  }

  /**
   * Parses the raw email content using PostalMime.
   */
  private async parseEmail(message: ForwardableEmailMessage): Promise<any> {
    console.log("📄 Parsing email content...");

    // Convert ReadableStream to text
    const reader = message.raw.getReader();
    const chunks: Uint8Array[] = [];
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    const rawContent = new TextDecoder().decode(combined);
    const parsed = await new PostalMime().parse(rawContent);

    console.log(
      `📧 Parsed email - Subject: ${parsed.subject}, From: ${parsed.from?.address}`
    );
    return parsed;
  }

  /**
   * Calls Worker AI to get structured data from the email.
   */
  private async classifyEmail(): Promise<AIEmailResponse> {
    console.log("🧠 Calling AI for classification...");

    // Use the environment variable if set, otherwise default to the recommended model
    const model =
      this.env.DEFAULT_MODEL_REASONING ||
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

    const textContent = this.parsedEmail.text || "";
    const htmlContent = this.parsedEmail.html || "";
    const headers = this.parsedEmail.headers || {};

    const userInput = `
      Headers:
      From: ${headers.from || this.parsedEmail.from?.text || "Unknown"}
      To: ${headers.to || "Unknown"}
      Subject: ${headers.subject || this.parsedEmail.subject || "No Subject"}
      
      --- Email Body (Text) ---
      ${textContent.substring(0, 4000)}
      
      --- Email Body (HTML) ---
      ${htmlContent.substring(0, 4000)}
    `;

    const response = await this.env.AI.run(model as keyof AiModels, {
      messages: [
        { role: "system", content: AI_PROMPT_SYSTEM_MESSAGE },
        { role: "user", content: userInput },
      ],
      response_format: {
        type: "json_schema",
        schema: AI_RESPONSE_SCHEMA,
      },
    });

    console.log(
      `👍 AI classification successful. Category: ${
        (response as AIEmailResponse).category
      }`
    );
    return response as AIEmailResponse;
  }

  /**
   * Inserts the initial record into the `email_logs` table.
   */
  private async logEmail(message: ForwardableEmailMessage): Promise<number> {
    console.log(`💾 Logging email to D1 table 'email_logs'...`);
    const now = new Date().toISOString();

    // Generate UUID for the email
    const uuid = this.generateUUID();

    const result = await this.env.DB.prepare(
      `INSERT INTO email_logs (
        uuid, from_email, to_email, subject, message_id, date_received,
        content_text, content_html, content_preview, headers,
        ai_from, ai_subject, ai_body, ai_category, ai_category_reasoning, ai_job_links,
        ai_processing_status, status, received_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        uuid,
        message.from,
        message.to,
        this.parsedEmail.subject || "No Subject",
        this.parsedEmail.messageId || null,
        this.parsedEmail.date || now,
        this.parsedEmail.text || "",
        this.parsedEmail.html || "",
        this.parsedEmail.text?.substring(0, 200) || "",
        JSON.stringify(this.parsedEmail.headers || {}),
        this.classification.from,
        this.classification.subject,
        this.classification.body,
        this.classification.category,
        this.classification.category_reasoning,
        JSON.stringify(this.classification.job_links),
        "processing",
        "processing",
        now,
        now,
        now
      )
      .run();

    const newId = result.meta.last_row_id as number;
    console.log(`📄 Created email log with ID: ${newId}`);
    return newId;
  }

  /**
   * Directs the workflow based on the email's category.
   */
  private async routeByClassification(): Promise<void> {
    console.log(
      `🔀 Routing based on category: ${this.classification.category}`
    );

    switch (this.classification.category) {
      case "JOB_ALERT":
        await this.handleJobAlert();
        break;

      case "OTP":
        await this.handleOTP();
        break;

      case "SPAM":
      case "MARKETING_SPAM":
        await this.updateLogStatus("completed", {
          reason: "Classified as SPAM",
        });
        console.log("🚮 Spam email processed and filtered. No further action.");
        break;

      default: // Includes MESSAGE, RECRUITER, SYSTEM, etc.
        await this.updateLogStatus("completed", {
          reason: "Logged and archived",
        });
        console.log(
          `✅ Email type '${this.classification.category}' processed. No further routing needed.`
        );
        break;
    }
  }

  /**
   * Handles 'JOB_ALERT' emails by sending their links to the centralized job processor.
   */
  private async handleJobAlert(): Promise<void> {
    const { job_links } = this.classification;
    const actualJobLinks = job_links.filter((link) => !link.startsWith("OTP:"));

    if (actualJobLinks.length === 0) {
      console.log("🧐 Job alert detected, but no job links were found.");
      await this.updateLogStatus("completed", {
        note: "Job alert with no job links.",
      });
      return;
    }

    console.log(
      `🚀 Found ${actualJobLinks.length} job links. Submitting to centralized processor...`
    );

    try {
      // Use the centralized job processing system
      const { submitJobUrlsForProcessing } = await import(
        "../../lib/job-processing"
      );

      const result = await submitJobUrlsForProcessing(this.env, {
        urls: actualJobLinks,
        source: "email",
        source_id: this.emailId.toString(),
        metadata: {
          email_classification: this.classification.category,
          email_subject: this.classification.subject,
          ai_reasoning: this.classification.category_reasoning,
        },
      });

      // Update email_job_links table with results
      for (const urlResult of result.results) {
        const status = urlResult.success ? "completed" : "failed";
        const jobId = urlResult.success ? urlResult.job_id : null;
        const error = urlResult.success ? null : urlResult.error;

        await this.env.DB.prepare(
          `INSERT INTO email_job_links (email_id, job_url, status, job_id, processing_error, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            this.emailId,
            urlResult.url,
            status,
            jobId,
            error,
            new Date().toISOString(),
            new Date().toISOString()
          )
          .run();
      }

      await this.updateLogStatus("completed", {
        action: "submitted_to_processor",
        job_links_count: actualJobLinks.length,
        processed_count: result.processed_count,
        failed_count: result.failed_count,
      });

      console.log(
        `✅ Successfully processed ${result.processed_count} job links.`
      );
    } catch (error) {
      console.error("❌ Error processing job links:", error);
      await this.updateLogStatus("failed", {
        error: error instanceof Error ? error.message : "Job processing failed",
      });
    }
  }

  /**
   * Handles 'OTP' emails by detecting and forwarding OTP codes.
   */
  private async handleOTP(): Promise<void> {
    console.log("🔐 Processing OTP email...");

    const otpCode = this.extractOTPCode();
    if (!otpCode) {
      console.log("🧐 OTP email detected, but no code found.");
      await this.updateLogStatus("completed", {
        note: "OTP email with no code.",
      });
      return;
    }

    console.log(`🔑 OTP code detected: ${otpCode}`);

    try {
      // Forward OTP to configured recipient
      await this.forwardOTP(otpCode);

      await this.updateLogStatus("completed", {
        action: "otp_forwarded",
        otp_detected: true,
        otp_code: otpCode,
        otp_forwarded_to: this.env.OTP_FORWARD_EMAIL || "default@example.com",
      });

      console.log(`✅ OTP code forwarded successfully.`);
    } catch (error) {
      console.error("❌ Error forwarding OTP:", error);
      await this.updateLogStatus("failed", {
        error: error instanceof Error ? error.message : "OTP forwarding failed",
        otp_detected: true,
        otp_code: otpCode,
      });
    }
  }

  /**
   * Extracts OTP code from email content.
   */
  private extractOTPCode(): string | null {
    const content = this.classification.body;

    // Common OTP patterns
    const patterns = [
      /(?:code|otp|verification|pin)[\s:]*(\d{4,8})/i,
      /(\d{4,8})[\s]*(?:is your|is the|verification|code)/i,
      /(?:enter|use|type)[\s]*(?:code|otp)[\s:]*(\d{4,8})/i,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Forwards OTP code to configured email address.
   */
  private async forwardOTP(otpCode: string): Promise<void> {
    if (!this.env.EMAIL_SENDER) {
      throw new Error("EMAIL_SENDER not configured");
    }

    const otpMessage = {
      from: "noreply@9to5-scout.com",
      to: this.env.OTP_FORWARD_EMAIL || "default@example.com",
      subject: `OTP Code: ${otpCode}`,
      text: `OTP Code: ${otpCode}\n\nOriginal email from: ${this.classification.from}`,
      html: `
        <h2>OTP Code Alert</h2>
        <p><strong>Code:</strong> ${otpCode}</p>
        <p><strong>From:</strong> ${this.classification.from}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      `,
    };

    await (this.env as any).EMAIL_SENDER.send(otpMessage);
  }

  /**
   * Updates the final status of the email log in D1.
   */
  private async updateLogStatus(
    status: "completed" | "failed",
    metadata: EmailProcessingMetadata
  ): Promise<void> {
    const now = new Date().toISOString();

    await this.env.DB.prepare(
      `UPDATE email_logs 
       SET status = ?, 
           ai_processing_status = ?, 
           processed_at = ?, 
           updated_at = ?,
           otp_detected = ?,
           otp_code = ?,
           otp_forwarded_to = ?
       WHERE id = ?`
    )
      .bind(
        status,
        status,
        now,
        now,
        metadata.otp_detected || false,
        metadata.otp_code || null,
        metadata.otp_forwarded_to || null,
        this.emailId
      )
      .run();

    // Also update the metadata in a separate field if needed
    if (Object.keys(metadata).length > 0) {
      await this.env.DB.prepare(
        `UPDATE email_logs SET ai_job_links = ? WHERE id = ?`
      )
        .bind(JSON.stringify(metadata), this.emailId)
        .run();
    }
  }

  /**
   * Generates a UUID for email identification.
   */
  private generateUUID(): string {
    return uuidv4();
  }
}
