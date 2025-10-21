/**
 * @module src/core/services/logger.service.ts
 * @description
 * A structured logging service for consistent, leveled logging across the application.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  service: string;
  metadata?: Record<string, unknown>;
  traceId?: string; // Would be populated by a tracing middleware
}

interface LoggerEnv {
  ANALYTICS?: AnalyticsEngineDataset;
}

export class Logger {
  private minLevel: LogLevel = LogLevel.INFO;

  constructor(
    private service: string,
    private env: LoggerEnv,
    minLevel?: LogLevel
  ) {
    if (minLevel !== undefined) {
      this.minLevel = minLevel;
    }
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    if (level < this.minLevel) return;

    const levelName = LogLevel[level];
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: levelName,
      message,
      service: this.service,
      metadata,
    };

    console.log(`[${entry.timestamp}] [${levelName}] [${this.service}] ${message}`, metadata || '');

    if (this.env.ANALYTICS) {
      this.env.ANALYTICS.writeDataPoint({
        blobs: [this.service, message, levelName, entry.timestamp],
        doubles: [level],
        indexes: ["application_logs"],
      });
    }
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, { ...metadata, error: error?.message, stack: error?.stack });
  }

  critical(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.CRITICAL, message, { ...metadata, error: error?.message, stack: error?.stack });
  }
}
