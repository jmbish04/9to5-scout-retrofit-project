import type { Env } from '../lib/env';
import { crawlJob } from '../lib/crawl';

export async function handleManualCrawlPost(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as { url: string; site_id?: string };
  if (!body.url) {
    return new Response(JSON.stringify({ error: 'URL is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const job = await crawlJob(env, body.url, body.site_id);
  if (job) {
    return new Response(JSON.stringify(job), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Failed to crawl job' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}
