import type { Env } from '../env';

export class JobMonitorWorkflow {
  async run(env: Env, payload: { job_ids?: string[] }): Promise<any> {
    const { job_ids } = payload;

    try {
      let jobs: any[];

      if (job_ids && job_ids.length > 0) {
        const placeholders = job_ids.map(() => '?').join(',');
        const result = await env.DB.prepare(
          `SELECT * FROM jobs WHERE id IN (${placeholders}) AND status = 'open'`
        ).bind(...job_ids).all();
        jobs = result.results || [];
      } else {
        const result = await env.DB.prepare(
          'SELECT * FROM jobs WHERE status = ? ORDER BY last_crawled_at ASC LIMIT 50'
        ).bind('open').all();
        jobs = result.results || [];
      }

      const results = [];

      for (const job of jobs) {
        const monitorId = env.JOB_MONITOR.idFromName(job.id);
        const monitor = env.JOB_MONITOR.get(monitorId);

        const configResponse = await monitor.fetch('http://localhost/monitor-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_id: job.id,
            url: job.url,
          }),
        });

        if (!configResponse.ok) {
          console.error(`Failed to configure monitor for job ${job.id}`);
          continue;
        }

        const checkResponse = await monitor.fetch('http://localhost/check-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        const checkResult = await checkResponse.json();
        results.push({
          job_id: job.id,
          job_title: job.title,
          company: job.company,
          ...checkResult,
        });
      }

      return { results, total_monitored: jobs.length };
    } catch (error) {
      console.error('Job monitor workflow error:', error);
      throw error;
    }
  }
}
