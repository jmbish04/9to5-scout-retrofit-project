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
      const validatedPayload = SiteSchema.omit({ id: true }).parse(payload);

      const existingSite = await this.env.DB.prepare('SELECT id FROM sites WHERE base_url = ?1')
        .bind(validatedPayload.base_url)
        .first();

      if (existingSite) {
        throw new DuplicateError("Site", "base_url", validatedPayload.base_url);
      }
      
      const id = crypto.randomUUID();
      await this.env.DB.prepare(
        `INSERT INTO sites (id, name, base_url, status) VALUES (?1, ?2, ?3, ?4)`
      )
        .bind(id, validatedPayload.name, validatedPayload.base_url, validatedPayload.status || 'active')
        .run();

      const newSite = await this.getSiteById(id);
      if (!newSite) {
        throw new DatabaseError("Failed to create site: could not retrieve after insert", undefined);
      }
      
      this.logger.info("Successfully created site", { siteId: newSite.id });
      return newSite;
    } catch (error) {
      this.logger.error("Failed to create site", error as Error, { baseUrl: payload.base_url });
      if (error instanceof DuplicateError) throw error;
      throw new DatabaseError("Failed to create site", error as Error);
    }
  }

  async getSites(options: { limit?: number; offset?: number } = {}): Promise<Site[]> {
    const { limit = 50, offset = 0 } = options;
    const result = await this.env.DB.prepare(
      'SELECT * FROM sites ORDER BY name LIMIT ?1 OFFSET ?2'
    )
      .bind(limit, offset)
      .all<Site>();
    return result.results || [];
  }

  async getSiteById(id: string): Promise<Site | null> {
    const result = await this.env.DB.prepare('SELECT * FROM sites WHERE id = ?1')
      .bind(id)
      .first<Site>();
    return result || null;
  }

  async updateSite(id: string, updates: Partial<Omit<Site, 'id' | 'created_at'>>): Promise<Site> {
    const existingSite = await this.getSiteById(id);
    if (!existingSite) {
      throw new NotFoundError('Site', id);
    }

    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      return existingSite;
    }

    values.push(id);
    await this.env.DB.prepare(`UPDATE sites SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    const updatedSite = await this.getSiteById(id);
    if (!updatedSite) {
      throw new DatabaseError("Failed to update site: could not retrieve after update", undefined);
    }
    return updatedSite;
  }

  async deleteSite(id: string): Promise<void> {
    const result = await this.env.DB.prepare('DELETE FROM sites WHERE id = ?1')
      .bind(id)
      .run();

    if (result.meta.changes === 0) {
      throw new NotFoundError('Site', id);
    }
  }

  async searchSites(query: string): Promise<Site[]> {
    const searchQuery = `%${query}%`;
    const result = await this.env.DB.prepare(
      'SELECT * FROM sites WHERE name LIKE ?1 OR base_url LIKE ?1 ORDER BY name LIMIT 25'
    )
      .bind(searchQuery)
      .all<Site>();
    return result.results || [];
  }

  async getSitesForDiscovery(limit: number = 10): Promise<Site[]> {
    const result = await this.env.DB.prepare(
      `SELECT * FROM sites
       WHERE last_scraped_at IS NULL OR datetime(last_scraped_at, '+1 day') <= datetime('now')
       ORDER BY last_scraped_at ASC NULLS FIRST
       LIMIT ?1`
    )
      .bind(limit)
      .all<Site>();
    return result.results || [];
  }

  async getSiteStatistics(): Promise<{ totalSites: number; sitesDiscoveredInLast24Hours: number }> {
    const totalPromise = this.env.DB.prepare('SELECT COUNT(*) as count FROM sites').first<{ count: number }>();
    const recentPromise = this.env.DB.prepare(
      `SELECT COUNT(*) as count FROM sites WHERE last_scraped_at >= datetime('now', '-1 day')`
    ).first<{ count: number }>();

    const [totalResult, recentResult] = await Promise.all([totalPromise, recentPromise]);

    return {
      totalSites: totalResult?.count ?? 0,
      sitesDiscoveredInLast24Hours: recentResult?.count ?? 0,
    };
  }

  async performSiteHealthCheck(id: string): Promise<{ status: 'ok' | 'error' | 'unknown'; statusCode?: number }> {
    const site = await this.getSiteById(id);
    if (!site) {
      return { status: 'unknown' };
    }

    try {
      const response = await fetch(site.base_url, { method: 'HEAD', redirect: 'follow' });
      return {
        status: response.ok ? 'ok' : 'error',
        statusCode: response.status,
      };
    } catch (error) {
      this.logger.error("Health check failed", error as Error, { siteId: id });
      return { status: 'error' };
    }
  }
}

// ============================================================================
// Wrapper Functions for Route Compatibility
// ============================================================================

export interface GetSitesOptions {
  status?: string;
  discovery_strategy?: string;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: string;
}

export async function getSites(env: SiteStorageEnv, options: GetSitesOptions = {}): Promise<Site[]> {
  const service = new SiteStorageService(env);
  const { limit = 50, offset = 0 } = options;
  return service.getSites({ limit, offset });
}

export async function getSiteById(env: SiteStorageEnv, id: string): Promise<Site | null> {
  const service = new SiteStorageService(env);
  return service.getSiteById(id);
}

export async function saveSite(env: SiteStorageEnv, site: Partial<Site>): Promise<string> {
  const service = new SiteStorageService(env);
  if (site.id) {
    const updated = await service.updateSite(site.id, site);
    return updated.id;
  } else {
    const created = await service.createSite(site as Omit<Site, 'id' | 'created_at'>);
    return created.id;
  }
}

export async function deleteSite(env: SiteStorageEnv, id: string): Promise<boolean> {
  const service = new SiteStorageService(env);
  try {
    await service.deleteSite(id);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return false;
    }
    throw error;
  }
}

export async function searchSites(env: SiteStorageEnv, searchParams: any): Promise<any> {
  const service = new SiteStorageService(env);
  if (searchParams.query) {
    return service.searchSites(searchParams.query);
  }
  return service.getSites({ limit: searchParams.limit, offset: searchParams.offset });
}

export async function getSitesForDiscovery(env: SiteStorageEnv): Promise<Site[]> {
  const service = new SiteStorageService(env);
  return service.getSitesForDiscovery();
}

export async function getSiteStatistics(env: SiteStorageEnv, id: string): Promise<any> {
  const service = new SiteStorageService(env);
  const site = await service.getSiteById(id);
  if (!site) {
    throw new NotFoundError('Site', id);
  }
  const stats = await service.getSiteStatistics();
  return { ...stats, site_id: id };
}

export async function performSiteHealthCheck(env: SiteStorageEnv, id: string): Promise<any> {
  const service = new SiteStorageService(env);
  return service.performSiteHealthCheck(id);
}

export async function updateSiteStatus(
  env: SiteStorageEnv,
  id: string,
  status: string,
  last_discovered_at?: string
): Promise<void> {
  const service = new SiteStorageService(env);
  const updates: any = { status };
  if (last_discovered_at) {
    updates.last_discovered_at = last_discovered_at;
  }
  await service.updateSite(id, updates);
}