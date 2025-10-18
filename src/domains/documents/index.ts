/**
 * Documents Domain Index
 *
 * Barrel file for exporting all document domain components
 */

// Export types
export * from "./types/document.types";

// Export schemas
export {
  ApplicantDocumentSchema,
  ApplicantDocumentWithSectionsSchema,
  CreateDocumentRequestSchema,
  DocumentCollaborationSchema,
  DocumentCreateInputSchema,
  DocumentEvaluationResultSchema,
  DocumentExportOptionsSchema,
  DocumentExportRequestSchema,
  DocumentGenerationInputSchema,
  DocumentGenerationRequestSchema,
  DocumentListResponseSchema,
  DocumentPatchSchema,
  DocumentProcessingStatusSchema,
  DocumentPurposeSchema,
  DocumentResponseSchema,
  DocumentSearchRequestSchema,
  DocumentSearchResponseSchema,
  DocumentSearchResultSchema,
  DocumentStatsResponseSchema,
  DocumentStatsSchema,
  DocumentTemplateSchema,
  DocumentTypeSchema,
  DocumentUpdateInputSchema,
  ResumeSectionsSchema,
  UpdateDocumentRequestSchema,
  VectorSearchRequestSchema,
  type ApplicantDocument,
  type ApplicantDocumentWithSections,
  type CreateDocumentRequest,
  type DocumentCollaboration,
  type DocumentCreateInput,
  type DocumentEvaluationResult,
  type DocumentExportOptions,
  type DocumentExportRequest,
  type DocumentGenerationInput,
  type DocumentGenerationRequest,
  type DocumentListResponse,
  type DocumentPatch,
  type DocumentProcessingStatus,
  type DocumentPurpose,
  type DocumentResponse,
  type DocumentSearchRequest,
  type DocumentSearchResponse,
  type DocumentSearchResult,
  type DocumentStats,
  type DocumentStatsResponse,
  type DocumentTemplate,
  // Type exports
  type DocumentType,
  type DocumentUpdateInput,
  type ResumeSections,
  type UpdateDocumentRequest,
  type VectorSearchRequest,
} from "./models/document.schema";

// Export services
export {
  DocumentGenerationService,
  DocumentProcessingService,
  DocumentSearchService,
  DocumentStorageService,
  createDocumentGenerationService,
  createDocumentProcessingService,
  createDocumentSearchService,
  createDocumentStorageService,
  type ApplyPatchResult,
} from "./services";

// Export routes
export { default as documentsRoutes } from "./routes/documents.routes";
