/**
 * @file src/domains/agents/durable-objects/document-generation-agent.ts
 * @description Document generation agent for creating resumes and cover letters
 */

import { Agent } from "agents";
import type { Env } from "../../../config/env";
import { createPDFRenderingTool, createRAGTool } from "../../../shared/tools";

export interface DocumentGenerationAgentState {
  generatedDocuments: Array<{
    id: string;
    type: "resume" | "cover_letter";
    title: string;
    createdAt: string;
    metadata: any;
  }>;
  templates: Record<string, any>;
}

export class DocumentGenerationAgent extends Agent<
  Env,
  DocumentGenerationAgentState
> {
  private env: Env;
  private pdfTool: any;
  private ragTool: any;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.env = env;
    this.pdfTool = createPDFRenderingTool(env);
    this.ragTool = createRAGTool(env);
  }

  /**
   * @method generateResume
   * @description Generates a personalized resume using AI and RAG
   * @param {any} jobDescription - Target job description
   * @param {any} userProfile - User's profile and experience
   * @param {string} [template] - Resume template to use
   * @returns {Promise<any>} Generated resume data and PDF
   */
  public async generateResume(
    jobDescription: any,
    userProfile: any,
    template: string = "modern"
  ): Promise<any> {
    try {
      // Use RAG to find relevant job market insights
      const insights = await this.ragTool.getJobMarketInsights(
        jobDescription.title || jobDescription.position || "software engineer"
      );

      // Generate personalized resume content using AI
      const resumeContent = await this.generateResumeContent(
        jobDescription,
        userProfile,
        insights
      );

      // Generate PDF
      const pdfResult = await this.pdfTool.generateResume(
        resumeContent,
        template,
        {
          format: "A4",
          orientation: "portrait",
          printBackground: true,
        }
      );

      // Store document reference
      const documentId = crypto.randomUUID();
      await this.storeDocumentReference(
        documentId,
        "resume",
        resumeContent,
        pdfResult
      );

      return {
        success: true,
        documentId,
        resumeData: resumeContent,
        pdf: pdfResult.pdf,
        metadata: pdfResult.metadata,
        insights,
      };
    } catch (error) {
      console.error("Resume generation error:", error);
      throw new Error(
        `Resume generation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * @method generateCoverLetter
   * @description Generates a personalized cover letter using AI and RAG
   * @param {any} jobDescription - Target job description
   * @param {any} userProfile - User's profile and experience
   * @param {string} [template] - Cover letter template to use
   * @returns {Promise<any>} Generated cover letter data and PDF
   */
  public async generateCoverLetter(
    jobDescription: any,
    userProfile: any,
    template: string = "professional"
  ): Promise<any> {
    try {
      // Use RAG to find relevant context
      const context = await this.ragTool.retrieveContext(
        `${jobDescription.title || jobDescription.position} ${
          jobDescription.company || ""
        }`,
        "job_opening",
        3
      );

      // Generate personalized cover letter content using AI
      const coverLetterContent = await this.generateCoverLetterContent(
        jobDescription,
        userProfile,
        context
      );

      // Generate PDF
      const pdfResult = await this.pdfTool.generateCoverLetter(
        coverLetterContent,
        template,
        {
          format: "A4",
          orientation: "portrait",
          printBackground: true,
        }
      );

      // Store document reference
      const documentId = crypto.randomUUID();
      await this.storeDocumentReference(
        documentId,
        "cover_letter",
        coverLetterContent,
        pdfResult
      );

      return {
        success: true,
        documentId,
        coverLetterData: coverLetterContent,
        pdf: pdfResult.pdf,
        metadata: pdfResult.metadata,
        context: context.results,
      };
    } catch (error) {
      console.error("Cover letter generation error:", error);
      throw new Error(
        `Cover letter generation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * @method generateResumeContent
   * @description Uses AI to generate personalized resume content
   * @param {any} jobDescription - Target job description
   * @param {any} userProfile - User's profile
   * @param {any} insights - Job market insights
   * @returns {Promise<any>} Generated resume data
   */
  private async generateResumeContent(
    jobDescription: any,
    userProfile: any,
    insights: any
  ): Promise<any> {
    const prompt = `
Generate a personalized resume for the following job description and user profile.

Job Description:
${JSON.stringify(jobDescription, null, 2)}

User Profile:
${JSON.stringify(userProfile, null, 2)}

Job Market Insights:
${JSON.stringify(insights, null, 2)}

Please generate a resume that:
1. Highlights relevant skills and experience for this specific role
2. Uses keywords from the job description
3. Quantifies achievements where possible
4. Tailors the professional summary to the role
5. Emphasizes relevant projects and accomplishments

Return the resume data in the following JSON format:
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "location": "string",
  "linkedin": "string",
  "summary": "string",
  "experience": [
    {
      "title": "string",
      "company": "string",
      "startDate": "string",
      "endDate": "string",
      "description": "string",
      "achievements": ["string"]
    }
  ],
  "education": [
    {
      "degree": "string",
      "school": "string",
      "year": "string"
    }
  ],
  "skills": ["string"]
}
`;

    const response = await this.env.AI.run(
      this.env.DEFAULT_MODEL_REASONING || "@cf/meta/llama-3.1-8b-instruct",
      {
        messages: [
          {
            role: "system",
            content:
              "You are an expert resume writer and career advisor. Generate professional, tailored resumes that help candidates stand out to employers.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }
    );

    try {
      const resumeData = JSON.parse(
        (response as any).response || (response as any).message || "{}"
      );
      return resumeData;
    } catch (error) {
      console.error("Failed to parse resume content:", error);
      // Return a fallback resume structure
      return {
        name: userProfile.name || "Your Name",
        email: userProfile.email || "",
        phone: userProfile.phone || "",
        location: userProfile.location || "",
        linkedin: userProfile.linkedin || "",
        summary: `Experienced professional with ${
          userProfile.experience || 0
        } years of experience in ${jobDescription.title || "relevant field"}.`,
        experience: userProfile.experience || [],
        education: userProfile.education || [],
        skills: userProfile.skills || [],
      };
    }
  }

  /**
   * @method generateCoverLetterContent
   * @description Uses AI to generate personalized cover letter content
   * @param {any} jobDescription - Target job description
   * @param {any} userProfile - User's profile
   * @param {any} context - Retrieved context
   * @returns {Promise<any>} Generated cover letter data
   */
  private async generateCoverLetterContent(
    jobDescription: any,
    userProfile: any,
    context: any
  ): Promise<any> {
    const prompt = `
Generate a personalized cover letter for the following job description and user profile.

Job Description:
${JSON.stringify(jobDescription, null, 2)}

User Profile:
${JSON.stringify(userProfile, null, 2)}

Relevant Context:
${JSON.stringify(context, null, 2)}

Please generate a cover letter that:
1. Addresses the hiring manager by name if available
2. Shows enthusiasm for the specific role and company
3. Highlights 2-3 most relevant achievements
4. Demonstrates knowledge of the company/role
5. Connects user's experience to job requirements
6. Has a strong opening and closing

Return the cover letter data in the following JSON format:
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "location": "string",
  "hiringManager": "string",
  "company": "string",
  "position": "string",
  "address": "string",
  "opening": "string",
  "body": "string",
  "closing": "string"
}
`;

    const response = await this.env.AI.run(
      this.env.DEFAULT_MODEL_REASONING || "@cf/meta/llama-3.1-8b-instruct",
      {
        messages: [
          {
            role: "system",
            content:
              "You are an expert cover letter writer and career advisor. Generate compelling, personalized cover letters that help candidates make a strong impression.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }
    );

    try {
      const coverLetterData = JSON.parse(
        (response as any).response || (response as any).message || "{}"
      );
      return coverLetterData;
    } catch (error) {
      console.error("Failed to parse cover letter content:", error);
      // Return a fallback cover letter structure
      return {
        name: userProfile.name || "Your Name",
        email: userProfile.email || "",
        phone: userProfile.phone || "",
        location: userProfile.location || "",
        hiringManager: "Hiring Manager",
        company: jobDescription.company || "Company",
        position: jobDescription.title || jobDescription.position || "Position",
        address: "",
        opening: `I am writing to express my strong interest in the ${
          jobDescription.title || "position"
        } at ${jobDescription.company || "your company"}.`,
        body: `With my background in ${
          userProfile.experience || "relevant field"
        }, I am excited about the opportunity to contribute to your team.`,
        closing:
          "Thank you for your consideration. I look forward to hearing from you.",
      };
    }
  }

  /**
   * @method storeDocumentReference
   * @description Stores document reference in state
   * @param {string} documentId - Document ID
   * @param {string} type - Document type
   * @param {any} content - Document content
   * @param {any} pdfResult - PDF generation result
   */
  private async storeDocumentReference(
    documentId: string,
    type: "resume" | "cover_letter",
    content: any,
    pdfResult: any
  ): Promise<void> {
    const state = (await this.ctx.storage.get<DocumentGenerationAgentState>(
      "state"
    )) || {
      generatedDocuments: [],
      templates: {},
    };

    state.generatedDocuments.push({
      id: documentId,
      type,
      title: content.title || `${type} for ${content.position || "position"}`,
      createdAt: new Date().toISOString(),
      metadata: {
        content,
        pdfSize: pdfResult.metadata.size,
        generatedAt: pdfResult.metadata.generatedAt,
      },
    });

    await this.ctx.storage.put("state", state);
  }

  /**
   * @method getGeneratedDocuments
   * @description Gets list of generated documents
   * @returns {Promise<any[]>} List of generated documents
   */
  public async getGeneratedDocuments(): Promise<any[]> {
    const state = (await this.ctx.storage.get<DocumentGenerationAgentState>(
      "state"
    )) || {
      generatedDocuments: [],
      templates: {},
    };
    return state.generatedDocuments;
  }

  /**
   * @method getDocument
   * @description Gets a specific document by ID
   * @param {string} documentId - Document ID
   * @returns {Promise<any>} Document data
   */
  public async getDocument(documentId: string): Promise<any> {
    const state = (await this.ctx.storage.get<DocumentGenerationAgentState>(
      "state"
    )) || {
      generatedDocuments: [],
      templates: {},
    };

    return state.generatedDocuments.find((doc) => doc.id === documentId);
  }
}
