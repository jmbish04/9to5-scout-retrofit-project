import type { Env } from './env';
import { computeSHA256 } from './hash';

export interface VectorMetadata {
  document_id: number;
  doc_type: 'resume' | 'cover_letter';
  user_id: string;
  job_id?: string | null;
  content_sha256: string;
  section: string;
}

export interface EmbeddingComputation {
  cleanText: string;
  embedding: number[];
  hash: string;
}

const DEFAULT_EMBEDDING_MODEL = '@cf/baai/bge-large-en-v1.5';

export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[#>*_\-]+/g, ' ')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function computeEmbedding(env: Env, text: string): Promise<EmbeddingComputation | null> {
  const cleanText = stripMarkdown(text);
  if (!cleanText) {
    return null;
  }

  const model = env.EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
  const response = await env.AI.run(model, { text: cleanText });
  const embedding: number[] | undefined = response?.data?.[0]?.embedding;

  if (!embedding || embedding.length === 0) {
    return null;
  }

  const hash = await computeSHA256(cleanText);
  return { cleanText, embedding, hash };
}

export async function upsertVector(
  env: Env,
  id: string,
  values: number[],
  metadata: VectorMetadata,
): Promise<void> {
  await env.VECTORIZE_INDEX.upsert([
    {
      id,
      values,
      metadata,
    },
  ]);
}

export interface VectorSearchParams {
  env: Env;
  embedding: number[];
  topK?: number;
  filter?: Record<string, unknown>;
}

export async function searchVectors({ env, embedding, topK = 10, filter }: VectorSearchParams) {
  return env.VECTORIZE_INDEX.query(embedding, {
    topK,
    returnMetadata: true,
    filter,
  });
}

export function shouldReindex(existingHash: string | null, nextHash: string): boolean {
  if (!existingHash) {
    return true;
  }
  return existingHash !== nextHash;
}
