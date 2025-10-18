/**
 * Environment Configuration
 *
 * Centralized environment variable definitions and validation for the 9to5 Scout application.
 * Provides type-safe access to Cloudflare Workers bindings and environment variables.
 *
 * @fileoverview This module defines the complete environment interface including all
 * Cloudflare Workers bindings, API keys, and configuration values used throughout the application.
 */

/**
 * Complete environment interface for the 9to5 Scout Cloudflare Worker
 *
 * @description This interface defines all available bindings and environment variables
 * used throughout the application, providing type safety and documentation for all
 * external dependencies and configuration values.
 */
export interface Env {
  // Cloudflare Workers AI bindings
  AI: any;

  // Database bindings
  DB: any;
  KV: any;
  R2: any;
  RESUME_BUCKET?: any;
  VECTORIZE_INDEX: any;

  // AI model configuration
  EMBEDDING_MODEL?: string;
  DEFAULT_MODEL_REASONING?: string;
  DEFAULT_MODEL_WEB_BROWSER?: string;

  // Browser rendering bindings
  MYBROWSER?: any;
  BROWSER?: any;

  // Static assets
  ASSETS: any;

  // API authentication
  API_AUTH_TOKEN: string;
  BROWSER_RENDERING_TOKEN: string;

  // External API keys
  SERPAPI_API_KEY: string; // SerpAPI for job search (replaces Google Jobs API)

  // FastAPI Integration
  LOCAL_SCRAPER_URL: string; // URL of the local FastAPI scraper service
  LOCAL_SCRAPER_API_KEY: string; // API key for FastAPI authentication

  // Email configuration
  FORWARD_EMAIL_ADDRESS?: string;
  NOTIFICATION_EMAIL_ADDRESS?: string;
  OTP_FORWARD_EMAIL?: string;

  // Storage configuration
  BUCKET_BASE_URL?: string;

  // Notification services
  SLACK_WEBHOOK_URL: string;

  // SMTP configuration
  SMTP_ENDPOINT: string;
  SMTP_USERNAME: string;
  SMTP_PASSWORD: string;

  // Admin configuration
  ADMIN_TOKEN?: string;
  ENABLE_LLM?: string;

  // Worker configuration
  WORKER_URL: string;

  // Durable Objects
  SITE_CRAWLER: any;
  JOB_MONITOR: any;
  SCRAPE_SOCKET: any;

  // Workflows
  DISCOVERY_WORKFLOW: any;
  JOB_MONITOR_WORKFLOW: any;
  CHANGE_ANALYSIS_WORKFLOW: any;

  // Agents
  AGENTS?: any;
  EMAIL_SENDER?: any;
  EMAIL_PROCESSOR_AGENT?: any;
  JOB_MONITOR_AGENT?: any;
  RESUME_OPTIMIZATION_AGENT?: any;
  COMPANY_INTELLIGENCE_AGENT?: any;
  INTERVIEW_PREPARATION_AGENT?: any;
  GENERIC_AGENT?: any;

  // Queues
  JOB_QUEUE?: any;

  // Cloudflare account configuration
  CLOUDFLARE_ACCOUNT_ID: string;
}

/**
 * Environment validation schema
 *
 * @description Defines required environment variables and their validation rules
 * to ensure proper configuration before application startup.
 */
export const ENV_VALIDATION_SCHEMA = {
  required: [
    "AI",
    "DB",
    "KV",
    "R2",
    "VECTORIZE_INDEX",
    "API_AUTH_TOKEN",
    "BROWSER_RENDERING_TOKEN",
    "SERPAPI_API_KEY",
    "SLACK_WEBHOOK_URL",
    "SMTP_ENDPOINT",
    "SMTP_USERNAME",
    "SMTP_PASSWORD",
    "WORKER_URL",
    "SITE_CRAWLER",
    "JOB_MONITOR",
    "DISCOVERY_WORKFLOW",
    "JOB_MONITOR_WORKFLOW",
    "CHANGE_ANALYSIS_WORKFLOW",
    "SCRAPE_SOCKET",
    "CLOUDFLARE_ACCOUNT_ID",
  ],
  optional: [
    "RESUME_BUCKET",
    "EMBEDDING_MODEL",
    "DEFAULT_MODEL_REASONING",
    "DEFAULT_MODEL_WEB_BROWSER",
    "MYBROWSER",
    "BROWSER",
    "FORWARD_EMAIL_ADDRESS",
    "NOTIFICATION_EMAIL_ADDRESS",
    "BUCKET_BASE_URL",
    "ADMIN_TOKEN",
    "ENABLE_LLM",
    "AGENTS",
    "EMAIL_SENDER",
    "OTP_FORWARD_EMAIL",
    "JOB_QUEUE",
    "EMAIL_PROCESSOR_AGENT",
    "JOB_MONITOR_AGENT",
    "RESUME_OPTIMIZATION_AGENT",
    "COMPANY_INTELLIGENCE_AGENT",
    "INTERVIEW_PREPARATION_AGENT",
    "GENERIC_AGENT",
  ],
} as const;

/**
 * Validates environment configuration
 *
 * @param env - The environment object to validate
 * @returns Validation result with success status and any missing variables
 *
 * @description This function checks that all required environment variables
 * are present and properly configured before the application starts.
 *
 * @example
 * ```typescript
 * const validation = validateEnv(env);
 * if (!validation.success) {
 *   console.error('Missing required environment variables:', validation.missing);
 * }
 * ```
 */
export function validateEnv(env: Partial<Env>): {
  success: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  for (const required of ENV_VALIDATION_SCHEMA.required) {
    if (!env[required as keyof Env]) {
      missing.push(required);
    }
  }

  return {
    success: missing.length === 0,
    missing,
  };
}

/**
 * Gets environment variable with fallback
 *
 * @param env - The environment object
 * @param key - The environment variable key
 * @param fallback - Fallback value if not found
 * @returns The environment variable value or fallback
 *
 * @description This utility function provides safe access to environment variables
 * with optional fallback values for better error handling.
 *
 * @example
 * ```typescript
 * const model = getEnvVar(env, 'DEFAULT_MODEL_REASONING', '@cf/meta/llama-3.1-8b-instruct');
 * ```
 */
export function getEnvVar<K extends keyof Env>(
  env: Env,
  key: K,
  fallback?: Env[K]
): Env[K] | undefined {
  return env[key] ?? fallback;
}

/**
 * Environment configuration for different deployment stages
 *
 * @description Provides environment-specific configuration overrides
 * for development, staging, and production deployments.
 */
export const ENV_CONFIGS = {
  development: {
    ENABLE_LLM: "true",
    LOG_LEVEL: "debug",
  },
  staging: {
    ENABLE_LLM: "true",
    LOG_LEVEL: "info",
  },
  production: {
    ENABLE_LLM: "true",
    LOG_LEVEL: "warn",
  },
} as const;

/**
 * Gets environment-specific configuration
 *
 * @param env - The environment object
 * @param stage - The deployment stage
 * @returns Environment-specific configuration
 *
 * @description This function returns configuration overrides based on the
 * deployment stage, allowing for different behavior in different environments.
 *
 * @example
 * ```typescript
 * const config = getEnvConfig(env, 'development');
 * // Returns development-specific configuration
 * ```
 */
export function getEnvConfig(env: Env, stage: keyof typeof ENV_CONFIGS) {
  return {
    ...ENV_CONFIGS[stage],
    // Add any environment-specific overrides here
  };
}
