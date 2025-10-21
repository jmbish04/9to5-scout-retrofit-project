/**
 * @module src/domains/email/types.ts
 * @description
 * Zod schemas and TypeScript types for the 'email' domain.
 */

import { z } from 'zod';

export const EmailCategorySchema = z.enum([
  "SPAM",
  "JOB_ALERT",
  "MESSAGE",
  "RECRUITER",
  "NETWORKING",
  "MARKETING_SPAM",
  "OTP",
  "SYSTEM",
  "UNKNOWN",
]);
export type EmailCategory = z.infer<typeof EmailCategorySchema>;

export const AIEmailResponseSchema = z.object({
  from: z.string().email(),
  subject: z.string(),
  body: z.string(),
  category: EmailCategorySchema,
  category_reasoning: z.string(),
  job_links: z.array(z.string().url()),
});
export type AIEmailResponse = z.infer<typeof AIEmailResponseSchema>;

export const EmailLogRowSchema = z.object({
    id: z.number().int(),
    uuid: z.string().uuid(),
    from_email: z.string(),
    to_email: z.string(),
    subject: z.string(),
    message_id: z.string().nullable(),
    date_received: z.string().datetime(),
    content_text: z.string(),
    content_html: z.string(),
    content_preview: z.string(),
    headers: z.string(), // JSON string
    ai_from: z.string().nullable(),
    ai_subject: z.string().nullable(),
    ai_body: z.string().nullable(),
    ai_category: z.string().nullable(),
    ai_category_reasoning: z.string().nullable(),
    ai_job_links: z.string().nullable(), // JSON string
    status: z.enum(['processing', 'completed', 'failed']),
    received_at: z.string().datetime(),
    processed_at: z.string().datetime().nullable(),
});
export type EmailLogRow = z.infer<typeof EmailLogRowSchema>;