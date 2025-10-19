import type { Site } from "../../../lib/types";

export interface StorageEnv {
  DB: D1Database;
}

/**
 * Save a site configuration.
 */
export async function saveSite(env: StorageEnv, site: Site): Promise<string> {
  if (site.id) {
    await updateSite(env, site.id, site);
    return site.id;
  }
  return createSite(env, site);
}

/**
 * Get all sites with optional pagination.
 */
export async function getSites(
  env: StorageEnv,
  options: { limit?: number; offset?: number } = {}
): Promise<Site[]> {
  const { limit = 50, offset = 0 } = options;
  const stmt = env.DB.prepare(
    "SELECT * FROM sites ORDER BY name LIMIT ?1 OFFSET ?2"
  );
  const result = await stmt.bind(limit, offset).all();
  return (result.results || []) as unknown as Site[];
}

/**
 * Get a site by ID.
 */
export async function getSiteById(
  env: StorageEnv,
  id: string
): Promise<Site | null> {
  const result = await env.DB.prepare("SELECT * FROM sites WHERE id = ?1")
    .bind(id)
    .first<Site>();
  return result || null;
}

/**
 * Create a new site record.
 */
export async function createSite(env: StorageEnv, site: Site): Promise<string> {
  const id = site.id || crypto.randomUUID();
  const createdAt = site.created_at || new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO sites(
      id, name, base_url, robots_txt, sitemap_url,
      discovery_strategy, last_discovered_at, created_at
    ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)`
  )
    .bind(
      id,
      site.name,
      site.base_url,
      site.robots_txt ?? null,
      site.sitemap_url ?? null,
      site.discovery_strategy,
      site.last_discovered_at ?? null,
      createdAt
    )
    .run();

  return id;
}

/**
 * Update an existing site.
 */
export async function updateSite(
  env: StorageEnv,
  id: string,
  updates: Partial<Site>
): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.base_url !== undefined) {
    fields.push("base_url = ?");
    values.push(updates.base_url);
  }
  if (updates.robots_txt !== undefined) {
    fields.push("robots_txt = ?");
    values.push(updates.robots_txt ?? null);
  }
  if (updates.sitemap_url !== undefined) {
    fields.push("sitemap_url = ?");
    values.push(updates.sitemap_url ?? null);
  }
  if (updates.discovery_strategy !== undefined) {
    fields.push("discovery_strategy = ?");
    values.push(updates.discovery_strategy);
  }
  if (updates.last_discovered_at !== undefined) {
    fields.push("last_discovered_at = ?");
    values.push(updates.last_discovered_at);
  }

  if (fields.length === 0) {
    return;
  }

  values.push(id);

  await env.DB.prepare(`UPDATE sites SET ${fields.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
}

/**
 * Delete a site by ID.
 */
export async function deleteSite(
  env: StorageEnv,
  id: string
): Promise<boolean> {
  const result = await env.DB.prepare("DELETE FROM sites WHERE id = ?1")
    .bind(id)
    .run();
  return (result as any)?.success !== false;
}

export interface SiteStorageEnv {
  DB: D1Database;
}

export async function getSiteStatistics(env: SiteStorageEnv, siteId: string): Promise<any> {
  // Placeholder implementation
  return {
    site_id: siteId,
    site_name: "Unknown",
    total_jobs_discovered: 0,
    jobs_last_24h: 0,
    jobs_last_7d: 0,
    jobs_last_30d: 0,
    avg_jobs_per_run: 0,
    success_rate: 0,
    avg_response_time: 0,
    last_successful_discovery: undefined,
    discovery_frequency_hours: 24,
    consecutive_failures: 0,
  };
}

export async function searchSites(env: SiteStorageEnv, params: any): Promise<any> {
  // Placeholder implementation
  return {
    sites: [],
    total: 0,
    page: 1,
    limit: 20,
    has_more: false,
    next_offset: undefined,
    metadata: {
      search_time_ms: 0,
      filters_applied: [],
      steel_sites_count: 0,
      active_sites_count: 0,
    },
  };
}

export async function getSitesForDiscovery(env: SiteStorageEnv): Promise<any[]> {
  // Placeholder implementation
  return [];
}

export async function performSiteHealthCheck(env: SiteStorageEnv, id: string): Promise<any> {
  // Placeholder implementation
  return {
    id,
    status: "healthy",
    response_time: 100,
  };
}

export async function updateSiteStatus(
  env: SiteStorageEnv,
  id: string,
  status: string,
  last_discovered_at?: string
): Promise<void> {
  // Placeholder implementation
  return;
}
