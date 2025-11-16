/**
 * Jobs domain exports
 * Centralized exports for all job-related functionality
 */

// Models - explicit exports to avoid conflicts
export {
  JobExtractionResultSchema,
  JobHistoryEntrySchema,
  JobHistorySubmissionSchema,
  JobProcessingResultSchema,
  JobRatingSchema,
  JobSchema,
  JobSearchParamsSchema,
} from "./models/job.schema";

// Types from schema with aliases to avoid conflicts
export type {
  Job as SchemaJob,
  JobExtractionResult as SchemaJobExtractionResult,
  JobHistoryEntry as SchemaJobHistoryEntry,
  JobHistorySubmission as SchemaJobHistorySubmission,
  JobProcessingResult as SchemaJobProcessingResult,
  JobRating as SchemaJobRating,
  JobSearchParams as SchemaJobSearchParams,
} from "./models/job.schema";

// Types from interfaces
export type {
  Job as InterfaceJob,
  JobExtractionResult as InterfaceJobExtractionResult,
  JobHistoryEntry as InterfaceJobHistoryEntry,
  JobHistorySubmission as InterfaceJobHistorySubmission,
  JobProcessingResult as InterfaceJobProcessingResult,
  JobRating as InterfaceJobRating,
  JobSearchParams as InterfaceJobSearchParams,
  JobSearchResult,
} from "./models/job.types";

// Services
export * from "./services/job-extraction.service";
export * from "./services/job-ingestion.service";
export * from "./services/job-monitoring.service";
export * from "./services/job-processing.service";
export * from "./services/job-storage.service";

// Routes
export { handleJobHistoryPost as jobHistoryRoutes } from "./routes/job-history.routes";
export { default as jobProcessingRoutes } from "./routes/job-processing.routes";
export { default as jobsRoutes } from "./routes/jobs.routes";
