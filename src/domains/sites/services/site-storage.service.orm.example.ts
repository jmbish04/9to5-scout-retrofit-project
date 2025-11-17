/**
 * @module src/domains/sites/services/site-storage.service.orm.example.ts
 * @description
 * EXAMPLE: Refactored site storage service using Drizzle + Kysely hybrid ORM.
 * This demonstrates the migration pattern from raw D1 queries to type-safe ORM.
 *
 * Migration Guide:
 * 1. Replace raw DB.prepare() calls with Drizzle for simple CRUD
 * 2. Use Kysely for dynamic queries, filtering, and complex joins
 * 3. Maintain same function signatures and return types
 */

import { eq, sql } from "drizzle-orm";
import {
  DatabaseError,
  DuplicateError,
  NotFoundError,
} from "../../../core/errors";
import { Logger } from "../../../core/services/logger.service";
import type { DatabaseEnv } from "../../../db/client";
import { initDb, type DatabaseClient } from "../../../db/client";
import type { NewSite, Site } from "../../../db/schema";
import { sites as sitesTable } from "../../../db/schema";

export interface SiteStorageEnv extends DatabaseEnv {
  ANALYTICS?: AnalyticsEngineDataset;
}

export class SiteStorageService {
  private db: DatabaseClient;
  private logger: Logger;

  constructor(env: SiteStorageEnv) {
    this.db = initDb(env);
    this.logger = new Logger("SiteStorageService", env);
  }

  /**
   * Create a new site using Drizzle (simple insert)
   */
  async createSite(payload: Omit<Site, "id" | "createdAt">): Promise<Site> {
    this.logger.info("Attempting to create site", { baseUrl: payload.baseUrl });
    try {
      // Check for duplicates using Drizzle
      const existingSite = await this.db.drizzle
        .select({ id: sitesTable.id })
        .from(sitesTable)
        .where(eq(sitesTable.baseUrl, payload.baseUrl))
        .limit(1)
        .get();

      if (existingSite) {
        throw new DuplicateError("Site", "base_url", payload.baseUrl);
      }

      // Insert using Drizzle
      const id = crypto.randomUUID();
      const newSite: NewSite = {
        id,
        name: payload.name,
        baseUrl: payload.baseUrl,
        discoveryStrategy: payload.discoveryStrategy,
        robotsTxt: payload.robotsTxt ?? null,
        sitemapUrl: payload.sitemapUrl ?? null,
        lastDiscoveredAt: payload.lastDiscoveredAt ?? null,
        createdAt: new Date().toISOString(),
      } as any; // Type assertion for example

      await this.db.drizzle.insert(sitesTable).values(newSite).run();

      const created = await this.getSiteById(id);
      if (!created) {
        throw new DatabaseError(
          "Failed to create site: could not retrieve after insert",
          undefined
        );
      }

      this.logger.info("Successfully created site", { siteId: created.id });
      return created;
    } catch (error) {
      this.logger.error("Failed to create site", error as Error, {
        baseUrl: payload.baseUrl,
      });
      if (error instanceof DuplicateError) throw error;
      throw new DatabaseError("Failed to create site", error as Error);
    }
  }

  /**
   * Get sites with pagination using Drizzle (simple select)
   */
  async getSites(
    options: { limit?: number; offset?: number } = {}
  ): Promise<Site[]> {
    const { limit = 50, offset = 0 } = options;

    const results = await this.db.drizzle
      .select()
      .from(sitesTable)
      .orderBy(sitesTable.name)
      .limit(limit)
      .offset(offset)
      .all();

    return results;
  }

  /**
   * Get site by ID using Drizzle (simple lookup)
   */
  async getSiteById(id: string): Promise<Site | null> {
    const result = await this.db.drizzle
      .select()
      .from(sitesTable)
      .where(eq(sitesTable.id, id))
      .limit(1)
      .get();

    return result ?? null;
  }

  /**
   * Update site using Drizzle (simple update)
   */
  async updateSite(
    id: string,
    updates: Partial<Omit<Site, "id" | "createdAt">>
  ): Promise<Site> {
    const existingSite = await this.getSiteById(id);
    if (!existingSite) {
      throw new NotFoundError("Site", id);
    }

    // Build update object, excluding undefined values
    const updateData: Partial<NewSite> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.baseUrl !== undefined) updateData.baseUrl = updates.baseUrl;
    if (updates.discoveryStrategy !== undefined)
      updateData.discoveryStrategy = updates.discoveryStrategy;
    if (updates.robotsTxt !== undefined)
      (updateData as any).robotsTxt = updates.robotsTxt;
    if (updates.sitemapUrl !== undefined)
      (updateData as any).sitemapUrl = updates.sitemapUrl;
    if (updates.lastDiscoveredAt !== undefined)
      (updateData as any).lastDiscoveredAt = updates.lastDiscoveredAt;

    if (Object.keys(updateData).length === 0) {
      return existingSite; // No updates to perform
    }

    await this.db.drizzle
      .update(sitesTable)
      .set(updateData)
      .where(eq(sitesTable.id, id))
      .run();

    const updated = await this.getSiteById(id);
    if (!updated) {
      throw new DatabaseError(
        "Failed to update site: could not retrieve after update",
        undefined
      );
    }
    return updated;
  }

  /**
   * Delete site using Drizzle (simple delete)
   */
  async deleteSite(id: string): Promise<void> {
    const result = await this.db.drizzle
      .delete(sitesTable)
      .where(eq(sitesTable.id, id))
      .run();

    if (result.meta.changes === 0) {
      throw new NotFoundError("Site", id);
    }
  }

  /**
   * Search sites using Kysely (dynamic query composition)
   */
  async searchSites(query: string): Promise<Site[]> {
    const searchPattern = `%${query}%`;

    // Use Kysely for dynamic LIKE queries
    const results = await (this.db.kysely as any)
      .selectFrom(sitesTable)
      .selectAll()
      .where((eb: any) =>
        eb.or([
          eb((sitesTable as any).name, "like", searchPattern),
          eb((sitesTable as any).baseUrl, "like", searchPattern),
        ])
      )
      .orderBy((sitesTable as any).name)
      .limit(25)
      .execute();

    return results as Site[];
  }

  /**
   * Get sites ready for discovery using Kysely (complex WHERE conditions)
   */
  async getSitesForDiscovery(limit: number = 10): Promise<Site[]> {
    // Use Kysely for complex date comparisons
    const results = await (this.db.kysely as any)
      .selectFrom(sitesTable)
      .selectAll()
      .where((eb: any) =>
        eb.or([
          eb((sitesTable as any).lastDiscoveredAt, "is", null),
          eb(
            sql`datetime(${eb.ref((sitesTable as any).lastDiscoveredAt)}, '+1 day')`,
            "<=",
            sql`datetime('now')`
          ),
        ])
      )
      .orderBy((sitesTable as any).lastDiscoveredAt, "asc")
      .orderBy((sitesTable as any).lastDiscoveredAt, "asc nulls first")
      .limit(limit)
      .execute();

    return results as Site[];
  }

  /**
   * Get site statistics using Kysely (aggregations)
   */
  async getSiteStatistics(): Promise<{
    totalSites: number;
    sitesDiscoveredInLast24Hours: number;
  }> {
    // Use Kysely for aggregations and subqueries
    const [totalResult, recentResult] = await Promise.all([
      (this.db.kysely as any)
        .selectFrom(sitesTable)
        .select((eb: any) => (eb.fn.count(sitesTable.id).as("count") as any))
        .executeTakeFirst(),

      (this.db.kysely as any)
        .selectFrom(sitesTable)
        .select((eb: any) => (eb.fn.count(sitesTable.id).as("count") as any))
        .where(
          sitesTable.lastDiscoveredAt,
          ">=",
          sql`datetime('now', '-1 day')`
        )
        .executeTakeFirst(),
    ]);

    return {
      totalSites: totalResult?.count ?? 0,
      sitesDiscoveredInLast24Hours: recentResult?.count ?? 0,
    };
  }

  /**
   * Perform health check (external fetch, simple DB lookup)
   */
  async performSiteHealthCheck(
    id: string
  ): Promise<{ status: "ok" | "error" | "unknown"; statusCode?: number }> {
    const site = await this.getSiteById(id);
    if (!site) {
      return { status: "unknown" };
    }

    try {
      const response = await fetch(site.baseUrl, {
        method: "HEAD",
        redirect: "follow",
      });
      return {
        status: response.ok ? "ok" : "error",
        statusCode: response.status,
      };
    } catch (error) {
      this.logger.error("Health check failed", error as Error, { siteId: id });
      return { status: "error" };
    }
  }
}

// ============================================================================
// Wrapper Functions (maintain compatibility with existing routes)
// ============================================================================

export interface GetSitesOptions {
  status?: string;
  discovery_strategy?: string;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: string;
}

export async function getSites(
  env: SiteStorageEnv,
  options: GetSitesOptions = {}
): Promise<Site[]> {
  const service = new SiteStorageService(env);
  const { limit = 50, offset = 0 } = options;
  return service.getSites({ limit, offset });
}

export async function getSiteById(
  env: SiteStorageEnv,
  id: string
): Promise<Site | null> {
  const service = new SiteStorageService(env);
  return service.getSiteById(id);
}

export async function saveSite(
  env: SiteStorageEnv,
  site: Partial<Site>
): Promise<string> {
  const service = new SiteStorageService(env);
  if (site.id) {
    const updated = await service.updateSite(site.id, site);
    return updated.id;
  } else {
    const created = await service.createSite(
      site as Omit<Site, "id" | "createdAt">
    );
    return created.id;
  }
}

export async function deleteSite(
  env: SiteStorageEnv,
  id: string
): Promise<boolean> {
  const service = new SiteStorageService(env);
  try {
    await service.deleteSite(id);
    return true;
  } catch (error) {
    if (error instanceof NotFoundError) {
      return false;
    }
    throw error;
  }
}

export async function searchSites(
  env: SiteStorageEnv,
  searchParams: any
): Promise<any> {
  const service = new SiteStorageService(env);
  if (searchParams.query) {
    return service.searchSites(searchParams.query);
  }
  return service.getSites({
    limit: searchParams.limit,
    offset: searchParams.offset,
  });
}

export async function getSitesForDiscovery(
  env: SiteStorageEnv
): Promise<Site[]> {
  const service = new SiteStorageService(env);
  return service.getSitesForDiscovery();
}

export async function getSiteStatistics(
  env: SiteStorageEnv,
  id: string
): Promise<any> {
  const service = new SiteStorageService(env);
  const site = await service.getSiteById(id);
  if (!site) {
    throw new NotFoundError("Site", id);
  }
  const stats = await service.getSiteStatistics();
  return { ...stats, site_id: id };
}

export async function performSiteHealthCheck(
  env: SiteStorageEnv,
  id: string
): Promise<any> {
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
  const updates = { status } as any; // Type assertion for example
  if (last_discovered_at) {
    updates.lastDiscoveredAt = last_discovered_at;
  }
  await service.updateSite(id, updates);
}
