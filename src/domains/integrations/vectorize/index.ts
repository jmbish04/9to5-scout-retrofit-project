/**
 * @file src/domains/integrations/vectorize/index.ts
 * @description Vectorize integration exports
 */

export { VectorizeService } from "./vectorize.service";
export type {
  EmbeddingComputation,
  VectorMetadata,
  VectorSearchOptions,
  VectorSearchResult,
} from "./vectorize.types";

// Re-export utility functions
export {
  computeEmbedding,
  searchSimilar,
  shouldReindex,
  stripMarkdown,
  upsertVector,
} from "./vectorize.service";

export { default as vectorizeRoutes } from "./vectorize.routes";

