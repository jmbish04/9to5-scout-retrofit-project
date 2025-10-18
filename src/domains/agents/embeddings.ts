/**
 * Embeddings Manager
 *
 * Handles vector embeddings for RAG (Retrieval-Augmented Generation) operations.
 * Provides functionality for generating, storing, and querying embeddings.
 *
 * @fileoverview This module manages embeddings for various content types
 * including job postings, resumes, cover letters, and general content.
 */

export interface EmbeddingsManager {
  generateEmbedding(text: string): Promise<number[]>;
  storeEmbedding(
    id: string,
    text: string,
    metadata?: Record<string, any>
  ): Promise<void>;
  querySimilar(content: string, limit?: number): Promise<RAGResult[]>;
}

export interface RAGQuery {
  query: string;
  limit?: number;
  threshold?: number;
  filters?: Record<string, any>;
}

export interface RAGResult {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, any>;
}

export class EmbeddingsManagerImpl implements EmbeddingsManager {
  constructor(
    private ai: Ai,
    private vectorizeIndex: Vectorize,
    private embeddingModel: string
  ) {}

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.ai.run(this.embeddingModel as any, {
      text: text,
    });

    if (response && "data" in response && Array.isArray(response.data)) {
      return response.data[0] || [];
    }

    throw new Error("Failed to generate embedding");
  }

  async storeEmbedding(
    id: string,
    text: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const embedding = await this.generateEmbedding(text);

    await this.vectorizeIndex.insert([
      {
        id: id,
        values: embedding,
        metadata: {
          content: text,
          ...metadata,
        },
      },
    ]);
  }

  async querySimilar(
    content: string,
    limit: number = 10
  ): Promise<RAGResult[]> {
    const queryEmbedding = await this.generateEmbedding(content);

    const results = await this.vectorizeIndex.query(queryEmbedding, {
      topK: limit,
    });

    return results.matches.map((match: any) => ({
      id: match.id,
      content: match.metadata?.content || "",
      score: match.score,
      metadata: match.metadata,
    }));
  }
}

export function createEmbeddingsManager(
  ai: Ai,
  vectorizeIndex: Vectorize,
  embeddingModel: string
): EmbeddingsManager {
  return new EmbeddingsManagerImpl(ai, vectorizeIndex, embeddingModel);
}
