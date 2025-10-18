/**
 * Interview Domain Models
 *
 * Data models and validation schemas for interview preparation and coaching.
 * Provides structured data handling for interview sessions, questions, feedback,
 * and coaching functionality within the 9to5 Scout application.
 *
 * @fileoverview This module defines data models, validation schemas, and
 * data transformation utilities for interview preparation operations.
 */

import type {
  DifficultyLevel,
  InterviewAnalytics,
  InterviewFeedback,
  InterviewQuestion,
  InterviewSession,
  InterviewSessionStatus,
  InterviewSessionSummary,
  QuestionType,
  SessionType,
} from "../types/interview.types";

/**
 * Interview session model
 *
 * @description Handles the core logic for interview session management
 * and provides methods for data transformation and validation.
 */
export class InterviewSessionModel {
  /**
   * Create a new interview session
   *
   * @param data - Session creation data
   * @returns Interview session object
   *
   * @description Creates a new interview session with proper validation
   * and default values for required fields.
   *
   * @example
   * ```typescript
   * const session = InterviewSessionModel.create({
   *   user_id: 'user-123',
   *   job_id: 'job-456',
   *   company_id: 'company-789',
   *   session_type: 'technical'
   * });
   * ```
   */
  static create(data: {
    user_id: string;
    job_id: string;
    company_id: string;
    session_type?: SessionType;
    metadata?: Record<string, any>;
  }): InterviewSession {
    const now = new Date().toISOString();
    const sessionId = `session_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    return {
      id: sessionId,
      user_id: data.user_id,
      job_id: data.job_id,
      company_id: data.company_id,
      session_type: data.session_type || "general",
      status: "active",
      created_at: now,
      updated_at: now,
      metadata: data.metadata || {},
    };
  }

  /**
   * Update session status
   *
   * @param session - Interview session object
   * @param status - New status
   * @returns Updated session object
   *
   * @description Updates the session status and timestamp with proper
   * validation and state transitions.
   *
   * @example
   * ```typescript
   * const updatedSession = InterviewSessionModel.updateStatus(session, 'completed');
   * ```
   */
  static updateStatus(
    session: InterviewSession,
    status: InterviewSessionStatus
  ): InterviewSession {
    const now = new Date().toISOString();
    const updates: Partial<InterviewSession> = {
      status,
      updated_at: now,
    };

    if (status === "in_progress" && !session.started_at) {
      updates.started_at = now;
    }

    if (status === "completed" && session.started_at) {
      updates.completed_at = now;
      const startTime = new Date(session.started_at).getTime();
      const endTime = new Date(now).getTime();
      updates.duration_minutes = Math.round(
        (endTime - startTime) / (1000 * 60)
      );
    }

    return { ...session, ...updates };
  }

  /**
   * Validate session data
   *
   * @param session - Interview session object
   * @returns Validation result with errors and warnings
   *
   * @description Validates session data for completeness and correctness
   * before database operations.
   *
   * @example
   * ```typescript
   * const validation = InterviewSessionModel.validate(session);
   * if (!validation.isValid) {
   *   console.error('Validation errors:', validation.errors);
   * }
   * ```
   */
  static validate(session: Partial<InterviewSession>): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!session.id) errors.push("Session ID is required");
    if (!session.user_id) errors.push("User ID is required");
    if (!session.job_id) errors.push("Job ID is required");
    if (!session.company_id) errors.push("Company ID is required");
    if (!session.session_type) errors.push("Session type is required");
    if (!session.status) errors.push("Status is required");

    if (session.duration_minutes && session.duration_minutes < 0) {
      errors.push("Duration cannot be negative");
    }

    if (session.duration_minutes && session.duration_minutes > 480) {
      warnings.push("Session duration is very long (>8 hours)");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Transform database row to session object
   *
   * @param row - Database row result
   * @returns Interview session object
   *
   * @description Converts raw database results into structured session
   * objects with proper type safety.
   *
   * @example
   * ```typescript
   * const session = InterviewSessionModel.fromDbRow(dbResult);
   * console.log(session.status);
   * ```
   */
  static fromDbRow(row: any): InterviewSession {
    return {
      id: row.id,
      user_id: row.user_id,
      job_id: row.job_id,
      company_id: row.company_id,
      session_type: row.session_type,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      started_at: row.started_at,
      completed_at: row.completed_at,
      duration_minutes: row.duration_minutes,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
    };
  }
}

/**
 * Interview question model
 *
 * @description Handles the core logic for interview question management
 * and provides methods for data transformation and validation.
 */
export class InterviewQuestionModel {
  /**
   * Create a new interview question
   *
   * @param data - Question creation data
   * @returns Interview question object
   *
   * @description Creates a new interview question with proper validation
   * and default values for required fields.
   *
   * @example
   * ```typescript
   * const question = InterviewQuestionModel.create({
   *   session_id: 'session-123',
   *   question: 'Tell me about yourself',
   *   type: 'behavioral',
   *   difficulty: 'easy'
   * });
   * ```
   */
  static create(data: {
    session_id: string;
    question: string;
    type: QuestionType;
    difficulty: DifficultyLevel;
    tips?: string[];
    expected_answer?: string;
    keywords?: string[];
    time_limit_minutes?: number;
    order_index: number;
  }): InterviewQuestion {
    const now = new Date().toISOString();
    const questionId = `q_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    return {
      id: questionId,
      session_id: data.session_id,
      question: data.question,
      type: data.type,
      difficulty: data.difficulty,
      tips: data.tips || [],
      expected_answer: data.expected_answer,
      keywords: data.keywords || [],
      time_limit_minutes: data.time_limit_minutes,
      created_at: now,
      order_index: data.order_index,
    };
  }

  /**
   * Validate question data
   *
   * @param question - Interview question object
   * @returns Validation result with errors and warnings
   *
   * @description Validates question data for completeness and correctness
   * before database operations.
   *
   * @example
   * ```typescript
   * const validation = InterviewQuestionModel.validate(question);
   * if (!validation.isValid) {
   *   console.error('Validation errors:', validation.errors);
   * }
   * ```
   */
  static validate(question: Partial<InterviewQuestion>): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!question.id) errors.push("Question ID is required");
    if (!question.session_id) errors.push("Session ID is required");
    if (!question.question) errors.push("Question text is required");
    if (!question.type) errors.push("Question type is required");
    if (!question.difficulty) errors.push("Difficulty level is required");

    if (question.question && question.question.length < 10) {
      warnings.push("Question text is very short");
    }

    if (question.question && question.question.length > 1000) {
      warnings.push("Question text is very long");
    }

    if (question.time_limit_minutes && question.time_limit_minutes < 1) {
      errors.push("Time limit must be at least 1 minute");
    }

    if (question.time_limit_minutes && question.time_limit_minutes > 60) {
      warnings.push("Time limit is very long (>1 hour)");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Transform database row to question object
   *
   * @param row - Database row result
   * @returns Interview question object
   *
   * @description Converts raw database results into structured question
   * objects with proper type safety.
   *
   * @example
   * ```typescript
   * const question = InterviewQuestionModel.fromDbRow(dbResult);
   * console.log(question.type);
   * ```
   */
  static fromDbRow(row: any): InterviewQuestion {
    return {
      id: row.id,
      session_id: row.session_id,
      question: row.question,
      type: row.type,
      difficulty: row.difficulty,
      tips: row.tips ? JSON.parse(row.tips) : [],
      expected_answer: row.expected_answer,
      keywords: row.keywords ? JSON.parse(row.keywords) : [],
      time_limit_minutes: row.time_limit_minutes,
      created_at: row.created_at,
      order_index: row.order_index,
    };
  }
}

/**
 * Interview feedback model
 *
 * @description Handles the core logic for interview feedback management
 * and provides methods for data transformation and validation.
 */
export class InterviewFeedbackModel {
  /**
   * Create a new interview feedback
   *
   * @param data - Feedback creation data
   * @returns Interview feedback object
   *
   * @description Creates a new interview feedback with proper validation
   * and default values for required fields.
   *
   * @example
   * ```typescript
   * const feedback = InterviewFeedbackModel.create({
   *   session_id: 'session-123',
   *   question_id: 'question-456',
   *   user_answer: 'I have 5 years of experience...',
   *   score: 8.5
   * });
   * ```
   */
  static create(data: {
    session_id: string;
    question_id: string;
    user_answer: string;
    strengths: string[];
    improvements: string[];
    score: number;
    suggestions: string[];
    detailed_feedback?: string;
  }): InterviewFeedback {
    const now = new Date().toISOString();
    const feedbackId = `feedback_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    return {
      id: feedbackId,
      session_id: data.session_id,
      question_id: data.question_id,
      user_answer: data.user_answer,
      strengths: data.strengths,
      improvements: data.improvements,
      score: data.score,
      suggestions: data.suggestions,
      detailed_feedback: data.detailed_feedback,
      created_at: now,
      updated_at: now,
    };
  }

  /**
   * Validate feedback data
   *
   * @param feedback - Interview feedback object
   * @returns Validation result with errors and warnings
   *
   * @description Validates feedback data for completeness and correctness
   * before database operations.
   *
   * @example
   * ```typescript
   * const validation = InterviewFeedbackModel.validate(feedback);
   * if (!validation.isValid) {
   *   console.error('Validation errors:', validation.errors);
   * }
   * ```
   */
  static validate(feedback: Partial<InterviewFeedback>): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!feedback.id) errors.push("Feedback ID is required");
    if (!feedback.session_id) errors.push("Session ID is required");
    if (!feedback.question_id) errors.push("Question ID is required");
    if (!feedback.user_answer) errors.push("User answer is required");
    if (feedback.score === undefined || feedback.score === null)
      errors.push("Score is required");

    if (
      feedback.score !== undefined &&
      (feedback.score < 0 || feedback.score > 10)
    ) {
      errors.push("Score must be between 0 and 10");
    }

    if (feedback.user_answer && feedback.user_answer.length < 10) {
      warnings.push("User answer is very short");
    }

    if (feedback.strengths && feedback.strengths.length === 0) {
      warnings.push("No strengths identified");
    }

    if (feedback.improvements && feedback.improvements.length === 0) {
      warnings.push("No improvements identified");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Transform database row to feedback object
   *
   * @param row - Database row result
   * @returns Interview feedback object
   *
   * @description Converts raw database results into structured feedback
   * objects with proper type safety.
   *
   * @example
   * ```typescript
   * const feedback = InterviewFeedbackModel.fromDbRow(dbResult);
   * console.log(feedback.score);
   * ```
   */
  static fromDbRow(row: any): InterviewFeedback {
    return {
      id: row.id,
      session_id: row.session_id,
      question_id: row.question_id,
      user_answer: row.user_answer,
      strengths: row.strengths ? JSON.parse(row.strengths) : [],
      improvements: row.improvements ? JSON.parse(row.improvements) : [],
      score: row.score,
      suggestions: row.suggestions ? JSON.parse(row.suggestions) : [],
      detailed_feedback: row.detailed_feedback,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

/**
 * Interview analytics model
 *
 * @description Handles the computation of interview analytics and
 * provides methods for data aggregation and analysis.
 */
export class InterviewAnalyticsModel {
  /**
   * Compute session summary
   *
   * @param session - Interview session object
   * @param questions - Array of questions
   * @param feedbacks - Array of feedbacks
   * @returns Session summary object
   *
   * @description Computes a comprehensive summary of an interview session
   * including performance metrics and recommendations.
   *
   * @example
   * ```typescript
   * const summary = InterviewAnalyticsModel.computeSessionSummary(session, questions, feedbacks);
   * console.log(summary.averageScore);
   * ```
   */
  static computeSessionSummary(
    session: InterviewSession,
    questions: InterviewQuestion[],
    feedbacks: InterviewFeedback[]
  ): InterviewSessionSummary {
    const totalQuestions = questions.length;
    const averageScore =
      feedbacks.length > 0
        ? feedbacks.reduce((sum, f) => sum + f.score, 0) / feedbacks.length
        : 0;

    const allStrengths = feedbacks.flatMap((f) => f.strengths);
    const allImprovements = feedbacks.flatMap((f) => f.improvements);
    const allSuggestions = feedbacks.flatMap((f) => f.suggestions);

    const strengths = [...new Set(allStrengths)];
    const areasForImprovement = [...new Set(allImprovements)];
    const recommendations = [...new Set(allSuggestions)];

    const timeSpent = session.duration_minutes || 0;
    const completionRate =
      totalQuestions > 0 ? (feedbacks.length / totalQuestions) * 100 : 0;

    return {
      sessionId: session.id,
      totalQuestions,
      averageScore,
      strengths,
      areasForImprovement,
      recommendations,
      timeSpent,
      completionRate,
    };
  }

  /**
   * Compute analytics from multiple sessions
   *
   * @param sessions - Array of interview sessions
   * @param questions - Array of questions
   * @param feedbacks - Array of feedbacks
   * @returns Analytics object
   *
   * @description Computes comprehensive analytics across multiple
   * interview sessions for trend analysis and insights.
   *
   * @example
   * ```typescript
   * const analytics = InterviewAnalyticsModel.computeAnalytics(sessions, questions, feedbacks);
   * console.log(analytics.averageScore);
   * ```
   */
  static computeAnalytics(
    sessions: InterviewSession[],
    questions: InterviewQuestion[],
    feedbacks: InterviewFeedback[]
  ): InterviewAnalytics {
    const totalSessions = sessions.length;
    const averageScore =
      feedbacks.length > 0
        ? feedbacks.reduce((sum, f) => sum + f.score, 0) / feedbacks.length
        : 0;

    const allStrengths = feedbacks.flatMap((f) => f.strengths);
    const allImprovements = feedbacks.flatMap((f) => f.improvements);

    const mostCommonStrengths = this.getMostCommon(allStrengths, 5);
    const mostCommonImprovements = this.getMostCommon(allImprovements, 5);

    const difficultyDistribution = this.computeDistribution(
      questions,
      "difficulty"
    );
    const questionTypeDistribution = this.computeDistribution(
      questions,
      "type"
    );
    const sessionTypeDistribution = this.computeDistribution(
      sessions,
      "session_type"
    );

    const timeSpentValues = sessions
      .filter((s) => s.duration_minutes)
      .map((s) => s.duration_minutes!);

    const timeSpentDistribution = {
      min: timeSpentValues.length > 0 ? Math.min(...timeSpentValues) : 0,
      max: timeSpentValues.length > 0 ? Math.max(...timeSpentValues) : 0,
      average:
        timeSpentValues.length > 0
          ? timeSpentValues.reduce((sum, t) => sum + t, 0) /
            timeSpentValues.length
          : 0,
      median:
        timeSpentValues.length > 0 ? this.computeMedian(timeSpentValues) : 0,
    };

    return {
      totalSessions,
      averageScore,
      improvementTrend: 0, // TODO: Implement trend calculation
      mostCommonStrengths,
      mostCommonImprovements,
      difficultyDistribution,
      questionTypeDistribution,
      sessionTypeDistribution,
      timeSpentDistribution,
    };
  }

  /**
   * Get most common items from array
   *
   * @param items - Array of items
   * @param limit - Maximum number of items to return
   * @returns Array of most common items
   *
   * @description Computes the most frequently occurring items in an array
   * for analytics and insights.
   *
   * @example
   * ```typescript
   * const common = InterviewAnalyticsModel.getMostCommon(['a', 'b', 'a', 'c', 'a'], 2);
   * // Returns ['a', 'b']
   * ```
   */
  private static getMostCommon(items: string[], limit: number): string[] {
    const counts = items.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([item]) => item);
  }

  /**
   * Compute distribution of values
   *
   * @param items - Array of items
   * @param key - Key to extract from items
   * @returns Distribution object
   *
   * @description Computes the distribution of values for a specific key
   * across an array of items.
   *
   * @example
   * ```typescript
   * const distribution = InterviewAnalyticsModel.computeDistribution(questions, 'difficulty');
   * // Returns { easy: 5, medium: 10, hard: 3 }
   * ```
   */
  private static computeDistribution(
    items: any[],
    key: string
  ): Record<string, number> {
    return items.reduce((acc, item) => {
      const value = item[key];
      if (value) {
        acc[value] = (acc[value] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Compute median value
   *
   * @param values - Array of numeric values
   * @returns Median value
   *
   * @description Computes the median value from an array of numbers
   * for statistical analysis.
   *
   * @example
   * ```typescript
   * const median = InterviewAnalyticsModel.computeMedian([1, 2, 3, 4, 5]);
   * // Returns 3
   * ```
   */
  private static computeMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }
}
