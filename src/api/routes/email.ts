/**
 * @module src/api/routes/email.ts
 * @description
 * Routes for the email domain.
 */
import { Hono } from 'hono';
import { EmailReportingService } from '../../domains/email/services/email-reporting.service';

const email = new Hono();

email.post('/report', async (c) => {
    const service = new EmailReportingService(c.env);
    await service.sendDailySummary();
    return c.json({ message: 'Daily email summary sent.' });
});

export default email;
