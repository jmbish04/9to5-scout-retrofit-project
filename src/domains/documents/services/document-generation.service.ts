/**
 * Document Generation Service
 *
 * Handles AI-powered document generation, including resume and cover letter creation,
 * document templates, and content optimization.
 */

import type { Env } from "../../../config/env";
import type {
  ApplicantDocumentWithSections,
  DocumentGenerationInput,
  DocumentPurpose,
  DocumentTemplate,
  DocumentType,
  ResumeSections,
} from "../types/document.types";

export class DocumentGenerationService {
  constructor(private env: Env) {}

  /**
   * Generate a document for a specific job
   */
  async generateDocumentForJob(
    input: DocumentGenerationInput
  ): Promise<ApplicantDocumentWithSections> {
    const { user_id, doc_type, job_id, purpose, title, prompt, sections } =
      input;

    // Get job details if job_id is provided
    let jobDetails = null;
    if (job_id) {
      jobDetails = await this.env.DB.prepare(
        `
        SELECT * FROM jobs WHERE id = ?
      `
      )
        .bind(job_id)
        .first();
    }

    // Generate content based on document type
    let generatedContent: string;
    let generatedSections: ResumeSections | null = null;

    if (doc_type === "resume") {
      const result = await this.generateResumeContent(
        jobDetails,
        prompt,
        sections
      );
      generatedContent = result.content;
      generatedSections = result.sections;
    } else if (doc_type === "cover_letter") {
      generatedContent = await this.generateCoverLetterContent(
        jobDetails,
        prompt
      );
    } else {
      throw new Error(`Unsupported document type: ${doc_type}`);
    }

    // Create the document
    const documentInput = {
      user_id,
      doc_type,
      purpose: purpose || "job_related",
      job_id: job_id || null,
      title: title || this.generateDocumentTitle(doc_type, jobDetails),
      content_md: generatedContent,
      sections: generatedSections,
    };

    // Use the document storage service to create the document
    const { createDocumentStorageService } = await import(
      "./document-storage.service"
    );
    const storageService = createDocumentStorageService(this.env);

    return await storageService.createDocument(documentInput);
  }

  /**
   * Generate resume content using AI
   */
  private async generateResumeContent(
    jobDetails: any,
    prompt?: string | null,
    existingSections?: ResumeSections | null
  ): Promise<{ content: string; sections: ResumeSections }> {
    const systemPrompt = this.buildResumeSystemPrompt(jobDetails);
    const userPrompt =
      prompt || this.buildResumeUserPrompt(jobDetails, existingSections);

    const response = await this.env.AI.run(
      this.env.DEFAULT_MODEL_REASONING as any,
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }
    );

    const generatedContent = response.response || "";

    // Parse sections from generated content
    const sections = this.parseResumeSections(generatedContent);

    return {
      content: generatedContent,
      sections,
    };
  }

  /**
   * Generate cover letter content using AI
   */
  private async generateCoverLetterContent(
    jobDetails: any,
    prompt?: string | null
  ): Promise<string> {
    const systemPrompt = this.buildCoverLetterSystemPrompt(jobDetails);
    const userPrompt = prompt || this.buildCoverLetterUserPrompt(jobDetails);

    const response = await this.env.AI.run(
      this.env.DEFAULT_MODEL_REASONING as any,
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }
    );

    return response.response || "";
  }

  /**
   * Build system prompt for resume generation
   */
  private buildResumeSystemPrompt(jobDetails: any): string {
    const jobContext = jobDetails
      ? `
Job Title: ${jobDetails.title || "N/A"}
Company: ${jobDetails.company || "N/A"}
Location: ${jobDetails.location || "N/A"}
Description: ${jobDetails.description || "N/A"}
`
      : "";

    return `You are an expert resume writer and career coach. Generate a professional, ATS-friendly resume that highlights the candidate's qualifications and matches the job requirements.

${jobContext}

Guidelines:
- Use strong action verbs and quantifiable achievements
- Include relevant keywords from the job description
- Structure content with clear sections (Summary, Experience, Education, Skills, etc.)
- Keep formatting clean and professional
- Ensure ATS compatibility
- Focus on accomplishments, not just responsibilities
- Use industry-standard section headers

Return the resume in markdown format with clear section headers.`;
  }

  /**
   * Build user prompt for resume generation
   */
  private buildResumeUserPrompt(
    jobDetails: any,
    existingSections?: ResumeSections | null
  ): string {
    let prompt =
      "Please generate a professional resume based on the following information:\n\n";

    if (existingSections) {
      prompt += "Existing resume sections:\n";
      Object.entries(existingSections).forEach(([key, value]) => {
        if (value) {
          prompt += `${key}: ${value}\n`;
        }
      });
      prompt += "\nPlease enhance and improve these sections.\n\n";
    } else {
      prompt +=
        "Please create a comprehensive resume with the following sections:\n";
      prompt += "- Professional Summary\n";
      prompt += "- Work Experience\n";
      prompt += "- Education\n";
      prompt += "- Skills\n";
      prompt += "- Projects (if applicable)\n\n";
    }

    if (jobDetails) {
      prompt += `Target job requirements:\n`;
      prompt += `Title: ${jobDetails.title}\n`;
      prompt += `Company: ${jobDetails.company}\n`;
      prompt += `Key requirements: ${jobDetails.description?.substring(
        0,
        500
      )}...\n\n`;
    }

    prompt +=
      "Please generate a professional, ATS-optimized resume in markdown format.";

    return prompt;
  }

  /**
   * Build system prompt for cover letter generation
   */
  private buildCoverLetterSystemPrompt(jobDetails: any): string {
    const jobContext = jobDetails
      ? `
Job Title: ${jobDetails.title || "N/A"}
Company: ${jobDetails.company || "N/A"}
Location: ${jobDetails.location || "N/A"}
Description: ${jobDetails.description || "N/A"}
`
      : "";

    return `You are an expert cover letter writer. Generate a compelling, personalized cover letter that demonstrates the candidate's enthusiasm and qualifications for the position.

${jobContext}

Guidelines:
- Write in a professional but engaging tone
- Show knowledge of the company and role
- Highlight relevant experience and achievements
- Demonstrate enthusiasm and cultural fit
- Keep it concise (3-4 paragraphs)
- Use specific examples when possible
- Address the hiring manager directly
- End with a strong call to action

Return the cover letter in markdown format.`;
  }

  /**
   * Build user prompt for cover letter generation
   */
  private buildCoverLetterUserPrompt(jobDetails: any): string {
    let prompt =
      "Please generate a compelling cover letter for the following position:\n\n";

    if (jobDetails) {
      prompt += `Job Title: ${jobDetails.title}\n`;
      prompt += `Company: ${jobDetails.company}\n`;
      prompt += `Location: ${jobDetails.location}\n`;
      prompt += `Description: ${jobDetails.description?.substring(
        0,
        1000
      )}...\n\n`;
    }

    prompt += "Please create a personalized cover letter that:\n";
    prompt += "- Demonstrates enthusiasm for the role\n";
    prompt += "- Highlights relevant qualifications\n";
    prompt += "- Shows knowledge of the company\n";
    prompt += "- Includes specific examples of achievements\n";
    prompt += "- Maintains a professional yet engaging tone\n\n";
    prompt += "Return the cover letter in markdown format.";

    return prompt;
  }

  /**
   * Parse resume sections from generated content
   */
  private parseResumeSections(content: string): ResumeSections {
    const sections: ResumeSections = {};

    // Common section headers
    const sectionPatterns = {
      summary: /(?:summary|profile|about|overview)/i,
      contact: /(?:contact|personal|info)/i,
      skills: /(?:skills|technical|technologies)/i,
      experience: /(?:experience|work|employment|career)/i,
      education: /(?:education|academic|qualifications)/i,
      projects: /(?:projects|portfolio|work)/i,
      certifications: /(?:certifications|certificates|credentials)/i,
      extras: /(?:additional|other|extras|interests)/i,
    };

    const lines = content.split("\n");
    let currentSection: keyof ResumeSections | null = null;
    let sectionContent: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Check if this line is a section header
      let foundSection = false;
      for (const [sectionName, pattern] of Object.entries(sectionPatterns)) {
        if (pattern.test(trimmedLine) && trimmedLine.length < 50) {
          // Save previous section
          if (currentSection && sectionContent.length > 0) {
            sections[currentSection] = sectionContent.join("\n").trim();
          }

          // Start new section
          currentSection = sectionName as keyof ResumeSections;
          sectionContent = [];
          foundSection = true;
          break;
        }
      }

      if (!foundSection && currentSection && trimmedLine) {
        sectionContent.push(line);
      }
    }

    // Save the last section
    if (currentSection && sectionContent.length > 0) {
      sections[currentSection] = sectionContent.join("\n").trim();
    }

    return sections;
  }

  /**
   * Generate a document title
   */
  private generateDocumentTitle(docType: string, jobDetails: any): string {
    const timestamp = new Date().toLocaleDateString();

    if (jobDetails) {
      return `${docType.replace("_", " ")} - ${jobDetails.company} - ${
        jobDetails.title
      } - ${timestamp}`;
    }

    return `${docType.replace("_", " ")} - ${timestamp}`;
  }

  /**
   * Get available document templates
   */
  async getDocumentTemplates(docType?: string): Promise<DocumentTemplate[]> {
    let whereClause = "WHERE is_public = 1";
    const params: any[] = [];

    if (docType) {
      whereClause += " AND doc_type = ?";
      params.push(docType);
    }

    const templates = await this.env.DB.prepare(
      `
      SELECT * FROM document_templates 
      ${whereClause}
      ORDER BY created_at DESC
    `
    )
      .bind(...params)
      .all();

    return templates || [];
  }

  /**
   * Create a document from a template
   */
  async createDocumentFromTemplate(
    templateId: string,
    userId: string,
    jobId?: string
  ): Promise<ApplicantDocumentWithSections> {
    const template = await this.env.DB.prepare(
      `
      SELECT * FROM document_templates WHERE id = ?
    `
    )
      .bind(templateId)
      .first();

    if (!template) {
      throw new Error("Template not found");
    }

    // Get job details if provided
    let jobDetails = null;
    if (jobId) {
      jobDetails = await this.env.DB.prepare(
        `
        SELECT * FROM jobs WHERE id = ?
      `
      )
        .bind(jobId)
        .first();
    }

    // Generate content using the template
    const generatedContent = await this.generateContentFromTemplate(
      template,
      jobDetails
    );
    const generatedSections = template.sections;

    // Create the document
    const documentInput = {
      user_id: userId,
      doc_type: template.doc_type as DocumentType,
      purpose: "job_related" as DocumentPurpose,
      job_id: jobId || null,
      title: `${template.name} - ${new Date().toLocaleDateString()}`,
      content_md: generatedContent,
      sections: generatedSections,
    };

    const { createDocumentStorageService } = await import(
      "./document-storage.service"
    );
    const storageService = createDocumentStorageService(this.env);

    return await storageService.createDocument(documentInput);
  }

  /**
   * Generate content from a template
   */
  private async generateContentFromTemplate(
    template: DocumentTemplate,
    jobDetails: any
  ): Promise<string> {
    // For now, return the template content as-is
    // In a more sophisticated implementation, you might want to customize it based on job details
    return template.template_content;
  }
}

/**
 * Create a document generation service instance
 */
export function createDocumentGenerationService(
  env: Env
): DocumentGenerationService {
  return new DocumentGenerationService(env);
}
