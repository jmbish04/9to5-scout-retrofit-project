import type { Env } from '../lib/env';
import { companyBenefitsNightly, triggerCompanyScrape } from '../companies/scrape';
import { benefitsStatsRollup, getLatestStatsForCompany, getTopHighlights, getValuations } from '../stats/compute';

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_DEFAULT = 60;
const rateLimiter = new Map<string, { count: number; reset: number }>();

function getClientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')
    || 'unknown';
}

function rateLimitKey(request: Request, identifier: string): string {
  return `${identifier}:${getClientIp(request)}`;
}

function enforceRateLimit(key: string, limit = RATE_LIMIT_DEFAULT, windowMs = RATE_LIMIT_WINDOW): boolean {
  const now = Date.now();
  const existing = rateLimiter.get(key);

  if (!existing || existing.reset <= now) {
    rateLimiter.set(key, { count: 1, reset: now + windowMs });
    return true;
  }

  if (existing.count >= limit) {
    return false;
  }

  existing.count += 1;
  return true;
}

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function requireAdmin(request: Request, env: Env): boolean {
  const expected = env.ADMIN_TOKEN;
  if (!expected) {
    console.warn('ADMIN_TOKEN is not configured');
    return false;
  }

  const provided = request.headers.get('x-admin-token') || request.headers.get('x-admin-key');
  if (!provided) {
    return false;
  }

  return secureCompare(provided.trim(), expected.trim());
}

function parseLimit(value: string | null, defaultValue: number, max: number): number {
  if (!value) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }
  return Math.max(1, Math.min(parsed, max));
}

export async function handleCompanyScrapePost(request: Request, env: Env): Promise<Response> {
  if (!requireAdmin(request, env)) {
    return unauthorized();
  }

  const rateKey = rateLimitKey(request, 'company-scrape');
  if (!enforceRateLimit(rateKey, 10, 60_000)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get('DRY_RUN') === '1';

  let parsedBody: unknown = null;
  try {
    parsedBody = await request.json();
  } catch (error) {
    console.warn('Failed to parse JSON body for company scrape trigger', error);
  }

  const body = typeof parsedBody === 'object' && parsedBody !== null ? parsedBody as Record<string, unknown> : {};
  const companyIdValue = body['company_id'];
  const careersUrlValue = body['careers_url'];
  const companyId = typeof companyIdValue === 'string' ? companyIdValue : undefined;
  const careersUrl = typeof careersUrlValue === 'string' ? careersUrlValue : undefined;

  try {
    const result = await triggerCompanyScrape(env, companyId, {
      dryRun,
      careersUrlOverride: careersUrl,
      source: 'manual_trigger',
      adminTriggered: true,
    });

    return new Response(JSON.stringify({ status: 'ok', result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to trigger company scrape', error);
    return new Response(JSON.stringify({ error: 'Failed to trigger company scrape' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleCompaniesGet(request: Request, env: Env): Promise<Response> {
  const rateKey = rateLimitKey(request, 'companies-list');
  if (!enforceRateLimit(rateKey, 120, 60_000)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
  }

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get('limit'), 25, 100);
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10));
  const query = url.searchParams.get('q');

  let sql = `SELECT c.*, (
    SELECT json_object(
      'highlights', s.highlights,
      'total_comp_heuristics', s.total_comp_heuristics,
      'coverage', s.coverage,
      'computed_at', s.computed_at
    )
    FROM benefits_stats s
    WHERE s.company_id = c.id
    ORDER BY s.computed_at DESC
    LIMIT 1
  ) AS latest_stats
  FROM companies c`;

  const params: any[] = [];

  if (query && query.trim().length > 0) {
    sql += ' WHERE c.name LIKE ? OR c.normalized_domain LIKE ?';
    params.push(`%${query.trim()}%`, `%${query.trim()}%`);
  }

  sql += ' ORDER BY c.updated_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await env.DB.prepare(sql).bind(...params).all();
  const companies = (result.results || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    normalized_domain: row.normalized_domain,
    website_url: row.website_url,
    careers_url: row.careers_url,
    description: row.description,
    created_at: row.created_at,
    updated_at: row.updated_at,
    latest_stats: row.latest_stats ? JSON.parse(row.latest_stats) : null,
  }));

  return new Response(JSON.stringify({ companies, limit, offset }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleCompanyBenefitsGet(request: Request, env: Env, companyId: string): Promise<Response> {
  const rateKey = rateLimitKey(request, `company-benefits:${companyId}`);
  if (!enforceRateLimit(rateKey, 120, 60_000)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
  }

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get('limit'), 10, 100);

  const result = await env.DB.prepare(
    `SELECT id, source, source_url, snapshot_text, parsed, extracted_at
     FROM company_benefits_snapshots
     WHERE company_id = ?
     ORDER BY extracted_at DESC
     LIMIT ?`
  ).bind(companyId, limit).all();

  const snapshots = (result.results || []).map((row: any) => ({
    id: row.id,
    source: row.source,
    source_url: row.source_url,
    snapshot_text: row.snapshot_text,
    parsed: row.parsed ? JSON.parse(row.parsed) : null,
    extracted_at: row.extracted_at,
  }));

  const stats = await getLatestStatsForCompany(env, companyId);

  return new Response(JSON.stringify({ snapshots, stats }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleBenefitsCompareGet(request: Request, env: Env): Promise<Response> {
  const rateKey = rateLimitKey(request, 'benefits-compare');
  if (!enforceRateLimit(rateKey, 60, 60_000)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
  }

  const url = new URL(request.url);
  const idsParam = url.searchParams.get('company_ids');
  if (!idsParam) {
    return new Response(JSON.stringify({ error: 'company_ids query parameter is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const companyIds = idsParam.split(',').map((id) => id.trim()).filter((id) => id.length > 0);
  if (!companyIds.length) {
    return new Response(JSON.stringify({ error: 'No valid company_ids provided' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const placeholders = companyIds.map(() => '?').join(',');
  const snapshotsResult = await env.DB.prepare(
    `SELECT company_id, parsed, extracted_at
     FROM company_benefits_snapshots
     WHERE company_id IN (${placeholders})
     ORDER BY company_id, extracted_at DESC`
  ).bind(...companyIds).all();

  const groupedSnapshots = new Map<string, any[]>();
  (snapshotsResult.results || []).forEach((row: any) => {
    if (!groupedSnapshots.has(row.company_id)) {
      groupedSnapshots.set(row.company_id, []);
    }
    const parsed = row.parsed ? JSON.parse(row.parsed) : null;
    groupedSnapshots.get(row.company_id)?.push({
      extracted_at: row.extracted_at,
      parsed,
    });
  });

  const statsResult = await env.DB.prepare(
    `SELECT company_id, highlights, total_comp_heuristics, coverage, computed_at
     FROM benefits_stats
     WHERE company_id IN (${placeholders})
     ORDER BY computed_at DESC`
  ).bind(...companyIds).all();

  const latestStats = new Map<string, any>();
  (statsResult.results || []).forEach((row: any) => {
    if (!latestStats.has(row.company_id)) {
      latestStats.set(row.company_id, {
        computed_at: row.computed_at,
        highlights: row.highlights ? JSON.parse(row.highlights) : null,
        total_comp_heuristics: row.total_comp_heuristics ? JSON.parse(row.total_comp_heuristics) : null,
        coverage: row.coverage ? JSON.parse(row.coverage) : null,
      });
    }
  });

  const response = companyIds.map((companyId) => ({
    company_id: companyId,
    snapshots: (groupedSnapshots.get(companyId) || []).slice(0, 5),
    stats: latestStats.get(companyId) || null,
  }));

  return new Response(JSON.stringify({ companies: response }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleStatsHighlightsGet(request: Request, env: Env): Promise<Response> {
  const rateKey = rateLimitKey(request, 'stats-highlights');
  if (!enforceRateLimit(rateKey, 60, 60_000)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
  }

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get('limit'), 10, 50);
  const highlights = await getTopHighlights(env, limit);

  return new Response(JSON.stringify({ highlights }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleStatsValuationsGet(request: Request, env: Env): Promise<Response> {
  const rateKey = rateLimitKey(request, 'stats-valuations');
  if (!enforceRateLimit(rateKey, 60, 60_000)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
  }

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get('limit'), 25, 100);
  const valuations = await getValuations(env, limit);

  return new Response(JSON.stringify({ valuations }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleStatsRollupCron(env: Env, options: { dryRun?: boolean } = {}): Promise<void> {
  await benefitsStatsRollup(env, { dryRun: options.dryRun });
}

export async function handleCompanyBenefitsCron(env: Env, options: { dryRun?: boolean } = {}): Promise<void> {
  await companyBenefitsNightly(env, { dryRun: options.dryRun });
}
