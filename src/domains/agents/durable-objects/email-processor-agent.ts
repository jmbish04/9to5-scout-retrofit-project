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

/**
 * @deprecated Migrated to EmailIngestionService in `src/domains/email/services/email-ingestion.service.ts`.
 */
// export class EmailProcessorAgent extends Agent<Env> {
//   // ... implementation ...
// }
