export type DocumentType = "resume" | "cover_letter";
export type DocumentPurpose = "job_related" | "example" | "reference" | null;

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

export interface ApplicantDocumentWithSections extends ApplicantDocument {
  resume_sections?: ResumeSections | null;
  editor_json_url?: string | null;
}

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

export interface DocumentUpdateInput {
  title?: string | null;
  content_md?: string | null;
  editor_json?: unknown;
  sections?: ResumeSections | null;
}

export interface VectorSearchRequest {
  q: string;
  user_id: string;
  job_id?: string | null;
  top_k?: number;
}

export interface DocumentSearchMatch {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface DocumentSearchResponse {
  query: string;
  matches: DocumentSearchMatch[];
}

export interface PatchRangePosition {
  line: number;
  col: number;
}

export interface PatchRange {
  start: PatchRangePosition;
  end: PatchRangePosition;
}

export interface DocumentPatch {
  target: string;
  range: PatchRange;
  type: "replace" | "delete" | "insert";
  suggestion: string;
}

export interface ApplyPatchResult {
  updated: ApplicantDocumentWithSections;
  diffSummary: string[];
  reindexed: boolean;
}

export interface AtsEvaluationDimensionScores {
  keywords: number;
  action_verbs: number;
  impact_metrics: number;
  brevity: number;
  structure: number;
  seniority_alignment: number;
}

export interface AtsRecommendationPath {
  easiest: string;
  moderate: string;
  advanced: string;
}

export interface AtsRecommendation {
  target: string;
  range: PatchRange;
  type: "replace" | "delete" | "insert";
  message: string;
  suggestion: string;
  severity: "low" | "medium" | "high";
  paths: AtsRecommendationPath;
}

export interface AtsEvaluation {
  overall_score: number;
  dimensions: AtsEvaluationDimensionScores;
  recommendations: AtsRecommendation[];
  summary: string;
}

export interface DocumentGenerationInput {
  user_id: string;
  job_id: string;
  doc_type: DocumentType;
}
