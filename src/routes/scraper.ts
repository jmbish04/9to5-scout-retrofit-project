/**
 * API routes for coordinating localized Python scraping workers.
 */

import { processJobIngestion } from '../jobs/pipeline';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

function normalizeUrls(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return [];
}

function extractUrls(body: Record<string, unknown>): string[] {
  const candidateKeys = ['urls', 'url', 'target_url', 'target_urls'];

  for (const key of candidateKeys) {
    if (key in body) {
      const urls = normalizeUrls(body[key]);
      if (urls.length > 0) {
        return urls;
      }
    }
  }

  return [];
}

function parseJsonField(value: unknown): any {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('Failed to parse JSON field:', error);
    return null;
  }
}

function transformQueueRow(row: any) {
  return {
    ...row,
    urls: parseJsonField(row.urls) ?? [],
    payload: parseJsonField(row.payload)
  };
}

function transformJobDetailsRow(row: any) {
  return {
    ...row,
    metadata: parseJsonField(row.metadata),
    raw_payload: parseJsonField(row.raw_payload)
  };
}

const INTAKE_MAX_BATCH = 6;
const INTAKE_CLAIM_SIZE = 3;
const INTAKE_MAX_ATTEMPTS = 3;

interface NormalizedIntakePayload {
  jobUrl: string;
  jobTitle?: string | null;
  companyName?: string | null;
  companyWebsite?: string | null;
  companyCareersUrl?: string | null;
  jobId?: string | null;
  applyUrl?: string | null;
  rawHtml?: string | null;
  rawText?: string | null;
  rawJson?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  source?: string | null;
  dryRun: boolean;
  priority: number;
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  return false;
}

function firstNonEmptyString(...candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    const value = toStringOrNull(candidate);
    if (value) {
      return value;
    }
  }
  return null;
}

function normalizeRawJson(value: unknown): Record<string, any> | null {
  if (!value) {
    return null;
  }

  if (value && typeof value === 'object') {
    return value as Record<string, any>;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn('Failed to parse raw JSON payload from intake submission:', error);
      return null;
    }
  }

  return null;
}

function normalizeIntakePayload(raw: any): NormalizedIntakePayload | { error: string } {
  if (!raw || typeof raw !== 'object') {
    return { error: 'Each submission must be an object.' };
  }

  const jobUrl = firstNonEmptyString(
    raw.job_url,
    raw.jobUrl,
    raw.url,
    raw.job?.url,
    raw.job?.job_url,
    raw.details?.job_url,
    raw.details?.url,
    raw.metadata?.job_url,
    raw.metadata?.url,

  if (!jobUrl) {
    return { error: 'A job_url field is required for each submission.' };
  }

  const jobTitle = firstNonEmptyString(
    (raw as any).job_title,
    (raw as any).title,
    (raw as any).jobTitle,
    (raw as any).job?.title,
    (raw as any).metadata?.title,
  );

  const companyName = firstNonEmptyString(
    (raw as any).company,
    (raw as any).company_name,
    (raw as any).job_company,
    (raw as any).employer,
    (raw as any).organization,
    (raw as any).job?.company,
    (raw as any).metadata?.company,
    (raw as any).metadata?.company_name,
  );

  const rawHtml = firstNonEmptyString(
    (raw as any).raw_html,
    (raw as any).rawHtml,
    (raw as any).html,
    (raw as any).body_html,
    (raw as any).markup,
  );

  const rawText = firstNonEmptyString(
    (raw as any).raw_text,
    (raw as any).rawText,
    (raw as any).text,
    (raw as any).body,
    (raw as any).description,
    (raw as any).job?.description,
    (raw as any).metadata?.description,
  );

  const rawJson = normalizeRawJson(
    (raw as any).raw_json
      ?? (raw as any).rawJson
      ?? (raw as any).json
      ?? (raw as any).payload
      ?? (raw as any).data
  );

  const metadataObject = normalizeRawJson((raw as any).metadata ?? (raw as any).details ?? (raw as any).job);

  const applyUrl = firstNonEmptyString(
    (raw as any).apply_url,
    (raw as any).applyUrl,
    (raw as any).application_url,
    (raw as any).job?.apply_url,
    (raw as any).metadata?.apply_url,
  );

  const companyWebsite = firstNonEmptyString(
    (raw as any).company_url,
    (raw as any).companyUrl,
    (raw as any).website,
    (raw as any).job?.company_url,
    (raw as any).metadata?.company_url,
  );

  const companyCareersUrl = firstNonEmptyString(
    (raw as any).careers_url,
    (raw as any).careersUrl,
    (raw as any).company_careers_url,
    (raw as any).metadata?.careers_url,
  );

  const source = firstNonEmptyString(
    (raw as any).source,
    (raw as any).origin,
    (raw as any).provider,
  );

  const jobId = firstNonEmptyString(
    (raw as any).job_id,
    (raw as any).jobId,
    (raw as any).id,
  );

  const priorityRaw = (raw as any).priority ?? (raw as any).job_priority;
  const priority = Number(priorityRaw);

  const dryRun = toBoolean((raw as any).dry_run ?? (raw as any).dryRun);

  return {
    jobUrl,
    jobTitle,
    companyName,
    companyWebsite,
    companyCareersUrl,
    jobId,
    applyUrl,
    rawHtml,
    rawText,
    rawJson,
    metadata: metadataObject,
    source,
    dryRun,
    priority: Number.isFinite(priority) ? priority : 0,
  };
}

async function enqueueIntakeSubmission(env: any, payload: NormalizedIntakePayload) {
  const payloadForStorage = {
    jobUrl: payload.jobUrl,
    jobTitle: payload.jobTitle ?? null,
    companyName: payload.companyName ?? null,
    companyWebsite: payload.companyWebsite ?? null,
    companyCareersUrl: payload.companyCareersUrl ?? null,
    jobId: payload.jobId ?? null,
    applyUrl: payload.applyUrl ?? null,
    rawHtml: payload.rawHtml ?? null,
    rawText: payload.rawText ?? null,
    rawJson: payload.rawJson ?? null,
    metadata: payload.metadata ?? null,
    source: payload.source ?? null,
    dryRun: payload.dryRun,
    priority: payload.priority,
  };

  const insertResult = await env.DB.prepare(
    `INSERT INTO job_intake_queue (job_url, job_title, company_name, source, payload_json, priority, dry_run)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      payload.jobUrl,
      payload.jobTitle,
      payload.companyName,
      payload.source,
      JSON.stringify(payloadForStorage),
      payload.priority,
      payload.dryRun ? 1 : 0,
    )
    .run();

  const insertedId = insertResult.meta?.last_row_id ?? insertResult.lastRowId;

  if (!insertedId) {
    throw new Error('Failed to enqueue intake submission.');
  }

  const record = await env.DB.prepare(
    'SELECT id, job_url, job_title, company_name, source, status, priority, queued_at FROM job_intake_queue WHERE id = ?'
  )
    .bind(insertedId)
    .first();

  return record
    ? {
        ...record,
        id: Number(record.id),
        priority: Number(record.priority ?? 0),
      }
    : null;
}

async function claimIntakeJobs(env: any, limit: number) {
  const nowIso = new Date().toISOString();
  const statement = await env.DB.prepare(
    `WITH pending AS (
       SELECT id
       FROM job_intake_queue
       WHERE status = 'pending'
       ORDER BY priority DESC, queued_at ASC, id ASC
       LIMIT ?
     )
     UPDATE job_intake_queue
     SET status = 'processing',
         attempts = attempts + 1,
         started_at = COALESCE(started_at, ?),
         updated_at = CURRENT_TIMESTAMP
     WHERE id IN (SELECT id FROM pending)
     RETURNING *`
  )
    .bind(limit, nowIso)
    .all();

  return (statement.results || []).map((row: any) => ({
    ...row,
    payload_json: parseJsonField(row.payload_json),
  }));
}

async function markIntakeCompleted(env: any, id: number) {
  await env.DB.prepare(
    `UPDATE job_intake_queue
     SET status = 'completed',
         completed_at = CURRENT_TIMESTAMP,
         last_error = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  )
    .bind(id)
    .run();
}

async function markIntakeFailed(env: any, id: number, attempts: number, errorMessage: string) {
  const nextStatus = attempts >= INTAKE_MAX_ATTEMPTS ? 'failed' : 'pending';
  await env.DB.prepare(
    `UPDATE job_intake_queue
     SET status = ?,
         last_error = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  )
    .bind(nextStatus, errorMessage.slice(0, 2000), id)
    .run();
}

async function countPendingIntake(env: any): Promise<number> {
  const result = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM job_intake_queue WHERE status = 'pending'`
  ).first();

  return Number(result?.total ?? 0);
}

async function processIntakeQueue(env: any, maxToProcess = INTAKE_MAX_BATCH) {
  let processed = 0;
  let claimed: any[] = [];

  do {
    const remainingCapacity = Math.max(0, maxToProcess - processed);
    if (remainingCapacity === 0) {
      break;
    }

    claimed = await claimIntakeJobs(env, Math.min(remainingCapacity, INTAKE_CLAIM_SIZE));

    if (claimed.length === 0) {
      break;
    }

    for (const row of claimed) {
      const payload = row.payload_json as any;
      const rowId = Number(row.id);
      const attempts = Number(row.attempts ?? 1);
      const dryRunFromRow = Number(row.dry_run ?? 0) === 1;

      if (!payload || typeof payload !== 'object') {
        await markIntakeFailed(env, rowId, attempts, 'Invalid payload in queue entry.');
        continue;
      }

      const metadata = (payload.metadata && typeof payload.metadata === 'object') ? payload.metadata : null;
      const rawJson = (payload.rawJson && typeof payload.rawJson === 'object') ? payload.rawJson : null;
      const mergedMetadata = metadata || rawJson || null;

      try {
        await processJobIngestion(env, {
          jobId: toStringOrNull(payload.jobId) || undefined,
          jobUrl: toStringOrNull(payload.jobUrl) || row.job_url,
          applyUrl: toStringOrNull(payload.applyUrl) || undefined,
          companyName: toStringOrNull(payload.companyName) || toStringOrNull(row.company_name) || undefined,
          companyWebsite: toStringOrNull(payload.companyWebsite) || undefined,
          companyCareersUrl: toStringOrNull(payload.companyCareersUrl) || undefined,
          html: toStringOrNull(payload.rawHtml) || undefined,
          text: toStringOrNull(payload.rawText) || undefined,
          description: toStringOrNull(payload.rawText) || (mergedMetadata?.description ?? null),
          metadata: mergedMetadata,
          dryRun: Boolean(payload.dryRun) || dryRunFromRow,
        });

        await markIntakeCompleted(env, rowId);
        processed += 1;
      } catch (error: any) {
        console.error('Failed processing intake queue item', row.id, error);
        await markIntakeFailed(env, rowId, attempts, error?.message || 'Failed to process intake item.');
      }
    }
  } while (processed < maxToProcess);

  const pending = await countPendingIntake(env);
  return { processed, pending };
}

export async function handleScrapeQueuePost(request: Request, env: any): Promise<Response> {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return errorResponse('A JSON payload is required.');
    }

    const urls = extractUrls(body as Record<string, unknown>);

    if (urls.length === 0) {
      return errorResponse('At least one target URL must be provided in the "urls" field.');
    }

    const rawPayload = { ...(body as Record<string, unknown>) };
    delete rawPayload.urls;
    delete rawPayload.url;
    delete rawPayload.target_url;
    delete rawPayload.target_urls;

    const metadata = 'metadata' in rawPayload ? rawPayload.metadata : undefined;
    const explicitPayload = 'payload' in rawPayload ? rawPayload.payload : undefined;

    delete rawPayload.metadata;
    delete rawPayload.payload;

    const payloadSource = explicitPayload ?? metadata ?? (Object.keys(rawPayload).length > 0 ? rawPayload : null);
    const payloadJson = payloadSource ? JSON.stringify(payloadSource) : null;

    const priority = Number((body as Record<string, unknown>).priority ?? 0);
    const availableAtRaw = (body as Record<string, unknown>).available_at ?? (body as Record<string, unknown>).availableAt;
    let availableAt: string | null = null;

    if (availableAtRaw) {
      const availableDate = new Date(String(availableAtRaw));
      if (Number.isNaN(availableDate.getTime())) {
        return errorResponse('The provided available_at value is not a valid date.');
      }
      availableAt = availableDate.toISOString();
    }

    const insertResult = await env.DB.prepare(
      `INSERT INTO scrape_queue (urls, priority, payload, available_at)
       VALUES (?, ?, ?, ?)`
    )
      .bind(JSON.stringify(urls), Number.isFinite(priority) ? priority : 0, payloadJson, availableAt ?? new Date().toISOString())
      .run();

    const insertedId = insertResult.meta?.last_row_id ?? insertResult.lastRowId;

    if (!insertedId) {
      return errorResponse('Failed to create queue item.', 500);
    }

    const record = await env.DB.prepare('SELECT * FROM scrape_queue WHERE id = ?')
      .bind(insertedId)
      .first();

    return jsonResponse({ queue: record ? transformQueueRow(record) : null }, 201);
  } catch (error) {
    console.error('Error creating scrape queue item:', error);
    return errorResponse('Failed to create queue item.', 500);
  }
}

export async function handleScrapeQueuePendingGet(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limitParam = parseInt(url.searchParams.get('limit') || '10', 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 10;
    const nowIso = new Date().toISOString();

    const result = await env.DB.prepare(
      `WITH ready AS (
         SELECT id FROM scrape_queue
         WHERE status = 'pending'
           AND (available_at IS NULL OR datetime(available_at) <= datetime(?))
         ORDER BY priority DESC, id ASC
         LIMIT ?
       )
       UPDATE scrape_queue
       SET status = 'in_progress',
           updated_at = CURRENT_TIMESTAMP,
           last_claimed_at = CURRENT_TIMESTAMP
       WHERE id IN (SELECT id FROM ready)
       RETURNING *`
    )
      .bind(nowIso, limit)
      .all();

    const jobs = (result.results || []).map(transformQueueRow);

    return jsonResponse({ jobs });
  } catch (error) {
    console.error('Error retrieving pending scrape jobs:', error);
    return errorResponse('Failed to retrieve pending scrape jobs.', 500);
  }
}

export async function handleScrapeQueueUnrecordedGet(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limitParam = parseInt(url.searchParams.get('limit') || '25', 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 25;

    const result = await env.DB.prepare(
      `SELECT *
       FROM scrape_queue
       WHERE id NOT IN (
         SELECT queue_id
         FROM scraped_job_details
         WHERE queue_id IS NOT NULL
       )
       ORDER BY priority DESC, id ASC
       LIMIT ?`
    )
      .bind(limit)
      .all();

    const jobs = (result.results || []).map(transformQueueRow);

    return jsonResponse({ jobs, total: jobs.length });
  } catch (error) {
    console.error('Error retrieving unrecorded scrape jobs:', error);
    return errorResponse('Failed to retrieve unrecorded scrape jobs.', 500);
  }
}

export async function handleScraperIntakePost(request: Request, env: any): Promise<Response> {
  try {
    const bodyText = await request.text();

    if (!bodyText || bodyText.trim().length === 0) {
      return errorResponse('A JSON payload is required.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(bodyText);
    } catch (error) {
      console.warn('Failed to parse intake payload JSON:', error);
      return errorResponse('Request body must be valid JSON.');
    }

    let submissions: unknown[];
    if (Array.isArray(parsed)) {
      submissions = parsed;
    } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).items)) {
      submissions = (parsed as any).items;
    } else {
      submissions = [parsed];
    }

    if (submissions.length === 0) {
      return errorResponse('At least one submission must be provided.');
    }

    const queued: any[] = [];
    const failed: Array<{ index: number; error: string }> = [];

    for (const [index, submission] of submissions.entries()) {
      const normalized = normalizeIntakePayload(submission);

      if ('error' in normalized) {
        failed.push({ index, error: normalized.error });
        continue;
      }

      try {
        const record = await enqueueIntakeSubmission(env, normalized);
        if (!record) {
          throw new Error('Failed to persist queued submission.');
        }
        queued.push(record);
      } catch (error: any) {
        console.error('Failed to enqueue intake submission', error);
        failed.push({ index, error: error?.message || 'Failed to enqueue submission.' });
      }
    }

    if (queued.length === 0) {
      const firstFailed = failed[0];
      return errorResponse(firstFailed ? firstFailed.error : 'No submissions were accepted.');
    }

    const queueStatus = await processIntakeQueue(env);

    return jsonResponse({
      queued,
      failed,
      queue_status: queueStatus,
    }, 202);
  } catch (error) {
    console.error('Error processing scraper intake submissions:', error);
    return errorResponse('Failed to process intake submissions.', 500);
  }
}

export async function handleScrapedJobDetailsPost(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const dryRun = url.searchParams.get('DRY_RUN') === '1';
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return errorResponse('A JSON payload is required.');
    }

    const data = body as Record<string, unknown>;
    const jobUrl = typeof data.job_url === 'string' && data.job_url.length > 0
      ? data.job_url
      : typeof data.url === 'string' && data.url.length > 0
        ? data.url
        : null;

    if (!jobUrl) {
      return errorResponse('A job_url field is required.');
    }

    const queueIdRaw = data.queue_id ?? data.queueId;
    let queueId: number | null = null;
    if (typeof queueIdRaw === 'number' && Number.isFinite(queueIdRaw)) {
      queueId = queueIdRaw;
    } else if (typeof queueIdRaw === 'string') {
      const parsed = parseInt(queueIdRaw, 10);
      if (!Number.isNaN(parsed)) {
        queueId = parsed;
      }
    }

    const metadataValue = data.metadata ?? data.details ?? null;
    let metadataObject: Record<string, any> | null = null;

    if (metadataValue && typeof metadataValue === 'string') {
      try {
        metadataObject = JSON.parse(metadataValue);
      } catch (error) {
        console.warn('Failed to parse metadata JSON string in scraped job details:', error);
      }
    } else if (metadataValue && typeof metadataValue === 'object') {
      metadataObject = metadataValue as Record<string, any>;
    }

    const metadataJson = metadataValue ? JSON.stringify(metadataValue) : null;
    const rawPayloadJson = JSON.stringify(data);

    const monitoredJobIdRaw = data.monitored_job_id ?? (data as any).monitoredJobId;
    const monitoredJobId = typeof monitoredJobIdRaw === 'string' && monitoredJobIdRaw.trim().length > 0
      ? monitoredJobIdRaw.trim()
      : null;

    const statusValue = typeof data.status === 'string' ? data.status.toLowerCase() : null;
    const errorMessage = typeof data.error_message === 'string'
      ? data.error_message
      : typeof data.error === 'string'
        ? data.error
        : null;

    const insertResult = await env.DB.prepare(
      `INSERT INTO scraped_job_details (
         queue_id,
         monitored_job_id,
         job_url,
         source,
         company,
         title,
         location,
         employment_type,
         salary,
         apply_url,
         description,
         metadata,
         raw_payload
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        queueId,
        monitoredJobId,
        jobUrl,
        typeof data.source === 'string' ? data.source : null,
        typeof data.company === 'string' ? data.company : null,
        typeof data.title === 'string' ? data.title : null,
        typeof data.location === 'string' ? data.location : null,
        typeof data.employment_type === 'string' ? data.employment_type : (typeof (data as any).employmentType === 'string' ? (data as any).employmentType : null),
        typeof data.salary === 'string' ? data.salary : null,
        typeof data.apply_url === 'string' ? data.apply_url : (typeof (data as any).applyUrl === 'string' ? (data as any).applyUrl : null),
        typeof data.description === 'string' ? data.description : null,
        metadataJson,
        rawPayloadJson
      )
      .run();

    const insertedId = insertResult.meta?.last_row_id ?? insertResult.lastRowId;

    if (!insertedId) {
      return errorResponse('Failed to record scraped job details.', 500);
    }

    if (queueId) {
      const nextStatus = statusValue === 'failed' || statusValue === 'error' ? 'failed' : 'completed';
      await env.DB.prepare(
        `UPDATE scrape_queue
         SET status = ?,
             updated_at = CURRENT_TIMESTAMP,
             completed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END,
             error_message = CASE WHEN ? = 'failed' THEN ? ELSE error_message END
         WHERE id = ?`
      )
        .bind(nextStatus, nextStatus, nextStatus, errorMessage, queueId)
        .run();
    }

    const record = await env.DB.prepare('SELECT * FROM scraped_job_details WHERE id = ?')
      .bind(insertedId)
      .first();

    await processJobIngestion(env, {
      jobUrl,
      applyUrl: typeof data.apply_url === 'string' ? data.apply_url : (typeof (data as any).applyUrl === 'string' ? (data as any).applyUrl : null),
      companyName: typeof data.company === 'string' ? data.company : metadataObject?.company?.name,
      companyWebsite: typeof (data as any).company_url === 'string' ? (data as any).company_url : metadataObject?.company_url,
      html: typeof (data as any).html === 'string' ? (data as any).html : null,
      description: typeof data.description === 'string' ? data.description : null,
      text: typeof data.description === 'string' ? data.description : null,
      metadata: metadataObject,
      dryRun,
    });

    return jsonResponse({ job: record ? transformJobDetailsRow(record) : null }, 201);
  } catch (error) {
    console.error('Error recording scraped job details:', error);
    return errorResponse('Failed to record scraped job details.', 500);
  }
}

export async function handleScraperMonitoredJobsGet(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limitParam = parseInt(url.searchParams.get('limit') || '100', 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 500) : 100;

    const result = await env.DB.prepare(
      `SELECT
         id,
         url,
         title,
         company,
         location,
         monitoring_frequency_hours,
         last_status_check_at,
         daily_monitoring_enabled
       FROM jobs
       WHERE daily_monitoring_enabled = 1
         AND status = 'open'
       ORDER BY
         COALESCE(last_status_check_at, '1970-01-01T00:00:00Z') ASC,
         id ASC
       LIMIT ?`
    )
      .bind(limit)
      .all();

    const jobs = (result.results || []).map((row: any) => ({
      ...row,
      daily_monitoring_enabled: Boolean(row.daily_monitoring_enabled)
    }));

    return jsonResponse({
      jobs,
      total: jobs.length
    });
  } catch (error) {
    console.error('Error retrieving monitored jobs:', error);
    return errorResponse('Failed to retrieve monitored jobs.', 500);
  }
}

export function handleScraperOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Max-Age': '86400'
    }
  });
}
