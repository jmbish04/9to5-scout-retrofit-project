import { Agent } from "agents";
import type { Env } from "../../../config/env";
import { RAGTool, createRAGTool } from "../../../shared/tools";

// ... (imports and other code)

export interface RAGAgentEnv extends Env {
  VECTORIZE_INDEX: VectorizeIndex;
}

export class RAGAgent extends Agent<RAGAgentEnv> {
  private ragTool: RAGTool;

  constructor(state: any, env: RAGAgentEnv) {
    super(state, env);
    this.ragTool = createRAGTool(env);
  }

  async findSimilarJobs(
    jobDescription: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const results = await this.ragTool.findSimilarJobs(jobDescription, limit);

      if (results.length === 0) return [];

      const jobIds = results.map((result) => result.id);
      const param_placeholders = jobIds.map(() => "?").join(",");
      const jobs = await this.env.DB.prepare(
        `
        SELECT j.*, s.name as site_name 
        FROM jobs j 
        LEFT JOIN sites s ON j.site_id = s.id 
        WHERE j.id IN (${param_placeholders})
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

  async findMatchingResumes(
    jobDescription: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const results = await this.ragTool.findMatchingResumes(
        jobDescription,
        limit
      );

      if (results.length === 0) return [];

      const resumeIds = results.map((result) => result.id);
      const param_placeholders = resumeIds.map(() => "?").join(",");
      const resumes = await this.env.DB.prepare(
        `
        SELECT * FROM asset_embeddings 
        WHERE uuid IN (${param_placeholders}) AND content_type = 'resume'
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

  async getJobMarketInsights(query: string): Promise<string> {
    try {
      return await this.ragTool.getJobMarketInsights(query, 20);
    } catch (error: any) {
      console.error("Error getting job market insights:", error);
      return `I apologize, but I encountered an error while analyzing job market data: ${error.message}`;
    }
  }

  // ... (other methods)
}
