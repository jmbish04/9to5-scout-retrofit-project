/**
 * @module src/domains/jobs/types.ts
 * @description
 * Zod schemas and TypeScript types for the 'jobs' domain.
 */

import { z } from 'zod';

export const JobSchema = z.object({
  id: z.string().uuid(),
  site_id: z.string().uuid().nullable(),
  url: z.string().url(),
  canonical_url: z.string().url().nullable(),
  title: z.string().nullable(),
  company: z.string().nullable(),
  location: z.string().nullable(),
  employment_type: z.string().nullable(),
  department: z.string().nullable(),
  salary_min: z.number().nullable(),
  salary_max: z.number().nullable(),
  salary_currency: z.string().nullable(),
  salary_raw: z.string().nullable(),
  compensation_raw: z.string().nullable(),
  description_md: z.string().nullable(),
  requirements_md: z.string().nullable(),
  posted_at: z.string().datetime().nullable(),
  closed_at: z.string().datetime().nullable(),
  status: z.enum(['open', 'closed', 'expired']).default('open'),
  source: z.string().default('SCRAPED'),
  last_seen_open_at: z.string().datetime().nullable(),
  first_seen_at: z.string().datetime(),
  last_crawled_at: z.string().datetime(),
  daily_monitoring_enabled: z.boolean().default(true),
  monitoring_frequency_hours: z.number().default(24),
  last_status_check_at: z.string().datetime().nullable(),
  closure_detected_at: z.string().datetime().nullable(),
  company_id: z.string().uuid().nullable(),
});

export type Job = z.infer<typeof JobSchema>;