/**
 * @file src/domains/agents/durable-objects/email-classification-agent.ts
 * Email Classification Agent for job alert processing
 */

import { Agent } from "agents";
import type { Env } from "../../../config/env";

interface EmailData {
  to: string;
  from: string;
  subject: string;
  body: string;
}

type Classification =
  | "JOBS_ALERT"
  | "JOB_RELATED_DO_NOT_TAG"
  | "NOT_JOB_RELATED";

interface ClassificationResult {
  classification: Classification;
  confidence: number;
  reasoning?: string;
}

/**
 * Email Classification Agent
 * Analyzes emails to determine if they're job alerts, job-related, or unrelated
 */
export class EmailClassificationAgent extends Agent<Env, any> {
  /**
   * Classify an email
   * @param {EmailData} emailData - Email data to classify
   * @returns {Promise<ClassificationResult>} Classification result
   */
  public async classifyEmail(
    emailData: EmailData
  ): Promise<ClassificationResult> {
    try {
      // Use AI to analyze the email
      const classification = await this.analyzeEmailContent(emailData);

      return classification;
    } catch (error) {
      console.error("Error in email classification:", error);
      // Default to NOT_JOB_RELATED on error
      return {
        classification: "NOT_JOB_RELATED",
        confidence: 0,
        reasoning: "Error occurred during classification",
      };
    }
  }

  /**
   * Analyze email content using AI
   * @param {EmailData} emailData - Email data
   * @returns {Promise<ClassificationResult>} Classification result
   */
  private async analyzeEmailContent(
    emailData: EmailData
  ): Promise<ClassificationResult> {
    const prompt = `
You are a STRICT email classifier for job-related emails. Only classify as job-related if you are VERY confident.

Analyze the following email and classify it as one of the following categories:

1. JOBS_ALERT - ONLY automated job alert emails from known job platforms:
   - System-generated notifications from LinkedIn Job Alerts (jobalerts-noreply@linkedin.com)
   - Google Jobs alerts (notify-noreply@google.com)
   - Indeed job alerts
   - Other automated job board notifications
   - MUST have clear indicators: job listings, new positions, job matches, "we found jobs for you"
   - If unsure, classify as NOT_JOB_RELATED

2. JOB_RELATED_DO_NOT_TAG - ONLY direct job-related communications with STRONG evidence:
   - Explicit recruiter messages mentioning jobs, positions, or opportunities
   - Hiring manager emails with job offers or interview scheduling
   - Application follow-ups that clearly reference a specific job application
   - Job offer letters
   - MUST have clear job-related content, not just casual networking
   - If the email could be personal or unrelated, classify as NOT_JOB_RELATED

3. NOT_JOB_RELATED - Everything else:
   - Personal emails
   - Newsletters
   - Marketing emails
   - General LinkedIn connection requests without job mentions
   - Casual networking messages
   - Transactional emails (receipts, confirmations)
   - When in doubt, classify as NOT_JOB_RELATED to avoid missing important emails

Email Details:
From: ${emailData.from}
To: ${emailData.to}
Subject: ${emailData.subject}
Body: ${emailData.body.substring(0, 2000)}${
      emailData.body.length > 2000 ? "..." : ""
    }

IMPORTANT: Be VERY conservative. Only classify as job-related if there are CLEAR and EXPLICIT job-related indicators. 
If the email could be personal, marketing, or unrelated, classify as NOT_JOB_RELATED.

Please respond with a JSON object containing:
{
  "classification": "JOBS_ALERT" | "JOB_RELATED_DO_NOT_TAG" | "NOT_JOB_RELATED",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of why this classification was chosen"
}
`;

    try {
      const model =
        this.env.DEFAULT_MODEL_REASONING || "@cf/meta/llama-3.1-8b-instruct";

      const response = await this.env.AI.run(model, {
        messages: [
          {
            role: "system",
            content:
              "You are an expert email classifier specialized in identifying job-related communications. Analyze emails carefully and provide accurate classifications.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent classification
      });

      // Parse the response
      const responseText =
        (response as any).response || (response as any).message || "";
      const result = this.parseClassificationResponse(responseText);

      return result;
    } catch (error) {
      console.error("Error analyzing email content:", error);
      return {
        classification: "NOT_JOB_RELATED",
        confidence: 0,
        reasoning: "Error during AI analysis",
      };
    }
  }

  /**
   * Parse classification response from AI
   * @param {string} responseText - AI response text
   * @returns {ClassificationResult} Parsed result
   */
  private parseClassificationResponse(
    responseText: string
  ): ClassificationResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          classification: this.validateClassification(parsed.classification),
          confidence: parseFloat(parsed.confidence) || 0.5,
          reasoning: parsed.reasoning || "",
        };
      }
    } catch (error) {
      console.error("Error parsing classification response:", error);
    }

    // Fallback: try to infer from keywords
    return this.fallbackClassification(responseText);
  }

  /**
   * Validate classification value
   * @param {string} classification - Classification string
   * @returns {Classification} Valid classification
   */
  private validateClassification(classification: string): Classification {
    if (
      ["JOBS_ALERT", "JOB_RELATED_DO_NOT_TAG", "NOT_JOB_RELATED"].includes(
        classification
      )
    ) {
      return classification as Classification;
    }
    return "NOT_JOB_RELATED";
  }

  /**
   * Fallback classification based on keywords
   * @param {string} text - Text to analyze
   * @returns {ClassificationResult} Classification result
   */
  private fallbackClassification(text: string): ClassificationResult {
    const lowerText = text.toLowerCase();

    // Job alert keywords
    const alertKeywords = [
      "job alert",
      "new jobs",
      "job matches",
      "job opportunities",
      "recommended jobs",
      "daily digest",
      "job posting",
      "new position",
    ];

    // Job-related keywords
    const relatedKeywords = [
      "recruiter",
      "hiring manager",
      "interview",
      "application",
      "position guide",
      "next steps",
      "thank you for applying",
      "follow up",
    ];

    if (alertKeywords.some((keyword) => lowerText.includes(keyword))) {
      return {
        classification: "JOBS_ALERT",
        confidence: 0.7,
        reasoning: "Job alert keywords detected",
      };
    }

    if (relatedKeywords.some((keyword) => lowerText.includes(keyword))) {
      return {
        classification: "JOB_RELATED_DO_NOT_TAG",
        confidence: 0.6,
        reasoning: "Job-related keywords detected",
      };
    }

    return {
      classification: "NOT_JOB_RELATED",
      confidence: 0.5,
      reasoning: "No clear job-related indicators",
    };
  }

  /**
   * Handle incoming requests
   * @param {Request} request - HTTP request
   * @returns {Promise<Response>} HTTP response
   */
  async onRequest(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const emailData: EmailData = await request.json();
      const result = await this.classifyEmail(emailData);

      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error in onRequest:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
}
