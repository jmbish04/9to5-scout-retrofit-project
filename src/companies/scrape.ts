import { coalesceCareersUrl, textFromHTML } from '../lib/normalize';
import { extractBenefits } from '../lib/extractBenefits';

interface CompanyScrapeEnv {
  DB: any;
  BROWSER_RENDERING_TOKEN: string;
  BROWSER?: any;
  MYBROWSER?: any;
}

interface CompanyRow {
  id: string;
  name: string;
  normalized_domain: string;
  website_url: string | null;
  careers_url: string | null;
}

interface ScrapeOptions {
  dryRun?: boolean;
  careersUrlOverride?: string;
  force?: boolean;
  source?: string;
  perHostLimit?: number;
  concurrency?: number;
  adminTriggered?: boolean;
}

const ROBOTS_CACHE = new Map<string, { fetchedAt: number; disallows: string[] }>();
const ROBOTS_TTL = 1000 * 60 * 60 * 12; // 12 hours

function getBrowserFetcher(env: CompanyScrapeEnv): any {
  return env.BROWSER || env.MYBROWSER;
}

async function fetchWithRetries(fetcher: any, requestInit: RequestInit, attempts = 3): Promise<Response> {
  let lastError: unknown;
  const delayBase = 500;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetcher.fetch('https://browser.render.cloudflare.com', requestInit);
      if (response.ok) {
        return response;
      }
      lastError = new Error(`Browser rendering returned status ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    const jitter = Math.random() * 150;
    await new Promise((resolve) => setTimeout(resolve, delayBase * (attempt + 1) + jitter));
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function fetchRobots(domain: string): Promise<string[]> {
  const cached = ROBOTS_CACHE.get(domain);
  const now = Date.now();
  if (cached && now - cached.fetchedAt < ROBOTS_TTL) {
    return cached.disallows;
  }

  try {
    const response = await fetch(`https://${domain}/robots.txt`, { method: 'GET' });
    if (!response.ok) {
      return [];
    }
    const text = await response.text();
    const disallows: string[] = [];
    for (const rawLine of text.split('\n')) {
      const trimmed = rawLine.trim();
      if (!trimmed.toLowerCase().startsWith('disallow:')) {
        continue;
      }
      const parts = trimmed.split(':', 2);
      if (parts.length === 2) {
        const value = parts[1]?.trim() ?? '';
        if (value.length > 0) {
          disallows.push(value);
        }
      }
    }
    ROBOTS_CACHE.set(domain, { fetchedAt: now, disallows });
    return disallows;
  } catch (error) {
    console.warn('Failed to fetch robots.txt for domain', domain, error);
    ROBOTS_CACHE.set(domain, { fetchedAt: now, disallows: [] });
    return [];
  }
}

async function isAllowed(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    const disallows = await fetchRobots(parsed.hostname);
    return !disallows.some((rule) => rule !== '' && parsed.pathname.startsWith(rule));
  } catch (error) {
    console.warn('Failed to check robots permissions for url', url, error);
    return true;
  }
}

function extractBenefitsLinks(html: string, baseUrl: string): string[] {
  const anchorPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis;
  const results = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = anchorPattern.exec(html)) !== null) {
    const href = match[1];
    const text = match[2] || '';
    const normalized = `${href} ${text}`.toLowerCase();
    if (href && /(benefit|perk|total\s+rewards)/i.test(normalized)) {
      try {
        const url = new URL(href, baseUrl);
        results.add(url.toString());
      } catch (error) {
        console.warn('Skipping invalid href while extracting benefits links', href, error);
      }
    }
  }

  return Array.from(results).slice(0, 5);
}

async function storeSnapshot(env: CompanyScrapeEnv, companyId: string, source: string, sourceUrl: string, snapshotText: string, parsed: any, dryRun = false): Promise<void> {
  const existing = await env.DB.prepare(
    `SELECT id FROM company_benefits_snapshots
     WHERE company_id = ? AND source = ? AND source_url = ? AND snapshot_text = ?
     ORDER BY extracted_at DESC
     LIMIT 1`
  )
    .bind(companyId, source, sourceUrl, snapshotText)
    .first();

  if (existing) {
    console.log('Skipping duplicate benefits snapshot for company', companyId, sourceUrl);
    return;
  }

  if (dryRun) {
    console.log('[DRY_RUN] Would insert benefits snapshot for company', companyId, sourceUrl);
    return;
  }

  await env.DB.prepare(
    `INSERT INTO company_benefits_snapshots (id, company_id, source, source_url, snapshot_text, parsed, extracted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      crypto.randomUUID(),
      companyId,
      source,
      sourceUrl,
      snapshotText,
      JSON.stringify(parsed),
      Date.now(),
    )
    .run();
}

async function scrapeSingleUrl(env: CompanyScrapeEnv, url: string): Promise<string | null> {
  const fetcher = getBrowserFetcher(env);
  if (!fetcher) {
    throw new Error('Browser binding is not configured.');
  }

  const requestInit: RequestInit = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.BROWSER_RENDERING_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': '9to5-scout/benefits-crawler (+https://9to5scout.com)',
      'X-Contact': 'support@9to5scout.com',
    },
    body: JSON.stringify({
      url,
      waitFor: 'networkidle',
      maxWait: 10000,
      context: {
        userAgent: 'Mozilla/5.0 (compatible; 9to5-scout/1.0; +https://9to5scout.com)',
      },
    }),
  };

  const response = await fetchWithRetries(fetcher, requestInit, 3);
  const result = await response.json<any>();
  const html = result?.html || result?.content;
  return typeof html === 'string' ? html : null;
}

async function scrapeAndStoreBenefits(env: CompanyScrapeEnv, company: CompanyRow, url: string, options: ScrapeOptions): Promise<boolean> {
  if (!(await isAllowed(url))) {
    console.warn('Skipping URL due to robots.txt disallow', url);
    return false;
  }

  try {
    const html = await scrapeSingleUrl(env, url);
    if (!html) {
      console.warn('No HTML returned from browser rendering for', url);
      return false;
    }

    const text = textFromHTML(html);
    const { snapshotText, parsed } = await extractBenefits(text || html);

    if (!snapshotText || snapshotText.trim().length === 0) {
      console.log('No benefits detected for', url);
      return false;
    }

    await storeSnapshot(env, company.id, options.source || 'careers_page', url, snapshotText, parsed, options.dryRun);

    const additionalLinks = extractBenefitsLinks(html, url);
    for (const link of additionalLinks) {
      try {
        const subHtml = await scrapeSingleUrl(env, link);
        if (!subHtml) {
          continue;
        }
        const subText = textFromHTML(subHtml);
        const { snapshotText: subSnapshot, parsed: subParsed } = await extractBenefits(subText || subHtml);
        if (!subSnapshot || subSnapshot.trim().length === 0) {
          continue;
        }
        await storeSnapshot(env, company.id, options.source || 'careers_page', link, subSnapshot, subParsed, options.dryRun);
      } catch (error) {
        console.error('Failed to scrape secondary benefits link', link, error);
      }
    }

    return true;
  } catch (error) {
    console.error('Failed to scrape benefits for company', company.id, url, error);
    return false;
  }
}

export async function scrapeCompany(env: CompanyScrapeEnv, company: CompanyRow, options: ScrapeOptions = {}): Promise<boolean> {
  const targetUrl = options.careersUrlOverride
    || company.careers_url
    || coalesceCareersUrl(company.website_url, company.careers_url);

  if (!targetUrl) {
    console.warn('No careers URL available for company', company.id);
    return false;
  }

  return scrapeAndStoreBenefits(env, company, targetUrl, options);
}

export async function companyBenefitsNightly(env: CompanyScrapeEnv, options: ScrapeOptions = {}): Promise<void> {
  let offset = 0;
  const pageSize = 25;

  while (true) {
    const result = await env.DB.prepare(
      'SELECT id, name, normalized_domain, website_url, careers_url FROM companies ORDER BY updated_at DESC LIMIT ? OFFSET ?'
    )
      .bind(pageSize, offset)
      .all();

    const companies: CompanyRow[] = (result.results || []) as CompanyRow[];
    if (!companies.length) {
      break;
    }

    for (const company of companies) {
      try {
        await scrapeCompany(env, company, options);
      } catch (error) {
        console.error('Error scraping company benefits for', company.id, error);
      }
    }

    offset += companies.length;
    if (companies.length < pageSize) {
      break;
    }
  }
}

export async function triggerCompanyScrape(env: CompanyScrapeEnv, companyId?: string, options: ScrapeOptions = {}): Promise<{ processed: number }> {
  if (companyId) {
    const company = await env.DB.prepare(
      'SELECT id, name, normalized_domain, website_url, careers_url FROM companies WHERE id = ?'
    ).bind(companyId).first();

    if (!company) {
      throw new Error('Company not found');
    }

    await scrapeCompany(env, company as CompanyRow, { ...options, adminTriggered: true });
    return { processed: 1 };
  }

  await companyBenefitsNightly(env, options);
  return { processed: -1 };
}
