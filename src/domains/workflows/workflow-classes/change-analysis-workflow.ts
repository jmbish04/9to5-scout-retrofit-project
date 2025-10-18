/**
 * Change Analysis Workflow
 *
 * Workflow for analyzing changes between two versions of job postings.
 * Provides detailed analysis of content differences and generates summaries.
 */

import type { Env } from "../../../config/env";
import type {
  ChangeAnalysisWorkflowConfig,
  WorkflowResult,
} from "../types/workflow.types";

export class ChangeAnalysisWorkflow {
  constructor(private env: Env) {}

  /**
   * Execute the change analysis workflow
   */
  async execute(config: ChangeAnalysisWorkflowConfig): Promise<WorkflowResult> {
    const startTime = Date.now();
    const steps = [];
    const errors = [];
    const warnings = [];

    try {
      // Step 1: Validate job and content
      steps.push("validating_inputs");
      await this.validateInputs(config);

      // Step 2: Preprocess content
      steps.push("preprocessing_content");
      const processedContent = await this.preprocessContent(
        config.old_content,
        config.new_content
      );

      // Step 3: Perform basic analysis
      steps.push("basic_analysis");
      const basicAnalysis = await this.performBasicAnalysis(processedContent);

      // Step 4: Perform detailed analysis if requested
      let detailedAnalysis = null;
      if (
        config.analysis_depth === "detailed" ||
        config.analysis_depth === "comprehensive"
      ) {
        steps.push("detailed_analysis");
        detailedAnalysis = await this.performDetailedAnalysis(
          processedContent,
          config
        );
      }

      // Step 5: Perform AI analysis if requested
      let aiAnalysis = null;
      if (config.include_ai_analysis) {
        steps.push("ai_analysis");
        aiAnalysis = await this.performAIAnalysis(processedContent, config);
      }

      // Step 6: Generate summary if requested
      let summary = null;
      if (config.generate_summary) {
        steps.push("generating_summary");
        summary = await this.generateSummary(
          basicAnalysis,
          detailedAnalysis,
          aiAnalysis
        );
      }

      // Step 7: Store analysis results
      steps.push("storing_results");
      const analysisId = await this.storeAnalysisResults(config.job_id, {
        basic: basicAnalysis,
        detailed: detailedAnalysis,
        ai: aiAnalysis,
        summary,
      });

      const duration = Date.now() - startTime;

      return {
        success: true,
        data: {
          analysis_id: analysisId,
          basic_analysis: basicAnalysis,
          detailed_analysis: detailedAnalysis,
          ai_analysis: aiAnalysis,
          summary,
          duration_ms: duration,
        },
        metrics: {
          duration_ms: duration,
          steps_completed: steps.length,
          steps_failed: 0,
          resources_used: {
            content_length_old: config.old_content.length,
            content_length_new: config.new_content.length,
            analysis_depth: config.analysis_depth,
          },
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      return {
        success: false,
        errors: [errorMessage],
        warnings,
        metrics: {
          duration_ms: duration,
          steps_completed: steps.length,
          steps_failed: 1,
          resources_used: {},
        },
      };
    }
  }

  /**
   * Validate inputs
   */
  private async validateInputs(
    config: ChangeAnalysisWorkflowConfig
  ): Promise<void> {
    if (!config.job_id) {
      throw new Error("Job ID is required");
    }

    if (!config.old_content || !config.new_content) {
      throw new Error("Both old and new content are required");
    }

    if (config.old_content === config.new_content) {
      throw new Error("Old and new content are identical");
    }

    // Verify job exists
    const job = await this.env.DB.prepare(
      `
      SELECT id FROM jobs WHERE id = ?
    `
    )
      .bind(config.job_id)
      .first();

    if (!job) {
      throw new Error(`Job not found: ${config.job_id}`);
    }
  }

  /**
   * Preprocess content for analysis
   */
  private async preprocessContent(
    oldContent: string,
    newContent: string
  ): Promise<any> {
    // Clean and normalize content
    const cleanOld = this.cleanContent(oldContent);
    const cleanNew = this.cleanContent(newContent);

    // Extract structured data
    const oldStructured = await this.extractStructuredData(cleanOld);
    const newStructured = await this.extractStructuredData(cleanNew);

    return {
      old: {
        raw: oldContent,
        cleaned: cleanOld,
        structured: oldStructured,
      },
      new: {
        raw: newContent,
        cleaned: cleanNew,
        structured: newStructured,
      },
    };
  }

  /**
   * Clean content for analysis
   */
  private cleanContent(content: string): string {
    // Remove HTML tags
    let cleaned = content.replace(/<[^>]*>/g, " ");

    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    // Remove common noise
    cleaned = cleaned.replace(/\b(click here|read more|apply now)\b/gi, "");

    return cleaned;
  }

  /**
   * Extract structured data from content
   */
  private async extractStructuredData(content: string): Promise<any> {
    // Extract basic information using regex patterns
    const title = this.extractTitle(content);
    const company = this.extractCompany(content);
    const location = this.extractLocation(content);
    const salary = this.extractSalary(content);
    const requirements = this.extractRequirements(content);
    const description = this.extractDescription(content);

    return {
      title,
      company,
      location,
      salary,
      requirements,
      description,
      word_count: content.split(/\s+/).length,
      character_count: content.length,
    };
  }

  /**
   * Extract job title
   */
  private extractTitle(content: string): string | null {
    const patterns = [
      /(?:title|position|role):\s*([^\n]+)/i,
      /<h1[^>]*>([^<]+)<\/h1>/i,
      /<title[^>]*>([^<]+)<\/title>/i,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extract company name
   */
  private extractCompany(content: string): string | null {
    const patterns = [
      /(?:company|employer|organization):\s*([^\n]+)/i,
      /at\s+([A-Z][a-zA-Z\s&]+)/,
      /([A-Z][a-zA-Z\s&]+)\s+is\s+hiring/i,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extract location
   */
  private extractLocation(content: string): string | null {
    const patterns = [
      /(?:location|where):\s*([^\n]+)/i,
      /(?:remote|hybrid|onsite)/i,
      /([A-Z][a-z]+,\s*[A-Z]{2})/,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extract salary information
   */
  private extractSalary(content: string): string | null {
    const patterns = [
      /(?:salary|pay|compensation):\s*([^\n]+)/i,
      /\$[\d,]+(?:-\$[\d,]+)?(?:\s*(?:per\s+)?(?:year|month|hour|annually|monthly|hourly))?/i,
      /(?:competitive|negotiable|based on experience)/i,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extract requirements
   */
  private extractRequirements(content: string): string[] {
    const patterns = [
      /(?:requirements?|qualifications?|skills?):\s*([^\n]+)/i,
      /(?:must have|required|essential):\s*([^\n]+)/i,
    ];

    const requirements: string[] = [];

    for (const pattern of patterns) {
      const matches = content.match(new RegExp(pattern.source, "gi"));
      if (matches) {
        matches.forEach((match) => {
          const req = match
            .replace(
              /^(?:requirements?|qualifications?|skills?|must have|required|essential):\s*/i,
              ""
            )
            .trim();
          if (req) {
            requirements.push(req);
          }
        });
      }
    }

    return requirements;
  }

  /**
   * Extract description
   */
  private extractDescription(content: string): string | null {
    const patterns = [
      /(?:description|about|overview):\s*([^\n]+)/i,
      /<p[^>]*>([^<]+)<\/p>/i,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Perform basic analysis
   */
  private async performBasicAnalysis(processedContent: any): Promise<any> {
    const { old, new: newContent } = processedContent;

    // Calculate basic metrics
    const wordCountChange =
      newContent.structured.word_count - old.structured.word_count;
    const characterCountChange =
      newContent.structured.character_count - old.structured.character_count;

    // Check for field changes
    const fieldChanges = this.compareFields(
      old.structured,
      newContent.structured
    );

    // Calculate similarity score
    const similarityScore = this.calculateSimilarity(
      old.cleaned,
      newContent.cleaned
    );

    return {
      word_count_change: wordCountChange,
      character_count_change: characterCountChange,
      field_changes: fieldChanges,
      similarity_score: similarityScore,
      has_changes: Object.keys(fieldChanges).length > 0,
    };
  }

  /**
   * Compare fields between old and new content
   */
  private compareFields(old: any, newContent: any): Record<string, any> {
    const changes: Record<string, any> = {};

    const fields = ["title", "company", "location", "salary", "description"];

    for (const field of fields) {
      if (old[field] !== newContent[field]) {
        changes[field] = {
          old: old[field],
          new: newContent[field],
          changed: true,
        };
      }
    }

    // Compare requirements
    if (
      JSON.stringify(old.requirements) !==
      JSON.stringify(newContent.requirements)
    ) {
      changes.requirements = {
        old: old.requirements,
        new: newContent.requirements,
        changed: true,
      };
    }

    return changes;
  }

  /**
   * Calculate similarity score between two texts
   */
  private calculateSimilarity(text1: string, text2: string): number {
    // Simple Jaccard similarity
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Perform detailed analysis
   */
  private async performDetailedAnalysis(
    processedContent: any,
    config: ChangeAnalysisWorkflowConfig
  ): Promise<any> {
    const { old, new: newContent } = processedContent;

    // Perform more sophisticated analysis
    const detailedChanges = await this.analyzeDetailedChanges(old, newContent);
    const impactAnalysis = await this.analyzeImpact(detailedChanges);
    const trendAnalysis = await this.analyzeTrends(old, newContent);

    return {
      detailed_changes: detailedChanges,
      impact_analysis: impactAnalysis,
      trend_analysis: trendAnalysis,
    };
  }

  /**
   * Analyze detailed changes
   */
  private async analyzeDetailedChanges(
    old: any,
    newContent: any
  ): Promise<any> {
    // This would perform more sophisticated change detection
    // For now, return basic analysis
    return {
      content_additions: [],
      content_removals: [],
      content_modifications: [],
      structural_changes: [],
    };
  }

  /**
   * Analyze impact of changes
   */
  private async analyzeImpact(changes: any): Promise<any> {
    // Analyze the impact of changes on job seekers
    return {
      impact_level: "medium",
      affected_sections: [],
      recommendations: [],
    };
  }

  /**
   * Analyze trends
   */
  private async analyzeTrends(old: any, newContent: any): Promise<any> {
    // Analyze trends in job postings
    return {
      trend_direction: "neutral",
      trend_indicators: [],
    };
  }

  /**
   * Perform AI analysis
   */
  private async performAIAnalysis(
    processedContent: any,
    config: ChangeAnalysisWorkflowConfig
  ): Promise<any> {
    try {
      const response = await this.env.AI.run(
        this.env.DEFAULT_MODEL_REASONING as keyof AiModels,
        {
          messages: [
            {
              role: "system",
              content:
                "Analyze the changes between two versions of a job posting. Provide insights on what changed, why it might have changed, and the impact on job seekers. Return a JSON object with your analysis.",
            },
            {
              role: "user",
              content: `Analyze these changes in a job posting:\n\nOLD VERSION:\n${processedContent.old.cleaned}\n\nNEW VERSION:\n${processedContent.new.cleaned}`,
            },
          ],
          response_format: {
            type: "json_object",
          },
        }
      );

      return JSON.parse(response.response as string);
    } catch (error) {
      console.error("Error performing AI analysis:", error);
      return { error: "AI analysis failed" };
    }
  }

  /**
   * Generate summary
   */
  private async generateSummary(
    basic: any,
    detailed: any,
    ai: any
  ): Promise<string> {
    const summaryParts = [];

    // Basic summary
    if (basic.has_changes) {
      summaryParts.push(
        `The job posting has been updated with changes to: ${Object.keys(
          basic.field_changes
        ).join(", ")}.`
      );
    } else {
      summaryParts.push("No significant changes detected in the job posting.");
    }

    // Add AI insights if available
    if (ai && ai.insights) {
      summaryParts.push(`AI Analysis: ${ai.insights}`);
    }

    return summaryParts.join(" ");
  }

  /**
   * Store analysis results
   */
  private async storeAnalysisResults(
    jobId: string,
    analysis: any
  ): Promise<string> {
    const analysisId = crypto.randomUUID();

    await this.env.DB.prepare(
      `
      INSERT INTO change_analyses (
        id, job_id, analysis_data, created_at
      ) VALUES (?, ?, ?, datetime('now'))
    `
    )
      .bind(analysisId, jobId, JSON.stringify(analysis))
      .run();

    return analysisId;
  }
}
