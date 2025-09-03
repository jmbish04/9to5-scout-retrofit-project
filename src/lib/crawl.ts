/**
 * Web crawling functionality for job discovery.
 * Integrates with browser rendering service and AI extraction.
 */

import { extractJob } from './ai';
import { saveJob } from './storage';
import type { Job } from './types';

export interface CrawlEnv {
  BROWSER_RENDERING_TOKEN: string;
  MYBROWSER: any;
  AI: any;
  DB: any;
  VECTORIZE_INDEX: any;
}

/**
 * Crawl a single job URL and extract job data.
 * Uses browser rendering service to get full HTML content.
 */
export async function crawlJob(env: CrawlEnv, url: string, siteId?: string): Promise<Job | null> {
  try {
    // Use browser rendering service to get HTML content
    const response = await env.MYBROWSER.fetch('https://browser.render.cloudflare.com', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.BROWSER_RENDERING_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        url,
        waitFor: 2000, // Wait 2 seconds for dynamic content
        screenshot: false
      })
    });

    if (!response.ok) {
      console.error(`Browser rendering failed for ${url}:`, response.status);
      return null;
    }

    const result = await response.json();
    const html = result.html || result.content;

    if (!html) {
      console.error(`No HTML content received for ${url}`);
      return null;
    }

    // Extract job data using AI
    const job = await extractJob(env, html, url, siteId || 'unknown');
    
    if (job) {
      job.site_id = siteId;
      job.url = url;
      job.last_crawled_at = new Date().toISOString();
      
      // Save the job to database
      const jobId = await saveJob(env, job);
      job.id = jobId;
      
      console.log(`Successfully crawled job: ${job.title} at ${job.company}`);
      return job;
    }
    
    return null;
  } catch (error) {
    console.error(`Error crawling job ${url}:`, error);
    return null;
  }
}

/**
 * Crawl multiple job URLs in batch.
 * Implements rate limiting to avoid overwhelming the browser service.
 */
export async function crawlJobs(env: CrawlEnv, urls: string[], siteId?: string): Promise<Job[]> {
  const jobs: Job[] = [];
  const batchSize = 5; // Process 5 URLs at a time
  const delay = 1000; // 1 second delay between batches

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    
    const batchPromises = batch.map(url => crawlJob(env, url, siteId));
    const batchResults = await Promise.all(batchPromises);
    
    // Filter out null results and add to jobs array
    for (const job of batchResults) {
      if (job) {
        jobs.push(job);
      }
    }
    
    // Add delay between batches to avoid rate limiting
    if (i + batchSize < urls.length) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return jobs;
}

/**
 * Simple URL discovery from a sitemap or robots.txt.
 * This is a basic implementation that can be extended for more sophisticated discovery.
 */
export async function discoverJobUrls(baseUrl: string, searchTerms: string[] = []): Promise<string[]> {
  const urls: string[] = [];
  
  try {
    // Try to fetch sitemap.xml
    const sitemapUrl = new URL('/sitemap.xml', baseUrl).href;
    const sitemapResponse = await fetch(sitemapUrl);
    
    if (sitemapResponse.ok) {
      const sitemapText = await sitemapResponse.text();
      
      // Basic XML parsing to extract URLs
      const urlMatches = sitemapText.match(/<loc>(.*?)<\/loc>/g);
      if (urlMatches) {
        for (const match of urlMatches) {
          const url = match.replace(/<\/?loc>/g, '');
          
          // Filter URLs that might contain job-related keywords
          const jobKeywords = ['job', 'career', 'position', 'opening', 'opportunity', ...searchTerms];
          const containsJobKeyword = jobKeywords.some(keyword => 
            url.toLowerCase().includes(keyword.toLowerCase())
          );
          
          if (containsJobKeyword) {
            urls.push(url);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error discovering URLs from ${baseUrl}:`, error);
  }
  
  return urls;
}