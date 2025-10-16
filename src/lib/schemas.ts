// src/lib/schemas.ts
import { z } from "zod";

export const ProviderSchema = z.enum(["serper", "serpapi"]);
export type Provider = z.infer<typeof ProviderSchema>;

export const FirecrawlJobSchema = z.object({
  company_name: z.string().optional(),
  company_description: z.string().optional(),
  job_title: z.string().optional(),
  job_location: z.string().optional(),
  employment_type: z.string().optional(),
  department: z.string().optional(),
  salary_min: z.number().optional(),
  salary_max: z.number().optional(),
  salary_currency: z.string().optional(),
  salary_raw: z.string().optional(),
  job_description: z.string().optional(),
  job_requirements: z.string().optional(),
  posted_date: z.string().datetime().optional(), // ISO when present
  source_url: z.string().url().optional(),
  url: z.string().url(), // Required url field for compatibility
});

export type FirecrawlJob = z.infer<typeof FirecrawlJobSchema>;

export const JobsResponseSchema = z.object({
  provider: ProviderSchema,
  count: z.number().int().nonnegative(),
  results: z.array(FirecrawlJobSchema),
});
export type JobsResponse = z.infer<typeof JobsResponseSchema>;

export const QuerySchema = z.object({
  q: z.string().min(1, "q is required"),
  location: z.string().optional(),
  n: z
    .string()
    .transform((v) => (v ? Number(v) : undefined))
    .pipe(z.number().int().positive().max(100).optional())
    .optional(),
  provider: ProviderSchema.optional(),
});
export type QueryParams = z.infer<typeof QuerySchema>;

// Email AI Extraction Schema for Llama 4 structured responses
export const EmailClassificationSchema = z.enum([
  "job_alert",
  "announcement",
  "otp",
  "spam",
  "personal",
  "other",
]);

export const EmailAIExtractionSchema = z.object({
  from: z.string().email(),
  to: z.string().email(),
  subject: z.string(),
  messageId: z.string(),
  dateReceived: z.string().datetime(),
  contentText: z.string(),
  contentHtml: z.string(),
  contentPreview: z.string().max(200),
  classification: EmailClassificationSchema,
  otpDetected: z.boolean(),
  otpCode: z.string().optional(),
  otpService: z.string().optional(),
  jobLinks: z.array(z.string().url()),
  headers: z.record(z.string(), z.string()),
});

export type EmailAIExtraction = z.infer<typeof EmailAIExtractionSchema>;

// Convert Zod schema to JSON Schema for Llama 4
export const emailAIExtractionJSONSchema = {
  type: "object",
  properties: {
    from: {
      type: "string",
      format: "email",
      description: "Sender email address",
    },
    to: {
      type: "string",
      format: "email",
      description: "Recipient email address",
    },
    subject: {
      type: "string",
      description: "Email subject line",
    },
    messageId: {
      type: "string",
      description: "Unique message identifier",
    },
    dateReceived: {
      type: "string",
      format: "date-time",
      description: "ISO 8601 datetime when email was received",
    },
    contentText: {
      type: "string",
      description: "Plain text body content only (no HTML tags)",
    },
    contentHtml: {
      type: "string",
      description: "HTML body content if available",
    },
    contentPreview: {
      type: "string",
      maxLength: 200,
      description: "First 200 characters of plain text body",
    },
    classification: {
      type: "string",
      enum: ["job_alert", "announcement", "otp", "spam", "personal", "other"],
      description: "Email classification category",
    },
    otpDetected: {
      type: "boolean",
      description: "Whether an OTP code was detected",
    },
    otpCode: {
      type: "string",
      description: "The OTP code if detected (4-8 characters)",
    },
    otpService: {
      type: "string",
      description: "Service name that sent the OTP",
    },
    jobLinks: {
      type: "array",
      items: {
        type: "string",
        format: "uri",
      },
      description: "Array of job-related URLs found in the email",
    },
    headers: {
      type: "object",
      additionalProperties: {
        type: "string",
      },
      description: "Email headers as key-value pairs",
    },
  },
  required: [
    "from",
    "to",
    "subject",
    "messageId",
    "dateReceived",
    "contentText",
    "contentHtml",
    "contentPreview",
    "classification",
    "otpDetected",
    "jobLinks",
    "headers",
  ],
} as const;
