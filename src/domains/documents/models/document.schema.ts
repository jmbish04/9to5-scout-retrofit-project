/**
 * Document domain Zod schemas for validation
 *
 * This module defines Zod schemas for validating document-related data structures,
 * ensuring type safety and data integrity across the documents domain.
 */

import { z } from "zod";

// Base enums
export const DocumentTypeSchema = z.enum(["resume", "cover_letter"]);
export const DocumentPurposeSchema = z
  .enum(["job_related", "example", "reference"])
  .nullable();

// Resume sections schema
export const ResumeSectionsSchema = z.object({
  summary: z.string().nullable().optional(),
  contact: z.string().nullable().optional(),
  skills: z.string().nullable().optional(),
  experience: z.string().nullable().optional(),
  education: z.string().nullable().optional(),
  projects: z.string().nullable().optional(),
  certifications: z.string().nullable().optional(),
  extras: z.string().nullable().optional(),
});

// Base applicant document schema
export const ApplicantDocumentSchema = z.object({
  id: z.number().int().positive(),
  user_id: z.string().min(1),
  job_id: z.string().nullable().optional(),
  doc_type: DocumentTypeSchema,
  purpose: DocumentPurposeSchema.optional(),
  title: z.string().nullable().optional(),
  r2_key_md: z.string().nullable().optional(),
  r2_url_md: z.string().url().nullable().optional(),
  r2_key_pdf: z.string().nullable().optional(),
  r2_url_pdf: z.string().url().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Extended document schema with sections
export const ApplicantDocumentWithSectionsSchema =
  ApplicantDocumentSchema.extend({
    resume_sections: ResumeSectionsSchema.nullable().optional(),
    editor_json_url: z.string().url().nullable().optional(),
  });

// Document creation input schema
export const DocumentCreateInputSchema = z.object({
  user_id: z.string().min(1),
  doc_type: DocumentTypeSchema,
  purpose: DocumentPurposeSchema.optional(),
  job_id: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  content_md: z.string().nullable().optional(),
  editor_json: z.unknown().optional(),
  sections: ResumeSectionsSchema.nullable().optional(),
});

// Document update input schema
export const DocumentUpdateInputSchema = z.object({
  title: z.string().nullable().optional(),
  content_md: z.string().nullable().optional(),
  editor_json: z.unknown().optional(),
  sections: ResumeSectionsSchema.nullable().optional(),
  purpose: DocumentPurposeSchema.optional(),
  job_id: z.string().nullable().optional(),
});

// Document patch schema
export const DocumentPatchSchema = z.object({
  op: z.enum(["replace", "add", "remove"]),
  path: z.string().min(1),
  value: z.unknown().optional(),
});

// Vector search request schema
export const VectorSearchRequestSchema = z.object({
  query: z.string().min(1),
  doc_type: DocumentTypeSchema.optional(),
  user_id: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).default(10),
  threshold: z.number().min(0).max(1).default(0.7),
});

// Document generation input schema
export const DocumentGenerationInputSchema = z.object({
  user_id: z.string().min(1),
  doc_type: DocumentTypeSchema,
  job_id: z.string().nullable().optional(),
  purpose: DocumentPurposeSchema.optional(),
  title: z.string().nullable().optional(),
  prompt: z.string().nullable().optional(),
  sections: ResumeSectionsSchema.nullable().optional(),
});

// Document evaluation result schema
export const DocumentEvaluationResultSchema = z.object({
  document_id: z.number().int().positive(),
  job_id: z.string().min(1),
  overall_score: z.number().min(0).max(100),
  section_scores: z.object({
    summary: z.number().min(0).max(100).optional(),
    skills: z.number().min(0).max(100).optional(),
    experience: z.number().min(0).max(100).optional(),
    education: z.number().min(0).max(100).optional(),
    projects: z.number().min(0).max(100).optional(),
  }),
  feedback: z.string(),
  suggestions: z.array(z.string()),
  created_at: z.string().datetime(),
});

// Document search result schema
export const DocumentSearchResultSchema = z.object({
  document: ApplicantDocumentWithSectionsSchema,
  score: z.number().min(0).max(1),
  highlights: z.array(z.string()).optional(),
});

// Document stats schema
export const DocumentStatsSchema = z.object({
  total_documents: z.number().int().min(0),
  documents_by_type: z.record(DocumentTypeSchema, z.number().int().min(0)),
  documents_by_purpose: z.record(z.string(), z.number().int().min(0)),
  recent_activity: z.object({
    created_last_7_days: z.number().int().min(0),
    updated_last_7_days: z.number().int().min(0),
  }),
  storage_usage: z.object({
    total_size_mb: z.number().min(0),
    markdown_size_mb: z.number().min(0),
    pdf_size_mb: z.number().min(0),
  }),
});

// Document processing status schema
export const DocumentProcessingStatusSchema = z.object({
  document_id: z.number().int().positive(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  progress: z.number().min(0).max(100),
  current_step: z.string().optional(),
  error_message: z.string().optional(),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
});

// Document template schema
export const DocumentTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  doc_type: DocumentTypeSchema,
  description: z.string().optional(),
  template_content: z.string(),
  sections: ResumeSectionsSchema,
  is_public: z.boolean(),
  created_by: z.string().min(1),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Document export options schema
export const DocumentExportOptionsSchema = z.object({
  format: z.enum(["pdf", "docx", "html", "markdown"]),
  include_sections: z.array(z.string()).optional(),
  exclude_sections: z.array(z.string()).optional(),
  styling: z
    .enum(["professional", "creative", "minimal"])
    .default("professional"),
  watermark: z.string().optional(),
});

// Document collaboration schema
export const DocumentCollaborationSchema = z.object({
  document_id: z.number().int().positive(),
  user_id: z.string().min(1),
  role: z.enum(["owner", "editor", "viewer"]),
  permissions: z.object({
    can_edit: z.boolean(),
    can_delete: z.boolean(),
    can_share: z.boolean(),
    can_export: z.boolean(),
  }),
  shared_at: z.string().datetime(),
  expires_at: z.string().datetime().optional(),
});

// Request/Response schemas for API endpoints
export const CreateDocumentRequestSchema = DocumentCreateInputSchema;
export const UpdateDocumentRequestSchema = DocumentUpdateInputSchema;
export const DocumentSearchRequestSchema = VectorSearchRequestSchema;
export const DocumentGenerationRequestSchema = DocumentGenerationInputSchema;
export const DocumentExportRequestSchema = DocumentExportOptionsSchema;

// Response schemas
export const DocumentResponseSchema = ApplicantDocumentWithSectionsSchema;
export const DocumentListResponseSchema = z.object({
  documents: z.array(ApplicantDocumentWithSectionsSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
});

export const DocumentSearchResponseSchema = z.object({
  results: z.array(DocumentSearchResultSchema),
  total: z.number().int().min(0),
  query: z.string(),
  took_ms: z.number().min(0),
});

export const DocumentStatsResponseSchema = DocumentStatsSchema;

// Type exports for use in other modules
export type DocumentType = z.infer<typeof DocumentTypeSchema>;
export type DocumentPurpose = z.infer<typeof DocumentPurposeSchema>;
export type ResumeSections = z.infer<typeof ResumeSectionsSchema>;
export type ApplicantDocument = z.infer<typeof ApplicantDocumentSchema>;
export type ApplicantDocumentWithSections = z.infer<
  typeof ApplicantDocumentWithSectionsSchema
>;
export type DocumentCreateInput = z.infer<typeof DocumentCreateInputSchema>;
export type DocumentUpdateInput = z.infer<typeof DocumentUpdateInputSchema>;
export type DocumentPatch = z.infer<typeof DocumentPatchSchema>;
export type VectorSearchRequest = z.infer<typeof VectorSearchRequestSchema>;
export type DocumentGenerationInput = z.infer<
  typeof DocumentGenerationInputSchema
>;
export type DocumentEvaluationResult = z.infer<
  typeof DocumentEvaluationResultSchema
>;
export type DocumentSearchResult = z.infer<typeof DocumentSearchResultSchema>;
export type DocumentStats = z.infer<typeof DocumentStatsSchema>;
export type DocumentProcessingStatus = z.infer<
  typeof DocumentProcessingStatusSchema
>;
export type DocumentTemplate = z.infer<typeof DocumentTemplateSchema>;
export type DocumentExportOptions = z.infer<typeof DocumentExportOptionsSchema>;
export type DocumentCollaboration = z.infer<typeof DocumentCollaborationSchema>;
export type CreateDocumentRequest = z.infer<typeof CreateDocumentRequestSchema>;
export type UpdateDocumentRequest = z.infer<typeof UpdateDocumentRequestSchema>;
export type DocumentSearchRequest = z.infer<typeof DocumentSearchRequestSchema>;
export type DocumentGenerationRequest = z.infer<
  typeof DocumentGenerationRequestSchema
>;
export type DocumentExportRequest = z.infer<typeof DocumentExportRequestSchema>;
export type DocumentResponse = z.infer<typeof DocumentResponseSchema>;
export type DocumentListResponse = z.infer<typeof DocumentListResponseSchema>;
export type DocumentSearchResponse = z.infer<
  typeof DocumentSearchResponseSchema
>;
export type DocumentStatsResponse = z.infer<typeof DocumentStatsResponseSchema>;
