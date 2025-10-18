/**
 * Companies Domain
 *
 * Exports all company-related types, schemas, services, and routes.
 * This domain handles company management, research, and intelligence gathering.
 */

// Export types
export * from "./types/company.types";

// Export schemas
export {
  CompanyBenefitsDataSchema,
  CompanyBenefitsRequestSchema,
  CompanyBenefitsResponseSchema,
  CompanyBenefitsSchema,
  CompanyCompareRequestSchema,
  CompanyCompareResponseSchema,
  CompanyCultureSchema,
  CompanyFinancialsSchema,
  CompanyLeadershipSchema,
  CompanyListResponseSchema,
  CompanyNewsSchema,
  CompanyResearchSchema,
  CompanyResponseSchema,
  CompanySchema,
  CompanySearchRequestSchema,
  CompanySnapshotSchema,
  CompanyStatsHighlightsResponseSchema,
  CompanyStatsSchema,
  CompanyStatsValuationsResponseSchema,
  CreateCompanyRequestSchema,
  FundingRoundSchema,
  InterviewFeedbackSchema,
  InterviewInsightsSchema,
  UpdateCompanyRequestSchema,
  type Company,
  type CompanyBenefits,
  type CompanyBenefitsData,
  type CompanyBenefitsRequest,
  type CompanyBenefitsResponse,
  type CompanyCompareRequest,
  type CompanyCompareResponse,
  type CompanyCulture,
  type CompanyFinancials,
  type CompanyLeadership,
  type CompanyListResponse,
  type CompanyNews,
  type CompanyResearch,
  type CompanyResponse,
  type CompanySearchRequest,
  type CompanySearchResponse,
  type CompanySnapshot,
  type CompanyStats,
  type CompanyStatsHighlightsResponse,
  type CompanyStatsValuationsResponse,
  type CreateCompanyRequest,
  type FundingRound,
  type InterviewFeedback,
  type InterviewInsights,
  type UpdateCompanyRequest,
} from "./models/company.schema";

// Export services
export {
  CompanyStorageService,
  createCompanyStorageService,
} from "./services/company-storage.service";

export {
  CompanyIntelligenceService,
  createCompanyIntelligenceService,
} from "./services/company-intelligence.service";

// Export routes
export { default as companyRoutes } from "./routes/company.routes";
