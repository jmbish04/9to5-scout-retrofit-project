/**
 * Interview analytics model
 */
export class InterviewAnalyticsModel {
  // ... (computeSessionSummary and other methods)

  static computeAnalytics(
    sessions: InterviewSession[],
    questions: InterviewQuestion[],
    feedbacks: InterviewFeedback[]
  ): InterviewAnalytics {
    // ... (existing analytics logic)

    const improvementTrend = this.calculateImprovementTrend(sessions, feedbacks);

    return {
      totalSessions,
      averageScore,
      improvementTrend,
      // ... (rest of the analytics data)
    };
  }

  private static calculateImprovementTrend(sessions: InterviewSession[], feedbacks: InterviewFeedback[]): number {
    if (sessions.length < 2) {
      return 0; // Not enough data for a trend
    }

    // Sort sessions by date
    const sortedSessions = [...sessions].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    const sessionScores = sortedSessions.map(session => {
        const sessionFeedbacks = feedbacks.filter(f => f.session_id === session.id);
        if (sessionFeedbacks.length === 0) return null;
        return sessionFeedbacks.reduce((sum, f) => sum + f.score, 0) / sessionFeedbacks.length;
    }).filter((score): score is number => score !== null);

    if (sessionScores.length < 2) {
        return 0;
    }

    const firstHalf = sessionScores.slice(0, Math.floor(sessionScores.length / 2));
    const secondHalf = sessionScores.slice(Math.ceil(sessionScores.length / 2));

    if (firstHalf.length === 0 || secondHalf.length === 0) {
        return 0;
    }

    const avgFirstHalf = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
    const avgSecondHalf = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;

    return avgSecondHalf - avgFirstHalf;
  }

  // ... (getMostCommon, computeDistribution, computeMedian)
}