/**
 * @module src/new/domains/sites/site-storage.service.ts
 * @description
 * This service is responsible for all data access and storage-related operations
 * for the 'sites' domain. It encapsulates all D1 database interactions,
 * validation logic, and any other storage-related concerns for sites.
 */

import { z } from 'zod';

// ============================================================================
// Schemas and Types
// ============================================================================

/**
 * Zod schema for Site validation.
 * This enforces data integrity for site objects.
 */
export const SiteSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Site name is required'),
  base_url: z.string().url('Base URL must be a valid URL').trim(),
  robots_txt: z.string().nullable().optional(),
  sitemap_url: z.string().url().nullable().optional(),
  discovery_strategy: z.string().min(1, 'Discovery strategy is required'),
  last_discovered_at: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime().optional(),
});

export type Site = z.infer<typeof SiteSchema>;

/**
 * Environment bindings required by this service.
 */
export interface SiteStorageEnv {
  DB: D1Database;
}

// ============================================================================
// Service Class
// ============================================================================

export class SiteStorageService {
  private env: SiteStorageEnv;

  constructor(env: SiteStorageEnv) {
    this.env = env;
  }

  /**
   * Get all sites with optional pagination.
   */
  async getSites(options: { limit?: number; offset?: number } = {}): Promise<Site[]> {
    const { limit = 50, offset = 0 } = options;
    const stmt = this.env.DB.prepare(
      'SELECT * FROM sites ORDER BY name LIMIT ?1 OFFSET ?2'
    );
    const result = await stmt.bind(limit, offset).all<Site>();
    return result.results || [];
  }

  /**
   * Get a site by its ID.
   */
  async getSiteById(id: string): Promise<Site | null> {
    const result = await this.env.DB.prepare('SELECT * FROM sites WHERE id = ?1')
      .bind(id)
      .first<Site>();
    return result || null;
  }

  /**
   * Creates a new site record after validating the payload and checking for duplicates.
   */
  async createSite(payload: Omit<Site, 'id' | 'created_at'>): Promise<Site> {
    // 1. Validate payload with Zod schema
    const validationResult = SiteSchema.omit({ id: true, created_at: true }).safeParse(payload);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.issues.map(i => i.message).join(', ')}`);
    }
    const validatedPayload = validationResult.data;

    // 2. Check for duplicate site by base_url to prevent redundant entries
    const existingSite = await this.env.DB.prepare('SELECT id FROM sites WHERE base_url = ?1')
      .bind(validatedPayload.base_url)
      .first();

    if (existingSite) {
      throw new Error(`A site with the URL '${validatedPayload.base_url}' already exists.`);
    }

    // 3. Create the new site record
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await this.env.DB.prepare(
      `INSERT INTO sites(
        id, name, base_url, robots_txt, sitemap_url,
        discovery_strategy, last_discovered_at, created_at
      ) VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
    )
      .bind(
        id,
        validatedPayload.name,
        validatedPayload.base_url,
        validatedPayload.robots_txt ?? null,
        validatedPayload.sitemap_url ?? null,
        validatedPayload.discovery_strategy,
        validatedPayload.last_discovered_at ?? null,
        createdAt
      )
      .run();

    const newSite = await this.getSiteById(id);
    if (!newSite) {
      throw new Error('Failed to create site: could not retrieve after insert.');
    }
    return newSite;
  }

  /**
   * Updates an existing site record.
   */
  async updateSite(id: string, updates: Partial<Omit<Site, 'id' | 'created_at'>>): Promise<Site> {
    const existingSite = await this.getSiteById(id);
    if (!existingSite) {
      throw new Error(`Site with id '${id}' not found.`);
    }

    const fields: string[] = [];
    const values: any[] = [];

    // Dynamically build the SET clause for the SQL query
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      return existingSite; // No updates to perform
    }

    values.push(id);

    await this.env.DB.prepare(
      `UPDATE sites SET ${fields.join(', ')} WHERE id = ?`
    )
      .bind(...values)
      .run();

    const updatedSite = await this.getSiteById(id);
    if (!updatedSite) {
      throw new Error('Failed to update site: could not retrieve after update.');
    }
    return updatedSite;
  }

  /**
   * Deletes a site by its ID.
   */
  async deleteSite(id: string): Promise<void> {
    const result = await this.env.DB.prepare('DELETE FROM sites WHERE id = ?1')
      .bind(id)
      .run();

    if (result.meta.changes === 0) {
        throw new Error(`Site with id '${id}' not found or could not be deleted.`);
    }
  }

  /**
   * Searches for sites by name or URL.
   */
  async searchSites(query: string): Promise<Site[]> {
    const searchQuery = `%${query}%`;
    const result = await this.env.DB.prepare(
      'SELECT * FROM sites WHERE name LIKE ?1 OR base_url LIKE ?1 ORDER BY name LIMIT 25'
    )
      .bind(searchQuery)
      .all<Site>();
    return result.results || [];
  }

  /**
   * Retrieves sites that are due for content discovery.
   */
  async getSitesForDiscovery(limit: number = 10): Promise<Site[]> {
    const result = await this.env.DB.prepare(
      `SELECT * FROM sites
       WHERE last_discovered_at IS NULL OR datetime(last_discovered_at, '+1 day') <= datetime('now')
       ORDER BY last_discovered_at ASC NULLS FIRST
       LIMIT ?1`
    )
      .bind(limit)
      .all<Site>();
    return result.results || [];
  }

  /**
   * Gathers basic statistics about the sites in the database.
   */
  async getSiteStatistics(): Promise<{ totalSites: number; sitesDiscoveredInLast24Hours: number }> {
    const totalPromise = this.env.DB.prepare('SELECT COUNT(*) as count FROM sites').first<{ count: number }>();
    const recentPromise = this.env.DB.prepare(
        `SELECT COUNT(*) as count FROM sites WHERE last_discovered_at >= datetime('now', '-1 day')`
    ).first<{ count: number }>();

    const [totalResult, recentResult] = await Promise.all([totalPromise, recentPromise]);

    return {
      totalSites: totalResult?.count ?? 0,
      sitesDiscoveredInLast24Hours: recentResult?.count ?? 0,
    };
  }

  /**
   * Performs a basic health check on a site's base URL.
   */
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
      console.error(`Health check failed for site ${id}:`, error);
      return { status: 'error' };
    }
  }
}
