/**
 * @file Cloudflare Worker AI Agent for crafting tailored cover letters.
 *
 * This agent accepts a job description and candidate profile, then uses a
 * structured JSON schema to guide a language model in generating a complete,
 * professional cover letter with distinct, purposeful paragraphs.
 */

// --- TypeScript Interfaces ---

/**
 * Defines the expected JSON structure for the incoming request body.
 */
interface CoverLetterRequestBody {
    job_title: string;
    company_name: string;
    hiring_manager_name?: string; // Optional, defaults to "Hiring Manager"
    job_description_text: string;
    candidate_career_summary: string;
}

/**
 * Defines the structured JSON output that the AI model must generate.
 */
interface CoverLetterContent {
    salutation: string;
    opening_paragraph: string;
    body_paragraph_1: string;
    body_paragraph_2: string;
    closing_paragraph: string;
}

/**
 * Defines the environment bindings available to the worker.
 * Specifically, the binding for Cloudflare's Workers AI service.
 */
export interface Env {
    AI: any;
}

// --- Main Worker Logic ---

export default {
    /**
     * Handles incoming fetch requests to the worker.
     * @param request - The incoming HTTP request.
     * @param env - The worker's environment bindings.
     * @returns A promise that resolves to the HTTP response.
     */
    async fetch(request: Request, env: Env): Promise<Response> {
        if (request.method !== 'POST') {
            return new Response('Expected POST request', { status: 405 });
        }

        try {
            const body = await request.json<CoverLetterRequestBody>();

            // Validate required fields
            if (!body.job_title || !body.company_name || !body.job_description_text || !body.candidate_career_summary) {
                return new Response(JSON.stringify({ error: 'Missing required fields in request body' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            const coverLetterSchema = {
                type: 'object',
                properties: {
                    salutation: {
                        type: 'string',
                        description: 'A professional salutation, addressing the hiring manager by name if provided, otherwise using a general title like "Dear Hiring Manager,".',
                    },
                    opening_paragraph: {
                        type: 'string',
                        description: 'A compelling opening paragraph that clearly states the position being applied for, where it was seen, and a powerful 1-2 sentence summary of the candidate\'s fitness for the role, creating immediate interest.',
                    },
                    body_paragraph_1: {
                        type: 'string',
                        description: 'The first body paragraph. Connects the candidate\'s key experiences and skills directly to the most important requirements from the job description. Should highlight 1-2 specific, quantifiable achievements.',
                    },
                    body_paragraph_2: {
                        type: 'string',
                        description: 'The second body paragraph. Focuses on the candidate\'s alignment with the company\'s mission, culture, or recent projects. Demonstrates genuine interest and shows how the candidate will add value to the team and company goals.',
                    },
                    closing_paragraph: {
                        type: 'string',
                        description: 'A strong closing paragraph that reiterates interest in the role, expresses enthusiasm for the opportunity, and includes a clear call to action, such as requesting an interview to discuss their qualifications further.',
                    },
                },
                required: ['salutation', 'opening_paragraph', 'body_paragraph_1', 'body_paragraph_2', 'closing_paragraph'],
            };

            const messages = [
                {
                    role: 'system',
                    content: `You are an expert career coach and professional cover letter writer. Your task is to generate the content for a compelling, tailored cover letter based on the provided job description and candidate summary. You must strictly adhere to the provided JSON schema for your response, filling in each field with high-quality, relevant content.`,
                },
                {
                    role: 'user',
                    content: `Please craft the content for a cover letter with the following details:
                    
                    - Job Title: ${body.job_title}
                    - Company: ${body.company_name}
                    - Hiring Manager: ${body.hiring_manager_name || 'Not specified'}
                    
                    --- Job Description ---
                    ${body.job_description_text}
                    
                    --- Candidate Career Summary ---
                    ${body.candidate_career_summary}
                    
                    Generate the response following the required JSON schema.`,
                },
            ];

            const inputs = {
                messages,
                guided_json: coverLetterSchema,
            };

            const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', inputs);

            return new Response(JSON.stringify(response), {
                headers: { 'Content-Type': 'application/json' },
            });

        } catch (error) {
            console.error('Error processing request:', error);
            return new Response(JSON.stringify({ error: 'Failed to process request', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    },
} satisfies ExportedHandler<Env>;
