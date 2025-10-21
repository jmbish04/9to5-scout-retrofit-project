/**
 * @module src/domains/sites/services/site-storage.service.ts
 * @description
 * This service is responsible for all data access and storage-related operations
 * for the 'sites' domain, now with professional-grade error handling and logging.
 */

import { z } from 'zod';
import { DuplicateError, NotFoundError, DatabaseError } from '../../../core/errors';
import { Logger } from '../../../core/services/logger.service';
import { Site, SiteSchema } from '../types';

export interface SiteStorageEnv {
  DB: D1Database;
  ANALYTICS?: AnalyticsEngineDataset;
}

export class SiteStorageService {
  private env: SiteStorageEnv;
  private logger: Logger;

  constructor(env: SiteStorageEnv) {
    this.env = env;
    this.logger = new Logger("SiteStorageService", env);
  }

  async createSite(payload: Omit<Site, 'id' | 'created_at'>): Promise<Site> {
    this.logger.info("Attempting to create site", { baseUrl: payload.base_url });
    try {
      const validatedPayload = SiteSchema.omit({ id: true, created_at: true }).parse(payload);

      const existingSite = await this.env.DB.prepare('SELECT id FROM sites WHERE base_url = ?1')
        .bind(validatedPayload.base_url)
        .first();

      if (existingSite) {
        throw new DuplicateError("Site", "base_url", validatedPayload.base_url);
      }
      
      // ... creation logic
      this.logger.info("Successfully created site", { siteId: newSite.id });
      return newSite;
    } catch (error) {
      this.logger.error("Failed to create site", error as Error, { baseUrl: payload.base_url });
      if (error instanceof DuplicateError) throw error;
      throw new DatabaseError("Failed to create site", error as Error);
    }
  }

  // ... other methods refactored with logging
}