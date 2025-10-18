/**
 * @fileoverview Career Coach and Talent Agent
 *
 * A Cloudflare Agents SDK agent that helps applicants create, update, adjust,
 * and optimize their profiles. Provides CRUD tools for applicant profiles with
 * soft delete and confirmation-based changes.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { Agent } from "agents";
import type { Env } from "../config/env/env.config";

/**
 * Environment interface for Career Coach Agent
 */
export interface CareerCoachAgentEnv extends Env {
  DB: D1Database;
  AI: any;
  DEFAULT_MODEL_REASONING: string;
  CAREER_COACH_AGENT: DurableObjectNamespace;
}

/**
 * Profile change data
 */
export interface ProfileChange {
  change_type: "create" | "update" | "delete";
  table_name: string;
  record_id?: string;
  old_values?: Record<string, any>;
  new_values: Record<string, any>;
  change_reason: string;
  ai_suggested: boolean;
}

/**
 * Document analysis request
 */
export interface DocumentAnalysisRequest {
  profile_id: string;
  document_type: "resume" | "cover_letter" | "portfolio";
  content: string;
  analysis_type?: "general" | "job_specific";
  job_description?: string;
}

/**
 * Interview preparation request
 */
export interface InterviewPrepRequest {
  profile_id: string;
  job_id?: string;
  prep_type: "general" | "technical" | "behavioral" | "company_specific";
  job_description?: string;
  company_name?: string;
}

/**
 * Career Coach and Talent Agent
 *
 * Helps applicants manage their profiles, analyze documents,
 * and prepare for interviews using AI-powered insights.
 */
export class CareerCoachAgent extends Agent<CareerCoachAgentEnv> {
  private db: D1Database;
  private ai: any;
  private model: string;

  constructor(ctx: any, env: CareerCoachAgentEnv) {
    super(ctx, env);
    this.db = env.DB;
    this.ai = env.AI;
    this.model = env.DEFAULT_MODEL_REASONING;
  }

  /**
   * Handles HTTP requests to the agent
   *
   * @param request - The incoming request
   * @returns Response with agent results
   */
  async onRequest(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const method = request.method;
      const path = url.pathname;

      // Route requests based on path
      if (path === "/profile" && method === "GET") {
        return await this.getProfile(request);
      } else if (path === "/profile" && method === "POST") {
        return await this.createProfile(request);
      } else if (path === "/profile" && method === "PUT") {
        return await this.updateProfile(request);
      } else if (path === "/profile" && method === "DELETE") {
        return await this.deleteProfile(request);
      } else if (path === "/analyze-document" && method === "POST") {
        return await this.analyzeDocument(request);
      } else if (path === "/interview-prep" && method === "POST") {
        return await this.prepareForInterview(request);
      } else if (path === "/linkedin-consultation" && method === "POST") {
        return await this.linkedinConsultation(request);
      } else if (path === "/approve-changes" && method === "POST") {
        return await this.approveChanges(request);
      } else if (path === "/chat" && method === "POST") {
        return await this.chatWithAgent(request);
      } else {
        return new Response("Not Found", { status: 404 });
      }
    } catch (error) {
      console.error("Error in CareerCoachAgent request handler:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  /**
   * Gets an applicant profile
   *
   * @param request - The request containing user_id
   * @returns Profile data
   */
  private async getProfile(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const userId = url.searchParams.get("user_id");

      if (!userId) {
        return new Response(JSON.stringify({ error: "user_id is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Get profile with all related data
      const profile = await this.db
        .prepare(
          `
        SELECT * FROM applicant_profiles WHERE user_id = ? AND is_active = 1
      `
        )
        .bind(userId)
        .first();

      if (!profile) {
        return new Response(JSON.stringify({ error: "Profile not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Get related data
      const [jobHistory, skills, careerGoals, industryInterests, salaryGoals] =
        await Promise.all([
          this.db
            .prepare(
              "SELECT * FROM job_history WHERE profile_id = ? AND is_confirmed = 1"
            )
            .bind(profile.id)
            .all(),
          this.db
            .prepare(
              "SELECT * FROM skills WHERE profile_id = ? AND is_confirmed = 1"
            )
            .bind(profile.id)
            .all(),
          this.db
            .prepare(
              "SELECT * FROM career_goals WHERE profile_id = ? AND is_confirmed = 1"
            )
            .bind(profile.id)
            .all(),
          this.db
            .prepare(
              "SELECT * FROM industry_interests WHERE profile_id = ? AND is_confirmed = 1"
            )
            .bind(profile.id)
            .all(),
          this.db
            .prepare(
              "SELECT * FROM salary_goals WHERE profile_id = ? AND is_confirmed = 1"
            )
            .bind(profile.id)
            .all(),
        ]);

      return new Response(
        JSON.stringify({
          profile,
          job_history: jobHistory.results,
          skills: skills.results,
          career_goals: careerGoals.results,
          industry_interests: industryInterests.results,
          salary_goals: salaryGoals.results,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error getting profile:", error);
      return new Response(JSON.stringify({ error: "Failed to get profile" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  /**
   * Creates a new applicant profile
   *
   * @param request - The request containing profile data
   * @returns Created profile data
   */
  private async createProfile(request: Request): Promise<Response> {
    try {
      const data = (await request.json()) as any;
      const profileId = crypto.randomUUID();
      const now = new Date().toISOString();

      // Create profile
      await this.db
        .prepare(
          `
        INSERT INTO applicant_profiles (
          id, user_id, email, first_name, last_name, phone, linkedin_url,
          github_url, portfolio_url, location, timezone, current_title,
          current_company, years_experience, is_active, is_confirmed,
          created_at, updated_at, last_activity_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .bind(
          profileId,
          data.user_id,
          data.email,
          data.first_name || null,
          data.last_name || null,
          data.phone || null,
          data.linkedin_url || null,
          data.github_url || null,
          data.portfolio_url || null,
          data.location || null,
          data.timezone || null,
          data.current_title || null,
          data.current_company || null,
          data.years_experience || null,
          1, // is_active
          0, // is_confirmed (requires approval)
          now,
          now,
          now
        )
        .run();

      // Log the change
      await this.logProfileChange(profileId, {
        change_type: "create",
        table_name: "applicant_profiles",
        new_values: data,
        change_reason: "Profile created via API",
        ai_suggested: false,
      });

      return new Response(
        JSON.stringify({
          id: profileId,
          message: "Profile created successfully. Awaiting confirmation.",
          requires_approval: true,
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error creating profile:", error);
      return new Response(
        JSON.stringify({ error: "Failed to create profile" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  /**
   * Updates an applicant profile
   *
   * @param request - The request containing update data
   * @returns Updated profile data
   */
  private async updateProfile(request: Request): Promise<Response> {
    try {
      const data = (await request.json()) as any;
      const { user_id, updates } = data;

      if (!user_id || !updates) {
        return new Response(
          JSON.stringify({ error: "user_id and updates are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Get current profile
      const currentProfile = (await this.db
        .prepare(
          `
        SELECT * FROM applicant_profiles WHERE user_id = ? AND is_active = 1
      `
        )
        .bind(user_id)
        .first()) as any;

      if (!currentProfile) {
        return new Response(JSON.stringify({ error: "Profile not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Update profile
      const updateFields = Object.keys(updates)
        .map((key) => `${key} = ?`)
        .join(", ");
      const updateValues = Object.values(updates);
      updateValues.push(new Date().toISOString(), currentProfile.id);

      await this.db
        .prepare(
          `
        UPDATE applicant_profiles 
        SET ${updateFields}, updated_at = ?, is_confirmed = 0
        WHERE id = ?
      `
        )
        .bind(...updateValues)
        .run();

      // Log the change
      await this.logProfileChange(currentProfile.id || "", {
        change_type: "update",
        table_name: "applicant_profiles",
        record_id: currentProfile.id || "",
        old_values: currentProfile as Record<string, any>,
        new_values: updates as Record<string, any>,
        change_reason: "Profile updated via API",
        ai_suggested: false,
      });

      return new Response(
        JSON.stringify({
          message: "Profile updated successfully. Awaiting confirmation.",
          requires_approval: true,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error updating profile:", error);
      return new Response(
        JSON.stringify({ error: "Failed to update profile" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  /**
   * Soft deletes an applicant profile
   *
   * @param request - The request containing user_id
   * @returns Deletion confirmation
   */
  private async deleteProfile(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const userId = url.searchParams.get("user_id");

      if (!userId) {
        return new Response(JSON.stringify({ error: "user_id is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Get current profile
      const currentProfile = (await this.db
        .prepare(
          `
        SELECT * FROM applicant_profiles WHERE user_id = ? AND is_active = 1
      `
        )
        .bind(userId)
        .first()) as any;

      if (!currentProfile) {
        return new Response(JSON.stringify({ error: "Profile not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Soft delete (set is_active = 0)
      await this.db
        .prepare(
          `
        UPDATE applicant_profiles 
        SET is_active = 0, updated_at = ?
        WHERE id = ?
      `
        )
        .bind(new Date().toISOString(), currentProfile.id)
        .run();

      // Log the change
      await this.logProfileChange(currentProfile.id || "", {
        change_type: "delete",
        table_name: "applicant_profiles",
        record_id: currentProfile.id,
        old_values: currentProfile as Record<string, any>,
        new_values: { is_active: 0 } as Record<string, any>,
        change_reason: "Profile soft deleted via API",
        ai_suggested: false,
      });

      return new Response(
        JSON.stringify({
          message:
            "Profile deleted successfully (soft delete). Awaiting confirmation.",
          requires_approval: true,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error deleting profile:", error);
      return new Response(
        JSON.stringify({ error: "Failed to delete profile" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  /**
   * Analyzes a document (resume, cover letter, portfolio)
   *
   * @param request - The request containing document data
   * @returns Analysis results
   */
  private async analyzeDocument(request: Request): Promise<Response> {
    try {
      const data = (await request.json()) as DocumentAnalysisRequest;
      const {
        document_type,
        content,
        analysis_type = "general",
        job_description,
      } = data;

      // Generate AI analysis
      const analysisPrompt = this.buildDocumentAnalysisPrompt(
        document_type,
        content,
        analysis_type,
        job_description
      );

      const analysisResponse = await this.ai.run(this.model, {
        messages: [{ role: "user", content: analysisPrompt }],
      });

      const analysisResults = JSON.parse(analysisResponse.response || "{}");

      // Save analysis to database
      const analysisId = crypto.randomUUID();
      await this.db
        .prepare(
          `
        INSERT INTO document_analysis (
          id, profile_id, document_type, document_content,
          analysis_results, suggested_improvements, ai_confidence,
          is_confirmed, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .bind(
          analysisId,
          data.profile_id || null,
          document_type,
          content,
          JSON.stringify(analysisResults.analysis || {}),
          JSON.stringify(analysisResults.improvements || []),
          analysisResults.confidence || 0.8,
          0, // is_confirmed (requires approval)
          new Date().toISOString(),
          new Date().toISOString()
        )
        .run();

      return new Response(
        JSON.stringify({
          analysis_id: analysisId,
          analysis: analysisResults.analysis,
          improvements: analysisResults.improvements,
          confidence: analysisResults.confidence,
          requires_approval: true,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error analyzing document:", error);
      return new Response(
        JSON.stringify({ error: "Failed to analyze document" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  /**
   * Prepares for an interview
   *
   * @param request - The request containing interview prep data
   * @returns Interview preparation data
   */
  private async prepareForInterview(request: Request): Promise<Response> {
    try {
      const data = (await request.json()) as InterviewPrepRequest;
      const { job_id, prep_type, job_description, company_name } = data;

      // Generate interview questions and preparation
      const prepPrompt = this.buildInterviewPrepPrompt(
        prep_type,
        job_description,
        company_name
      );

      const prepResponse = await this.ai.run(this.model, {
        messages: [{ role: "user", content: prepPrompt }],
      });

      const prepData = JSON.parse(prepResponse.response || "{}");

      // Save preparation data
      const prepId = crypto.randomUUID();
      await this.db
        .prepare(
          `
        INSERT INTO interview_prep_data (
          id, profile_id, job_id, prep_type, questions, answers,
          feedback, score, is_confirmed, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .bind(
          prepId,
          data.profile_id || null,
          job_id || null,
          prep_type,
          JSON.stringify(prepData.questions || []),
          JSON.stringify(prepData.answers || []),
          JSON.stringify(prepData.feedback || {}),
          prepData.score || 0,
          0, // is_confirmed (requires approval)
          new Date().toISOString(),
          new Date().toISOString()
        )
        .run();

      return new Response(
        JSON.stringify({
          prep_id: prepId,
          questions: prepData.questions,
          answers: prepData.answers,
          feedback: prepData.feedback,
          score: prepData.score,
          requires_approval: true,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error preparing for interview:", error);
      return new Response(
        JSON.stringify({ error: "Failed to prepare for interview" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  /**
   * Provides LinkedIn profile consultation
   *
   * @param request - The request containing LinkedIn data
   * @returns Consultation results
   */
  private async linkedinConsultation(request: Request): Promise<Response> {
    try {
      const data = (await request.json()) as any;
      const { linkedin_url, current_profile } = data;

      // Generate LinkedIn optimization suggestions
      const consultationPrompt = this.buildLinkedInConsultationPrompt(
        linkedin_url,
        current_profile
      );

      const consultationResponse = await this.ai.run(this.model, {
        messages: [{ role: "user", content: consultationPrompt }],
      });

      const consultation = JSON.parse(consultationResponse.response || "{}");

      return new Response(
        JSON.stringify({
          suggestions: consultation.suggestions || [],
          improvements: consultation.improvements || [],
          score: consultation.score || 0,
          next_steps: consultation.next_steps || [],
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error providing LinkedIn consultation:", error);
      return new Response(
        JSON.stringify({ error: "Failed to provide LinkedIn consultation" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  /**
   * Approves pending changes
   *
   * @param request - The request containing approval data
   * @returns Approval confirmation
   */
  private async approveChanges(request: Request): Promise<Response> {
    try {
      const data = (await request.json()) as any;
      const { change_ids, approver_id, comments } = data;

      if (!change_ids || !Array.isArray(change_ids)) {
        return new Response(
          JSON.stringify({ error: "change_ids array is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const now = new Date().toISOString();
      const approvedChanges = [];

      for (const changeId of change_ids) {
        // Get the change
        const change = await this.db
          .prepare(
            `
          SELECT * FROM profile_changes WHERE id = ? AND is_confirmed = 0
        `
          )
          .bind(changeId)
          .first();

        if (!change) {
          continue;
        }

        // Create approval record
        const approvalId = crypto.randomUUID();
        await this.db
          .prepare(
            `
          INSERT INTO profile_approvals (
            id, profile_id, change_id, approver_id, status,
            comments, approved_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
          )
          .bind(
            approvalId,
            change.profile_id,
            changeId,
            approver_id || null,
            "approved",
            comments || null,
            now,
            now,
            now
          )
          .run();

        // Mark change as confirmed
        await this.db
          .prepare(
            `
          UPDATE profile_changes 
          SET is_confirmed = 1, updated_at = ?
          WHERE id = ?
        `
          )
          .bind(now, changeId)
          .run();

        // Apply the change to the actual record
        await this.applyProfileChange(change);

        approvedChanges.push(changeId);
      }

      return new Response(
        JSON.stringify({
          message: "Changes approved successfully",
          approved_changes: approvedChanges,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error approving changes:", error);
      return new Response(
        JSON.stringify({ error: "Failed to approve changes" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  /**
   * Chat with the agent for profile updates
   *
   * @param request - The request containing chat data
   * @returns Chat response
   */
  private async chatWithAgent(request: Request): Promise<Response> {
    try {
      const data = (await request.json()) as any;
      const { message, user_id, context } = data;

      // Build chat prompt with context
      const chatPrompt = this.buildChatPrompt(message, user_id, context);

      const chatResponse = await this.ai.run(this.model, {
        messages: [{ role: "user", content: chatPrompt }],
      });

      const response = JSON.parse(chatResponse.response || "{}");

      return new Response(
        JSON.stringify({
          response:
            response.message || "I'm here to help with your career profile!",
          suggestions: response.suggestions || [],
          actions: response.actions || [],
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error in chat:", error);
      return new Response(
        JSON.stringify({ error: "Failed to process chat message" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  /**
   * Logs a profile change
   */
  private async logProfileChange(
    profileId: string,
    change: ProfileChange
  ): Promise<void> {
    const changeId = crypto.randomUUID();
    await this.db
      .prepare(
        `
      INSERT INTO profile_changes (
        id, profile_id, change_type, table_name, record_id,
        old_values, new_values, change_reason, ai_suggested,
        is_confirmed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .bind(
        changeId,
        profileId,
        change.change_type,
        change.table_name,
        change.record_id || null,
        JSON.stringify(change.old_values || {}),
        JSON.stringify(change.new_values),
        change.change_reason,
        change.ai_suggested ? 1 : 0,
        0, // is_confirmed (requires approval)
        new Date().toISOString(),
        new Date().toISOString()
      )
      .run();
  }

  /**
   * Applies a profile change to the actual record
   */
  private async applyProfileChange(change: any): Promise<void> {
    // Implementation would depend on the specific change type
    // This is a simplified version
    console.log("Applying profile change:", change);
  }

  /**
   * Builds document analysis prompt
   */
  private buildDocumentAnalysisPrompt(
    documentType: string,
    content: string,
    analysisType: string,
    jobDescription?: string
  ): string {
    return `Analyze this ${documentType} and provide detailed feedback:

Document Content:
${content}

${
  jobDescription
    ? `Target Job Description:
${jobDescription}`
    : ""
}

Please provide:
1. Overall assessment and score (1-10)
2. Strengths identified
3. Areas for improvement
4. Specific suggestions for enhancement
5. ATS optimization recommendations
6. Confidence level (0-1)

Format as JSON with keys: analysis, improvements, confidence, score.`;
  }

  /**
   * Builds interview preparation prompt
   */
  private buildInterviewPrepPrompt(
    prepType: string,
    jobDescription?: string,
    companyName?: string
  ): string {
    return `Create ${prepType} interview preparation for ${
      companyName ? `a position at ${companyName}` : "a general interview"
    }:

${
  jobDescription
    ? `Job Description:
${jobDescription}`
    : ""
}

Please provide:
1. 10 relevant interview questions
2. Sample answers for each question
3. Key talking points
4. Questions to ask the interviewer
5. Preparation checklist
6. Overall preparation score (1-10)

Format as JSON with keys: questions, answers, feedback, score.`;
  }

  /**
   * Builds LinkedIn consultation prompt
   */
  private buildLinkedInConsultationPrompt(
    linkedinUrl: string,
    currentProfile?: any
  ): string {
    return `Provide LinkedIn profile optimization consultation:

LinkedIn URL: ${linkedinUrl}

${
  currentProfile
    ? `Current Profile Data:
${JSON.stringify(currentProfile, null, 2)}`
    : ""
}

Please provide:
1. Profile optimization suggestions
2. Headline improvements
3. Summary enhancements
4. Skills recommendations
5. Experience optimization tips
6. Overall profile score (1-10)
7. Next steps for improvement

Format as JSON with keys: suggestions, improvements, score, next_steps.`;
  }

  /**
   * Builds chat prompt
   */
  private buildChatPrompt(
    message: string,
    userId: string,
    context?: any
  ): string {
    return `You are a career coach AI assistant helping a user with their professional profile.

User ID: ${userId}
Message: ${message}

${context ? `Context: ${JSON.stringify(context, null, 2)}` : ""}

Please provide helpful, actionable advice for career development and profile optimization.
Be encouraging and specific in your recommendations.

Format as JSON with keys: message, suggestions, actions.`;
  }
}
