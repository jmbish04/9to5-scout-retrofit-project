/**
 * @module src/api/routes/jobs.ts
 * @description
 * Routes for the jobs domain.
 */
import { Hono } from 'hono';
import { JobStorageService } from '../../domains/jobs/services/job-storage.service';
import { JobProcessingService } from '../../domains/jobs/services/job-processing.service';

const jobs = new Hono();

jobs.get('/', async (c) => {
  const service = new JobStorageService(c.env);
  const jobs = await service.getJobs();
  return c.json(jobs);
});

jobs.get('/:id', async (c) => {
  const { id } = c.req.param();
  const service = new JobStorageService(c.env);
  const job = await service.getJobById(id);
  if (!job) return c.json({ error: 'Job not found' }, 404);
  return c.json(job);
});

jobs.post('/monitor', async (c) => {
    const service = new JobProcessingService(c.env);
    const result = await service.runDailyJobMonitoring();
    return c.json(result);
});

export default jobs;
