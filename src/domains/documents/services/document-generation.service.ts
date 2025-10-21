/**
 * @module src/domains/documents/services/document-generation.service.ts
 * @description
 * Service for generating AI-powered documents like cover letters and resumes.
 */

import {
  CoverLetterRequest,
  CoverLetterContent,
  CoverLetterContentSchema,
  ResumeRequest,
  ResumeContent,
  ResumeContentSchema,
  DocumentGenerationInput, // Assuming this type is defined
} from '../types';
import { DocumentParsingService } from './document-parsing.service';
import { DocumentStorageService } from './document-storage.service';
import type { ApplicantDocumentWithSections } from '../types'; // Assuming this type

export interface AiEnv {
  AI: Ai;
  DB: D1Database; // For fetching job/profile data
}

export class DocumentGenerationService {
  private env: AiEnv;
  private parsingService: DocumentParsingService;
  private storageService: DocumentStorageService;

  constructor(env: AiEnv) {
    this.env = env;
    this.parsingService = new DocumentParsingService();
    this.storageService = new DocumentStorageService(env);
  }

  // ... generateCoverLetter and generateResumeContent methods from before ...

  /**
   * Generates a full document (resume or cover letter) for a specific job,
   * parses it into sections, and saves it to the database.
   * This replaces the old monolithic function.
   */
  async generateDocumentForJob(input: DocumentGenerationInput): Promise<ApplicantDocumentWithSections> {
    const documentTypeLabel = input.doc_type === "resume" ? "resume" : "cover letter";
    
    // Step 1: Fetch context data (job and user profile)
    const jobMarkdown = await this.fetchJobMarkdown(input.job_id);
    const profileSummary = await this.buildUserProfileSummary(input.user_id);

    // Step 2: Construct the prompt and call the AI
    const prompt = `Create a tailored ${documentTypeLabel} in Markdown.\n\nUser Profile:\n${profileSummary}\n\nJob Description:\n${jobMarkdown}`;
    const generatedMarkdown = await this.callDocumentGenerator(prompt);

    // Step 3: Use the new, robust parsing service
    const sections = this.parsingService.parseResumeSections(generatedMarkdown);

    // Step 4: Use the new storage service to save the document
    const documentToCreate = {
      user_id: input.user_id,
      doc_type: input.doc_type,
      purpose: "job_related",
      job_id: input.job_id,
      title: `${documentTypeLabel} for ${input.job_id}`,
      content_md: generatedMarkdown,
      sections,
    };

    return this.storageService.createApplicantDocument(documentToCreate);
  }

  private async fetchJobMarkdown(jobId: string): Promise<string> {
    const job: { description_md: string; requirements_md: string; title: string; company: string; } | null = 
      await this.env.DB.prepare("SELECT description_md, requirements_md, title, company FROM jobs WHERE id = ?1")
        .bind(jobId)
        .first();
    if (!job) throw new Error("Job not found");
    return [job.title && `# ${job.title}`, job.company && `**Company:** ${job.company}`, job.description_md, job.requirements_md]
      .filter(Boolean).join('\n\n');
  }

  private async buildUserProfileSummary(userId: string): Promise<string> {
    const profile: { name: string; current_title: string; target_roles: string; skills: string; } | null = 
      await this.env.DB.prepare("SELECT name, current_title, target_roles, skills FROM applicant_profiles WHERE user_id = ?1")
        .bind(userId)
        .first();
    const lines: string[] = [];
    if (profile?.name) lines.push(`Name: ${profile.name}`);
    if (profile?.current_title) lines.push(`Current Title: ${profile.current_title}`);
    if (profile?.target_roles) lines.push(`Target Roles: ${profile.target_roles}`);
    if (profile?.skills) lines.push(`Skills: ${profile.skills}`);
    return lines.join('\n');
  }

  private async callDocumentGenerator(prompt: string): Promise<string> {
    const response = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: "You craft ATS-friendly professional documents using Markdown formatting." },
        { role: "user", content: prompt },
      ],
    });
    return (response as any)?.response || "";
  }
}
