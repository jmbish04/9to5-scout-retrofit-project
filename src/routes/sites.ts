import type { Env } from "../domains/config/env/env.config";
import {
  createSite,
  deleteSite,
  getSiteById,
  getSites,
  updateSite,
} from "../domains/sites/services/site-storage.service";
import type { Site } from "../lib/types";

function parsePagination(searchParams: URLSearchParams): {
  limit: number;
  offset: number;
} {
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);
  return { limit, offset };
}

function sanitizeSitePayload(payload: Partial<Site>): Partial<Site> {
  if (!payload) {
    return {};
  }

  const site: Partial<Site> = {};

  if (payload.name !== undefined) {
    site.name = payload.name.trim();
  }
  if (payload.base_url !== undefined) {
    site.base_url = payload.base_url.trim();
  }
  if (payload.robots_txt !== undefined) {
    site.robots_txt = payload.robots_txt ? payload.robots_txt.trim() : null;
  }
  if (payload.sitemap_url !== undefined) {
    site.sitemap_url = payload.sitemap_url ? payload.sitemap_url.trim() : null;
  }
  if (payload.discovery_strategy !== undefined) {
    site.discovery_strategy = payload.discovery_strategy.trim();
  }
  if (payload.last_discovered_at !== undefined) {
    site.last_discovered_at = payload.last_discovered_at;
  }

  return site;
}

function validateSiteForCreate(site: Partial<Site>): string | null {
  if (!site.name) {
    return "Site name is required";
  }
  if (!site.base_url) {
    return "Base URL is required";
  }
  if (!site.discovery_strategy) {
    return "Discovery strategy is required";
  }
  return null;
}

export async function handleSitesGet(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const { limit, offset } = parsePagination(url.searchParams);

    const [sites, totalRow] = await Promise.all([
      getSites(env, { limit, offset }),
      env.DB.prepare("SELECT COUNT(*) as count FROM sites").first<{
        count: number;
      }>(),
    ]);

    return new Response(
      JSON.stringify({
        sites,
        pagination: {
          limit,
          offset,
          total: totalRow?.count ?? sites.length,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Failed to list sites:", error);
    return new Response(JSON.stringify({ error: "Failed to list sites" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleSitesPost(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const payload = sanitizeSitePayload(
      (await request.json()) as Partial<Site>
    );
    const validationError = validateSiteForCreate(payload);

    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const id = await createSite(env, payload as Site);
    const created = await getSiteById(env, id);

    return new Response(JSON.stringify(created), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to create site:", error);
    return new Response(JSON.stringify({ error: "Failed to create site" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleSiteGet(
  _request: Request,
  env: Env,
  siteId: string
): Promise<Response> {
  try {
    const site = await getSiteById(env, siteId);

    if (!site) {
      return new Response(JSON.stringify({ error: "Site not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(site), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to fetch site:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch site" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleSitePut(
  request: Request,
  env: Env,
  siteId: string
): Promise<Response> {
  try {
    const existing = await getSiteById(env, siteId);
    if (!existing) {
      return new Response(JSON.stringify({ error: "Site not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = sanitizeSitePayload(
      (await request.json()) as Partial<Site>
    );
    await updateSite(env, siteId, payload);
    const updated = await getSiteById(env, siteId);

    return new Response(JSON.stringify(updated), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to update site:", error);
    return new Response(JSON.stringify({ error: "Failed to update site" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleSiteDelete(
  _request: Request,
  env: Env,
  siteId: string
): Promise<Response> {
  try {
    const existing = await getSiteById(env, siteId);
    if (!existing) {
      return new Response(JSON.stringify({ error: "Site not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    await deleteSite(env, siteId);

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete site:", error);
    return new Response(JSON.stringify({ error: "Failed to delete site" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
