/**
 * @fileoverview Email Integration Service
 *
 * Provides comprehensive email processing functionality including parsing,
 * classification, template generation, and email management using Cloudflare
 * Email Routing and Workers AI.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * Email service environment interface
 */
export interface EmailServiceEnv {
  AI: Ai;
  DB: D1Database;
  R2: R2Bucket;
  BUCKET_BASE_URL: string;
  DEFAULT_MODEL_REASONING: string;
  EMBEDDING_MODEL: string;
  VECTORIZE_INDEX: VectorizeIndex;
}

/**
 * Email parsing result interface
 */
export interface EmailParseResult {
  from: string;
  to: string;
  subject: string;
  body: string;
  html?: string;
  attachments: Array<{
    filename: string;
    contentType: string;
    size: number;
    content: ArrayBuffer;
  }>;
  headers: Record<string, string>;
  messageId: string;
  date: string;
}

/**
 * Email classification result interface
 */
export interface EmailClassificationResult {
  category:
    | "job_alert"
    | "application_response"
    | "interview_invite"
    | "rejection"
    | "otp"
    | "other";
  confidence: number;
  reasoning: string;
  job_links: string[];
  otp_codes: string[];
  priority: "low" | "normal" | "high" | "urgent";
  action_required: boolean;
  suggested_actions: string[];
}

/**
 * Email template data interface
 */
export interface EmailTemplateData {
  recipient_name: string;
  company_name: string;
  job_title: string;
  position: string;
  salary_range?: string;
  location?: string;
  application_deadline?: string;
  interview_date?: string;
  interview_time?: string;
  interview_location?: string;
  contact_person?: string;
  contact_email?: string;
  additional_notes?: string;
  [key: string]: any;
}

/**
 * Email generation result interface
 */
export interface EmailGenerationResult {
  subject: string;
  body: string;
  html: string;
  template_used: string;
  variables_used: string[];
  word_count: number;
  estimated_read_time: number;
}

/**
 * Email Service Class
 *
 * Provides comprehensive email processing functionality including parsing,
 * classification, template generation, and email management.
 */
export class EmailService {
  private env: EmailServiceEnv;

  constructor(env: EmailServiceEnv) {
    this.env = env;
  }

  /**
   * Parse raw email content using postal-mime
   * @param rawEmail Raw email content as string or ArrayBuffer
   * @returns Promise resolving to parsed email data
   */
  async parseEmail(rawEmail: string | ArrayBuffer): Promise<EmailParseResult> {
    try {
      // Import postal-mime dynamically to avoid bundling issues
      const PostalMime = (await import("postal-mime")).default;

      const parser = new PostalMime();
      const email = await parser.parse(rawEmail);

      const attachments = (email.attachments || []).map((att: any) => ({
        filename: att.filename || "unknown",
        contentType: att.mimeType || "application/octet-stream",
        size: att.content?.length || 0,
        content: att.content || new ArrayBuffer(0),
      }));

      return {
        from: (email.from as any)?.text || "",
        to: Array.isArray(email.to)
          ? (email.to[0] as any)?.text || ""
          : (email.to as any)?.text || "",
        subject: email.subject || "",
        body: email.text || "",
        html: email.html,
        attachments,
        headers: (email.headers || []).reduce(
          (acc: Record<string, string>, header: any) => {
            acc[header.key] = header.value;
            return acc;
          },
          {}
        ),
        messageId: email.messageId || "",
        date: email.date || new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error parsing email:", error);
      throw new Error(
        `Failed to parse email: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Classify email content using AI
   * @param emailData Parsed email data
   * @returns Promise resolving to classification result
   */
  async classifyEmail(
    emailData: EmailParseResult
  ): Promise<EmailClassificationResult> {
    try {
      const classificationSchema = {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: [
              "job_alert",
              "application_response",
              "interview_invite",
              "rejection",
              "otp",
              "other",
            ],
            description: "Primary category of the email",
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Confidence score for the classification",
          },
          reasoning: {
            type: "string",
            description: "Explanation for the classification",
          },
          job_links: {
            type: "array",
            items: { type: "string" },
            description: "Job posting links found in the email",
          },
          otp_codes: {
            type: "array",
            items: { type: "string" },
            description: "OTP codes found in the email",
          },
          priority: {
            type: "string",
            enum: ["low", "normal", "high", "urgent"],
            description: "Priority level of the email",
          },
          action_required: {
            type: "boolean",
            description: "Whether the email requires action",
          },
          suggested_actions: {
            type: "array",
            items: { type: "string" },
            description: "Suggested actions for the email",
          },
        },
        required: [
          "category",
          "confidence",
          "reasoning",
          "job_links",
          "otp_codes",
          "priority",
          "action_required",
          "suggested_actions",
        ],
      };

      const messages = [
        {
          role: "system",
          content: `You are an expert email classifier for job seekers. Analyze the provided email and classify it into the appropriate category. Extract job links, OTP codes, and suggest actions. Be thorough and accurate.`,
        },
        {
          role: "user",
          content: `Classify this email:\n\nFrom: ${emailData.from}\nSubject: ${
            emailData.subject
          }\n\nBody:\n${emailData.body.slice(0, 4000)}`,
        },
      ];

      const inputs = {
        messages,
        guided_json: classificationSchema,
      };

      const response = await this.env.AI.run(
        this.env.DEFAULT_MODEL_REASONING as keyof AiModels,
        inputs
      );

      if ((response as { response?: string })?.response) {
        const classificationData =
          typeof (response as { response: string }).response === "string"
            ? JSON.parse((response as { response: string }).response)
            : (response as { response: unknown }).response;

        return classificationData as EmailClassificationResult;
      }

      // Return default classification if parsing fails
      return {
        category: "other",
        confidence: 0,
        reasoning: "Classification failed",
        job_links: [],
        otp_codes: [],
        priority: "normal",
        action_required: false,
        suggested_actions: [],
      };
    } catch (error) {
      console.error("Error classifying email:", error);
      return {
        category: "other",
        confidence: 0,
        reasoning: "Classification failed",
        job_links: [],
        otp_codes: [],
        priority: "normal",
        action_required: false,
        suggested_actions: [],
      };
    }
  }

  /**
   * Generate email content using templates
   * @param templateName Name of the template to use
   * @param data Template data
   * @returns Promise resolving to generated email content
   */
  async generateEmail(
    templateName: string,
    data: EmailTemplateData
  ): Promise<EmailGenerationResult> {
    try {
      // Load template from R2 or use default templates
      const template = await this.loadTemplate(templateName);

      // Replace template variables
      let subject = template.subject;
      let body = template.body;
      let html = template.html;

      for (const [key, value] of Object.entries(data)) {
        const placeholder = `{{${key}}}`;
        subject = subject.replace(
          new RegExp(placeholder, "g"),
          String(value || "")
        );
        body = body.replace(new RegExp(placeholder, "g"), String(value || ""));
        html = html.replace(new RegExp(placeholder, "g"), String(value || ""));
      }

      // Calculate metrics
      const wordCount = body.split(/\s+/).length;
      const estimatedReadTime = Math.ceil(wordCount / 200); // Assuming 200 words per minute

      return {
        subject,
        body,
        html,
        template_used: templateName,
        variables_used: Object.keys(data),
        word_count: wordCount,
        estimated_read_time: estimatedReadTime,
      };
    } catch (error) {
      console.error("Error generating email:", error);
      throw new Error(
        `Failed to generate email: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Store email in database and R2
   * @param emailData Parsed email data
   * @param classification Classification result
   * @returns Promise resolving to storage result
   */
  async storeEmail(
    emailData: EmailParseResult,
    classification: EmailClassificationResult
  ): Promise<{ success: boolean; emailId?: string; error?: string }> {
    try {
      const emailId = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      // Store email content in R2
      const emailContent = {
        from: emailData.from,
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        html: emailData.html,
        headers: emailData.headers,
        messageId: emailData.messageId,
        date: emailData.date,
        attachments: emailData.attachments.map((att) => ({
          filename: att.filename,
          contentType: att.contentType,
          size: att.size,
        })),
      };

      const emailKey = `emails/${emailId}.json`;
      await this.env.R2.put(emailKey, JSON.stringify(emailContent, null, 2));

      // Store email metadata in D1
      await this.env.DB.prepare(
        `
        INSERT INTO email_logs (
          id, from_email, to_email, subject, category, confidence,
          reasoning, job_links, otp_codes, priority, action_required,
          suggested_actions, r2_key, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
        .bind(
          emailId,
          emailData.from,
          emailData.to,
          emailData.subject,
          classification.category,
          classification.confidence,
          classification.reasoning,
          JSON.stringify(classification.job_links),
          JSON.stringify(classification.otp_codes),
          classification.priority,
          classification.action_required ? 1 : 0,
          JSON.stringify(classification.suggested_actions),
          emailKey,
          timestamp,
          timestamp
        )
        .run();

      return { success: true, emailId };
    } catch (error) {
      console.error("Error storing email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Load email template from R2 or use default
   * @param templateName Name of the template
   * @returns Promise resolving to template data
   */
  private async loadTemplate(templateName: string): Promise<{
    subject: string;
    body: string;
    html: string;
  }> {
    try {
      // Try to load from R2 first
      const templateKey = `templates/email/${templateName}.json`;
      const templateObject = await this.env.R2.get(templateKey);

      if (templateObject) {
        const template = (await templateObject.json()) as {
          subject?: string;
          body?: string;
          html?: string;
        };
        return {
          subject: template.subject || "",
          body: template.body || "",
          html: template.html || "",
        };
      }
    } catch (error) {
      console.warn(`Failed to load template ${templateName} from R2:`, error);
    }

    // Fallback to default templates
    return this.getDefaultTemplate(templateName);
  }

  /**
   * Get default email template
   * @param templateName Name of the template
   * @returns Default template data
   */
  private getDefaultTemplate(templateName: string): {
    subject: string;
    body: string;
    html: string;
  } {
    const defaultTemplates: Record<
      string,
      { subject: string; body: string; html: string }
    > = {
      job_application: {
        subject: "Application for {{job_title}} at {{company_name}}",
        body: `Dear {{contact_person}},

I am writing to express my interest in the {{job_title}} position at {{company_name}}. I am excited about the opportunity to contribute to your team and believe my skills and experience make me a strong candidate for this role.

Key qualifications:
- Relevant experience in {{position}}
- Strong technical skills
- Excellent communication abilities

I am available for an interview at your convenience and look forward to discussing how I can contribute to {{company_name}}.

Best regards,
{{recipient_name}}`,
        html: `<p>Dear {{contact_person}},</p>
<p>I am writing to express my interest in the {{job_title}} position at {{company_name}}. I am excited about the opportunity to contribute to your team and believe my skills and experience make me a strong candidate for this role.</p>
<p>Key qualifications:</p>
<ul>
<li>Relevant experience in {{position}}</li>
<li>Strong technical skills</li>
<li>Excellent communication abilities</li>
</ul>
<p>I am available for an interview at your convenience and look forward to discussing how I can contribute to {{company_name}}.</p>
<p>Best regards,<br>{{recipient_name}}</p>`,
      },
      follow_up: {
        subject: "Follow-up on {{job_title}} application",
        body: `Dear {{contact_person}},

I wanted to follow up on my application for the {{job_title}} position at {{company_name}} that I submitted on {{application_date}}.

I remain very interested in this opportunity and would appreciate any updates on the status of my application.

Thank you for your time and consideration.

Best regards,
{{recipient_name}}`,
        html: `<p>Dear {{contact_person}},</p>
<p>I wanted to follow up on my application for the {{job_title}} position at {{company_name}} that I submitted on {{application_date}}.</p>
<p>I remain very interested in this opportunity and would appreciate any updates on the status of my application.</p>
<p>Thank you for your time and consideration.</p>
<p>Best regards,<br>{{recipient_name}}</p>`,
      },
    };

    return (
      defaultTemplates[templateName] || {
        subject: "{{subject}}",
        body: "{{body}}",
        html: "<p>{{body}}</p>",
      }
    );
  }

  /**
   * Search emails using vector embeddings
   * @param query Search query
   * @param limit Maximum number of results
   * @returns Promise resolving to search results
   */
  async searchEmails(query: string, limit: number = 10): Promise<any[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);
      if (!queryEmbedding) {
        return [];
      }

      // Search in Vectorize
      const searchResults = await this.env.VECTORIZE_INDEX.query(
        queryEmbedding,
        {
          topK: limit,
          returnMetadata: true,
        }
      );

      return searchResults.matches || [];
    } catch (error) {
      console.error("Error searching emails:", error);
      return [];
    }
  }

  /**
   * Generate embedding for text
   * @param text Text to embed
   * @returns Promise resolving to embedding vector
   */
  private async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      const response = await this.env.AI.run(
        this.env.EMBEDDING_MODEL as keyof AiModels,
        { text }
      );
      return (
        (response as { data?: { embedding: number[] }[] })?.data?.[0]
          ?.embedding || null
      );
    } catch (error) {
      console.error("Error generating embedding:", error);
      return null;
    }
  }
}

/**
 * Factory function to create EmailService
 * @param env Email service environment configuration
 * @returns New EmailService instance
 */
export function createEmailService(env: EmailServiceEnv): EmailService {
  return new EmailService(env);
}
