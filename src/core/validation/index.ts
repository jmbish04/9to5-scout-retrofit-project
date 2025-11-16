/**
 * @module src/core/validation/index.ts
 * @description
 * Barrel file for exporting all validation schemas and middleware.
 */

export * from "./normalize";
export * from "./schemas";

// Explicit re-exports to avoid naming conflicts between hono-validation and hono-validators
export {
  getValidatedBody,
  getValidatedParams,
  getValidatedQuery,
  cors as honoCors,
  errorHandler as honoErrorHandler,
  logger as honoLogger,
  rateLimit as honoRateLimit,
  validateBody as honoValidateBody,
  validateParams as honoValidateParams,
  validateQuery as honoValidateQuery,
  validateQueryParams,
} from "./hono-validation";

export type { ValidationError, ValidationResult } from "./hono-validators";

export {
  auth,
  cors,
  errorHandler,
  logger,
  rateLimit,
  validateBody,
  validateParams,
  validateQuery,
  validateResponse,
} from "./hono-validators";
