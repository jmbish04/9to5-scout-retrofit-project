/**
 * Config Domain
 *
 * Centralized configuration management for the 9to5 Scout application.
 * Provides environment configuration, database settings, and application preferences.
 *
 * @fileoverview This module exports all configuration-related functionality including
 * environment management, database configuration, and system settings.
 */

// Export environment configuration
export * from "./env/env.config";

// Export configuration routes
export * from "./routes/configs.routes";

// Re-export types
export type { Env } from "./env/env.config";
