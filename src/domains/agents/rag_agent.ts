import { Agent } from "agents";
import {
  EmbeddingsManager,
  RAGQuery,
  RAGResult,
  createEmbeddingsManager,
} from "./embeddings";

export interface RAGAgentEnv {
  AI: Ai;
  DB: D1Database;
  JOB_OPENINGS_INDEX: Vectorize;
  RESUMES_INDEX: Vectorize;
  COVER_LETTERS_INDEX: Vectorize;
  GENERAL_CONTENT_INDEX: Vectorize;
  DEFAULT_MODEL_REASONING: keyof AiModels;
  EMBEDDING_MODEL: keyof AiModels;
}

export class RAGAgent extends Agent<RAGAgentEnv> {
  private embeddingsManager: EmbeddingsManager;

  constructor(state: DurableObjectState, env: RAGAgentEnv) {
    super(state, env);
    this.embeddingsManager = createEmbeddingsManager(
      env.AI,
      env.GENERAL_CONTENT_INDEX,
      env.EMBEDDING_MODEL
    );
  }

  /**
   * Perform RAG search across all content types
   */
  async searchAllContent(
    query: string,
    limit: number = 10
  ): Promise<RAGResult[]> {
    const contentTypes = [
      "job_opening",
      "resume",
      "cover_letter",
      "general_content",
    ];
    const results: RAGResult[] = [];

    for (const contentType of contentTypes) {
      try {
        const ragQuery: RAGQuery = {
          query,
          limit: Math.ceil(limit / contentTypes.length),
        };

        const result = await this.embeddingsManager.querySimilar(
          query,
          ragQuery.limit || 10
        );
        results.push(...result);
      } catch (error) {
        console.error(`Error searching ${contentType}:`, error);
        // Continue with other content types even if one fails
      }
    }

    return results;
  }

  /**
   * Perform RAG search for a specific content type
   */
  async searchContentType(
    query: string,
    contentType: string,
    limit: number = 10
  ): Promise<RAGResult> {
    const ragQuery: RAGQuery = {
      query,
      limit,
    };

    const results = await this.embeddingsManager.querySimilar(query, limit);
    return results[0] || { id: "", content: "", score: 0 };
  }

  /**
   * Answer a question using RAG context
   */
  async answerQuestion(
    question: string,
    contextTypes: string[] = ["job_opening", "resume", "cover_letter"]
  ): Promise<string> {
    try {
      // Search for relevant content
      const searchResults: RAGResult[] = [];

      for (const contentType of contextTypes) {
        const result = await this.searchContentType(question, contentType, 5);
        searchResults.push(result);
      }

      // Combine all context
      const combinedContext = searchResults
        .map((result) => result.content)
        .join("\n\n---\n\n");

      // Generate answer using AI with context
      const response = await this.env.AI.run(this.env.DEFAULT_MODEL_REASONING, {
        messages: [
          {
            role: "system",
            content: `You are a helpful AI assistant that answers questions based on the provided context. 
            Use the context to provide accurate and relevant answers. If the context doesn't contain enough 
            information to answer the question, say so clearly.`,
          },
          {
            role: "user",
            content: `Context:\n${combinedContext}\n\nQuestion: ${question}`,
          },
        ],
        max_tokens: 1000,
      });

      const answerText =
        typeof response === "string"
          ? response
          : (response as any).response || "No response generated";

      // Log the interaction
      await this.logAgentInteraction(question, answerText, searchResults);

      return answerText;
    } catch (error: any) {
      console.error("Error answering question:", error);
      return `I apologize, but I encountered an error while processing your question: ${error.message}`;
    }
  }

  /**
   * Find similar job openings
   */
  async findSimilarJobs(
    jobDescription: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const result = await this.searchContentType(
        jobDescription,
        "job_opening",
        limit
      );

      // Get full job details from database
      const jobIds = [result.id];
      if (jobIds.length === 0) return [];

      const placeholders = jobIds.map(() => "?").join(",");
      const jobs = await this.env.DB.prepare(
        `
        SELECT j.*, s.name as site_name 
        FROM jobs j 
        LEFT JOIN sites s ON j.site_id = s.id 
        WHERE j.id IN (${placeholders})
        ORDER BY j.posted_at DESC
      `
      )
        .bind(...jobIds)
        .all();

      return jobs.results;
    } catch (error) {
      console.error("Error finding similar jobs:", error);
      return [];
    }
  }

  /**
   * Find matching resumes for a job
   */
  async findMatchingResumes(
    jobDescription: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const result = await this.searchContentType(
        jobDescription,
        "resume",
        limit
      );

      // Get full resume details from database
      const resumeIds = [result.id];
      if (resumeIds.length === 0) return [];

      const placeholders = resumeIds.map(() => "?").join(",");
      const resumes = await this.env.DB.prepare(
        `
        SELECT * FROM asset_embeddings 
        WHERE uuid IN (${placeholders}) AND content_type = 'resume'
        ORDER BY created_at DESC
      `
      )
        .bind(...resumeIds)
        .all();

      return resumes.results;
    } catch (error) {
      console.error("Error finding matching resumes:", error);
      return [];
    }
  }

  /**
   * Generate cover letter suggestions
   */
  async generateCoverLetterSuggestions(
    jobDescription: string,
    resumeContent: string
  ): Promise<string> {
    try {
      // Search for relevant job context
      const jobContext = await this.searchContentType(
        jobDescription,
        "job_opening",
        3
      );

      // Search for relevant resume context
      const resumeContext = await this.searchContentType(
        resumeContent,
        "resume",
        3
      );

      const combinedContext = `
Job Context:
${jobContext.content}

Resume Context:
${resumeContext.content}
      `.trim();

      const response = await this.env.AI.run(this.env.DEFAULT_MODEL_REASONING, {
        messages: [
          {
            role: "system",
            content: `You are an expert career advisor. Generate a cover letter that effectively matches the candidate's resume to the job requirements. 
            Use the provided context to create personalized suggestions and highlight relevant skills and experiences.`,
          },
          {
            role: "user",
            content: `Based on this job description and resume context, generate a cover letter outline with specific suggestions:

${combinedContext}

Please provide:
1. Opening paragraph suggestions
2. Key points to highlight from the resume
3. Closing paragraph suggestions
4. Overall tone and style recommendations`,
          },
        ],
        max_tokens: 1500,
      });

      return typeof response === "string"
        ? response
        : (response as any).response || "No response generated";
    } catch (error: any) {
      console.error("Error generating cover letter suggestions:", error);
      return `I apologize, but I encountered an error while generating cover letter suggestions: ${error.message}`;
    }
  }

  /**
   * Get insights about job market trends
   */
  async getJobMarketInsights(query: string): Promise<string> {
    try {
      // Search across all job openings
      const jobResults = await this.searchContentType(query, "job_opening", 20);

      if (!jobResults || !jobResults.content) {
        return "I don't have enough job data to provide insights on this topic.";
      }

      // Analyze the job data
      const jobIds = [jobResults.id];
      const placeholders = jobIds.map(() => "?").join(",");

      const jobs = await this.env.DB.prepare(
        `
        SELECT j.*, s.name as site_name 
        FROM jobs j 
        LEFT JOIN sites s ON j.site_id = s.id 
        WHERE j.id IN (${placeholders})
        ORDER BY j.posted_at DESC
      `
      )
        .bind(...jobIds)
        .all();

      const jobData = jobs.results.map((job: any) => ({
        title: job.title,
        company: job.company,
        location: job.location,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        posted_at: job.posted_at,
        description: (job.description_md || "").substring(0, 500),
      }));

      const response = await this.env.AI.run(this.env.DEFAULT_MODEL_REASONING, {
        messages: [
          {
            role: "system",
            content: `You are a job market analyst. Analyze the provided job data and provide insights about trends, salary ranges, 
            popular skills, and market conditions. Be specific and data-driven in your analysis.`,
          },
          {
            role: "user",
            content: `Analyze this job market data and provide insights about: ${query}

Job Data:
${JSON.stringify(jobData, null, 2)}

Please provide:
1. Key trends and patterns
2. Salary insights
3. Skill requirements analysis
4. Market opportunities
5. Recommendations for job seekers`,
          },
        ],
        max_tokens: 2000,
      });

      return typeof response === "string"
        ? response
        : (response as any).response || "No response generated";
    } catch (error: any) {
      console.error("Error getting job market insights:", error);
      return `I apologize, but I encountered an error while analyzing job market data: ${error.message}`;
    }
  }

  /**
   * Log agent interaction for analytics
   */
  private async logAgentInteraction(
    question: string,
    answer: string,
    searchResults: RAGResult[]
  ): Promise<void> {
    try {
      const interactionId = crypto.randomUUID();
      const queryIds = searchResults.map((r) => r.id).join(",");
      const agentId = "main-rag-agent"; // Use a consistent agent ID

      await this.env.DB.prepare(
        `
        INSERT INTO agent_rag_interactions (
          id, agent_id, query_id, response_text, context_used_json
        ) VALUES (?, ?, ?, ?, ?)
      `
      )
        .bind(
          interactionId,
          agentId,
          queryIds,
          answer,
          JSON.stringify(searchResults.map((r) => r.content))
        )
        .run();
    } catch (error) {
      console.error("Error logging agent interaction:", error);
      // Don't throw - logging failures shouldn't break the main functionality
    }
  }

  /**
   * Get agent analytics
   */
  async getAnalytics(timeframe: string = "7d"): Promise<any> {
    try {
      const timeFilter = this.getTimeFilter(timeframe);

      const interactions = await this.env.DB.prepare(
        `
        SELECT 
          COUNT(*) as total_interactions,
          COUNT(DISTINCT query_id) as unique_queries,
          AVG(LENGTH(response_text)) as avg_response_length
        FROM agent_rag_interactions 
        WHERE agent_id = ? AND created_at >= ?
      `
      )
        .bind("main-rag-agent", timeFilter)
        .first();

      const topQueries = await this.env.DB.prepare(
        `
        SELECT q.query_text, COUNT(*) as frequency
        FROM agent_rag_interactions ari
        JOIN rag_queries q ON ari.query_id = q.id
        WHERE ari.agent_id = ? AND ari.created_at >= ?
        GROUP BY q.query_text
        ORDER BY frequency DESC
        LIMIT 10
      `
      )
        .bind("main-rag-agent", timeFilter)
        .all();

      return {
        interactions: interactions,
        topQueries: topQueries.results,
        timeframe,
      };
    } catch (error) {
      console.error("Error getting analytics:", error);
      return { error: "Failed to get analytics" };
    }
  }

  /**
   * Get time filter for analytics
   */
  private getTimeFilter(timeframe: string): string {
    const now = new Date();
    let days = 7;

    switch (timeframe) {
      case "1d":
        days = 1;
        break;
      case "7d":
        days = 7;
        break;
      case "30d":
        days = 30;
        break;
      case "90d":
        days = 90;
        break;
    }

    const pastDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return pastDate.toISOString();
  }
}
