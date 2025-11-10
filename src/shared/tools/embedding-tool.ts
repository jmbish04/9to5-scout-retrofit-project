/**
 * @file src/shared/tools/embedding-tool.ts
 * @description Embedding tool for text embedding generation and search result reranking
 */

import type { Env } from "../../config/env";
import type { EmbeddingResponse } from "./types";
import { EmbedModel, RerankerModel } from "./types";

// Note: RAG functionality has been moved to src/shared/tools/rag-tool.ts

/**
 * @class EmbeddingTool
 * @description Provides a high-level API for interacting with Cloudflare's
 * embedding and reranking AI models.
 *
 * @example
 * // In a Worker:
 * const embedTool = new EmbeddingTool(env);
 * const vector = await embedTool.generateEmbedding("Hello world");
 * const searchResults = [...] // from Vectorize
 * const reranked = await embedTool.rerankMatches("Hello world", searchResults);
 */
export class EmbeddingTool {
  private env: Env;

  /**
   * @constructor
   * @param {Env} env - The Cloudflare Worker environment object, which must
   * contain the `AI` binding.
   */
  constructor(env: Env) {
    this.env = env;
  }

  /**
   * @method generateEmbedding
   * @description Generates a vector embedding for a single text string.
   * @param {string} query - The text to embed.
   * @returns {Promise<number[]>} A promise that resolves to the vector embedding.
   * @throws {Error} Throws an error if the AI model fails or returns an
   * unexpected data shape.
   */
  public async generateEmbedding(query: string): Promise<number[]> {
    try {
      // `this.env.AI.run` is the native Cloudflare Workers AI binding.
      const queryVector: EmbeddingResponse = await this.env.AI.run(EmbedModel, {
        text: [query], // The embedding model expects an array of strings.
      });

      // Defensive check for a valid response structure.
      if (!queryVector?.data?.[0]) {
        throw new Error(
          `Failed to generate embedding for query: ${query.substring(
            0,
            100
          )}...`
        );
      }

      return queryVector.data[0]; // Return the first (and only) embedding.
    } catch (error) {
      // Wrap the error for better upstream logging.
      throw new Error(
        `Embedding generation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * @method generateBatchEmbeddings
   * @description Generates vector embeddings for an array of text strings in a
   * single batch request.
   * @param {string[]} queries - An array of text strings to embed.
   * @returns {Promise<number[][]>} A promise that resolves to an array of
   * vector embeddings, in the same order as the input.
   * @throws {Error} Throws if the AI model fails or returns a mismatched
   * number of embeddings.
   */
  public async generateBatchEmbeddings(queries: string[]): Promise<number[][]> {
    try {
      const batchResponse: EmbeddingResponse = await this.env.AI.run(
        EmbedModel,
        {
          text: queries,
        }
      );

      // Validate that the response contains the expected number of embeddings.
      if (
        !batchResponse?.data ||
        batchResponse.data.length !== queries.length
      ) {
        throw new Error(
          `Batch embedding generation failed. Expected ${
            queries.length
          } embeddings, got ${batchResponse?.data?.length || 0}`
        );
      }

      return batchResponse.data;
    } catch (error) {
      throw new Error(
        `Batch embedding generation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * @method rerankMatches
   * @description Reranks a list of search results against a query.
   * This is used to improve the relevance of initial search results
   * (e.g., from Vectorize) before returning them to the user.
   *
   * @param {string} query - The original search query.
   * @param {any[]} matches - An array of match objects (e.g., from Vectorize).
   * @param {string} [contextField='text'] - The property name on the `match`
   * object (or `match.metadata`) that contains the text to be reranked.
   * @returns {Promise<any[]>} A new array of match objects, sorted by the
   * new reranked `score` (descending). Includes `originalIndex`.
   */
  public async rerankMatches(
    query: string,
    matches: any[],
    contextField: string = "text"
  ): Promise<any[]> {
    try {
      const rerankedMatches = await Promise.all(
        matches.map(async (match, index) => {
          try {
            // Extract the text content to be reranked.
            // flexible-access-pattern
            const context =
              match.metadata?.[contextField] || match[contextField] || "";

            // Call the reranker model with the query and the context.
            const response = await this.env.AI.run(RerankerModel, {
              context,
              query,
            });

            // Return the original match object, augmented with the new score.
            return {
              ...match,
              score: response.score || 0, // `response.score` is the new relevance.
              originalIndex: index,
            };
          } catch (error) {
            // Failsafe: If a single rerank fails, return the original
            // match with its original score (or 0) and log the error.
            return {
              ...match,
              score: match.score || 0,
              originalIndex: index,
              rerankError:
                error instanceof Error ? error.message : String(error),
            };
          }
        })
      );

      // Sort the augmented matches by the new score in descending order.
      return rerankedMatches.sort((a, b) => b.score - a.score);
    } catch (error) {
      // Global failsafe: If the `Promise.all` fails, log the error
      // and return the original, unsorted matches.
      console.warn("Reranking failed, returning original matches:", error);
      return matches;
    }
  }

  // Note: RAG functionality (storeEmbedding, querySimilar, searchContentType)
  // has been moved to src/shared/tools/rag-tool.ts for better separation of concerns
}

/**
 * @function createEmbeddingTool
 * @description Factory function to create a new instance of `EmbeddingTool`.
 * @param {Env} env - The Cloudflare Worker environment bindings.
 * @returns {EmbeddingTool} A new EmbeddingTool instance.
 */
export function createEmbeddingTool(env: Env): EmbeddingTool {
  return new EmbeddingTool(env);
}
