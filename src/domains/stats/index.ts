/**
 * Stats Domain
 *
 * Centralized statistics computation, analysis, and reporting functionality
 * for the 9to5 Scout application. Provides comprehensive statistical analysis
 * capabilities for benefits data, company metrics, and performance reporting.
 *
 * @fileoverview This module exports all statistics-related functionality including
 * computation services, data models, route handlers, and type definitions.
 */

// Export types
export * from "./types/stats.types";

// Export models
export * from "./models/stats.model";

// Export services
export * from "./services/stats.service";

// Export routes
export * from "./routes/stats.routes";

// Re-export types for convenience
export type { Env } from "../config/env/env.config";
