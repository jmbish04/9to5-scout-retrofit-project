/**
 * @module src/domains/sites/types.ts
 * @description
 * Zod schemas and TypeScript types for the sites domain.
 */
import { z } from 'zod';

export const SiteSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  base_url: z.string().url(),
  status: z.enum(['active', 'paused', 'error']).default('active'),
  last_scraped_at: z.string().datetime().optional(),
});

export type Site = z.infer<typeof SiteSchema>;
