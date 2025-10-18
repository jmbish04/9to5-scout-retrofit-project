/**
 * Document domain types and interfaces
 *
 * This module defines all TypeScript types and interfaces for the documents domain,
 * including document types, purposes, sections, and related data structures.
 */

export type DocumentType =
  | "resume"
  | "cover_letter"
  | "email"
  | "email_attachment";
export type DocumentPurpose = "job_related" | "example" | "reference" | null;

/**
 * Resume sections structure for organizing resume content
 */
export interface ResumeSections {
  summary?: string | null;
  contact?: string | null;
  skills?: string | null;
  experience?: string | null;
  education?: string | null;
  projects?: string | null;
  certifications?: string | null;
  extras?: string | null;
}

/**
 * Base applicant document interface
 */
export interface ApplicantDocument {
  id: number;
  user_id: string;
  job_id?: string | null;
  doc_type: DocumentType;
  purpose?: DocumentPurpose;
  title?: string | null;
  r2_key_md?: string | null;
  r2_url_md?: string | null;
  r2_key_pdf?: string | null;
  r2_url_pdf?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Extended applicant document with additional sections and editor data
 */
export interface ApplicantDocumentWithSections extends ApplicantDocument {
  resume_sections?: ResumeSections | null;
  editor_json_url?: string | null;
}

/**
 * Input for creating a new document
 */
export interface DocumentCreateInput {
  user_id: string;
  doc_type: DocumentType;
  purpose?: DocumentPurpose;
  job_id?: string | null;
  title?: string | null;
  content_md?: string | null;
  editor_json?: unknown;
  sections?: ResumeSections | null;
}

/**
 * Input for updating an existing document
 */
export interface DocumentUpdateInput {
  title?: string | null;
  content_md?: string | null;
  editor_json?: unknown;
  sections?: ResumeSections | null;
  purpose?: DocumentPurpose;
  job_id?: string | null;
}

/**
 * Document patch for applying incremental updates
 */
export interface DocumentPatch {
  op: "replace" | "add" | "remove";
  path: string;
  value?: unknown;
}

/**
 * Vector search request parameters
 */
export interface VectorSearchRequest {
  query: string;
  doc_type?: DocumentType;
  user_id?: string;
  limit?: number;
  threshold?: number;
}

/**
 * Document generation input for AI-powered document creation
 */
export interface DocumentGenerationInput {
  user_id: string;
  doc_type: DocumentType;
  job_id?: string | null;
  purpose?: DocumentPurpose;
  title?: string | null;
  prompt?: string | null;
  sections?: ResumeSections | null;
}

/**
 * Document evaluation result against a job posting
 */
export interface DocumentEvaluationResult {
  document_id: number;
  job_id: string;
  overall_score: number;
  section_scores: {
    summary?: number;
    skills?: number;
    experience?: number;
    education?: number;
    projects?: number;
  };
  feedback: string;
  suggestions: string[];
  created_at: string;
}

/**
 * Document search result with relevance score
 */
export interface DocumentSearchResult {
  document: ApplicantDocumentWithSections;
  score: number;
  highlights?: string[];
}

/**
 * Document statistics and metrics
 */
export interface DocumentStats {
  total_documents: number;
  documents_by_type: Record<DocumentType, number>;
  documents_by_purpose: Record<string, number>;
  recent_activity: {
    created_last_7_days: number;
    updated_last_7_days: number;
  };
  storage_usage: {
    total_size_mb: number;
    markdown_size_mb: number;
    pdf_size_mb: number;
  };
}

/**
 * Document processing status
 */
export interface DocumentProcessingStatus {
  document_id: number;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number; // 0-100
  current_step?: string;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
}

/**
 * Document template structure
 */
export interface DocumentTemplate {
  id: string;
  name: string;
  doc_type: DocumentType;
  description?: string;
  template_content: string;
  sections: ResumeSections;
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Document export options
 */
export interface DocumentExportOptions {
  format: "pdf" | "docx" | "html" | "markdown";
  include_sections?: string[];
  exclude_sections?: string[];
  styling?: "professional" | "creative" | "minimal";
  watermark?: string;
}

/**
 * Document collaboration data
 */
export interface DocumentCollaboration {
  document_id: number;
  user_id: string;
  role: "owner" | "editor" | "viewer";
  permissions: {
    can_edit: boolean;
    can_delete: boolean;
    can_share: boolean;
    can_export: boolean;
  };
  shared_at: string;
  expires_at?: string;
}
