/**
 * Company Types
 *
 * TypeScript interfaces and types for company management,
 * including company profiles, benefits, and intelligence gathering.
 */

export interface Company {
  id: string;
  name: string;
  normalized_domain?: string;
  website_url?: string;
  careers_url?: string;
  description?: string;
  industry?: string;
  size?: string;
  location?: string;
  founded?: string;
  mission?: string;
  company_values?: string[];
  culture?: CompanyCulture;
  recent_news?: CompanyNews[];
  financials?: CompanyFinancials;
  leadership?: CompanyLeadership[];
  benefits?: CompanyBenefits[];
  interview_insights?: InterviewInsights;
  last_updated: string;
  research_count: number;
  created_at: string;
  updated_at: string;
}

export interface CompanyCulture {
  work_environment?: string;
  values?: string[];
  perks?: string[];
  remote_policy?: string;
  diversity_initiatives?: string[];
  employee_testimonials?: string[];
}

export interface CompanyNews {
  title: string;
  url: string;
  published_at: string;
  source: string;
  summary?: string;
  sentiment?: "positive" | "neutral" | "negative";
}

export interface CompanyFinancials {
  revenue?: string;
  funding_rounds?: FundingRound[];
  valuation?: string;
  employees?: number;
  growth_rate?: string;
  profitability?: string;
}

export interface FundingRound {
  round: string;
  amount: string;
  date: string;
  investors?: string[];
}

export interface CompanyLeadership {
  name: string;
  title: string;
  bio?: string;
  linkedin_url?: string;
  photo_url?: string;
  tenure?: string;
}

export interface CompanyBenefits {
  category: string;
  name: string;
  description?: string;
  value?: string;
  eligibility?: string;
  coverage?: string;
}

export interface InterviewInsights {
  common_questions?: string[];
  interview_process?: string;
  difficulty_level?: "easy" | "medium" | "hard";
  preparation_tips?: string[];
  company_specific_advice?: string;
  recent_feedback?: InterviewFeedback[];
}

export interface InterviewFeedback {
  role: string;
  experience: string;
  rating: number;
  feedback: string;
  date: string;
  source: string;
}

export interface CompanyResearch {
  id: string;
  company_name: string;
  domain?: string;
  industry?: string;
  status:
    | "queued"
    | "processing"
    | "gathering_info"
    | "analyzing_culture"
    | "gathering_news"
    | "researching_leadership"
    | "analyzing_benefits"
    | "completed"
    | "failed";
  created_at: string;
  updated_at: string;
}

export interface CompanySnapshot {
  id: string;
  company_id: string;
  source: string;
  source_url: string;
  snapshot_text: string;
  parsed?: CompanyBenefitsData;
  extracted_at: string;
}

export interface CompanyBenefitsData {
  benefits: CompanyBenefits[];
  highlights: string[];
  total_comp_heuristics: any;
  coverage: any;
}

export interface CompanyStats {
  company_id: string;
  highlights: string[];
  total_comp_heuristics: any;
  coverage: any;
  computed_at: string;
}

export interface CompanySearchRequest {
  query?: string;
  industry?: string;
  size?: string;
  location?: string;
  limit?: number;
  offset?: number;
}

export interface CompanySearchResponse {
  companies: Company[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface CompanyBenefitsRequest {
  company_id: string;
  limit?: number;
}

export interface CompanyBenefitsResponse {
  snapshots: CompanySnapshot[];
  stats: CompanyStats | null;
}

export interface CompanyCompareRequest {
  company_ids: string[];
}

export interface CompanyCompareResponse {
  companies: {
    company_id: string;
    snapshots: CompanySnapshot[];
    stats: CompanyStats | null;
  }[];
}

export interface CompanyStatsHighlightsResponse {
  highlights: string[];
}

export interface CompanyStatsValuationsResponse {
  valuations: any[];
}

export interface CreateCompanyRequest {
  name: string;
  normalized_domain?: string;
  website_url?: string;
  careers_url?: string;
  description?: string;
  industry?: string;
  size?: string;
  location?: string;
  founded?: string;
  mission?: string;
  company_values?: string[];
}

export interface UpdateCompanyRequest {
  name?: string;
  normalized_domain?: string;
  website_url?: string;
  careers_url?: string;
  description?: string;
  industry?: string;
  size?: string;
  location?: string;
  founded?: string;
  mission?: string;
  company_values?: string[];
  culture?: CompanyCulture;
  recent_news?: CompanyNews[];
  financials?: CompanyFinancials;
  leadership?: CompanyLeadership[];
  benefits?: CompanyBenefits[];
  interview_insights?: InterviewInsights;
}

export interface CompanyResponse {
  company: Company;
}

export interface CompanyListResponse {
  companies: Company[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}
