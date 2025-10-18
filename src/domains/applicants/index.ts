/**
 * Applicants Domain Index
 *
 * Barrel file for exporting all applicant domain components.
 */

// Types
export * from "./types/applicant.types";

// Schemas
export {
  ApplicantMatchSchema,
  ApplicantProfileSchema,
  ApplicantSearchRequestSchema,
  ApplicantSearchResponseSchema,
  ApplicantStatsSchema,
  CreateApplicantRequestSchema,
  JobHistoryEntrySchema,
  JobHistorySubmissionSchema,
  JobRatingSchema,
  JobRecommendationSchema,
  MatchingCriteriaSchema,
  MatchingResultSchema,
  UpdateApplicantRequestSchema,
  type ApplicantMatch,
  type ApplicantProfile,
  type ApplicantSearchRequest,
  type ApplicantSearchResponse,
  type ApplicantStats,
  type CreateApplicantRequest,
  type JobHistoryEntry,
  type JobHistorySubmission,
  type JobRating,
  type JobRecommendation,
  type MatchingCriteria,
  type MatchingResult,
  type UpdateApplicantRequest,
} from "./models/applicant.schema";

// Services
export {
  ApplicantMatchingService,
  ApplicantStorageService,
  createApplicantMatchingService,
  createApplicantStorageService,
} from "./services";

// Routes
export { default as applicantRoutes } from "./routes/applicant.routes";
