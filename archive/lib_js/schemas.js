// src/lib/schemas.ts
import { z } from "zod";
export const ProviderSchema = z.enum(["serper", "serpapi"]);
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
export const JobsResponseSchema = z.object({
    provider: ProviderSchema,
    count: z.number().int().nonnegative(),
    results: z.array(FirecrawlJobSchema),
});
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
