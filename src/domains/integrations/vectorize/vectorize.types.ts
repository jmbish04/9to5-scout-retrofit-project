/**
 * @file src/domains/integrations/vectorize/vectorize.types.ts
 * @description Type definitions for Vectorize integration
 */

export interface VectorMetadata {
  document_id: number;
  doc_type: "resume" | "cover_letter" | "job_opening" | "content";
  user_id: string;
  job_id?: string | null;
  content_sha256: string;
  section: string;
  title?: string;
  company?: string;
  content_type?: string;
}

export interface EmbeddingComputation {
  cleanText: string;
  embedding: number[];
  hash: string;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: VectorMetadata;
}

export interface VectorSearchOptions {
  topK?: number;
  filter?: Partial<VectorMetadata>;
  returnValues?: boolean;
  returnMetadata?: boolean;
}

