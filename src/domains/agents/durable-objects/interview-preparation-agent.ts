/**
 * InterviewPreparationAgent - Comprehensive interview preparation and coaching
 */

import { Agent } from "agents";
import type { Env } from "../config/env/env.config";
import { InterviewQuestionService, InterviewCoachingService } from '../services/interview.service';

export class InterviewPreparationAgent extends Agent<Env, any> {
  private questionService: InterviewQuestionService;
  private coachingService: InterviewCoachingService;

  constructor(state: any, env: Env) {
    super(state, env);
    // Assuming a default config for now
    this.questionService = new InterviewQuestionService({});
    this.coachingService = new InterviewCoachingService({});
  }

  // ... (onRequest and other handlers remain the same)

  /**
   * Generate practice questions
   */
  private async generatePracticeQuestions(
    sessionId: string,
    questionTypes: string[],
    difficulty: string,
    count: number = 5
  ): Promise<any[]> {
    return this.questionService.generateQuestions(this.env, {
        sessionId,
        questionTypes,
        difficulty,
        count,
    });
  }

  /**
   * Analyze answer and provide feedback
   */
  private async analyzeAnswer(
    sessionId: string,
    question: string,
    answer: string,
    context?: any
  ): Promise<any> {
    return this.coachingService.provideCoaching(this.env, {
        sessionId,
        question,
        answer,
        context,
    });
  }
}