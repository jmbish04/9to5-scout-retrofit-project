import { coalesceCareersUrl, normalizeDomain, textFromHTML } from '../lib/normalize';
import { extractBenefits } from '../lib/extractBenefits';

interface JobPipelineEnv {
  DB: any;
  ADMIN_TOKEN?: string;
}

interface JobMetadata {
  company_url?: string;
  careers_url?: string;
  description?: string;
  [key: string]: any;
}

export interface JobIngestionPayload {
  jobId?: string;
  jobUrl?: string;
  applyUrl?: string;
  companyName?: string;
  companyWebsite?: string;
  companyCareersUrl?: string;
  html?: string;
  text?: string;
  metadata?: JobMetadata | null;
  description?: string | null;
  dryRun?: boolean;
}

interface CompanyRecord {
  id: string;
  name: string;
  normalized_domain: string;
  website_url: string | null;
  careers_url: string | null;
  description: string | null;
}

function selectFirstUrl(...values: (string | null | undefined)[]): string | null {
  for (const value of values) {
    if (value && typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

async function upsertCompany(env: JobPipelineEnv, payload: JobIngestionPayload): Promise<CompanyRecord | null> {
  const companyName = payload.companyName?.trim()
    || payload.metadata?.company_name?.trim()
    || payload.metadata?.company?.name?.trim()
    || null;

  const websiteUrl = selectFirstUrl(
    payload.companyWebsite,
    payload.metadata?.company_url,
    payload.metadata?.company?.website,
    payload.metadata?.website,
    payload.jobUrl,
  );

  const normalizedDomain = normalizeDomain(websiteUrl) || normalizeDomain(payload.jobUrl || payload.applyUrl || '') || null;

  if (!normalizedDomain) {
    console.warn('Unable to determine normalized domain for company', companyName, websiteUrl);
    return null;
  }

  const careersUrlGuess = coalesceCareersUrl(websiteUrl, payload.companyCareersUrl || payload.metadata?.careers_url || null);
  const now = Date.now();

  const existing = await env.DB.prepare(
    'SELECT * FROM companies WHERE normalized_domain = ?'
  ).bind(normalizedDomain).first();

  if (existing) {
    const updates: string[] = [];
    const params: any[] = [];

    if (companyName && companyName.length > 0 && companyName !== existing.name) {
      updates.push('name = ?');
      params.push(companyName);
    }

    if (websiteUrl && websiteUrl !== existing.website_url) {
      updates.push('website_url = ?');
      params.push(websiteUrl);
    }

    if (careersUrlGuess && careersUrlGuess !== existing.careers_url) {
      updates.push('careers_url = ?');
      params.push(careersUrlGuess);
    }

    const description = payload.metadata?.company_description || payload.metadata?.description;
    if (description && description.length > 0 && (!existing.description || description.length > existing.description.length)) {
      updates.push('description = ?');
      params.push(description);
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      params.push(now, existing.id);
      const statement = `UPDATE companies SET ${updates.join(', ')} WHERE id = ?`;
      await env.DB.prepare(statement).bind(...params).run();
      return {
        ...existing,
        name: companyName || existing.name,
        website_url: websiteUrl || existing.website_url,
        careers_url: careersUrlGuess || existing.careers_url,
        description: payload.metadata?.company_description || existing.description,
      } as CompanyRecord;
    }

    return existing as CompanyRecord;
  }

  const id = crypto.randomUUID();
  const nameForInsert = companyName || normalizedDomain;

  await env.DB.prepare(
    `INSERT INTO companies (id, name, normalized_domain, website_url, careers_url, description, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      nameForInsert,
      normalizedDomain,
      websiteUrl,
      careersUrlGuess,
      payload.metadata?.company_description || payload.metadata?.description || null,
      now,
      now,
    )
    .run();

  return {
    id,
    name: nameForInsert,
    normalized_domain: normalizedDomain,
    website_url: websiteUrl,
    careers_url: careersUrlGuess,
    description: payload.metadata?.company_description || payload.metadata?.description || null,
  };
}

async function snapshotExists(env: JobPipelineEnv, companyId: string, source: string, sourceUrl: string | null, snapshotText: string): Promise<boolean> {
  const existing = await env.DB.prepare(
    `SELECT id FROM company_benefits_snapshots
     WHERE company_id = ? AND source = ? AND IFNULL(source_url, '') = IFNULL(?, '')
       AND snapshot_text = ?
     ORDER BY extracted_at DESC
     LIMIT 1`
  )
    .bind(companyId, source, sourceUrl, snapshotText)
    .first();

  return Boolean(existing);
}

export async function processJobIngestion(env: JobPipelineEnv, payload: JobIngestionPayload): Promise<{ companyId?: string }> {
  try {
    const company = await upsertCompany(env, payload);
    if (!company) {
      return {};
    }

    if (payload.jobId) {
      await env.DB.prepare('UPDATE jobs SET company_id = ? WHERE id = ?')
        .bind(company.id, payload.jobId)
        .run();
    }

    const textSource = payload.html ? textFromHTML(payload.html) : payload.text || payload.description || '';

    if (!textSource || textSource.trim().length === 0) {
      return { companyId: company.id };
    }

    const { snapshotText, parsed } = await extractBenefits(textSource);
    const sourceUrl = payload.jobUrl || payload.applyUrl || payload.metadata?.job_url || null;

    if (!snapshotText || snapshotText.trim().length === 0) {
      return { companyId: company.id };
    }

    const alreadyExists = await snapshotExists(env, company.id, 'job_posting', sourceUrl, snapshotText);

    if (alreadyExists) {
      console.log('Skipping duplicate job posting snapshot for company', company.id, sourceUrl);
      return { companyId: company.id };
    }

    if (payload.dryRun) {
      console.log('DRY_RUN enabled; skipping snapshot insert for company', company.id);
      return { companyId: company.id };
    }

    await env.DB.prepare(
      `INSERT INTO company_benefits_snapshots (id, company_id, source, source_url, snapshot_text, parsed, extracted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        crypto.randomUUID(),
        company.id,
        'job_posting',
        sourceUrl,
        snapshotText,
        JSON.stringify(parsed),
        Date.now(),
      )
      .run();

    return { companyId: company.id };
  } catch (error) {
    console.error('Failed to process job ingestion pipeline', error);
    return {};
  }
}
