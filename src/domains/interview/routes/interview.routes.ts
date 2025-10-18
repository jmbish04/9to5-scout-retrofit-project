/**
 * Interview Domain Routes
 *
 * HTTP route handlers for interview preparation, coaching, and session management.
 * Provides RESTful API endpoints for interview sessions, question generation,
 * real-time coaching, and analytics within the 9to5 Scout application.
 *
 * @fileoverview This module defines HTTP route handlers for interview preparation
 * operations including session management, question generation, coaching, and analytics.
 */

import type { Env } from "../../config/env/env.config";
import {
  InterviewAnalyticsService,
  InterviewCoachingService,
  InterviewQuestionService,
  InterviewSessionService,
} from "../services/interview.service";
import type {
  CoachingRequest,
  InterviewConfig,
  InterviewPreparationRequest,
  QuestionGenerationRequest,
} from "../types/interview.types";

/**
 * Handle interview session creation
 *
 * @param request - The incoming HTTP request
 * @param env - Cloudflare Workers environment bindings
 * @returns Response with created session data
 *
 * @description Creates a new interview preparation session for a user
 * with job and company context.
 *
 * @example
 * ```typescript
 * // POST /api/interview/sessions
 * // Body: { userId: "user-123", jobId: "job-456", companyId: "company-789", sessionType: "technical" }
 * ```
 */
export async function handleCreateSession(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = (await request.json()) as InterviewPreparationRequest;

    if (!body.userId || !body.jobId || !body.companyId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: userId, jobId, companyId",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const config: InterviewConfig = {
      defaultSessionDuration: 60,
      maxQuestionsPerSession: 20,
      defaultDifficulty: "medium",
      enableRealTimeCoaching: true,
      enableVoiceAnalysis: false,
      enableVideoAnalysis: false,
      questionBankSize: 1000,
      feedbackDelay: 2000,
    };

    const service = new InterviewSessionService(config);
    const session = await service.createSession(env, body);

    return new Response(
      JSON.stringify({
        success: true,
        data: session,
        message: "Interview session created successfully",
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Session creation error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to create interview session",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handle interview session retrieval
 *
 * @param request - The incoming HTTP request
 * @param env - Cloudflare Workers environment bindings
 * @param sessionId - Session identifier from URL parameters
 * @returns Response with session data
 *
 * @description Retrieves a specific interview session by its ID
 * with all associated data.
 *
 * @example
 * ```typescript
 * // GET /api/interview/sessions/{sessionId}
 * ```
 */
export async function handleGetSession(
  request: Request,
  env: Env,
  sessionId: string
): Promise<Response> {
  try {
    const config: InterviewConfig = {
      defaultSessionDuration: 60,
      maxQuestionsPerSession: 20,
      defaultDifficulty: "medium",
      enableRealTimeCoaching: true,
      enableVoiceAnalysis: false,
      enableVideoAnalysis: false,
      questionBankSize: 1000,
      feedbackDelay: 2000,
    };

    const service = new InterviewSessionService(config);
    const session = await service.getSession(env, sessionId);

    if (!session) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Session not found",
          sessionId,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: session,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Session retrieval error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to retrieve session",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handle interview session status update
 *
 * @param request - The incoming HTTP request
 * @param env - Cloudflare Workers environment bindings
 * @param sessionId - Session identifier from URL parameters
 * @returns Response with updated session data
 *
 * @description Updates the status of an interview session (e.g., start, complete, cancel)
 * with proper validation and state transitions.
 *
 * @example
 * ```typescript
 * // PUT /api/interview/sessions/{sessionId}/status
 * // Body: { status: "in_progress" }
 * ```
 */
export async function handleUpdateSessionStatus(
  request: Request,
  env: Env,
  sessionId: string
): Promise<Response> {
  try {
    const body = (await request.json()) as { status: string };

    if (!body.status) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Status is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const config: InterviewConfig = {
      defaultSessionDuration: 60,
      maxQuestionsPerSession: 20,
      defaultDifficulty: "medium",
      enableRealTimeCoaching: true,
      enableVoiceAnalysis: false,
      enableVideoAnalysis: false,
      questionBankSize: 1000,
      feedbackDelay: 2000,
    };

    const service = new InterviewSessionService(config);
    const session = await service.updateSessionStatus(
      env,
      sessionId,
      body.status as any
    );

    if (!session) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Session not found",
          sessionId,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: session,
        message: "Session status updated successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Session status update error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to update session status",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handle question generation
 *
 * @param request - The incoming HTTP request
 * @param env - Cloudflare Workers environment bindings
 * @returns Response with generated questions
 *
 * @description Generates practice questions for an interview session
 * based on job requirements and user preferences.
 *
 * @example
 * ```typescript
 * // POST /api/interview/questions/generate
 * // Body: { sessionId: "session-123", questionTypes: ["behavioral", "technical"], difficulty: "medium", count: 10 }
 * ```
 */
export async function handleGenerateQuestions(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = (await request.json()) as QuestionGenerationRequest;

    if (!body.sessionId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Session ID is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const config: InterviewConfig = {
      defaultSessionDuration: 60,
      maxQuestionsPerSession: 20,
      defaultDifficulty: "medium",
      enableRealTimeCoaching: true,
      enableVoiceAnalysis: false,
      enableVideoAnalysis: false,
      questionBankSize: 1000,
      feedbackDelay: 2000,
    };

    const service = new InterviewQuestionService(config);
    const questions = await service.generateQuestions(env, body);

    return new Response(
      JSON.stringify({
        success: true,
        data: questions,
        count: questions.length,
        message: "Questions generated successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Question generation error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to generate questions",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handle coaching feedback
 *
 * @param request - The incoming HTTP request
 * @param env - Cloudflare Workers environment bindings
 * @returns Response with coaching feedback
 *
 * @description Provides real-time coaching feedback for user answers
 * including strengths, improvements, and suggestions.
 *
 * @example
 * ```typescript
 * // POST /api/interview/coaching
 * // Body: { sessionId: "session-123", question: "Tell me about yourself", answer: "I have 5 years...", context: {} }
 * ```
 */
export async function handleCoaching(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = (await request.json()) as CoachingRequest;

    if (!body.sessionId || !body.question || !body.answer) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: sessionId, question, answer",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const config: InterviewConfig = {
      defaultSessionDuration: 60,
      maxQuestionsPerSession: 20,
      defaultDifficulty: "medium",
      enableRealTimeCoaching: true,
      enableVoiceAnalysis: false,
      enableVideoAnalysis: false,
      questionBankSize: 1000,
      feedbackDelay: 2000,
    };

    const service = new InterviewCoachingService(config);
    const feedback = await service.provideCoaching(env, body);

    return new Response(
      JSON.stringify({
        success: true,
        data: feedback,
        message: "Coaching feedback generated successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Coaching error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to provide coaching feedback",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handle session analytics
 *
 * @param request - The incoming HTTP request
 * @param env - Cloudflare Workers environment bindings
 * @param sessionId - Session identifier from URL parameters
 * @returns Response with session analytics
 *
 * @description Generates comprehensive analytics for an interview session
 * including performance metrics and recommendations.
 *
 * @example
 * ```typescript
 * // GET /api/interview/sessions/{sessionId}/analytics
 * ```
 */
export async function handleSessionAnalytics(
  request: Request,
  env: Env,
  sessionId: string
): Promise<Response> {
  try {
    const service = new InterviewAnalyticsService();
    const analytics = await service.generateSessionSummary(env, sessionId);

    if (!analytics) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Session not found or no analytics available",
          sessionId,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: analytics,
        message: "Session analytics generated successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Session analytics error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to generate session analytics",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handle user analytics
 *
 * @param request - The incoming HTTP request
 * @param env - Cloudflare Workers environment bindings
 * @param userId - User identifier from URL parameters
 * @returns Response with user analytics
 *
 * @description Generates comprehensive analytics for a user across
 * all their interview sessions.
 *
 * @example
 * ```typescript
 * // GET /api/interview/users/{userId}/analytics
 * ```
 */
export async function handleUserAnalytics(
  request: Request,
  env: Env,
  userId: string
): Promise<Response> {
  try {
    const service = new InterviewAnalyticsService();
    const analytics = await service.generateUserAnalytics(env, userId);

    return new Response(
      JSON.stringify({
        success: true,
        data: analytics,
        message: "User analytics generated successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("User analytics error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to generate user analytics",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handle session questions retrieval
 *
 * @param request - The incoming HTTP request
 * @param env - Cloudflare Workers environment bindings
 * @param sessionId - Session identifier from URL parameters
 * @returns Response with session questions
 *
 * @description Retrieves all questions for a specific interview session
 * with proper sorting and filtering.
 *
 * @example
 * ```typescript
 * // GET /api/interview/sessions/{sessionId}/questions
 * ```
 */
export async function handleGetSessionQuestions(
  request: Request,
  env: Env,
  sessionId: string
): Promise<Response> {
  try {
    const config: InterviewConfig = {
      defaultSessionDuration: 60,
      maxQuestionsPerSession: 20,
      defaultDifficulty: "medium",
      enableRealTimeCoaching: true,
      enableVoiceAnalysis: false,
      enableVideoAnalysis: false,
      questionBankSize: 1000,
      feedbackDelay: 2000,
    };

    const service = new InterviewQuestionService(config);
    const questions = await service.getSessionQuestions(env, sessionId);

    return new Response(
      JSON.stringify({
        success: true,
        data: questions,
        count: questions.length,
        message: "Session questions retrieved successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Session questions retrieval error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to retrieve session questions",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handle session feedback retrieval
 *
 * @param request - The incoming HTTP request
 * @param env - Cloudflare Workers environment bindings
 * @param sessionId - Session identifier from URL parameters
 * @returns Response with session feedback
 *
 * @description Retrieves all feedback for a specific interview session
 * for review and analysis.
 *
 * @example
 * ```typescript
 * // GET /api/interview/sessions/{sessionId}/feedback
 * ```
 */
export async function handleGetSessionFeedback(
  request: Request,
  env: Env,
  sessionId: string
): Promise<Response> {
  try {
    const config: InterviewConfig = {
      defaultSessionDuration: 60,
      maxQuestionsPerSession: 20,
      defaultDifficulty: "medium",
      enableRealTimeCoaching: true,
      enableVoiceAnalysis: false,
      enableVideoAnalysis: false,
      questionBankSize: 1000,
      feedbackDelay: 2000,
    };

    const service = new InterviewCoachingService(config);
    const feedback = await service.getSessionFeedback(env, sessionId);

    return new Response(
      JSON.stringify({
        success: true,
        data: feedback,
        count: feedback.length,
        message: "Session feedback retrieved successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Session feedback retrieval error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to retrieve session feedback",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handle user sessions list
 *
 * @param request - The incoming HTTP request
 * @param env - Cloudflare Workers environment bindings
 * @param userId - User identifier from URL parameters
 * @returns Response with user sessions
 *
 * @description Retrieves a paginated list of interview sessions for a specific user
 * with proper sorting and filtering.
 *
 * @example
 * ```typescript
 * // GET /api/interview/users/{userId}/sessions?limit=20&offset=0
 * ```
 */
export async function handleGetUserSessions(
  request: Request,
  env: Env,
  userId: string
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get("limit") || "20", 10), 1),
      100
    );
    const offset = Math.max(
      parseInt(url.searchParams.get("offset") || "0", 10),
      0
    );

    const config: InterviewConfig = {
      defaultSessionDuration: 60,
      maxQuestionsPerSession: 20,
      defaultDifficulty: "medium",
      enableRealTimeCoaching: true,
      enableVoiceAnalysis: false,
      enableVideoAnalysis: false,
      questionBankSize: 1000,
      feedbackDelay: 2000,
    };

    const service = new InterviewSessionService(config);
    const sessions = await service.listUserSessions(env, userId, limit, offset);

    return new Response(
      JSON.stringify({
        success: true,
        data: sessions,
        count: sessions.length,
        limit,
        offset,
        message: "User sessions retrieved successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("User sessions retrieval error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to retrieve user sessions",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
