/**
 * @module src/api/router.ts
 * @description
 * The main API router for the application. This is where all HTTP routes
 * are defined and mapped to their respective service handlers.
 */

import { Hono } from 'hono';
import { handleHealthGet, handleHealthPost } from './routes/health';
import sites from './routes/sites';
import jobs from './routes/jobs';
import documents from './routes/documents';
import email from './routes/email';
import scraping from './routes/scraping';

const app = new Hono();

// --- Health Routes ---
app.get('/api/health', (c) => handleHealthGet(c.env));
app.post('/api/health', (c) => handleHealthPost(c.env));

// --- Domain Routes ---
app.route('/api/sites', sites);
app.route('/api/jobs', jobs);
app.route('/api/documents', documents);
app.route('/api/email', email);
app.route('/api/scraping', scraping);


export default app;
