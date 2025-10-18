/**
 * Interview Domain Types
 *
 * Type definitions for interview preparation, coaching, and session management.
 * Provides comprehensive typing for interview sessions, questions, feedback,
 * and coaching functionality within the 9to5 Scout application.
 *
 * @fileoverview This module defines all types related to interview preparation
 * including session management, question generation, coaching, and feedback systems.
 */

/**
 * Interview session status
 */
export type InterviewSessionStatus =
  | "active"
  | "generating_strategy"
  | "generating_questions"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "error";

/**
 * Question types for interview preparation
 */
export type QuestionType =
  | "behavioral"
  | "technical"
  | "motivational"
  | "situational"
  | "case_study"
  | "system_design"
  | "coding"
  | "general";

/**
 * Difficulty levels for questions
 */
export type DifficultyLevel = "easy" | "medium" | "hard" | "expert";

/**
 * Session types for different interview scenarios
 */
export type SessionType =
  | "general"
  | "technical"
  | "behavioral"
  | "case_study"
  | "system_design"
  | "coding"
  | "mock_interview"
  | "preparation";

/**
 * Interview session data structure
 */
export interface InterviewSession {
  id: string;
  user_id: string;
  job_id: string;
  company_id: string;
  session_type: SessionType;
  status: InterviewSessionStatus;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  duration_minutes?: number;
  metadata?: Record<string, any>;
}

/**
 * Interview question data structure
 */
export interface InterviewQuestion {
  id: string;
  session_id: string;
  question: string;
  type: QuestionType;
  difficulty: DifficultyLevel;
  tips: string[];
  expected_answer?: string;
  keywords?: string[];
  time_limit_minutes?: number;
  created_at: string;
  order_index: number;
}

/**
 * Interview feedback data structure
 */
export interface InterviewFeedback {
  id: string;
  session_id: string;
  question_id: string;
  user_answer: string;
  strengths: string[];
  improvements: string[];
  score: number;
  suggestions: string[];
  detailed_feedback?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Interview strategy data structure
 */
export interface InterviewStrategy {
  id: string;
  session_id: string;
  job_title: string;
  company_name: string;
  key_areas: string[];
  focus_points: string[];
  preparation_tips: string[];
  common_questions: string[];
  technical_topics?: string[];
  behavioral_examples: string[];
  questions_to_ask: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Interview preparation request
 */
export interface InterviewPreparationRequest {
  userId: string;
  jobId: string;
  companyId: string;
  sessionType?: SessionType;
  questionTypes?: QuestionType[];
  difficulty?: DifficultyLevel;
  duration?: number;
  focusAreas?: string[];
}

/**
 * Question generation request
 */
export interface QuestionGenerationRequest {
  sessionId: string;
  questionTypes?: QuestionType[];
  difficulty?: DifficultyLevel;
  count?: number;
  focusAreas?: string[];
}

/**
 * Coaching request
 */
export interface CoachingRequest {
  sessionId: string;
  question: string;
  answer: string;
  context?: Record<string, any>;
  timeSpent?: number;
}

/**
 * Coaching feedback response
 */
export interface CoachingFeedback {
  strengths: string[];
  improvements: string[];
  score: number;
  suggestions: string[];
  detailed_feedback?: string;
  next_questions?: string[];
  resources?: string[];
}

/**
 * Interview session summary
 */
export interface InterviewSessionSummary {
  sessionId: string;
  totalQuestions: number;
  averageScore: number;
  strengths: string[];
  areasForImprovement: string[];
  recommendations: string[];
  timeSpent: number;
  completionRate: number;
}

/**
 * Interview preparation configuration
 */
export interface InterviewConfig {
  defaultSessionDuration: number;
  maxQuestionsPerSession: number;
  defaultDifficulty: DifficultyLevel;
  enableRealTimeCoaching: boolean;
  enableVoiceAnalysis: boolean;
  enableVideoAnalysis: boolean;
  questionBankSize: number;
  feedbackDelay: number;
}

/**
 * Interview preparation environment
 */
export interface InterviewEnv {
  DB: any;
  AI: any;
  VECTORIZE_INDEX?: any;
  DEFAULT_MODEL_REASONING?: string;
  DEFAULT_MODEL_WEB_BROWSER?: string;
}

/**
 * Interview preparation context
 */
export interface InterviewContext {
  env: InterviewEnv;
  config: InterviewConfig;
  session: InterviewSession;
  userProfile?: Record<string, any>;
  jobDetails?: Record<string, any>;
  companyDetails?: Record<string, any>;
}

/**
 * Interview preparation validation result
 */
export interface InterviewValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Interview preparation export options
 */
export interface InterviewExportOptions {
  format: "json" | "pdf" | "csv";
  includeQuestions: boolean;
  includeFeedback: boolean;
  includeStrategy: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  sessionIds?: string[];
}

/**
 * Interview preparation export result
 */
export interface InterviewExportResult {
  data: any;
  format: string;
  exportedAt: Date;
  sessionCount: number;
  questionCount: number;
  feedbackCount: number;
}

/**
 * Interview preparation analytics
 */
export interface InterviewAnalytics {
  totalSessions: number;
  averageScore: number;
  improvementTrend: number;
  mostCommonStrengths: string[];
  mostCommonImprovements: string[];
  difficultyDistribution: Record<DifficultyLevel, number>;
  questionTypeDistribution: Record<QuestionType, number>;
  sessionTypeDistribution: Record<SessionType, number>;
  timeSpentDistribution: {
    min: number;
    max: number;
    average: number;
    median: number;
  };
}

/**
 * Interview preparation service configuration
 */
export interface InterviewServiceConfig {
  enableAICoaching: boolean;
  enableRealTimeFeedback: boolean;
  enableProgressTracking: boolean;
  enableAnalytics: boolean;
  maxConcurrentSessions: number;
  sessionTimeoutMinutes: number;
  questionGenerationDelay: number;
  feedbackGenerationDelay: number;
}

/**
 * Interview preparation error types
 */
export type InterviewErrorType =
  | "SESSION_NOT_FOUND"
  | "INVALID_SESSION_STATE"
  | "QUESTION_GENERATION_FAILED"
  | "COACHING_ANALYSIS_FAILED"
  | "FEEDBACK_GENERATION_FAILED"
  | "STRATEGY_GENERATION_FAILED"
  | "VALIDATION_FAILED"
  | "DATABASE_ERROR"
  | "AI_SERVICE_ERROR"
  | "CONFIGURATION_ERROR";

/**
 * Interview preparation error
 */
export interface InterviewError {
  type: InterviewErrorType;
  message: string;
  details?: string;
  sessionId?: string;
  timestamp: string;
  recoverable: boolean;
}
