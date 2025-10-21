/**
 * @module src/api/routes/documents.ts
 * @description
 * Routes for the documents domain.
 */
import { Hono } from 'hono';
import { DocumentStorageService } from '../../domains/documents/services/document-storage.service';
import { DocumentGenerationService } from '../../domains/documents/services/document-generation.service';

const documents = new Hono();

documents.get('/:id', async (c) => {
    const { id } = c.req.param();
    const service = new DocumentStorageService(c.env);
    const doc = await service.getApplicantDocument(id);
    if (!doc) return c.json({ error: 'Document not found' }, 404);
    return c.json(doc);
});

documents.post('/generate/resume', async (c) => {
    const body = await c.req.json();
    const service = new DocumentGenerationService(c.env);
    const result = await service.generateResume(body.job, body.applicant);
    return c.json(result);
});

documents.post('/generate/cover-letter', async (c) => {
    const body = await c.req.json();
    const service = new DocumentGenerationService(c.env);
    const result = await service.generateCoverLetter(body.job, body.applicant, body.style);
    return c.json(result);
});


export default documents;
