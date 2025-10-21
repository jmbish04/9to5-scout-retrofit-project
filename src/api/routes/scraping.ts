/**
 * @module src/api/routes/scraping.ts
 * @description
 * Routes for the scraping domain.
 */
import { Hono } from 'hono';
import { ScrapeQueueService } from '../../domains/scraping/services/scrape-queue.service';
import { CompanyIntelligenceService } from '../../domains/scraping/services/company-intelligence.service';

const scraping = new Hono();

scraping.post('/queue', async (c) => {
    const body = await c.req.json();
    const service = new ScrapeQueueService(c.env);
    const result = await service.enqueue(body);
    return c.json(result);
});

scraping.get('/company/:id/benefits', async (c) => {
    const { id } = c.req.param();
    const service = new CompanyIntelligenceService(c.env);
    const benefits = await service.getCompanyBenefits(id);
    return c.json(benefits);
});

export default scraping;
