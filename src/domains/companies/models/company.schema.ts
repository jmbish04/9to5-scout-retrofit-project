/**
 * Company Schemas
 *
 * Zod schemas for validating company-related data structures.
 */

import { z } from "zod";

// Base schemas
export const CompanyCultureSchema = z.object({
  work_environment: z.string().optional(),
  values: z.array(z.string()).optional(),
  perks: z.array(z.string()).optional(),
  remote_policy: z.string().optional(),
  diversity_initiatives: z.array(z.string()).optional(),
  employee_testimonials: z.array(z.string()).optional(),
});

export const CompanyNewsSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  published_at: z.string().datetime(),
  source: z.string().min(1),
  summary: z.string().optional(),
  sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
});

export const FundingRoundSchema = z.object({
  round: z.string().min(1),
  amount: z.string().min(1),
  date: z.string().datetime(),
  investors: z.array(z.string()).optional(),
});

export const CompanyFinancialsSchema = z.object({
  revenue: z.string().optional(),
  funding_rounds: z.array(FundingRoundSchema).optional(),
  valuation: z.string().optional(),
  employees: z.number().int().min(0).optional(),
  growth_rate: z.string().optional(),
  profitability: z.string().optional(),
});

export const CompanyLeadershipSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  bio: z.string().optional(),
  linkedin_url: z.string().url().optional(),
  photo_url: z.string().url().optional(),
  tenure: z.string().optional(),
});

export const CompanyBenefitsSchema = z.object({
  category: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  value: z.string().optional(),
  eligibility: z.string().optional(),
  coverage: z.string().optional(),
});

export const InterviewFeedbackSchema = z.object({
  role: z.string().min(1),
  experience: z.string().min(1),
  rating: z.number().min(1).max(5),
  feedback: z.string().min(1),
  date: z.string().datetime(),
  source: z.string().min(1),
});

export const InterviewInsightsSchema = z.object({
  common_questions: z.array(z.string()).optional(),
  interview_process: z.string().optional(),
  difficulty_level: z.enum(["easy", "medium", "hard"]).optional(),
  preparation_tips: z.array(z.string()).optional(),
  company_specific_advice: z.string().optional(),
  recent_feedback: z.array(InterviewFeedbackSchema).optional(),
});

// Main company schema
export const CompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  normalized_domain: z.string().optional(),
  website_url: z.string().url().optional(),
  careers_url: z.string().url().optional(),
  description: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
  location: z.string().optional(),
  founded: z.string().optional(),
  mission: z.string().optional(),
  company_values: z.array(z.string()).optional(),
  culture: CompanyCultureSchema.optional(),
  recent_news: z.array(CompanyNewsSchema).optional(),
  financials: CompanyFinancialsSchema.optional(),
  leadership: z.array(CompanyLeadershipSchema).optional(),
  benefits: z.array(CompanyBenefitsSchema).optional(),
  interview_insights: InterviewInsightsSchema.optional(),
  last_updated: z.string().datetime(),
  research_count: z.number().int().min(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CompanyResearchSchema = z.object({
  id: z.string().uuid(),
  company_name: z.string().min(1),
  domain: z.string().optional(),
  industry: z.string().optional(),
  status: z.enum([
    "queued",
    "processing",
    "gathering_info",
    "analyzing_culture",
    "gathering_news",
    "researching_leadership",
    "analyzing_benefits",
    "completed",
    "failed",
  ]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CompanyBenefitsDataSchema = z.object({
  benefits: z.array(CompanyBenefitsSchema),
  highlights: z.array(z.string()),
  total_comp_heuristics: z.any(),
  coverage: z.any(),
});

export const CompanySnapshotSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
  source: z.string().min(1),
  source_url: z.string().url(),
  snapshot_text: z.string().min(1),
  parsed: CompanyBenefitsDataSchema.optional(),
  extracted_at: z.string().datetime(),
});

export const CompanyStatsSchema = z.object({
  company_id: z.string().uuid(),
  highlights: z.array(z.string()),
  total_comp_heuristics: z.any(),
  coverage: z.any(),
  computed_at: z.string().datetime(),
});

// Request/Response schemas
export const CompanySearchRequestSchema = z.object({
  query: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
  location: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const CompanyBenefitsRequestSchema = z.object({
  company_id: z.string().uuid(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const CompanyCompareRequestSchema = z.object({
  company_ids: z.array(z.string().uuid()).min(1).max(10),
});

export const CreateCompanyRequestSchema = z.object({
  name: z.string().min(1),
  normalized_domain: z.string().optional(),
  website_url: z.string().url().optional(),
  careers_url: z.string().url().optional(),
  description: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
  location: z.string().optional(),
  founded: z.string().optional(),
  mission: z.string().optional(),
  company_values: z.array(z.string()).optional(),
});

export const UpdateCompanyRequestSchema = z.object({
  name: z.string().min(1).optional(),
  normalized_domain: z.string().optional(),
  website_url: z.string().url().optional(),
  careers_url: z.string().url().optional(),
  description: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
  location: z.string().optional(),
  founded: z.string().optional(),
  mission: z.string().optional(),
  company_values: z.array(z.string()).optional(),
  culture: CompanyCultureSchema.optional(),
  recent_news: z.array(CompanyNewsSchema).optional(),
  financials: CompanyFinancialsSchema.optional(),
  leadership: z.array(CompanyLeadershipSchema).optional(),
  benefits: z.array(CompanyBenefitsSchema).optional(),
  interview_insights: InterviewInsightsSchema.optional(),
});

export const CompanyResponseSchema = z.object({
  company: CompanySchema,
});

export const CompanyListResponseSchema = z.object({
  companies: z.array(CompanySchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  has_more: z.boolean(),
});

export const CompanyBenefitsResponseSchema = z.object({
  snapshots: z.array(CompanySnapshotSchema),
  stats: CompanyStatsSchema.nullable(),
});

export const CompanyCompareResponseSchema = z.object({
  companies: z.array(
    z.object({
      company_id: z.string().uuid(),
      snapshots: z.array(CompanySnapshotSchema),
      stats: CompanyStatsSchema.nullable(),
    })
  ),
});

export const CompanyStatsHighlightsResponseSchema = z.object({
  highlights: z.array(z.string()),
});

export const CompanyStatsValuationsResponseSchema = z.object({
  valuations: z.array(z.any()),
});

// Type exports
export type Company = z.infer<typeof CompanySchema>;
export type CompanyCulture = z.infer<typeof CompanyCultureSchema>;
export type CompanyNews = z.infer<typeof CompanyNewsSchema>;
export type CompanyFinancials = z.infer<typeof CompanyFinancialsSchema>;
export type FundingRound = z.infer<typeof FundingRoundSchema>;
export type CompanyLeadership = z.infer<typeof CompanyLeadershipSchema>;
export type CompanyBenefits = z.infer<typeof CompanyBenefitsSchema>;
export type InterviewInsights = z.infer<typeof InterviewInsightsSchema>;
export type InterviewFeedback = z.infer<typeof InterviewFeedbackSchema>;
export type CompanyResearch = z.infer<typeof CompanyResearchSchema>;
export type CompanySnapshot = z.infer<typeof CompanySnapshotSchema>;
export type CompanyBenefitsData = z.infer<typeof CompanyBenefitsDataSchema>;
export type CompanyStats = z.infer<typeof CompanyStatsSchema>;
export type CompanySearchRequest = z.infer<typeof CompanySearchRequestSchema>;
export type CompanySearchResponse = z.infer<typeof CompanyListResponseSchema>;
export type CompanyBenefitsRequest = z.infer<
  typeof CompanyBenefitsRequestSchema
>;
export type CompanyBenefitsResponse = z.infer<
  typeof CompanyBenefitsResponseSchema
>;
export type CompanyCompareRequest = z.infer<typeof CompanyCompareRequestSchema>;
export type CompanyCompareResponse = z.infer<
  typeof CompanyCompareResponseSchema
>;
export type CompanyStatsHighlightsResponse = z.infer<
  typeof CompanyStatsHighlightsResponseSchema
>;
export type CompanyStatsValuationsResponse = z.infer<
  typeof CompanyStatsValuationsResponseSchema
>;
export type CreateCompanyRequest = z.infer<typeof CreateCompanyRequestSchema>;
export type UpdateCompanyRequest = z.infer<typeof UpdateCompanyRequestSchema>;
export type CompanyResponse = z.infer<typeof CompanyResponseSchema>;
export type CompanyListResponse = z.infer<typeof CompanyListResponseSchema>;
