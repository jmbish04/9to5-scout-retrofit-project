/**
 * @module src/domains/scraping/types.ts
 * @description
 * Zod schemas and TypeScript types for the 'scraping' and 'company-intelligence' domains.
 */

import { z } from 'zod';

export const CompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  normalized_domain: z.string(),
  website_url: z.string().url().nullable(),
  careers_url: z.string().url().nullable(),
  description: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Company = z.infer<typeof CompanySchema>;

export const BenefitsStatsSchema = z.object({
  company_id: z.string().uuid(),
  computed_at: z.string().datetime(),
  highlights: z.any(), // JSON blob
  total_comp_heuristics: z.any(), // JSON blob
  coverage: z.any(), // JSON blob
});
export type BenefitsStats = z.infer<typeof BenefitsStatsSchema>;

export const CompanyWithStatsSchema = CompanySchema.extend({
  latest_stats: BenefitsStatsSchema.nullable(),
});
export type CompanyWithStats = z.infer<typeof CompanyWithStatsSchema>;

export const BenefitsSnapshotSchema = z.object({
    id: z.number().int(),
    source: z.string(),
    source_url: z.string().url(),
    snapshot_text: z.string(),
    parsed: z.any(), // JSON blob
    extracted_at: z.string().datetime(),
});
export type BenefitsSnapshot = z.infer<typeof BenefitsSnapshotSchema>;