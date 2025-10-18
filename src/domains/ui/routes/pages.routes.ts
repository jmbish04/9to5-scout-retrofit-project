/**
 * UI Pages Routes
 *
 * Handles static page serving and routing for the 9to5 Scout application.
 * Provides a centralized way to serve HTML pages and static assets.
 *
 * @fileoverview This module manages page routing, path normalization, and asset serving
 * for the frontend interface of the job scraping and management system.
 */

import type { Env } from "../../config/env";

/**
 * Normalizes a pathname to ensure consistent routing
 *
 * @param pathname - The raw pathname from the URL
 * @returns Normalized pathname with proper leading/trailing slashes
 *
 * @example
 * ```typescript
 * normalisePath('getting-started') // Returns '/getting-started'
 * normalisePath('/api-reference/') // Returns '/api-reference'
 * normalisePath('') // Returns '/'
 * ```
 */
function normalisePath(pathname: string): string {
  if (!pathname) {
    return "/";
  }
  let path = pathname;
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }
  return path || "/";
}

/**
 * Page route configuration mapping paths to asset files
 *
 * @description Maps URL paths to their corresponding static asset files
 * and content types for proper serving
 */
const PAGE_ROUTES: Record<string, { assetPath: string; contentType?: string }> =
  {
    "/": { assetPath: "/index.html", contentType: "text/html; charset=UTF-8" },
    "/index.html": {
      assetPath: "/index.html",
      contentType: "text/html; charset=UTF-8",
    },
    "/getting-started": {
      assetPath: "/getting-started.html",
      contentType: "text/html; charset=UTF-8",
    },
    "/getting-started.html": {
      assetPath: "/getting-started.html",
      contentType: "text/html; charset=UTF-8",
    },
    "/api-reference": {
      assetPath: "/api-reference.html",
      contentType: "text/html; charset=UTF-8",
    },
    "/api-reference.html": {
      assetPath: "/api-reference.html",
      contentType: "text/html; charset=UTF-8",
    },
    "/email-integration": {
      assetPath: "/email-integration.html",
      contentType: "text/html; charset=UTF-8",
    },
    "/email-integration.html": {
      assetPath: "/email-integration.html",
      contentType: "text/html; charset=UTF-8",
    },
    "/job-history-management": {
      assetPath: "/job-history-management.html",
      contentType: "text/html; charset=UTF-8",
    },
    "/job-history-management.html": {
      assetPath: "/job-history-management.html",
      contentType: "text/html; charset=UTF-8",
    },
    "/agent-workflow-config": {
      assetPath: "/agent-workflow-config.html",
      contentType: "text/html; charset=UTF-8",
    },
    "/agent-workflow-config.html": {
      assetPath: "/agent-workflow-config.html",
      contentType: "text/html; charset=UTF-8",
    },
    "/operations-dashboard": {
      assetPath: "/operations-dashboard.html",
      contentType: "text/html; charset=UTF-8",
    },
    "/operations-dashboard.html": {
      assetPath: "/operations-dashboard.html",
      contentType: "text/html; charset=UTF-8",
    },
    "/logs": {
      assetPath: "/logs.html",
      contentType: "text/html; charset=UTF-8",
    },
    "/logs.html": {
      assetPath: "/logs.html",
      contentType: "text/html; charset=UTF-8",
    },
    "/ws-debug": {
      assetPath: "/ws-debug.html",
      contentType: "text/html; charset=UTF-8",
    },
    "/ws-debug.html": {
      assetPath: "/ws-debug.html",
      contentType: "text/html; charset=UTF-8",
    },
    "/templates/cover_letter_template": {
      assetPath: "/templates/cover_letter_template.html",
      contentType: "text/html; charset=UTF-8",
    },
    "/templates/cover_letter_template.html": {
      assetPath: "/templates/cover_letter_template.html",
      contentType: "text/html; charset=UTF-8",
    },
    "/templates/resume_template": {
      assetPath: "/templates/resume_template.html",
      contentType: "text/html; charset=UTF-8",
    },
    "/templates/resume_template.html": {
      assetPath: "/templates/resume_template.html",
      contentType: "text/html; charset=UTF-8",
    },
    "/templates/email_template": {
      assetPath: "/templates/email_template.html",
      contentType: "text/html; charset=UTF-8",
    },
    "/templates/email_template.html": {
      assetPath: "/templates/email_template.html",
      contentType: "text/html; charset=UTF-8",
    },
    "/openapi.json": {
      assetPath: "/openapi.json",
      contentType: "application/json; charset=UTF-8",
    },
  };

/**
 * Handles page requests by serving static HTML files and assets
 *
 * @param request - The incoming HTTP request
 * @param env - Cloudflare Workers environment bindings
 * @returns Response with the requested page or asset, or 404 if not found
 *
 * @description This function:
 * 1. Normalizes the request pathname
 * 2. Checks if the request method is GET or HEAD
 * 3. Looks up the path in PAGE_ROUTES configuration
 * 4. Serves the corresponding asset with proper content type
 * 5. Falls back to direct asset serving for unmatched paths
 * 6. Returns 404 for completely missing resources
 *
 * @example
 * ```typescript
 * // GET /getting-started -> serves /getting-started.html
 * // GET /api-reference -> serves /api-reference.html
 * // GET /static/style.css -> serves from ASSETS directly
 * ```
 */
export async function handlePageRequest(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const pathname = normalisePath(url.pathname);

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const route = PAGE_ROUTES[pathname];
  if (route) {
    const assetUrl = new URL(route.assetPath, url.origin);
    const assetRequest = new Request(assetUrl.toString(), {
      method: request.method,
      headers: new Headers(request.headers),
    });
    const assetResponse = await env.ASSETS.fetch(assetRequest);

    if (assetResponse.ok) {
      if (route.contentType) {
        const headers = new Headers(assetResponse.headers);
        headers.set("Content-Type", route.contentType);
        return new Response(assetResponse.body, {
          status: assetResponse.status,
          headers,
        });
      }
      return assetResponse;
    }
  }

  // Fallback to direct asset serving
  const assetResponse = await env.ASSETS.fetch(request);
  if (assetResponse.status !== 404) {
    return assetResponse;
  }

  return new Response("Not Found", {
    status: 404,
    headers: { "Content-Type": "text/html; charset=UTF-8" },
  });
}
