import type { Env } from "../../../config/env";
import { computeEmbedding } from "../../integrations/vectorize";
import type {
  DocumentSearchMatch,
  DocumentSearchResponse,
  VectorSearchRequest,
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
