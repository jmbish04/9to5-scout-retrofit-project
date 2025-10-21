/**
 * @module src/domains/jobs/routes/job-history.routes.ts
 * @description
 * Routes for handling job history submissions and parsing.
 */

import { JobHistoryService } from '../services/job-history.service';

export async function handleJobHistoryPost(request: Request, env: any): Promise<Response> {
    const service = new JobHistoryService(env);
    try {
        const submission = await request.json();
        const result = await service.processJobHistorySubmission(submission);
        return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
    } catch (error) {
        // Global error handler will catch this
        throw error;
    }
}