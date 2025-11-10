/**
 * @file src/shared/tools/types.ts
 * @description Type definitions for the tools ecosystem
 */

// --- Model Definitions ---

/**
 * @constant Llama4Scout
 * @description Model ID for Llama 4 Scout.
 */
export const Llama4Scout = "@cf/meta/llama-4-scout-17b-16e-instruct" as const;

/**
 * @constant MistralSmall3_1
 * @description Model ID for Mistral Small 3.1.
 */
export const MistralSmall3_1 =
  "@cf/mistralai/mistral-small-3.1-24b-instruct" as const;

/**
 * @constant Hermes2Pro
 * @description Model ID for Hermes 2 Pro (Mistral 7B).
 */
export const Hermes2Pro = "@hf/nousresearch/hermes-2-pro-mistral-7b" as const;

/**
 * @constant Llama3_3
 * @description Model ID for Llama 3.3 70B Instruct.
 */
export const Llama3_3 = "@cf/meta/llama-3.3-70b-instruct-fp8-fast" as const;

/**
 * @constant EmbedModel
 * @description Model ID for the BAAI General Embedding (bge) model.
 */
export const EmbedModel = "@cf/baai/bge-large-en-v1.5" as const;

/**
 * @constant RerankerModel
 * @description Model ID for the BAAI Reranker model.
 */
export const RerankerModel = "@cf/baai/bge-reranker-base" as const;

// --- Type Definitions ---

/**
 * @typedef {string} StructuredModel
 * @description A type union representing all AI model identifiers
 * supported by the `StructuredResponseTool`.
 */
export type StructuredModel =
  | typeof Llama4Scout
  | typeof MistralSmall3_1
  | typeof Hermes2Pro
  | typeof Llama3_3;

/**
 * @interface AiBinding
 * @description Defines the expected interface for a Cloudflare AI binding (`env.AI`).
 */
export interface AiBinding {
  run: (model: string, options: any) => Promise<any>;
}

/**
 * @interface VectorizeBinding
 * @description Defines the expected interface for a Cloudflare Vectorize binding
 * (e.g., `env.VECTORIZE_INDEX`).
 */
export interface VectorizeBinding {
  query: (vector: number[], options: { topK: number }) => Promise<any>;
}

/**
 * @interface EmbeddingResponse
 * @description Represents the raw, successful response structure from the
 * Cloudflare embedding model (`@cf/baai/bge-large-en-v1.5`).
 */
export interface EmbeddingResponse {
  shape: number[];
  data: number[][];
}

/**
 * @interface StructuredResponse
 * @description A standardized wrapper for all responses from `StructuredResponseTool`.
 * @template T The type of the structured result, inferred from the provided Zod schema.
 */
export interface StructuredResponse<T> {
  /**
   * @property {boolean} success - True if the AI call was successful *and*
   * the response was successfully parsed and validated against the schema.
   */
  success: boolean;
  /**
   * @property {StructuredModel} modelUsed - The string identifier of the AI model
   * that processed this request.
   */
  modelUsed: StructuredModel;
  /**
   * @property {T | null} structuredResult - The Zod-validated JSON object if
   * `success` is true, otherwise null.
   */
  structuredResult: T | null;
  /**
   * @property {string | undefined} error - A detailed error message if
   * `success` is false.
   */
  error?: string;
  /**
   * @property {boolean | undefined} isChunked - True if the response was generated
   * by splitting a large text payload into multiple AI calls.
   */
  isChunked?: boolean;
}

/**
 * @interface ToolConfig
 * @description Defines the configuration structure for the toolkit.
 */
export interface ToolConfig {
  ai: {
    maxRetries: number;
    timeout: number;
    fallbackModels: boolean;
  };
  browser: {
    timeout: number;
    viewport: {
      width: number;
      height: number;
    };
    userAgent?: string;
  };
  auth: {
    tokenExpiry: number; // in seconds
    allowedOrigins: string[];
  };
  health: {
    checkInterval: number; // in milliseconds
    enableMetrics: boolean;
  };
}

/**
 * @constant DEFAULT_TOOL_CONFIG
 * @description Provides sensible default values for the entire toolkit.
 */
export const DEFAULT_TOOL_CONFIG: ToolConfig = {
  ai: {
    maxRetries: 3,
    timeout: 30000,
    fallbackModels: true,
  },
  browser: {
    timeout: 30000,
    viewport: {
      width: 1920,
      height: 1080,
    },
    userAgent: "9to5-Scout-Worker/1.0",
  },
  auth: {
    tokenExpiry: 3600, // 1 hour
    allowedOrigins: ["*"], // Default to all origins
  },
  health: {
    checkInterval: 60000, // 1 minute
    enableMetrics: true,
  },
};

