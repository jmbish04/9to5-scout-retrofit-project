/**
 * @file src/shared/tools/index.ts
 * @description Central barrel export for the tools ecosystem
 */

// Re-export all types and constants
export * from "./types";

// Re-export embedding tool
export { EmbeddingTool, createEmbeddingTool } from "./embedding-tool";

// Re-export structured response tool
export {
  StructuredResponseTool,
  createStructuredResponseTool,
} from "./structured-response-tool";

// Re-export model constants for convenience
export {
  EmbedModel,
  Hermes2Pro,
  Llama3_3,
  Llama4Scout,
  MistralSmall3_1,
  RerankerModel,
} from "./types";

// Re-export core types for external use
export type { StructuredModel, StructuredResponse, ToolConfig } from "./types";

// Re-export RAG tool and types
export { RAGTool, createRAGTool } from "./rag-tool";
export type { RAGContext, RAGQuery, RAGResult } from "./rag-tool";

// Re-export PDF rendering tool and types
export { PDFRenderingTool, createPDFRenderingTool } from "./pdf-rendering-tool";
export type {
  DocumentOptions,
  DocumentTemplate,
  PDFOptions,
  PDFResult,
} from "./pdf-rendering-tool";
