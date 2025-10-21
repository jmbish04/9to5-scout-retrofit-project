/**
 * @module src/new/core/services/error-logging.service.ts
 * @description
 * A service for logging detailed error information to a D1 database table.
 * This provides a persistent, queryable record of application errors for
 * monitoring and diagnostics.
 */

import { AppError } from '../errors';

export interface LoggingEnv {
  DB: D1Database;
}

export interface ErrorContext {
  request?: {
    url: string;
    method: string;
    headers: Record<string, string>;
  };
  user?: {
    id: string;
  };
  // Add any other relevant context
}

export class ErrorLoggingService {
  private env: LoggingEnv;

  constructor(env: LoggingEnv) {
    this.env = env;
  }

  /**
   * Logs an error to the D1 database.
   * @param error - The error object to log.
   * @param context - Additional context about the request or user.
   * @returns The ID of the created log entry.
   */
  async logError(error: Error, context: ErrorContext = {}): Promise<string> {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    let severity: 'info' | 'warning' | 'critical' = 'critical';
    let errorCode: string | undefined;

    if (error instanceof AppError) {
      severity = error.statusCode >= 500 ? 'critical' : 'warning';
      errorCode = error.errorCode;
    } else if ((error as any).severity) {
      severity = (error as any).severity;
    }

    try {
      await this.env.DB.prepare(
        `INSERT INTO error_logs (id, timestamp, error_message, stack_trace, error_code, severity, context)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
      )
        .bind(
          id,
          timestamp,
          error.message,
          error.stack || null,
          errorCode || null,
          severity,
          JSON.stringify(context)
        )
        .run();
      return id;
    } catch (dbError) {
      console.error("FATAL: Failed to write to error_logs table.", dbError);
      // If logging to DB fails, we're in a bad state. Log to console as a last resort.
      console.error("Original error that failed to log:", error);
      return '';
    }
  }

  /**
   * Updates an error log with AI-generated analysis and a potential solution.
   * @param logId - The ID of the error log to update.
   * @param analysis - The analysis from the AI agent.
   * @param solution - The potential solution from the AI agent.
   */
  async updateLogWithAnalysis(logId: string, analysis: string, solution: string): Promise<void> {
    try {
      await this.env.DB.prepare(
        `UPDATE error_logs
         SET agentic_analysis = ?1, potential_solution = ?2
         WHERE id = ?3`
      )
        .bind(analysis, solution, logId)
        .run();
    } catch (dbError) {
      console.error(`FATAL: Failed to update error_log ${logId} with AI analysis.`, dbError);
    }
  }
}
