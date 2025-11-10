/**
 * @file src/shared/tools/rag-tool.ts
 * @description RAG (Retrieval-Augmented Generation) tool for semantic search and context retrieval
 */

import type { Env } from "../../config/env";
import { VectorizeService } from "../../domains/integrations/vectorize";
import { EmbeddingTool, createEmbeddingTool } from "./embedding-tool";

// Text splitting for large documents
interface TextChunk {
  content: string;
  metadata?: Record<string, any>;
}

// AI model response types
interface AIResponse {
  response: string;
  modelUsed?: string;
}

// RAG-specific interfaces
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

export interface RAGContext {
  results: RAGResult[];
  totalResults: number;
  query: string;
  contentType?: string;
}

/**
 * @class RAGTool
 * @description Provides RAG (Retrieval-Augmented Generation) functionality for semantic search
 * and context retrieval. This tool focuses on finding relevant content and providing
 * context for AI generation tasks.
 *
 * @example
 * // In a Worker:
 * const ragTool = new RAGTool(env);
 * const context = await ragTool.retrieveContext("software engineer", "job_opening", 5);
 * const insights = await ragTool.getJobMarketInsights("remote work");
 */
export class RAGTool {
  private embeddingTool: EmbeddingTool;
  private vectorizeService: VectorizeService;
  private env: Env;

  /**
   * @constructor
   * @param {Env} env - The Cloudflare Worker environment object
   */
  constructor(env: Env) {
    this.env = env;
    this.embeddingTool = createEmbeddingTool(env);
    this.vectorizeService = new VectorizeService();
  }

  /**
   * @method retrieveContext
   * @description Retrieves relevant context for a given query and content type
   * @param {string} query - The search query
   * @param {string} contentType - The type of content to search for
   * @param {number} [limit=10] - Maximum number of results to return
   * @returns {Promise<RAGContext>} Context object with results and metadata
   */
  public async retrieveContext(
    query: string,
    contentType: string,
    limit: number = 10
  ): Promise<RAGContext> {
    const vectorResults = await this.vectorizeService.searchSimilar(
      this.env,
      query,
      limit,
      { content_type: contentType }
    );

    // Convert Vectorize results to RAG results
    const results: RAGResult[] = vectorResults.map((result) => ({
      id: result.id,
      content: (result.metadata as any).content || "",
      score: result.score,
      metadata: result.metadata,
    }));

    return {
      results,
      totalResults: results.length,
      query,
      contentType,
    };
  }

  /**
   * @method findSimilarJobs
   * @description Finds jobs similar to a given job description
   * @param {string} jobDescription - The job description to find similar jobs for
   * @param {number} [limit=10] - Maximum number of results to return
   * @returns {Promise<RAGResult[]>} Array of similar job results
   */
  public async findSimilarJobs(
    jobDescription: string,
    limit: number = 10
  ): Promise<RAGResult[]> {
    const context = await this.retrieveContext(
      jobDescription,
      "job_opening",
      limit
    );
    return context.results;
  }

  /**
   * @method findMatchingResumes
   * @description Finds resumes that match a given job description
   * @param {string} jobDescription - The job description to match against
   * @param {number} [limit=10] - Maximum number of results to return
   * @returns {Promise<RAGResult[]>} Array of matching resume results
   */
  public async findMatchingResumes(
    jobDescription: string,
    limit: number = 10
  ): Promise<RAGResult[]> {
    const context = await this.retrieveContext(jobDescription, "resume", limit);
    return context.results;
  }

  /**
   * @method getJobMarketInsights
   * @description Analyzes job market data to provide insights on a given topic
   * @param {string} query - The topic to analyze
   * @param {number} [limit=20] - Maximum number of jobs to analyze
   * @returns {Promise<string>} AI-generated insights about the job market
   */
  public async getJobMarketInsights(
    query: string,
    limit: number = 20
  ): Promise<string> {
    const context = await this.retrieveContext(query, "job_opening", limit);

    if (context.results.length === 0) {
      return "I don't have enough job data to provide insights on this topic.";
    }

    // Extract job titles and companies for analysis
    const jobTitles = context.results
      .map((result) => result.metadata?.title || result.content.split("\n")[0])
      .filter(Boolean)
      .slice(0, 10);

    const companies = context.results
      .map((result) => result.metadata?.company)
      .filter(Boolean)
      .slice(0, 10);

    // Generate insights based on the retrieved data
    const insights = [
      `Found ${context.results.length} relevant job postings for "${query}"`,
      `Top job titles: ${jobTitles.join(", ")}`,
      `Companies hiring: ${companies.join(", ")}`,
      `Average relevance score: ${(
        context.results.reduce((sum, r) => sum + r.score, 0) /
        context.results.length
      ).toFixed(2)}`,
    ];

    return insights.join("\n");
  }

  /**
   * @method searchWithFilters
   * @description Performs a search with custom filters
   * @param {RAGQuery} query - The search query with filters
   * @returns {Promise<RAGResult[]>} Array of filtered results
   */
  public async searchWithFilters(query: RAGQuery): Promise<RAGResult[]> {
    const vectorResults = await this.vectorizeService.searchSimilar(
      this.env,
      query.query,
      query.limit || 10,
      query.filters
    );

    // Convert to RAG results
    const results: RAGResult[] = vectorResults.map((result) => ({
      id: result.id,
      content: (result.metadata as any).content || "",
      score: result.score,
      metadata: result.metadata,
    }));

    // Apply threshold filter
    const threshold = query.threshold || 0;
    return results.filter((result) => result.score >= threshold);
  }

  /**
   * @method getContextForGeneration
   * @description Prepares context for AI generation tasks
   * @param {string} query - The query to generate context for
   * @param {string} contentType - The type of content to retrieve
   * @param {number} [limit=5] - Number of context items to retrieve
   * @returns {Promise<string>} Formatted context string for AI generation
   */
  public async getContextForGeneration(
    query: string,
    contentType: string,
    limit: number = 5
  ): Promise<string> {
    const context = await this.retrieveContext(query, contentType, limit);

    if (context.results.length === 0) {
      return `No relevant ${contentType} found for query: "${query}"`;
    }

    const contextItems = context.results.map((result, index) => {
      const title = result.metadata?.title || `Item ${index + 1}`;
      const content =
        result.content.substring(0, 200) +
        (result.content.length > 200 ? "..." : "");
      return `${index + 1}. ${title} (Score: ${result.score.toFixed(
        2
      )})\n   ${content}`;
    });

    return `Context for "${query}" (${contentType}):\n\n${contextItems.join(
      "\n\n"
    )}`;
  }

  /**
   * @method chunkText
   * @description Splits large text into smaller chunks for better embedding and retrieval
   * @param {string} text - The text to chunk
   * @param {number} [chunkSize=1000] - Maximum size of each chunk
   * @param {number} [chunkOverlap=200] - Overlap between chunks
   * @returns {Promise<TextChunk[]>} Array of text chunks
   */
  public async chunkText(
    text: string,
    chunkSize: number = 1000,
    chunkOverlap: number = 200
  ): Promise<TextChunk[]> {
    // Simple text splitting implementation
    // In a real implementation, you might want to use a more sophisticated splitter
    const chunks: TextChunk[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      let chunkText = text.slice(start, end);

      // Try to break at sentence boundaries
      if (end < text.length) {
        const lastSentenceEnd = chunkText.lastIndexOf(".");
        const lastNewline = chunkText.lastIndexOf("\n");
        const breakPoint = Math.max(lastSentenceEnd, lastNewline);

        if (breakPoint > chunkSize * 0.5) {
          // Only break if we're not losing too much content
          chunkText = chunkText.slice(0, breakPoint + 1);
        }
      }

      chunks.push({
        content: chunkText.trim(),
        metadata: {
          chunkIndex: chunks.length,
          startPosition: start,
          endPosition: start + chunkText.length,
        },
      });

      start += chunkText.length - chunkOverlap;
    }

    return chunks;
  }

  /**
   * @method storeDocument
   * @description Stores a document by chunking it and creating embeddings
   * @param {string} documentId - Unique identifier for the document
   * @param {string} text - The document text to store
   * @param {Record<string, any>} [metadata] - Additional metadata
   * @param {boolean} [enableChunking=true] - Whether to chunk the text
   * @returns {Promise<void>}
   */
  public async storeDocument(
    documentId: string,
    text: string,
    metadata?: Record<string, any>,
    enableChunking: boolean = true
  ): Promise<void> {
    let chunks: TextChunk[];

    if (enableChunking && text.length > 1000) {
      chunks = await this.chunkText(text);
    } else {
      chunks = [{ content: text, metadata }];
    }

    // Store each chunk as a separate vector
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk) continue; // Skip if chunk is undefined

      const chunkId =
        chunks.length > 1 ? `${documentId}_chunk_${i}` : documentId;

      const embedding = await this.embeddingTool.generateEmbedding(
        chunk.content
      );

      await this.vectorizeService.upsertVector(this.env, chunkId, embedding, {
        document_id: parseInt(documentId) || 0,
        doc_type: "content",
        user_id: metadata?.user_id || "system",
        content_sha256: await this.computeHash(chunk.content),
        section: `chunk_${i}`,
        title: metadata?.title,
        content_type: metadata?.content_type || "document",
        ...chunk.metadata,
        ...metadata,
      });
    }
  }

  /**
   * @method generateWithContext
   * @description Generates AI response using retrieved context
   * @param {string} query - The user query
   * @param {string} contentType - Type of content to retrieve context from
   * @param {number} [contextLimit=3] - Number of context items to retrieve
   * @param {string} [systemPrompt] - Custom system prompt
   * @returns {Promise<AIResponse>} AI response with context
   */
  public async generateWithContext(
    query: string,
    contentType: string,
    contextLimit: number = 3,
    systemPrompt?: string
  ): Promise<AIResponse> {
    // Retrieve relevant context
    const context = await this.retrieveContext(
      query,
      contentType,
      contextLimit
    );

    // Build context message
    const contextMessage =
      context.results.length > 0
        ? `Context:\n${context.results
            .map(
              (result, index) =>
                `- ${
                  result.metadata?.title || `Item ${index + 1}`
                }: ${result.content.substring(0, 300)}...`
            )
            .join("\n")}`
        : "";

    // Build system prompt
    const fullSystemPrompt = [
      systemPrompt ||
        "When answering the question or responding, use the context provided, if it is provided and relevant.",
      contextMessage,
    ]
      .filter(Boolean)
      .join("\n\n");

    // Generate response using Cloudflare AI
    const model =
      this.env.DEFAULT_MODEL_REASONING || "@cf/meta/llama-3.1-8b-instruct";

    const response = await this.env.AI.run(model, {
      messages: [
        ...(context.results.length > 0
          ? [{ role: "system", content: contextMessage }]
          : []),
        { role: "system", content: fullSystemPrompt },
        { role: "user", content: query },
      ],
    });

    return {
      response:
        (response as any).response ||
        (response as any).message ||
        "No response generated",
      modelUsed: model,
    };
  }

  /**
   * @method computeHash
   * @description Computes SHA256 hash of text for change detection
   * @param {string} text - Text to hash
   * @returns {Promise<string>} SHA256 hash
   */
  private async computeHash(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}

/**
 * @function createRAGTool
 * @description Factory function to create a new instance of RAGTool
 * @param {Env} env - The Cloudflare Worker environment object
 * @returns {RAGTool} A new RAGTool instance
 */
export function createRAGTool(env: Env): RAGTool {
  return new RAGTool(env);
}
