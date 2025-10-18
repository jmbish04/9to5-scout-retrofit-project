/**
 * UI Domain
 *
 * Centralized UI functionality for the 9to5 Scout application.
 * Provides page routing, file management, and user interface components.
 *
 * @fileoverview This module exports all UI-related functionality including
 * page routing, file management, and static asset serving capabilities.
 */

// Export page routing functionality
export * from "./routes/pages.routes";

// Export file management functionality
export * from "./routes/files.routes";

// Re-export types and utilities
export type { Env } from "../config/env/env.config";
