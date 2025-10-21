/**
 * Interview Domain Services
 */

// ... (imports and InterviewSessionService remain the same)

export class InterviewQuestionService {
  // ... (constructor and generateQuestions methods remain the same)

  /**
   * Generate a single question using AI.
   */
  private async generateSingleQuestion(
    env: InterviewEnv,
    session: InterviewSession,
    type: QuestionType,
    difficulty: DifficultyLevel,
    orderIndex: number
  ): Promise<InterviewQuestion> {
    const job = await this.getJobDetails(env, session.job_id);
    const prompt = `
      Generate one ${difficulty} ${type} interview question for a candidate applying for the role of ${job?.title} at ${job?.company}.
      The job description keywords are: ${job?.keywords?.join(', ')}.
      The question should be insightful and relevant.
      Return ONLY the question text.
    `;

    const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [{ role: "system", content: "You are an expert interviewer." }, { role: "user", content: prompt }],
    });

    const questionText = (response as any)?.response || "Tell me about a challenge you faced.";

    return InterviewQuestionModel.create({
      session_id: session.id,
      question: questionText.trim(),
      type,
      difficulty,
      tips: this.generateTips(type, difficulty),
      order_index: orderIndex,
    });
  }

  // ... (generateTips, storeQuestion, getSessionQuestions, getSession methods remain the same)

  private async getJobDetails(env: InterviewEnv, jobId: string): Promise<any | null> {
    return await env.DB.prepare("SELECT title, company, keywords FROM jobs WHERE id = ?").bind(jobId).first();
  }
}

export class InterviewCoachingService {
  // ... (constructor and provideCoaching methods remain the same)

  /**
   * Analyze answer using AI.
   */
  private async analyzeAnswer(
    env: InterviewEnv,
    request: CoachingRequest
  ): Promise<CoachingFeedback> {
    const prompt = `
      A candidate was asked: "${request.question}"
      They answered: "${request.answer}"
      Analyze their answer. Provide feedback in JSON format with keys: "strengths" (array of strings), "improvements" (array of strings), "score" (number 0-10), and "suggestions" (array of strings).
      Focus on clarity, use of the STAR method for behavioral questions, and technical accuracy.
    `;

    const schema = {
        type: "object",
        properties: {
            strengths: { type: "array", items: { type: "string" } },
            improvements: { type: "array", items: { type: "string" } },
            score: { type: "number" },
            suggestions: { type: "array", items: { type: "string" } },
        }
    };

    const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [{ role: "system", content: "You are an expert interview coach." }, { role: "user", content: prompt }],
      response_format: { type: "json_schema", schema },
    });

    const feedback = JSON.parse((response as any).response || "{}");
    return {
        ...feedback,
        detailed_feedback: `Overall score: ${feedback.score}/10. Strengths: ${feedback.strengths?.join(', ')}. Improvements: ${feedback.improvements?.join(', ')}.`
    };
  }

  // ... (storeFeedback and getSessionFeedback methods remain the same)
}

// ... (InterviewAnalyticsService remains the same)