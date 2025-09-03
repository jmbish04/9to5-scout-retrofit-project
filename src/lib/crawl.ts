/**
 * Web crawling functionality for job discovery.
 * Integrates with browser rendering service and AI extraction.
 */

import { extractJob } from './ai';
import { saveJob, createSnapshot } from './storage';
import type { Job } from './types';

/**
 * Parse sitemap XML to extract URLs robustly.
 * Handles different XML formats, namespaces, and sitemap index files.
 */
function parseSitemapUrls(xmlText: string): string[] {
  const urls: string[] = [];
  
  try {
    // Handle both regular sitemaps and sitemap index files
    // Look for <loc> tags while being namespace-aware
    const locPattern = /<loc[^>]*>(.*?)<\/loc>/gi;
    const sitemapPattern = /<sitemap[^>]*>[\s\S]*?<\/sitemap>/gi;
    
    let match;
    
    // First check if this is a sitemap index file
    if (xmlText.includes('<sitemapindex') || xmlText.includes('<sitemap>')) {
      // Extract URLs from sitemap entries (for sitemap index files)
      while ((match = sitemapPattern.exec(xmlText)) !== null) {
        const sitemapEntry = match[0];
        const locMatch = locPattern.exec(sitemapEntry);
        if (locMatch && locMatch[1]) {
          const url = locMatch[1].trim();
          if (url && url.startsWith('http')) {
            urls.push(url);
          }
        }
      }
      // Reset regex lastIndex for next search
      locPattern.lastIndex = 0;
    }
    
    // Extract all <loc> URLs (works for both regular sitemaps and index files)
    while ((match = locPattern.exec(xmlText)) !== null) {
      const url = match[1]?.trim();
      if (url && url.startsWith('http')) {
        // Decode HTML entities
        const decodedUrl = url
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'");
        
        urls.push(decodedUrl);
      }
    }
    
    // Remove duplicates
    return [...new Set(urls)];
    
  } catch (error) {
    console.error('Error parsing sitemap XML:', error);
    return [];
  }
}

export interface CrawlEnv {
  BROWSER_RENDERING_TOKEN: string;
  MYBROWSER: any;
  AI: any;
  DB: any;
  R2: any;
  VECTORIZE_INDEX: any;
}

/**
 * Enhanced job crawling with comprehensive snapshot creation.
 * Includes HTML content, PDF rendering, markdown extraction, and R2 storage.
 */
export async function crawlJobWithSnapshot(env: CrawlEnv, url: string, siteId?: string): Promise<{ job: Job | null; snapshotId?: string }> {
  try {
    console.log(`Starting enhanced crawling for ${url}`);
    
    // Use browser rendering service to get content
    const response = await env.MYBROWSER.fetch('https://browser.render.cloudflare.com', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.BROWSER_RENDERING_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        url,
        waitFor: 2000,
        screenshot: true,
        pdf: true
      })
    });

    if (!response.ok) {
      console.error(`Browser rendering failed for ${url}: ${response.status}`);
      return { job: null };
    }

    const result = await response.json();
    const html = result.html || result.content;

    if (!html) {
      console.error(`No HTML content received for ${url}`);
      return { job: null };
    }

    // Extract job data using AI
    const job = await extractJob(env, html, url, siteId || 'unknown');
    
    if (!job) {
      console.log(`No job data extracted from ${url}`);
      return { job: null };
    }

    job.site_id = siteId;
    job.url = url;
    job.last_crawled_at = new Date().toISOString();
    
    // Save the job to database
    const jobId = await saveJob(env, job);
    job.id = jobId;
    
    // Extract clean markdown from HTML for better storage
    let markdownContent = '';
    try {
      // Simple HTML to markdown conversion
      markdownContent = html
        .replace(/<script[^>]*>.*?<\/script>/gis, '')
        .replace(/<style[^>]*>.*?<\/style>/gis, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    } catch (error) {
      console.warn('Failed to extract markdown:', error);
    }

    // Generate content hash for change detection
    const contentHash = await crypto.subtle.digest(
      'SHA-256', 
      new TextEncoder().encode(html)
    ).then(buffer => Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    );

    // Create comprehensive snapshot
    const snapshotId = await createSnapshot(env, {
      job_id: jobId,
      content_hash: contentHash,
      html_content: html,
      json_content: JSON.stringify(job),
      screenshot_data: result.screenshot ? new Uint8Array(result.screenshot).buffer : undefined,
      pdf_data: result.pdf ? new Uint8Array(result.pdf).buffer : undefined,
      markdown_content: markdownContent,
      http_status: 200,
    });
    
    console.log(`Successfully crawled job with snapshot: ${job.title} at ${job.company}`);
    return { job, snapshotId };
    
  } catch (error) {
    console.error(`Error crawling job with snapshot ${url}:`, error);
    return { job: null };
  }
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
      
      // Robust XML parsing to extract URLs from sitemap
      const extractedUrls = parseSitemapUrls(sitemapText);
      
      // Filter URLs that might contain job-related keywords
      const jobKeywords = ['job', 'career', 'position', 'opening', 'opportunity', ...searchTerms];
      
      for (const url of extractedUrls) {
        const containsJobKeyword = jobKeywords.some(keyword => 
          url.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (containsJobKeyword) {
          urls.push(url);
        }
      }
    }
  } catch (error) {
    console.error(`Error discovering URLs from ${baseUrl}:`, error);
  }
  
  return urls;
}