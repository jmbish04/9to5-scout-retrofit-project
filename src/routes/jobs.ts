/**
 * Jobs API routes for retrieving and managing job data.
 */

import { getJobs, getJob } from "../domains/jobs/services/job-storage.service";

export async function handleJobsGet(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || undefined;
    const siteId = url.searchParams.get('site_id') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const jobs = await getJobs(env, { status, site_id: siteId, limit });
    
    return new Response(JSON.stringify(jobs), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch jobs' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleJobGet(request: Request, env: any, jobId: string): Promise<Response> {
  try {
    const job = await getJob(env, jobId);
    
    if (!job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify(job), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch job' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleJobsExportGet(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const siteId = url.searchParams.get('site_id');
    const limitParam = parseInt(url.searchParams.get('limit') || '1000', 10);
    const limit = Math.max(1, Math.min(limitParam, 1000));

    let sql = 'SELECT * FROM jobs WHERE 1=1';
    const params: any[] = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (siteId) {
      sql += ' AND site_id = ?';
      params.push(siteId);
    }

    sql += ' ORDER BY first_seen_at DESC LIMIT ?';
    params.push(limit);

    const stmt = env.DB.prepare(sql);
    const { results } = await stmt.bind(...params).all();

    return new Response(JSON.stringify(results || []), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error exporting jobs:', error);
    return new Response(JSON.stringify({ error: 'Failed to export jobs' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}