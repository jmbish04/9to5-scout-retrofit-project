/**
 * @fileoverview AI Integration Service
 *
 * Provides comprehensive AI-powered functionality using Cloudflare Workers AI.
 * Handles job extraction, text embeddings, content analysis, and structured data processing.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * AI service environment interface
 */
export interface AIServiceEnv {
  AI: Ai;
  VECTORIZE_INDEX: VectorizeIndex;
  DEFAULT_MODEL_WEB_BROWSER: string;
  DEFAULT_MODEL_REASONING: string;
  EMBEDDING_MODEL: string;
}

/**
 * Job extraction result interface
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
 * Content analysis result interface
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
 * Text classification result interface
 */
export interface TextClassificationResult {
  category: string;
  confidence: number;
  subcategories: string[];
  reasoning: string;
}

/**
 * AI Service Class
 *
 * Provides comprehensive AI functionality including job extraction, embeddings,
 * content analysis, and structured data processing using Cloudflare Workers AI.
 */
export class AIService {
  private env: AIServiceEnv;

  constructor(env: AIServiceEnv) {
    this.env = env;
  }

  /**
   * Extract structured job data from HTML content using AI
   * @param html The HTML content to analyze
   * @param url The URL of the job posting
   * @param site The site name
   * @returns Promise resolving to extracted job data or null
   */
  async extractJob(
    html: string,
    url: string,
    site: string
  ): Promise<JobExtractionResult | null> {
    try {
      const jobSchema = {
        type: "object",
        properties: {
          title: { type: "string", description: "Job title or position name" },
          company: {
            type: "string",
            description: "Company or organization name",
          },
          location: {
            type: "string",
            description: "Job location (city, state, remote, etc.)",
          },
          employment_type: {
            type: "string",
            description:
              "Employment type (full-time, part-time, contract, etc.)",
          },
          department: { type: "string", description: "Department or team" },
          salary_min: {
            type: "number",
            description: "Minimum salary if mentioned",
          },
          salary_max: {
            type: "number",
            description: "Maximum salary if mentioned",
          },
          salary_currency: {
            type: "string",
            description: "Currency code (USD, EUR, etc.)",
          },
          salary_raw: {
            type: "string",
            description: "Raw salary text as shown",
          },
          description_md: {
            type: "string",
            description: "Job description in markdown format",
          },
          requirements_md: {
            type: "string",
            description: "Job requirements in markdown format",
          },
          posted_at: {
            type: "string",
            description: "Job posting date in ISO format if available",
          },
        },
        required: [],
      };

      const messages = [
        {
          role: "system",
          content: `You are an expert at extracting structured job information from HTML. Extract all available job details from the provided HTML and return them in the specified JSON schema. Be thorough but accurate - only include information that is clearly present in the HTML.`,
        },
        {
          role: "user",
          content: `Extract job information from this HTML for ${site} at ${url}:\n\n${html.slice(
            0,
            8000
          )}`, // Limit HTML length
        },
      ];

      const inputs = {
        messages,
        guided_json: jobSchema,
      };

      const response = await this.env.AI.run(
        this.env.DEFAULT_MODEL_WEB_BROWSER as keyof AiModels,
        inputs
      );

      if ((response as { response?: string })?.response) {
        const jobData =
          typeof (response as { response: string }).response === "string"
            ? JSON.parse((response as { response: string }).response)
            : (response as { response: unknown }).response;

        // Add metadata
        jobData.url = url;
        jobData.status = "open";

        return jobData as JobExtractionResult;
      }

      return null;
    } catch (error) {
      console.error("Error extracting job:", error);
      return null;
    }
  }

  /**
   * Generate embeddings for text using Cloudflare Workers AI
   * @param text The text to embed
   * @returns Promise resolving to embedding vector or undefined
   */
  async embedText(text: string): Promise<number[] | undefined> {
    try {
      const response = await this.env.AI.run(
        this.env.EMBEDDING_MODEL as keyof AiModels,
        {
          text,
        }
      );
      return (response as { data?: { embedding: number[] }[] })?.data?.[0]
        ?.embedding;
    } catch (error) {
      console.error("Error generating embeddings:", error);
      return undefined;
    }
  }

  /**
   * Analyze content for sentiment, key points, and entities
   * @param content The content to analyze
   * @param contentType The type of content (job_description, resume, etc.)
   * @returns Promise resolving to content analysis result
   */
  async analyzeContent(
    content: string,
    contentType: string = "general"
  ): Promise<ContentAnalysisResult> {
    try {
      const analysisSchema = {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description: "Brief summary of the content",
          },
          key_points: {
            type: "array",
            items: { type: "string" },
            description: "Key points extracted from the content",
          },
          sentiment: {
            type: "string",
            enum: ["positive", "negative", "neutral"],
            description: "Overall sentiment of the content",
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Confidence score for the analysis",
          },
          categories: {
            type: "array",
            items: { type: "string" },
            description: "Content categories",
          },
          entities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                type: { type: "string" },
                confidence: { type: "number", minimum: 0, maximum: 1 },
              },
            },
            description: "Named entities found in the content",
          },
        },
        required: [
          "summary",
          "key_points",
          "sentiment",
          "confidence",
          "categories",
          "entities",
        ],
      };

      const messages = [
        {
          role: "system",
          content: `You are an expert content analyst. Analyze the provided ${contentType} content and extract key insights, sentiment, and entities. Be thorough and accurate in your analysis.`,
        },
        {
          role: "user",
          content: `Analyze this ${contentType} content:\n\n${content.slice(
            0,
            8000
          )}`,
        },
      ];

      const inputs = {
        messages,
        guided_json: analysisSchema,
      };

      const response = await this.env.AI.run(
        this.env.DEFAULT_MODEL_REASONING as keyof AiModels,
        inputs
      );

      if ((response as { response?: string })?.response) {
        const analysisData =
          typeof (response as { response: string }).response === "string"
            ? JSON.parse((response as { response: string }).response)
            : (response as { response: unknown }).response;

        return analysisData as ContentAnalysisResult;
      }

      // Return default result if parsing fails
      return {
        summary: "Content analysis failed",
        key_points: [],
        sentiment: "neutral",
        confidence: 0,
        categories: [],
        entities: [],
      };
    } catch (error) {
      console.error("Error analyzing content:", error);
      return {
        summary: "Content analysis failed",
        key_points: [],
        sentiment: "neutral",
        confidence: 0,
        categories: [],
        entities: [],
      };
    }
  }

  /**
   * Classify text into predefined categories
   * @param text The text to classify
   * @param categories Available categories for classification
   * @returns Promise resolving to classification result
   */
  async classifyText(
    text: string,
    categories: string[]
  ): Promise<TextClassificationResult> {
    try {
      const classificationSchema = {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Primary category for the text",
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Confidence score for the classification",
          },
          subcategories: {
            type: "array",
            items: { type: "string" },
            description: "Additional subcategories",
          },
          reasoning: {
            type: "string",
            description: "Explanation for the classification",
          },
        },
        required: ["category", "confidence", "subcategories", "reasoning"],
      };

      const messages = [
        {
          role: "system",
          content: `You are an expert text classifier. Classify the provided text into one of the following categories: ${categories.join(
            ", "
          )}. Provide reasoning for your classification.`,
        },
        {
          role: "user",
          content: `Classify this text:\n\n${text.slice(0, 4000)}`,
        },
      ];

      const inputs = {
        messages,
        guided_json: classificationSchema,
      };

      const response = await this.env.AI.run(
        this.env.DEFAULT_MODEL_REASONING as keyof AiModels,
        inputs
      );

      if ((response as { response?: string })?.response) {
        const classificationData =
          typeof (response as { response: string }).response === "string"
            ? JSON.parse((response as { response: string }).response)
            : (response as { response: unknown }).response;

        return classificationData as TextClassificationResult;
      }

      // Return default result if parsing fails
      return {
        category: "unknown",
        confidence: 0,
        subcategories: [],
        reasoning: "Classification failed",
      };
    } catch (error) {
      console.error("Error classifying text:", error);
      return {
        category: "unknown",
        confidence: 0,
        subcategories: [],
        reasoning: "Classification failed",
      };
    }
  }

  /**
   * Generate a summary of text content
   * @param text The text to summarize
   * @param maxLength Maximum length of the summary
   * @returns Promise resolving to summary string
   */
  async summarizeText(text: string, maxLength: number = 200): Promise<string> {
    try {
      const messages = [
        {
          role: "system",
          content: `You are an expert at creating concise summaries. Create a summary of the provided text that is no more than ${maxLength} characters. Focus on the most important information.`,
        },
        {
          role: "user",
          content: `Summarize this text:\n\n${text.slice(0, 8000)}`,
        },
      ];

      const inputs = {
        messages,
        max_tokens: Math.floor(maxLength / 4), // Rough estimate for token count
      };

      const response = await this.env.AI.run(
        this.env.DEFAULT_MODEL_REASONING as keyof AiModels,
        inputs
      );

      if ((response as { response?: string })?.response) {
        return (response as { response: string }).response;
      }

      return "Summary generation failed";
    } catch (error) {
      console.error("Error summarizing text:", error);
      return "Summary generation failed";
    }
  }

  /**
   * Search for similar content using vector embeddings
   * @param query The search query
   * @param topK Number of results to return
   * @returns Promise resolving to search results
   */
  async searchSimilar(query: string, topK: number = 10): Promise<any[]> {
    try {
      const queryEmbedding = await this.embedText(query);
      if (!queryEmbedding) {
        return [];
      }

      const searchResults = await this.env.VECTORIZE_INDEX.query(
        queryEmbedding,
        {
          topK,
          returnMetadata: true,
        }
      );

      return searchResults.matches || [];
    } catch (error) {
      console.error("Error searching similar content:", error);
      return [];
    }
  }

  /**
   * Generate embeddings and store them in Vectorize
   * @param text The text to embed and store
   * @param metadata Metadata to associate with the embedding
   * @returns Promise resolving to storage result
   */
  async storeEmbedding(
    text: string,
    metadata: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const embedding = await this.embedText(text);
      if (!embedding) {
        return { success: false, error: "Failed to generate embedding" };
      }

      const id = crypto.randomUUID();
      await this.env.VECTORIZE_INDEX.insert([
        {
          id,
          values: embedding,
          metadata,
        },
      ]);

      return { success: true };
    } catch (error) {
      console.error("Error storing embedding:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

/**
 * Factory function to create AIService
 * @param env AI service environment configuration
 * @returns New AIService instance
 */
export function createAIService(env: AIServiceEnv): AIService {
  return new AIService(env);
}
