const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

function safeJsonParse(value: string | null): any {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function normalizeBoolean(value: string | null): boolean | null {
  if (!value) {
    return null;
  }

  if (value === '1' || value.toLowerCase() === 'true') {
    return true;
  }

  if (value === '0' || value.toLowerCase() === 'false') {
    return false;
  }

  return null;
}

function normalizeListParam(param: string | null): string[] {
  if (!param) {
    return [];
  }

  return param
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function toUpperCaseList(values: string[]): string[] {
  return values.map((value) => value.toUpperCase());
}

function transformLogRow(row: any) {
  return {
    id: row.id,
    timestamp: row.timestamp,
    source: row.source,
    log_level: row.log_level,
    message: row.message,
    json_payload: safeJsonParse(row.json_payload),
    context: safeJsonParse(row.context),
    request_id: row.request_id,
    expires_at: row.expires_at,
    created_at: row.created_at
  };
}

function buildFtsQuery(search: string): string {
  return search
    .trim()
    .split(/\s+/)
    .map((term) => {
      const cleaned = term.replace(/['"]/g, '');
      if (cleaned.length === 0) {
        return '';
      }
      return `${cleaned}*`;
    })
    .filter(Boolean)
    .join(' ');
}

async function cleanupExpiredLogs(env: any) {
  try {
    await env.DB.prepare('DELETE FROM system_logs WHERE expires_at <= CURRENT_TIMESTAMP').run();
  } catch (error) {
    console.warn('Failed to cleanup expired logs:', error);
  }
}

interface NormalizedLogEntry {
  timestamp: string | null;
  source: string;
  log_level: string;
  message: string | null;
  json_payload: string | null;
  context: string | null;
  request_id: string | null;
  expires_at: string | null;
}

function normalizeLogEntry(raw: any): NormalizedLogEntry | null {
  const source = typeof raw.source === 'string' && raw.source.trim().length > 0
    ? raw.source.trim()
    : typeof raw.client === 'string' && raw.client.trim().length > 0
      ? raw.client.trim()
      : null;

  if (!source) {
    return null;
  }

  const logLevelRaw = raw.log_level ?? raw.logLevel ?? raw.level;
  const logLevel = typeof logLevelRaw === 'string' && logLevelRaw.trim().length > 0
    ? logLevelRaw.trim().toUpperCase()
    : 'INFO';

  const messageRaw = typeof raw.message === 'string' ? raw.message : (typeof raw.event === 'string' ? raw.event : null);

  let payloadSource = raw.json_payload ?? raw.payload ?? raw.data ?? null;
  if (payloadSource !== null && typeof payloadSource !== 'string') {
    try {
      payloadSource = JSON.stringify(payloadSource);
    } catch {
      payloadSource = String(payloadSource);
    }
  }

  let contextSource = raw.context ?? raw.meta ?? null;
  if (contextSource !== null && typeof contextSource !== 'string') {
    try {
      contextSource = JSON.stringify(contextSource);
    } catch {
      contextSource = String(contextSource);
    }
  }

  const timestamp = normalizeTimestamp(raw.timestamp ?? raw.time ?? raw.date ?? null);
  const expiresAt = normalizeTimestamp(raw.expires_at ?? raw.expiresAt ?? null);

  const requestIdRaw = raw.request_id ?? raw.requestId ?? raw.trace_id ?? raw.traceId;
  const requestId = typeof requestIdRaw === 'string' && requestIdRaw.trim().length > 0 ? requestIdRaw.trim() : null;

  return {
    timestamp,
    source,
    log_level: logLevel,
    message: messageRaw,
    json_payload: payloadSource,
    context: contextSource,
    request_id: requestId,
    expires_at: expiresAt
  };
}

export async function handleLogsPost(request: Request, env: any): Promise<Response> {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return errorResponse('A JSON payload is required.');
    }

    const entries = Array.isArray(body) ? body : [body];
    const normalized = entries
      .map((item) => normalizeLogEntry(item))
      .filter((item): item is NormalizedLogEntry => item !== null);

    if (normalized.length === 0) {
      return errorResponse('At least one log entry with a source field is required.');
    }

    const insertedIds: number[] = [];

    for (const entry of normalized) {
      const result = await env.DB.prepare(
        `INSERT INTO system_logs (
           timestamp,
           source,
           log_level,
           message,
           json_payload,
           context,
           request_id,
           expires_at
         )
         VALUES (COALESCE(?, CURRENT_TIMESTAMP), ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now', '+30 days')))`
      )
        .bind(
          entry.timestamp,
          entry.source,
          entry.log_level,
          entry.message,
          entry.json_payload,
          entry.context,
          entry.request_id,
          entry.expires_at
        )
        .run();

      const insertedId = result.meta?.last_row_id ?? result.lastRowId;
      if (insertedId) {
        insertedIds.push(insertedId);
      }
    }

    await cleanupExpiredLogs(env);

    if (insertedIds.length === 0) {
      return errorResponse('Failed to store log entries.', 500);
    }

    const placeholders = insertedIds.map(() => '?').join(',');
    const rows = await env.DB.prepare(`SELECT * FROM system_logs WHERE id IN (${placeholders}) ORDER BY timestamp DESC`)
      .bind(...insertedIds)
      .all();

    const logs = (rows.results || []).map(transformLogRow);

    return jsonResponse({ logs, inserted: logs.length }, 201);
  } catch (error) {
    console.error('Failed to record system logs:', error);
    return errorResponse('Failed to record system logs.', 500);
  }
}

export async function handleLogsGet(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);

    const sources = normalizeListParam(url.searchParams.get('source'));
    const levels = toUpperCaseList(normalizeListParam(url.searchParams.get('log_level') ?? url.searchParams.get('level')));
    const requestIds = normalizeListParam(url.searchParams.get('request_id') ?? url.searchParams.get('requestId'));
    const searchRaw = url.searchParams.get('search') ?? url.searchParams.get('q');
    const hasPayload = normalizeBoolean(url.searchParams.get('has_payload'));
    const start = normalizeTimestamp(url.searchParams.get('start') ?? url.searchParams.get('from'));
    const end = normalizeTimestamp(url.searchParams.get('end') ?? url.searchParams.get('to'));

    const limitParam = parseInt(url.searchParams.get('limit') || '100', 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 500) : 100;
    const offsetParam = parseInt(url.searchParams.get('offset') || '0', 10);
    const offset = Number.isFinite(offsetParam) ? Math.max(offsetParam, 0) : 0;

    const orderByRaw = (url.searchParams.get('order_by') ?? url.searchParams.get('orderBy') ?? 'timestamp').toLowerCase();
    const orderDirectionRaw = (url.searchParams.get('order_direction') ?? url.searchParams.get('orderDirection') ?? 'desc').toUpperCase();

    const allowedOrderFields: Record<string, string> = {
      timestamp: 'l.timestamp',
      log_level: 'l.log_level',
      source: 'l.source',
      created_at: 'l.created_at'
    };

    const orderBy = allowedOrderFields[orderByRaw] ?? allowedOrderFields.timestamp;
    const orderDirection = orderDirectionRaw === 'ASC' ? 'ASC' : 'DESC';

    const conditions: string[] = ['l.expires_at > CURRENT_TIMESTAMP'];
    const bindings: any[] = [];
    let joins = '';

    if (sources.length > 0) {
      const placeholders = sources.map(() => '?').join(',');
      conditions.push(`l.source IN (${placeholders})`);
      bindings.push(...sources);
    }

    if (levels.length > 0) {
      const placeholders = levels.map(() => '?').join(',');
      conditions.push(`l.log_level IN (${placeholders})`);
      bindings.push(...levels);
    }

    if (requestIds.length > 0) {
      const placeholders = requestIds.map(() => '?').join(',');
      conditions.push(`l.request_id IN (${placeholders})`);
      bindings.push(...requestIds);
    }

    if (hasPayload !== null) {
      conditions.push(hasPayload ? `(l.json_payload IS NOT NULL AND l.json_payload != '')` : `(l.json_payload IS NULL OR l.json_payload = '')`);
    }

    if (start) {
      conditions.push('datetime(l.timestamp) >= datetime(?)');
      bindings.push(start);
    }

    if (end) {
      conditions.push('datetime(l.timestamp) <= datetime(?)');
      bindings.push(end);
    }

    const search = searchRaw && searchRaw.trim().length > 0 ? buildFtsQuery(searchRaw) : '';

    if (search.length > 0) {
      joins += ' JOIN system_logs_fts fts ON fts.rowid = l.id';
      conditions.push('fts MATCH ?');
      bindings.push(search);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `FROM system_logs l${joins} ${whereClause}`;

    const countBindings = [...bindings];
    const resultsQuery = `SELECT l.* ${baseQuery} ORDER BY ${orderBy} ${orderDirection} LIMIT ? OFFSET ?`;
    const totalQuery = `SELECT COUNT(*) as count ${baseQuery}`;

    const resultsBindings = [...bindings, limit, offset];

    const [results, totalRow] = await Promise.all([
      env.DB.prepare(resultsQuery).bind(...resultsBindings).all(),
      env.DB.prepare(totalQuery).bind(...countBindings).first()
    ]);

    const logs = (results.results || []).map(transformLogRow);
    const totalCount = (() => {
      if (!totalRow || typeof totalRow.count === 'undefined' || totalRow.count === null) {
        return logs.length;
      }
      const numeric = Number(totalRow.count);
      return Number.isFinite(numeric) ? numeric : logs.length;
    })();

    return jsonResponse({
      logs,
      limit,
      offset,
      total: totalCount,
      order_by: orderByRaw,
      order_direction: orderDirection.toLowerCase(),
      filters: {
        sources,
        levels,
        request_ids: requestIds,
        has_payload: hasPayload,
        start,
        end,
        search: searchRaw ?? undefined
      }
    });
  } catch (error) {
    console.error('Failed to retrieve system logs:', error);
    return errorResponse('Failed to retrieve system logs.', 500);
  }
}

export async function handleLogsMetaGet(request: Request, env: any): Promise<Response> {
  try {
    const [sourcesResult, levelsResult, rangeResult] = await Promise.all([
      env.DB.prepare('SELECT DISTINCT source FROM system_logs WHERE expires_at > CURRENT_TIMESTAMP ORDER BY source').all(),
      env.DB.prepare('SELECT DISTINCT log_level FROM system_logs WHERE expires_at > CURRENT_TIMESTAMP ORDER BY log_level').all(),
      env.DB.prepare('SELECT MIN(timestamp) as oldest, MAX(timestamp) as newest FROM system_logs WHERE expires_at > CURRENT_TIMESTAMP').first()
    ]);

    const sources = (sourcesResult.results || []).map((row: any) => row.source).filter(Boolean);
    const levels = (levelsResult.results || []).map((row: any) => row.log_level).filter(Boolean);

    return jsonResponse({
      sources,
      levels,
      range: {
        oldest: rangeResult?.oldest ?? null,
        newest: rangeResult?.newest ?? null
      }
    });
  } catch (error) {
    console.error('Failed to retrieve logs metadata:', error);
    return errorResponse('Failed to retrieve logs metadata.', 500);
  }
}

export function handleLogsOptions(): Response {
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
