/**
 * AI-powered job extraction and processing functionality.
 * Integrates with Cloudflare Workers AI for structured data extraction.
 */

import type { Job } from './types';

export interface Env {
  AI: any;
  VECTORIZE_INDEX: any;
}

/**
 * Extract structured job data from HTML content using AI.
 * Uses Cloudflare Workers AI to parse job details from webpage HTML.
 */
export async function extractJob(env: Env, html: string, url: string, site: string): Promise<Job | null> {
  try {
    const jobSchema = {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Job title or position name' },
        company: { type: 'string', description: 'Company or organization name' },
        location: { type: 'string', description: 'Job location (city, state, remote, etc.)' },
        employment_type: { type: 'string', description: 'Employment type (full-time, part-time, contract, etc.)' },
        department: { type: 'string', description: 'Department or team' },
        salary_min: { type: 'number', description: 'Minimum salary if mentioned' },
        salary_max: { type: 'number', description: 'Maximum salary if mentioned' },
        salary_currency: { type: 'string', description: 'Currency code (USD, EUR, etc.)' },
        salary_raw: { type: 'string', description: 'Raw salary text as shown' },
        description_md: { type: 'string', description: 'Job description in markdown format' },
        requirements_md: { type: 'string', description: 'Job requirements in markdown format' },
        posted_at: { type: 'string', description: 'Job posting date in ISO format if available' },
      },
      required: [],
    };

    const messages = [
      {
        role: 'system',
        content: `You are an expert at extracting structured job information from HTML. Extract all available job details from the provided HTML and return them in the specified JSON schema. Be thorough but accurate - only include information that is clearly present in the HTML.`,
      },
      {
        role: 'user',
        content: `Extract job information from this HTML for ${site} at ${url}:\n\n${html.slice(0, 8000)}`, // Limit HTML length
      },
    ];

    const inputs = {
      messages,
      guided_json: jobSchema,
    };

    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', inputs);
    
    if (response?.response) {
      const jobData = typeof response.response === 'string' 
        ? JSON.parse(response.response) 
        : response.response;
        
      // Add metadata
      jobData.url = url;
      jobData.status = 'open';
      
      return jobData as Job;
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting job:', error);
    return null;
  }
}

/**
 * Generate embeddings for text using Cloudflare Workers AI.
 * Used for semantic search in Vectorize.
 */
export async function embedText(env: Env, text: string): Promise<number[] | undefined> {
  try {
    const response = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text });
    return response.data?.[0]?.embedding;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    return undefined;
  }
}