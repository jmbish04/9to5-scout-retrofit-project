/**
 * @module src/domains/sites/services/site-storage.service.ts
 * @description
 * This service is responsible for all data access and storage-related operations
 * for the 'sites' domain. It provides both class-based and function-based APIs.
 */

import { z } from 'zod';
import { DuplicateError, NotFoundError, DatabaseError } from '../../../core/errors';
import { Logger } from '../../../core/services/logger.service';
import { Site, SiteSchema } from '../models/site.schema';
import type { SiteSearchParams, SiteSearchResult, SiteStatistics, SiteHealthCheck } from '../models/site.schema';

export interface SiteStorageEnv {
  DB: D1Database;
  ANALYTICS?: AnalyticsEngineDataset;
}

/**
 * Service class for site storage operations.
 */
export class SiteStorageService {
  private env: SiteStorageEnv;
  private logger: Logger;

  constructor(env: SiteStorageEnv) {
    this.env = env;
    this.logger = new Logger("SiteStorageService", env);
  }

  /**
   * Get all sites with optional pagination and filtering.
   */
  async getSites(options: {
    limit?: number;
    offset?: number;
    status?: string;
    discovery_strategy?: string;
    sort_by?: string;
    sort_order?: string;
  } = {}): Promise<Site[]> {
    const { limit = 50, offset = 0 } = options;
    try {
      const result = await this.env.DB.prepare(
        'SELECT * FROM sites ORDER BY name LIMIT ?1 OFFSET ?2'
      ).bind(limit, offset).all<Site>();
      return result.results || [];
  	} catch (error) {
      this.logger.error("Failed to get sites", error as Error);
      throw new DatabaseError("Failed to get sites", error as Error);
    }
  }

  /**
   * Get a site by its ID.
   */
  async getSiteById(id: string): Promise<Site | null> {
    try {
      const result = await this.env.DB.prepare('SELECT * FROM sites WHERE id = ?1')
        .bind(id)
        .first<Site>();
      return result || null;
  	} catch (error) {
      this.logger.error("Failed to get site by ID", error as Error, { siteId: id });
      throw new DatabaseError("Failed to get site by ID", error as Error);
    }
  }

  /**
   * Creates a new site record after validating the payload and checking for duplicates.
   */
  async createSite(payload: Partial<Site>): Promise<string> {
    this.logger.info("Attempting to create site", { baseUrl: payload.base_url });
    try {
      // Check for duplicate site by base_url
      const existingSite = await this.env.DB.prepare('SELECT id FROM sites WHERE base_url = ?1')
        .bind(payload.base_url)
        .first();

      if (existingSite) {
        throw new DuplicateError("Site", "base_url", payload.base_url || '');
      }

      // Create the new site record
      const id = payload.id || crypto.randomUUID();
      const createdAt = new Date().toISOString();

      await this.env.DB.prepare(
        `INSERT INTO sites(
          id, name, base_url, robots_txt, sitemap_url,
          discovery_strategy, last_discovered_at, created_at, status
        ) VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
      )
        .bind(
          id,
          payload.name,
          payload.base_url,
          payload.robots_txt ?? null,
          payload.sitemap_url ?? null,
          payload.discovery_strategy,
          payload.last_discovered_at ?? null,
          createdAt,
          payload.status ?? 'active'
        )
        .run();

      this.logger.info("Successfully created site", { siteId: id });
      return id;
  	} catch (error) {
      this.logger.error("Failed to create site", error as Error, { baseUrl: payload.base_url });
      if (error instanceof DuplicateError) throw error;
      throw new DatabaseError("Failed to create site", error as Error);
    }
  }

  /**
   * Updates an existing site record.
   */
  async updateSite(id: string, updates: Partial<Site>): Promise<Site> {
  	try {
  	  const existingSite = await this.getSiteById(id);
  	  if (!existingSite) {
  	    throw new NotFoundError("Site", id);
  	  }

  	  const fields: string[] = [];
  	  const values: any[] = [];

  	  // Dynamically build the SET clause for the SQL query
  	  for (const [key, value] of Object.entries(updates)) {
  	    if (value !== undefined && key !== 'id') {
  	      fields.push(`${key} = ?`);
  	      values.push(value);
  	    }
  	  }

  	  if (fields.length === 0) {
  	    return existingSite; // No updates to perform
  	  }

  	  values.push(id);

  	  await this.env.DB.prepare(
  	    `UPDATE sites SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`
  	  )
  	    .bind(...values)
  	    .run();

  	  const updatedSite = await this.getSiteById(id);
  	  if (!updatedSite) {
  	    throw new DatabaseError('Failed to update site: could not retrieve after update.');
  	  }
  	  return updatedSite;
  	} catch (error) {
  	  this.logger.error("Failed to update site", error as Error, { siteId: id });
  	  if (error instanceof NotFoundError) throw error;
  	  throw new DatabaseError("Failed to update site", error as Error);
  	}
  }

  /**
   * Deletes a site by its ID.
   */
  async deleteSite(id: string): Promise<boolean> {
  	try {
  	  const result = await this.env.DB.prepare('DELETE FROM sites WHERE id = ?1')
  	    .bind(id)
  	    .run();

  	  if (result.meta.changes === 0) {
  	    return false;
  	  }
  	  this.logger.info("Successfully deleted site", { siteId: id });
  	  return true;
  	} catch (error) {
  	  this.logger.error("Failed to delete site", error as Error, { siteId: id });
  	  throw new DatabaseError("Failed to delete site", error as Error);
  	}
  }

  /**
   * Searches for sites by query.
   */
  async searchSites(params: SiteSearchParams): Promise<SiteSearchResult> {
  	try {
  	  const { query, limit = 20, offset = 0, page = 1 } = params;
  	  const searchQuery = `%${query}%`;
  	  const result = await this.env.DB.prepare(
  	    'SELECT * FROM sites WHERE name LIKE ?1 OR base_url LIKE ?1 ORDER BY name LIMIT ?2 OFFSET ?3'
  	  )
  	    .bind(searchQuery, limit, offset)
  	    .all<any>();

  	  const totalResult = await this.env.DB.prepare(
  	    'SELECT COUNT(*) as count FROM sites WHERE name LIKE ?1 OR base_url LIKE ?1'
  	  )
  	    .bind(searchQuery)
  	    .first<{ count: number }>();

  	  const total = totalResult?.count || 0;

  	  return {
  	    sites: result.results || [],
  	    total,
  	    page,
  	   	limit,
  	   	has_more: offset + limit < total,
  	   	next_offset: offset + limit < total ? offset + limit : undefined,
  	  };
  	} catch (error) {
  	  this.logger.error("Failed to search sites", error as Error);
  	  throw new DatabaseError("Failed to search sites", error as Error);
  	}
  }

  /**
  	* Retrieves sites that are due for content discovery.
  	*/
  async getSitesForDiscovery(limit: number = 10): Promise<Site[]> {
  	try {
  	  const result = await this.env.DB.prepare(
  	    `SELECT * FROM sites
  	      WHERE (last_discovered_at IS NULL OR datetime(last_discovered_at, '+1 day') <= datetime('now'))
         AND status = 'active'
  	      ORDER BY last_discovered_at ASC NULLS FIRST
  	      LIMIT ?1`
  	  )
  	    .bind(limit)
  	    .all<Site>();
  	  return result.results || [];
  	} catch (error) {
  	  this.logger.error("Failed to get sites for discovery", error as Error);
  	  throw new DatabaseError("Failed to get sites for discovery", error as Error);
  	}
  }

  /**
   * Gathers statistics about a specific site.
   */
  async getSiteStatistics(id: string): Promise<SiteStatistics> {
  	try {
  	  const site = await this.getSiteById(id);
  	  if (!site) {
  	    throw new NotFoundError("Site", id);
  	  }

  	  const jobsResult = await this.env.DB.prepare(
  	    'SELECT COUNT(*) as count FROM jobs WHERE site_id = ?1'
  	  ).bind(id).first<{ count: number }>();

  	  return {
  	    site_id: id,
  	   	site_name: site.name,
  	   	total_jobs_discovered: jobsResult?.count || 0,
  	   	jobs_last_24h: 0,
  	   	jobs_last_7d: 0,
  	   	jobs_last_30d: 0,
  	   	avg_jobs_per_run: 0,
  	   	success_rate: 100,
  	   	avg_response_time: 0,
  	   	discovery_frequency_hours: 24,
  	   	consecutive_failures: 0,
  	  };
  	} catch (error) {
  	  this.logger.error("Failed to get site statistics", error as Error, { siteId: id });
  	  if (error instanceof NotFoundError) throw error;
  	  throw new DatabaseError("Failed to get site statistics", error as Error);
  	}
  }

  /**
   * Performs a health check on a site.
   */
  async performSiteHealthCheck(id: string): Promise<SiteHealthCheck> {
  	try {
  	  const site = await this.getSiteById(id);
  	  if (!site) {
  	    throw new NotFoundError("Site", id);
  	  }

  	  const startTime = Date.now();
  	  let response: Response | null = null;
  	  let isAccessible = false;
  	  let httpStatus: number | undefined;
  	  let errorMessage: string | undefined;

  	  try {
  	    response = await fetch(site.base_url, {
  	      method: 'HEAD',
  	      redirect: 'follow',
          signal: AbortSignal.timeout(10000)
KE:   	    });
  	    isAccessible = response.ok;
  	    httpStatus = response.status;
  	  } catch (error) {
  	   	errorMessage = error instanceof Error ? error.message : 'Unknown error';
  	  }

  	  const responseTime = Date.now() - startTime;

  	  return {
  	   	site_id: id,
  	   	checked_at: new Date().toISOString(),
  	   	status: isAccessible ? 'healthy' : 'unhealthy',
  	   	response_time_ms: responseTime,
  	   	http_status: httpStatus,
  	   	is_accessible: isAccessible,
  	   	requires_auth: false,
  	   	steel_supported: false,
  	   	error_message: errorMessage,
T:   	  };
  	} catch (error) {
  	  this.logger.error("Failed to perform health check", error as Error, { siteId: id });
  	  if (error instanceof NotFoundError) throw error;
  	  throw new DatabaseError("Failed to perform health check", error as Error);
  	}
  }

  /**
   * Updates the status of a site.
   */
  async updateSiteStatus(id: string, status: string, lastDiscoveredAt?: string): Promise<void> {
  	try {
  	  if (lastDiscoveredAt) {
  	    await this.env.DB.prepare(
  	      'UPDATE sites SET status = ?1, last_discovered_at = ?2, updated_at = datetime("now") WHERE id = ?3'
  	    ).bind(status, lastDiscoveredAt, id).run();
  	  } else {
  	    await this.env.DB.prepare(
  	      'UPDATE sites SET status = ?1, updated_at = datetime("now") WHERE id = ?2'
  	    ).bind(status, id).run();
  	  }
  	  this.logger.info("Updated site status", { siteId: id, status });
  	} catch (error) {
  	  this.logger.error("Failed to update site status", error as Error, { siteId: id });
  	  throw new DatabaseError("Failed to update site status", error as Error);
  	}
  }
}

// ============================================================================
// Function-based API (for backward compatibility with routes)
// ============================================================================

/**
 * Get all sites with optional filtering.
 */
export async function getSites(env: SiteStorageEnv, options: any = {}): Promise<Site[]> {
  const service = new SiteStorageService(env);
  return service.getSites(options);
}

/**
 * Get a site by ID.
 */
export async function getSiteById(env: SiteStorageEnv, id: string): Promise<Site | null> {
  const service = new SiteStorageService(env);
  return service.getSiteById(id);
}

/**
 * Save a site (create or update).
 */
export async function saveSite(env: SiteStorageEnv, site: Partial<Site>): Promise<string> {
  const service = new SiteStorageService(env);
  if (site.id) {
    await service.updateSite(site.id, site);
    return site.id;
  }
  return service.createSite(site);
}

/**
 * Delete a site by ID.
 */
export async function deleteSite(env: SiteStorageEnv, id: string): Promise<boolean> {
  const service = new SiteStorageService(env);
  return service.deleteSite(id);
}

/**
 * Search sites.
 */
export async function searchSites(env: SiteStorageEnv, params: SiteSearchParams): Promise<SiteSearchResult> {
  const service = new SiteStorageService(env);
  return service.searchSites(params);
}

/**
 * Get sites ready for discovery.
 */
export async function getSitesForDiscovery(env: SiteStorageEnv, limit?: number): Promise<Site[]> {
  const service = new SiteStorageService(env);
  return service.getSitesForDiscovery(limit);
}

/**
 * Get site statistics.
 */
export async function getSiteStatistics(env: SiteStorageEnv, id: string): Promise<SiteStatistics> {
  const service = new SiteStorageService(env);
  return service.getSiteStatistics(id);
}

/**
 * Perform site health check.
 */
export async function performSiteHealthCheck(env: SiteStorageEnv, id: string): Promise<SiteHealthCheck> {
  const service = new SiteStorageService(env);
  return service.performSiteHealthCheck(id);
}

/**
 * Update site status.
 */
export async function updateSiteStatus(env: SiteStorageEnv, id: string, status: string, lastDiscoveredAt?: string): Promise<void> {
  const service = new SiteStorageService(env);
  return service.updateSiteStatus(id, status, lastDiscoveredAt);
}