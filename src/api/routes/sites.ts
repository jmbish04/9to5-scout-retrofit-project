/**
 * @module src/api/routes/sites.ts
 * @description
 * Routes for the sites domain.
 */
import { Hono } from 'hono';
import { SiteStorageService } from '../../domains/sites/services/site-storage.service';

const sites = new Hono();

sites.get('/', async (c) => {
  const service = new SiteStorageService(c.env as any);
  const sites = await service.getSites();
  return c.json(sites);
});

sites.get('/:id', async (c) => {
  const { id } = c.req.param();
  const service = new SiteStorageService(c.env as any);
  const site = await service.getSiteById(id);
  if (!site) return c.json({ error: 'Site not found' }, 404);
  return c.json(site);
});

export default sites;