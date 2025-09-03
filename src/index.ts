// Placeholder types for Durable Objects until full implementations are added.
type DurableObjectState = any;

// Import job scraping functionality
import { handleJobsGet, handleJobGet } from './routes/jobs';
import { handleRunsGet, handleDiscoveryRunPost, handleMonitorRunPost } from './routes/runs';
import { handleConfigsGet, handleConfigsPost } from './routes/configs';
import { handleAgentQuery } from './routes/agent';
import { crawlJob } from './lib/crawl';

/**
 * Cloudflare Worker handling AI-driven cover letter, resume generation, and job scraping.
 */

/**
 * Describes the request payload expected for cover letter generation.
 */
interface CoverLetterRequestBody {
  job_title: string;
  company_name: string;
  hiring_manager_name?: string;
  job_description_text: string;
  candidate_career_summary: string;
}

/**
 * Represents structured cover letter content returned by the AI model.
 */
interface CoverLetterContent {
  salutation: string;
  opening_paragraph: string;
  body_paragraph_1: string;
  body_paragraph_2: string;
  closing_paragraph: string;
}

/**
 * Defines the request payload for resume generation.
 */
interface ResumeRequestBody {
  job_title: string;
  company_name: string;
  job_description_text: string;
  candidate_career_summary: string;
}

/**
 * Represents structured resume content returned by the AI model.
 */
interface ResumeContent {
  summary: string;
  experience_bullets: string[];
  skills: string[];
}

/**
 * Environment bindings made available to the Worker at runtime.
 */
export interface Env {
  AI: any;
  DB: any;
  KV: any;
  R2: any;
  VECTORIZE_INDEX: any;
  MYBROWSER: any;
  API_AUTH_TOKEN: string;
  BROWSER_RENDERING_TOKEN: string;
  SLACK_WEBHOOK_URL: string;
  SITE_CRAWLER: any;
  JOB_MONITOR: any;
  DISCOVERY_WORKFLOW: any;
  JOB_MONITOR_WORKFLOW: any;
  CHANGE_ANALYSIS_WORKFLOW: any;
}

/**
 * Durable Object coordinating crawling operations for a specific site.
 */
export class SiteCrawler {
  /**
   * Creates a new SiteCrawler instance.
   * @param state - Durable Object state reference.
   * @param env - Worker environment bindings.
   */
  constructor(state: DurableObjectState, env: Env) {}

  /**
   * Placeholder fetch handler for future SiteCrawler APIs.
   * @param req - Incoming request object.
   */
  async fetch(req: Request) {
    return new Response("Not implemented", { status: 501 });
  }
}

/**
 * Durable Object responsible for monitoring individual job postings.
 */
export class JobMonitor {
  /**
   * Creates a new JobMonitor instance.
   * @param state - Durable Object state reference.
   * @param env - Worker environment bindings.
   */
  constructor(state: DurableObjectState, env: Env) {}

  /**
   * Placeholder fetch handler for future JobMonitor APIs.
   * @param req - Incoming request object.
   */
  async fetch(req: Request) {
    return new Response("Not implemented", { status: 501 });
  }
}

/**
 * Workflow stub for job discovery.
 */
export class DiscoveryWorkflow {}

/**
 * Workflow stub for ongoing job monitoring.
 */
export class JobMonitorWorkflow {}

/**
 * Workflow stub for analyzing changes in job postings.
 */
export class ChangeAnalysisWorkflow {}

export default {
  /**
   * Main fetch handler routing API requests.
   * @param request - Incoming HTTP request.
   * @param env - Worker environment bindings.
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/api/health') {
      return new Response('OK', { status: 200 });
    }

    // Authentication check for API routes (except health)
    if (url.pathname.startsWith('/api/') && url.pathname !== '/api/health') {
      const authHeader = request.headers.get('Authorization');
      const expectedToken = `Bearer ${env.API_AUTH_TOKEN}`;
      
      if (!authHeader || authHeader !== expectedToken) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    try {
      // Job scraping API routes
      if (url.pathname === '/api/jobs' && request.method === 'GET') {
        return handleJobsGet(request, env);
      }

      if (url.pathname.startsWith('/api/jobs/') && request.method === 'GET') {
        const jobId = url.pathname.split('/')[3];
        if (!jobId) {
          return new Response(JSON.stringify({ error: 'Job ID is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return handleJobGet(request, env, jobId);
      }

      if (url.pathname === '/api/runs' && request.method === 'GET') {
        return handleRunsGet(request, env);
      }

      if (url.pathname === '/api/runs/discovery' && request.method === 'POST') {
        return handleDiscoveryRunPost(request, env);
      }

      if (url.pathname === '/api/runs/monitor' && request.method === 'POST') {
        return handleMonitorRunPost(request, env);
      }

      if (url.pathname === '/api/configs' && request.method === 'GET') {
        return handleConfigsGet(request, env);
      }

      if (url.pathname === '/api/configs' && request.method === 'POST') {
        return handleConfigsPost(request, env);
      }

      if (url.pathname === '/api/agent/query' && request.method === 'GET') {
        return handleAgentQuery(request, env);
      }

      // Manual crawl endpoint
      if (url.pathname === '/api/crawl' && request.method === 'POST') {
        const body = await request.json() as { url: string; site_id?: string };
        if (!body.url) {
          return new Response(JSON.stringify({ error: 'URL is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const job = await crawlJob(env, body.url, body.site_id);
        if (job) {
          return new Response(JSON.stringify(job), {
            headers: { 'Content-Type': 'application/json' },
          });
        } else {
          return new Response(JSON.stringify({ error: 'Failed to crawl job' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      // Existing cover letter and resume routes
      if (url.pathname === '/api/cover-letter' && request.method === 'POST') {
        const body = (await request.json()) as CoverLetterRequestBody;
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
              description:
                'A professional salutation, addressing the hiring manager by name if provided, otherwise using a general title like "Dear Hiring Manager,".',
            },
            opening_paragraph: {
              type: 'string',
              description:
                "A compelling opening paragraph that clearly states the position being applied for, where it was seen, and a powerful 1-2 sentence summary of the candidate's fitness for the role, creating immediate interest.",
            },
            body_paragraph_1: {
              type: 'string',
              description:
                "The first body paragraph. Connects the candidate's key experiences and skills directly to the most important requirements from the job description. Should highlight 1-2 specific, quantifiable achievements.",
            },
            body_paragraph_2: {
              type: 'string',
              description:
                "The second body paragraph. Focuses on the candidate's alignment with the company's mission, culture, or recent projects. Demonstrates genuine interest and shows how the candidate will add value to the team and company goals.",
            },
            closing_paragraph: {
              type: 'string',
              description:
                'A strong closing paragraph that reiterates interest in the role, expresses enthusiasm for the opportunity, and includes a clear call to action, such as requesting an interview to discuss their qualifications further.',
            },
          },
          required: ['salutation', 'opening_paragraph', 'body_paragraph_1', 'body_paragraph_2', 'closing_paragraph'],
        };

        const messages = [
          {
            role: 'system',
            content:
              'You are an expert career coach and professional cover letter writer. Your task is to generate the content for a compelling, tailored cover letter based on the provided job description and candidate summary. You must strictly adhere to the provided JSON schema for your response, filling in each field with high-quality, relevant content.',
          },
          {
            role: 'user',
            content: `Please craft the content for a cover letter with the following details:\n\n- Job Title: ${body.job_title}\n- Company: ${body.company_name}\n- Hiring Manager: ${body.hiring_manager_name || 'Not specified'}\n\n--- Job Description ---\n${body.job_description_text}\n\n--- Candidate Career Summary ---\n${body.candidate_career_summary}\n\nGenerate the response following the required JSON schema.`,
          },
        ];

        const inputs = { messages, guided_json: coverLetterSchema };
        const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', inputs);
        return new Response(JSON.stringify(response), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname === '/api/resume' && request.method === 'POST') {
        const body = (await request.json()) as ResumeRequestBody;
        if (!body.job_title || !body.company_name || !body.job_description_text || !body.candidate_career_summary) {
          return new Response(JSON.stringify({ error: 'Missing required fields in request body' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const resumeSchema = {
          type: 'object',
          properties: {
            summary: { type: 'string', description: 'Professional summary tailored to the job.' },
            experience_bullets: {
              type: 'array',
              description: 'Three concise bullet points highlighting relevant achievements.',
              items: { type: 'string' },
            },
            skills: {
              type: 'array',
              description: 'Key skills relevant to the job description.',
              items: { type: 'string' },
            },
          },
          required: ['summary', 'experience_bullets', 'skills'],
        };

        const messages = [
          {
            role: 'system',
            content:
              'You are an expert resume writer. Generate a resume summary, three experience bullet points, and a list of key skills tailored to the job description and candidate background. Use the provided JSON schema.',
          },
          {
            role: 'user',
            content: `Generate resume content for the following details:\n\n- Job Title: ${body.job_title}\n- Company: ${body.company_name}\n\n--- Job Description ---\n${body.job_description_text}\n\n--- Candidate Career Summary ---\n${body.candidate_career_summary}\n\nFollow the JSON schema strictly.`,
          },
        ];

        const inputs = { messages, guided_json: resumeSchema };
        const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', inputs);
        return new Response(JSON.stringify(response), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Route not found
      return new Response(JSON.stringify({ error: 'Not Found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: unknown) {
      console.error('Error processing request:', error);
      return new Response(
        JSON.stringify({ error: 'An internal server error occurred.' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
  },
};
