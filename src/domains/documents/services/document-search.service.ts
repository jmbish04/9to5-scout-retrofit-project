/**
 * Document Search Service
 *
 * Handles document search operations including vector search, keyword matching,
 * and document evaluation against job postings.
 */

import type { Env } from "../../../config/env";
import type {
  ApplicantDocumentWithSections,
  DocumentSearchResult,
  VectorSearchRequest,
} from "../types/document.types";

// Define DocumentSearchResponse locally since it's not exported from types
export interface DocumentSearchResponse {
  results: DocumentSearchResult[];
  total: number;
  query: string;
  took_ms: number;
}

export class DocumentSearchService {
  constructor(private env: Env) {}

  /**
   * Search documents using vector similarity
   */
  async searchDocuments(
    params: VectorSearchRequest
  ): Promise<DocumentSearchResponse> {
    const { query, doc_type, user_id, limit = 10, threshold = 0.7 } = params;

    // Generate embedding for the search query
    const queryEmbedding = await this.generateEmbedding(query);

    // Build search query
    let whereClause = "WHERE 1=1";
    const searchParams: any[] = [];

    if (doc_type) {
      whereClause += " AND doc_type = ?";
      searchParams.push(doc_type);
    }

    if (user_id) {
      whereClause += " AND user_id = ?";
      searchParams.push(user_id);
    }

    // Search for similar documents
    const results = await this.env.VECTORIZE_INDEX.query(queryEmbedding, {
      topK: limit,
      filter: doc_type ? { doc_type } : undefined,
    });

    // Filter results by threshold
    const filteredResults = results.matches.filter(
      (match: any) => match.score >= threshold
    );

    // Get document details for matching results
    const documents: DocumentSearchResult[] = [];
    for (const match of filteredResults) {
      const documentId = parseInt((match as any).id);
      const document = await this.getDocumentById(documentId);

      if (document) {
        documents.push({
          document,
          score: match.score,
          highlights: this.generateHighlights(document, query),
        });
      }
    }

    return {
      results: documents,
      total: documents.length,
      query,
      took_ms: 0, // Could be measured if needed
    };
  }

  /**
   * Evaluate a document against a job posting
   */
  async evaluateDocumentAgainstJob(
    documentId: number,
    jobId: string
  ): Promise<any> {
    const document = await this.getDocumentById(documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    // Get job details
    const job = await this.env.DB.prepare(
      `
      SELECT * FROM jobs WHERE id = ?
    `
    )
      .bind(jobId)
      .first();

    if (!job) {
      throw new Error("Job not found");
    }

    // Get document content
    const content = await this.getDocumentContent(document);
    if (!content) {
      throw new Error("Document content not found");
    }

    // Calculate various scores
    const keywordScore = this.scoreKeywords(content, job.description || "");
    const actionVerbScore = this.scoreActionVerbs(content);
    const impactScore = this.scoreImpact(content);
    const brevityScore = this.scoreBrevity(content);
    const structureScore = this.scoreStructure(content);
    const seniorityScore = this.scoreSeniority(content, job.description || "");

    // Calculate overall score
    const overallScore = Math.round(
      keywordScore * 0.25 +
        actionVerbScore * 0.15 +
        impactScore * 0.15 +
        brevityScore * 0.1 +
        structureScore * 0.15 +
        seniorityScore * 0.2
    );

    // Generate feedback and recommendations
    const feedback = this.generateFeedback({
      keywordScore,
      actionVerbScore,
      impactScore,
      brevityScore,
      structureScore,
      seniorityScore,
    });

    const suggestions = this.generateSuggestions(
      content,
      job.description || ""
    );

    // Store evaluation result
    await this.env.DB.prepare(
      `
      INSERT INTO document_evaluations (
        document_id, job_id, overall_score, section_scores, 
        feedback, suggestions, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `
    )
      .bind(
        documentId,
        jobId,
        overallScore,
        JSON.stringify({
          keywordScore,
          actionVerbScore,
          impactScore,
          brevityScore,
          structureScore,
          seniorityScore,
        }),
        feedback,
        JSON.stringify(suggestions)
      )
      .run();

    return {
      document_id: documentId,
      job_id: jobId,
      overall_score: overallScore,
      section_scores: {
        keywordScore,
        actionVerbScore,
        impactScore,
        brevityScore,
        structureScore,
        seniorityScore,
      },
      feedback,
      suggestions,
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Generate embedding for text
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.env.AI.run(this.env.EMBEDDING_MODEL as any, {
      text: text,
    });

    if (response && response.data && Array.isArray(response.data[0])) {
      return response.data[0];
    }

    throw new Error("Failed to generate embedding");
  }

  /**
   * Get document by ID
   */
  private async getDocumentById(
    id: number
  ): Promise<ApplicantDocumentWithSections | null> {
    const document = await this.env.DB.prepare(
      `
      SELECT * FROM applicant_documents WHERE id = ?
    `
    )
      .bind(id)
      .first();

    if (!document) {
      return null;
    }

    // Get resume sections if it's a resume
    let resumeSections = null;
    if (document.doc_type === "resume") {
      const sections = await this.env.DB.prepare(
        `
        SELECT * FROM resume_sections WHERE document_id = ?
      `
      )
        .bind(id)
        .first();
      resumeSections = sections;
    }

    return {
      ...document,
      resume_sections: resumeSections,
      editor_json_url: null,
    };
  }

  /**
   * Get document content from R2
   */
  private async getDocumentContent(
    document: ApplicantDocumentWithSections
  ): Promise<string | null> {
    if (!document.r2_key_md) {
      return null;
    }

    try {
      const object = await this.env.R2.get(document.r2_key_md);
      return (await object?.text()) || null;
    } catch (error) {
      console.error("Error fetching document content:", error);
      return null;
    }
  }

  /**
   * Generate highlights for search results
   */
  private generateHighlights(
    document: ApplicantDocumentWithSections,
    query: string
  ): string[] {
    const highlights: string[] = [];
    const queryLower = query.toLowerCase();

    // Search in title
    if (document.title && document.title.toLowerCase().includes(queryLower)) {
      highlights.push(`Title: ${document.title}`);
    }

    // Search in resume sections
    if (document.resume_sections) {
      const sections = Object.entries(document.resume_sections);
      for (const [sectionName, content] of sections) {
        if (content && content.toLowerCase().includes(queryLower)) {
          highlights.push(`${sectionName}: ${content.substring(0, 100)}...`);
        }
      }
    }

    return highlights.slice(0, 3); // Limit to 3 highlights
  }

  /**
   * Score keywords match between resume and job description
   */
  private scoreKeywords(resume: string, job: string): number {
    const resumeWords = new Set(resume.toLowerCase().split(/\W+/));
    const jobWords = new Set(job.toLowerCase().split(/\W+/));

    const commonWords = [...resumeWords].filter((word) => jobWords.has(word));
    return Math.min((commonWords.length / jobWords.size) * 100, 100);
  }

  /**
   * Score action verbs in resume
   */
  private scoreActionVerbs(resume: string): number {
    const actionVerbs = [
      "achieved",
      "accomplished",
      "analyzed",
      "built",
      "created",
      "delivered",
      "developed",
      "executed",
      "implemented",
      "improved",
      "increased",
      "led",
      "managed",
      "optimized",
      "produced",
      "reduced",
      "solved",
      "transformed",
    ];

    const resumeLower = resume.toLowerCase();
    const foundVerbs = actionVerbs.filter((verb) => resumeLower.includes(verb));
    return Math.min((foundVerbs.length / actionVerbs.length) * 100, 100);
  }

  /**
   * Score impact statements in resume
   */
  private scoreImpact(resume: string): number {
    const impactPatterns = [
      /\d+%/g, // Percentage improvements
      /\$\d+[KMB]?/g, // Dollar amounts
      /\d+x/g, // Multipliers
      /increased|decreased|improved|reduced|saved|generated/g,
    ];

    let score = 0;
    impactPatterns.forEach((pattern) => {
      const matches = resume.match(pattern);
      if (matches) score += matches.length * 10;
    });

    return Math.min(score, 100);
  }

  /**
   * Score brevity (not too long, not too short)
   */
  private scoreBrevity(resume: string): number {
    const wordCount = resume.split(/\s+/).length;

    if (wordCount < 200) return 30; // Too short
    if (wordCount > 800) return 50; // Too long
    if (wordCount >= 300 && wordCount <= 600) return 100; // Optimal
    return 70; // Acceptable
  }

  /**
   * Score structure and formatting
   */
  private scoreStructure(resume: string): number {
    const hasSections = /(experience|education|skills|summary|projects)/i.test(
      resume
    );
    const hasBulletPoints = /•|\*|\-/.test(resume);
    const hasDates = /\d{4}/.test(resume);
    const hasContactInfo = /@|phone|email/i.test(resume);

    let score = 0;
    if (hasSections) score += 25;
    if (hasBulletPoints) score += 25;
    if (hasDates) score += 25;
    if (hasContactInfo) score += 25;

    return score;
  }

  /**
   * Score seniority level match
   */
  private scoreSeniority(resume: string, job: string): number {
    const seniorKeywords = [
      "senior",
      "lead",
      "principal",
      "director",
      "manager",
      "executive",
    ];
    const juniorKeywords = [
      "junior",
      "entry",
      "associate",
      "intern",
      "trainee",
    ];

    const resumeLower = resume.toLowerCase();
    const jobLower = job.toLowerCase();

    const resumeSenior = seniorKeywords.some((keyword) =>
      resumeLower.includes(keyword)
    );
    const jobSenior = seniorKeywords.some((keyword) =>
      jobLower.includes(keyword)
    );
    const resumeJunior = juniorKeywords.some((keyword) =>
      resumeLower.includes(keyword)
    );
    const jobJunior = juniorKeywords.some((keyword) =>
      jobLower.includes(keyword)
    );

    if (resumeSenior && jobSenior) return 100;
    if (resumeJunior && jobJunior) return 100;
    if (resumeSenior && jobJunior) return 30;
    if (resumeJunior && jobSenior) return 30;
    return 70; // Neutral
  }

  /**
   * Generate feedback based on scores
   */
  private generateFeedback(scores: any): string {
    const feedback = [];

    if (scores.keywordScore < 30) {
      feedback.push(
        "Consider adding more relevant keywords from the job description."
      );
    }
    if (scores.actionVerbScore < 50) {
      feedback.push(
        "Use more strong action verbs to describe your achievements."
      );
    }
    if (scores.impactScore < 40) {
      feedback.push("Include more quantifiable achievements and metrics.");
    }
    if (scores.brevityScore < 60) {
      feedback.push("Consider adjusting the length - aim for 300-600 words.");
    }
    if (scores.structureScore < 70) {
      feedback.push(
        "Improve the structure with clear sections and bullet points."
      );
    }

    return feedback.length > 0
      ? feedback.join(" ")
      : "Your resume looks great!";
  }

  /**
   * Generate specific suggestions for improvement
   */
  private generateSuggestions(
    resume: string,
    jobDescription: string
  ): string[] {
    const suggestions = [];

    // Extract key skills from job description
    const jobSkills =
      jobDescription.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    const resumeSkills =
      resume.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];

    const missingSkills = jobSkills.filter(
      (skill) =>
        !resumeSkills.some((resumeSkill) =>
          resumeSkill.toLowerCase().includes(skill.toLowerCase())
        )
    );

    if (missingSkills.length > 0) {
      suggestions.push(
        `Consider adding these skills: ${missingSkills.slice(0, 3).join(", ")}`
      );
    }

    return suggestions;
  }
}

/**
 * Create a document search service instance
 */
export function createDocumentSearchService(env: Env): DocumentSearchService {
  return new DocumentSearchService(env);
}
