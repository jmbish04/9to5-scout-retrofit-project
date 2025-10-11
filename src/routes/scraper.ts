/**
 * API routes for coordinating localized Python scraping workers.
 */

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

export async function handleScrapedJobDetailsPost(request: Request, env: any): Promise<Response> {
  try {
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
    const metadataJson = metadataValue ? JSON.stringify(metadataValue) : null;
    const rawPayloadJson = JSON.stringify(data);

    const statusValue = typeof data.status === 'string' ? data.status.toLowerCase() : null;
    const errorMessage = typeof data.error_message === 'string'
      ? data.error_message
      : typeof data.error === 'string'
        ? data.error
        : null;

    const insertResult = await env.DB.prepare(
      `INSERT INTO scraped_job_details (
         queue_id,
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
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        queueId,
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

    return jsonResponse({ job: record ? transformJobDetailsRow(record) : null }, 201);
  } catch (error) {
    console.error('Error recording scraped job details:', error);
    return errorResponse('Failed to record scraped job details.', 500);
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
