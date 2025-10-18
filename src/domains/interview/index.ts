/**
 * Interview Domain
 *
 * Centralized interview preparation, coaching, and session management functionality
 * for the 9to5 Scout application. Provides comprehensive interview preparation
 * capabilities including question generation, real-time coaching, feedback analysis,
 * and performance tracking.
 *
 * @fileoverview This module exports all interview-related functionality including
 * session management, question generation, coaching services, analytics, and type definitions.
 */

// Export types
export * from "./types/interview.types";

// Export models
export * from "./models/interview.model";

// Export services
export * from "./services/interview.service";

// Export routes
export * from "./routes/interview.routes";

// Re-export types for convenience
export type { Env } from "../config/env/env.config";
