import type { Env } from "../../../config/env";
import { computeSHA256 } from "../../../shared/utils/hash";
import type {
  EmbeddingComputation,
  VectorMetadata,
  VectorSearchResult,
} from "./vectorize.types";

const DEFAULT_EMBEDDING_MODEL = "@cf/baai/bge-large-en-v1.5";

export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[#>*_\-]+/g, " ")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export async function computeEmbedding(
  env: Env,
  text: string
): Promise<EmbeddingComputation | null> {
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
  vectorId: string,
  embedding: number[],
  metadata: VectorMetadata
): Promise<void> {
  await env.VECTORIZE_INDEX.upsert([
    {
      id: vectorId,
      values: embedding,
      metadata,
    },
  ]);
}

export async function shouldReindex(
  env: Env,
  vectorId: string,
  newHash: string
): Promise<boolean> {
  try {
    const existing = await env.VECTORIZE_INDEX.getByIds([vectorId]);
    if (!existing || existing.length === 0) {
      return true; // No existing vector, should index
    }

    const existingMetadata = existing[0].metadata as VectorMetadata;
    return existingMetadata.content_sha256 !== newHash;
  } catch (error) {
    console.error("Error checking if should reindex:", error);
    return true; // On error, assume we should reindex
  }
}

export async function searchSimilar(
  env: Env,
  query: string,
  limit: number = 10,
  filter?: Partial<VectorMetadata>
): Promise<VectorSearchResult[]> {
  const embedding = await computeEmbedding(env, query);
  if (!embedding) {
    return [];
  }

  const searchResult = await env.VECTORIZE_INDEX.query(embedding.embedding, {
    topK: limit,
    filter,
  });

  return searchResult.matches.map((match: any) => ({
    id: match.id,
    score: match.score,
    metadata: match.metadata as VectorMetadata,
  }));
}

/**
 * @class VectorizeService
 * @description Service class for Vectorize operations
 */
export class VectorizeService {
  /**
   * @method computeEmbedding
   * @description Compute embedding for text
   */
  async computeEmbedding(
    env: Env,
    text: string
  ): Promise<EmbeddingComputation | null> {
    return computeEmbedding(env, text);
  }

  /**
   * @method upsertVector
   * @description Store or update a vector
   */
  async upsertVector(
    env: Env,
    vectorId: string,
    embedding: number[],
    metadata: VectorMetadata
  ): Promise<void> {
    return upsertVector(env, vectorId, embedding, metadata);
  }

  /**
   * @method shouldReindex
   * @description Check if vector should be reindexed
   */
  async shouldReindex(
    env: Env,
    vectorId: string,
    newHash: string
  ): Promise<boolean> {
    return shouldReindex(env, vectorId, newHash);
  }

  /**
   * @method searchSimilar
   * @description Search for similar vectors
   */
  async searchSimilar(
    env: Env,
    query: string,
    limit: number = 10,
    filter?: Partial<VectorMetadata>
  ): Promise<VectorSearchResult[]> {
    return searchSimilar(env, query, limit, filter);
  }
}
