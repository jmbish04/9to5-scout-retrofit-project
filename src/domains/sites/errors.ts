/**
 * @module src/new/domains/sites/errors.ts
 * @description
 * Defines custom errors and AI diagnostic metadata specific to the 'sites' domain.
 */

import { DuplicateError, NotFoundError } from '../../core/errors';

/**
 * Thrown when a site cannot be found in the database.
 */
export class SiteNotFoundError extends NotFoundError {
  constructor(siteId: string) {
    super('Site', siteId);
  }
}

/**
 * Thrown when attempting to create a site that already exists (e.g., same base_url).
 */
export class DuplicateSiteError extends DuplicateError {
  constructor(baseUrl: string) {
    super('Site', 'base_url', baseUrl);
  }
}

/**
 * Metadata for the Error Investigation AI Agent.
 * This object provides the agent with context to diagnose critical errors
 * related to the sites domain.
 */
export const SiteErrorMetadata = {
  'DatabaseError: sites': {
    description: 'A critical database error occurred during an operation on the sites table.',
    severity: 'critical',
    relevantFiles: [
      'src/new/domains/sites/services/site-storage.service.ts'
    ],
    keywords: ['sites', 'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'D1Database']
  }
};