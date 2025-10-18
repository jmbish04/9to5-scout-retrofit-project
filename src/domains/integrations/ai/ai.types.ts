/**
 * @fileoverview AI Integration Types
 *
 * Type definitions for AI-powered functionality including job extraction,
 * content analysis, text classification, and vector embeddings.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * AI service environment configuration
 */
export interface AIServiceEnv {
  AI: Ai;
  VECTORIZE_INDEX: VectorizeIndex;
  DEFAULT_MODEL_WEB_BROWSER: keyof AiModels;
  DEFAULT_MODEL_REASONING: keyof AiModels;
  EMBEDDING_MODEL: keyof AiModels;
}

/**
 * Job extraction result from HTML content
 */
export interface JobExtractionResult {
  title?: string;
  company?: string;
  location?: string;
  employment_type?: string;
  department?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_raw?: string;
  description_md?: string;
  requirements_md?: string;
  posted_at?: string;
  url: string;
  status: string;
}

/**
 * Content analysis result
 */
export interface ContentAnalysisResult {
  summary: string;
  key_points: string[];
  sentiment: "positive" | "negative" | "neutral";
  confidence: number;
  categories: string[];
  entities: Array<{
    name: string;
    type: string;
    confidence: number;
  }>;
}

/**
 * Text classification result
 */
export interface TextClassificationResult {
  category: string;
  confidence: number;
  subcategories: string[];
  reasoning: string;
}

/**
 * Vector search result
 */
export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: Record<string, any>;
}

/**
 * AI model configuration
 */
export interface AIModelConfig {
  id: string;
  name: string;
  type: "text" | "embedding" | "image" | "audio";
  capabilities: string[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

/**
 * AI request configuration
 */
export interface AIRequestConfig {
  model: keyof AiModels;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
  guided_json?: any;
}

/**
 * AI response wrapper
 */
export interface AIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  timestamp: string;
}

/**
 * Embedding generation request
 */
export interface EmbeddingRequest {
  text: string;
  model?: keyof AiModels;
}

/**
 * Embedding generation result
 */
export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Content generation request
 */
export interface ContentGenerationRequest {
  prompt: string;
  model?: keyof AiModels;
  max_tokens?: number;
  temperature?: number;
  format?: "text" | "json" | "markdown";
  schema?: any;
}

/**
 * Content generation result
 */
export interface ContentGenerationResult {
  content: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * AI task configuration
 */
export interface AITaskConfig {
  id: string;
  name: string;
  description: string;
  model: keyof AiModels;
  prompt_template: string;
  input_schema: any;
  output_schema: any;
  parameters: Record<string, any>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * AI task execution result
 */
export interface AITaskResult {
  task_id: string;
  success: boolean;
  result?: any;
  error?: string;
  execution_time_ms: number;
  tokens_used: number;
  cost_estimate: number;
  timestamp: string;
}

/**
 * AI performance metrics
 */
export interface AIPerformanceMetrics {
  model: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_response_time_ms: number;
  average_tokens_per_request: number;
  total_tokens_used: number;
  cost_estimate: number;
  last_updated: string;
}

/**
 * AI error information
 */
export interface AIError {
  type: "model_error" | "rate_limit" | "quota_exceeded" | "invalid_request" | "unknown";
  message: string;
  code?: string;
  details?: string;
  retry_after?: number;
  timestamp: string;
}

/**
 * AI model capabilities
 */
export interface AIModelCapabilities {
  text_generation: boolean;
  text_classification: boolean;
  text_summarization: boolean;
  text_extraction: boolean;
  text_analysis: boolean;
  embedding_generation: boolean;
  structured_output: boolean;
  function_calling: boolean;
  vision: boolean;
  audio: boolean;
}

/**
 * AI service health status
 */
export interface AIServiceHealth {
  status: "healthy" | "degraded" | "unhealthy";
  models: Array<{
    id: string;
    status: "available" | "unavailable" | "rate_limited";
    last_checked: string;
  }>;
  vectorize_status: "healthy" | "degraded" | "unhealthy";
  last_updated: string;
  uptime_seconds: number;
  error_count: number;
}
