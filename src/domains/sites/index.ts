/**
 * @file Sites Domain Barrel Export
 *
 * This file serves as the main entry point for the sites domain within the 9to5-Scout platform.
 * It provides a clean, organized export structure for all site-related functionality,
 * enabling easy imports and maintaining clear domain boundaries.
 *
 * Exports:
 * - Models: Type definitions, interfaces, and validation schemas
 * - Services: Business logic and data access layer functions
 * - Routes: HTTP API endpoints and request handlers
 *
 * This barrel export pattern ensures that consumers of the sites domain can import
 * exactly what they need while maintaining clear separation of concerns and
 * preventing circular dependencies.
 *
 * @author 9to5-Scout Development Team
 * @version 1.0.0
 * @since 2025-01-17
 */

// Model exports - only export from types to avoid conflicts
export * from "./models/site.types";

// Service exports
export * from "./services/site-storage.service";

// Route exports
export { default as sitesRoutes } from "./routes/sites.routes";
