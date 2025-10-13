import type { Env } from '../env';

type DurableObjectState = any;

export class JobMonitor {
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    try {
      if (path === '/monitor-job' && req.method === 'POST') {
        return await this.monitorJob(req);
      }

      if (path === '/check-job' && req.method === 'POST') {
        return await this.checkJob(req);
      }

      if (path === '/status' && req.method === 'GET') {
        return await this.getStatus();
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('JobMonitor error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async monitorJob(req: Request): Promise<Response> {
    const { job_id, url, check_interval_hours = 24 } = await req.json() as {
      job_id: string;
      url: string;
      check_interval_hours?: number;
    };

    await this.state.storage.put('job_id', job_id);
    await this.state.storage.put('job_url', url);
    await this.state.storage.put('check_interval_hours', check_interval_hours);
    await this.state.storage.put('last_check', new Date().toISOString());
    await this.state.storage.put('status', 'monitoring');

    const nextCheck = new Date(Date.now() + check_interval_hours * 60 * 60 * 1000);
    await this.state.storage.setAlarm(nextCheck);

    return new Response(JSON.stringify({
      job_id,
      status: 'monitoring_started',
      next_check: nextCheck.toISOString(),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async checkJob(req: Request): Promise<Response> {
    const jobUrl = await this.state.storage.get('job_url') as string;
    const jobId = await this.state.storage.get('job_id') as string;

    if (!jobUrl || !jobId) {
      return new Response(JSON.stringify({ error: 'No job configured for monitoring' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { crawlJob } = await import('../crawl');
    const currentJob = await crawlJob(this.env, jobUrl);

    const lastCheck = new Date().toISOString();
    await this.state.storage.put('last_check', lastCheck);

    if (!currentJob) {
      await this.state.storage.put('status', 'job_not_found');

      await this.env.DB.prepare('UPDATE jobs SET status = ?, closed_at = ? WHERE id = ?')
        .bind('closed', lastCheck, jobId)
        .run();

      return new Response(JSON.stringify({
        job_id: jobId,
        status: 'job_not_found',
        last_check: lastCheck,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await this.env.DB.prepare('UPDATE jobs SET last_seen_open_at = ?, last_crawled_at = ? WHERE id = ?')
      .bind(lastCheck, lastCheck, jobId)
      .run();

    return new Response(JSON.stringify({
      job_id: jobId,
      status: 'job_active',
      last_check: lastCheck,
      title: currentJob.title,
      company: currentJob.company,
      location: currentJob.location,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async getStatus(): Promise<Response> {
    const jobId = await this.state.storage.get('job_id');
    const status = await this.state.storage.get('status') || 'idle';
    const lastCheck = await this.state.storage.get('last_check');
    const checkInterval = await this.state.storage.get('check_interval_hours') || 24;

    return new Response(JSON.stringify({
      job_id: jobId,
      status,
      last_check: lastCheck,
      check_interval_hours: checkInterval,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async alarm(): Promise<void> {
    try {
      const status = await this.state.storage.get('status');
      if (status !== 'monitoring' && status !== 'job_active') {
        return;
      }

      await this.checkJob(new Request('http://localhost/check-job', { method: 'POST' }));

      const finalStatus = await this.state.storage.get('status');
      if (finalStatus === 'monitoring' || finalStatus === 'job_active') {
        const checkInterval = await this.state.storage.get('check_interval_hours') as number || 24;
        const nextCheck = new Date(Date.now() + checkInterval * 60 * 60 * 1000);
        await this.state.storage.setAlarm(nextCheck);
      }
    } catch (error) {
      console.error('JobMonitor alarm error:', error);
    }
  }
}
