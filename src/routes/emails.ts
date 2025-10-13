import type { Env } from '../lib/env';

function parsePagination(searchParams: URLSearchParams): { limit: number; offset: number } {
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 200);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);
  return { limit, offset };
}

export async function handleEmailsGet(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const { limit, offset } = parsePagination(url.searchParams);
    const search = url.searchParams.get('search');
    const fromEmail = url.searchParams.get('from_email');
    const subject = url.searchParams.get('subject');

    const filters: string[] = [];
    const params: any[] = [];

    if (search) {
      filters.push('email_content LIKE ?');
      params.push(`%${search}%`);
    }

    if (fromEmail) {
      filters.push('from_email LIKE ?');
      params.push(`%${fromEmail}%`);
    }

    if (subject) {
      filters.push('subject LIKE ?');
      params.push(`%${subject}%`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const dataStmt = env.DB.prepare(`
      SELECT * FROM email_logs
      ${whereClause}
      ORDER BY received_at DESC
      LIMIT ? OFFSET ?
    `);

    const { results } = await dataStmt.bind(...params, limit, offset).all();

    const countParams = [...params];
    const totalRow = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM email_logs
      ${whereClause}
    `).bind(...countParams).first<{ count: number }>();

    return new Response(JSON.stringify({
      emails: results || [],
      pagination: {
        limit,
        offset,
        total: totalRow?.count ?? (results ? results.length : 0),
      },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to list emails:', error);
    return new Response(JSON.stringify({ error: 'Failed to list emails' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleEmailGet(_request: Request, env: Env, emailId: string): Promise<Response> {
  try {
    const emailLog = await env.DB.prepare(
      'SELECT * FROM email_logs WHERE id = ?'
    ).bind(emailId).first();

    if (!emailLog) {
      return new Response(JSON.stringify({ error: 'Email not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(emailLog), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to fetch email log:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch email log' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
