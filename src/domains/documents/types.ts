/**
 * @module src/domains/documents/types.ts
 * @description
 * Zod schemas and TypeScript types for the 'documents' domain.
 */

import { z } from 'zod';

// Schema for the request body when generating a cover letter
export const CoverLetterRequestSchema = z.object({
  job_title: z.string(),
  company_name: z.string(),
  hiring_manager_name: z.string().optional(),
  job_description_text: z.string(),
  candidate_career_summary: z.string(),
});
export type CoverLetterRequest = z.infer<typeof CoverLetterRequestSchema>;

// Schema for the structured content of a generated cover letter
export const CoverLetterContentSchema = z.object({
  salutation: z.string(),
  opening_paragraph: z.string(),
  body_paragraph_1: z.string(),
  body_paragraph_2: z.string(),
  closing_paragraph: z.string(),
});
export type CoverLetterContent = z.infer<typeof CoverLetterContentSchema>;

// Schema for the request body when generating resume content
export const ResumeRequestSchema = z.object({
  job_title: z.string(),
  company_name: z.string(),
  job_description_text: z.string(),
  candidate_career_summary: z.string(),
});
export type ResumeRequest = z.infer<typeof ResumeRequestSchema>;

// Schema for the structured content of a generated resume
export const ResumeContentSchema = z.object({
  summary: z.string(),
  experience_bullets: z.array(z.string()),
  skills: z.array(z.string()),
});
export type ResumeContent = z.infer<typeof ResumeContentSchema>;
