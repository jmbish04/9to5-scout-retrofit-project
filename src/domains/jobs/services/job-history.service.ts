/**
 * @module src/domains/jobs/services/job-history.service.ts
 * @description
 * Service for processing job history submissions using AI.
 */

import { z } from 'zod';
import { AIExtractionError } from '../../../core/errors';

const JobHistoryEntrySchema = z.object({
    company_name: z.string(),
    job_title: z.string(),
    start_date: z.string(),
    end_date: z.string().optional(),
    responsibilities: z.array(z.string()),
});

export class JobHistoryService {
    private env: any;

    constructor(env: any) {
        this.env = env;
    }

    async processJobHistorySubmission(submission: any): Promise<any> {
        const prompt = `
            Extract the job history from the following text.
            Return a JSON array of objects, where each object has keys: "company_name", "job_title", "start_date", "end_date", and "responsibilities" (an array of strings).
            Text: ${submission.raw_content}
        `;

        const schema = {
            type: "array",
            items: {
                type: "object",
                properties: {
                    company_name: { type: "string" },
                    job_title: { type: "string" },
                    start_date: { type: "string" },
                    end_date: { type: "string" },
                    responsibilities: { type: "array", items: { type: "string" } },
                }
            }
        };

        try {
            const response = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
                messages: [{ role: "system", content: "You are an expert data extractor." }, { role: "user", content: prompt }],
                response_format: { type: "json_schema", schema },
            });

            const extractedData = JSON.parse((response as any).response || "[]");
            return z.array(JobHistoryEntrySchema).parse(extractedData);
        } catch (error) {
            throw new AIExtractionError("Failed to parse job history with AI", error as Error);
        }
    }
}
