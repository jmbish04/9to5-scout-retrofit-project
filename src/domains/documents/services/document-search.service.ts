import type { Env } from "../../../lib/env";
import { computeEmbedding } from "../../../lib/vectorize";
import type {
  DocumentSearchResponse,
  VectorSearchRequest,
  DocumentSearchMatch,
} from "../types/documents.types";

export async function searchApplicantDocuments(
  env: Env,
  params: VectorSearchRequest
): Promise<DocumentSearchResponse> {
  const queryEmbedding = await computeEmbedding(env, params.q);
  if (!queryEmbedding) {
    return { query: params.q, matches: [] };
  }

  const filter: Record<string, unknown> = { user_id: params.user_id };
  if (params.job_id) {
    filter.job_id = params.job_id;
  }

  const result = await env.VECTORIZE_INDEX.query(queryEmbedding.embedding, {
    topK: params.top_k || 10,
    returnMetadata: true,
    filter,
  });

  const matches: DocumentSearchMatch[] = (result.matches || []).map(
    (match: any) => ({
      id: match.id,
      score: match.score,
      metadata: match.metadata || {},
    })
  );

  return { query: params.q, matches };
}
