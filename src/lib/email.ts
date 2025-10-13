/**
 * Email processing utilities for parsing job alert emails and extracting URLs.
 * Handles both HTML and plain text email formats.
 */

// Import EmailMessage type for sending emails
import { EmailMessage as CloudflareEmailMessage } from 'cloudflare:email';
import type { EmailConfig, EmailInsights } from './types';
import { assertBrowserRenderingToken } from './auth';

export interface EmailMessage {
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  raw?: string;
  headers: Record<string, string>;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function extractEmailAddress(value: string): string {
  if (!value) {
    return '';
  }
  const match = value.match(/<([^>]+)>/);
  if (match) {
    return match[1].trim().toLowerCase();
  }
  return value.trim().toLowerCase();
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>(?=\s*<br\s*\/?>(?:\s*<br\s*\/?>)*)/gi, '\n')
    .replace(/<br\s*\/?>(?!\n)/gi, '\n')
    .replace(/<\/(p|div|h\d|li)>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+$/g, '')
    .trim();
}

export function getPlainTextContent(email: EmailMessage): string {
  if (email.text && email.text.trim()) {
    return email.text.trim();
  }
  if (email.html) {
    return htmlToPlainText(email.html);
  }
  return '';
}

export function buildOutlookHtml(email: EmailMessage, plainText: string): string {
  const subject = escapeHtml(email.subject || '(no subject)');
  const from = escapeHtml(email.from || '');
  const to = escapeHtml(email.to?.join(', ') || '');
  const bodyHtml = email.html
    ? sanitizeHtml(email.html) // NOTE: You will need to implement or import a `sanitizeHtml` function.
    : escapeHtml(plainText).replace(/\n/g, '<br />');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${subject}</title>
  <style>
    body { margin: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f3f2f1; }
    .wrapper { max-width: 960px; margin: 24px auto; background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 8px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; padding: 24px; }
    .header h1 { margin: 0 0 4px 0; font-size: 20px; }
    .header p { margin: 0; opacity: 0.9; }
    .meta { padding: 16px 24px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .meta dt { font-weight: 600; color: #475569; }
    .meta dd { margin: 4px 0 12px 0; color: #0f172a; }
    .content { padding: 24px; color: #0f172a; line-height: 1.6; }
    .content h2 { margin-top: 0; font-size: 18px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>${subject}</h1>
      <p>Forwarded via 9to5-Scout Email Ingestion</p>
    </div>
    <dl class="meta">
      <dt>From</dt>
      <dd>${from}</dd>
      <dt>To</dt>
      <dd>${to || 'N/A'}</dd>
    </dl>
    <div class="content">
      ${bodyHtml}
    </div>
  </div>
</body>
</html>`;
}

export function buildR2Url(env: { BUCKET_BASE_URL?: string }, key?: string | null): string | null {
  if (!key) {
    return null;
  }

  const baseUrl = env.BUCKET_BASE_URL?.trim();
  if (!baseUrl) {
    console.warn('BUCKET_BASE_URL is not configured; unable to construct R2 URL.');
    return null;
  }

  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${normalizedBase}${key}`;
}

export async function renderEmailPdf(env: any, html: string): Promise<ArrayBuffer | null> {
  try {
    const browserToken = assertBrowserRenderingToken(env);
    const response = await env.MYBROWSER.fetch('https://browser.render.cloudflare.com', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${browserToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ html, pdf: true, waitFor: 0 }),
    });

    if (!response.ok) {
      console.error('Browser rendering for email PDF failed:', response.status);
      return null;
    }

    const result = await response.json();
    if (!result?.pdf) {
      return null;
    }

    const pdfArray = new Uint8Array(result.pdf);
    return pdfArray.buffer;
  } catch (error) {
    console.error('Failed to render email PDF:', error);
    return null;
  }
}

export interface ExtractedJobInfo {
  url: string;
  title?: string;
  company?: string;
  location?: string;
}

/**
 * Extract job posting URLs from email content.
 * Supports common job site patterns and email formats.
 */
export function extractJobUrls(content: string): string[] {
  const urls: string[] = [];

  // Common job site URL patterns
  const jobSitePatterns = [
    // LinkedIn Jobs
    /https?:\/\/(?:www\.)?linkedin\.com\/jobs\/view\/\d+/gi,
    // Indeed
    /https?:\/\/(?:www\.)?indeed\.com\/viewjob\?jk=[\w-]+/gi,
    // Glassdoor
    /https?:\/\/(?:www\.)?glassdoor\.com\/job-listing\/[^?\s]+/gi,
    // Monster
    /https?:\/\/(?:www\.)?monster\.com\/job-openings\/[^?\s]+/gi,
    // ZipRecruiter
    /https?:\/\/(?:www\.)?ziprecruiter\.com\/jobs\/[^?\s]+/gi,
    // CareerBuilder
    /https?:\/\/(?:www\.)?careerbuilder\.com\/job\/[^?\s]+/gi,
    // Google Jobs (redirects)
    /https?:\/\/(?:www\.)?google\.com\/search\?[^&]*&q=.*job/gi,
    // Company career pages
    /https?:\/\/[^\/\s]+\/(?:careers?|jobs?)\/[^?\s]+/gi,
    // Generic job posting patterns
    /https?:\/\/[^\/\s]+\/[^?\s]*(?:job|career|position|opening|vacancy)[^?\s]*/gi
  ];

  // Extract URLs using patterns
  for (const pattern of jobSitePatterns) {
    const matches = content.match(pattern);
    if (matches) {
      urls.push(...matches);
    }
  }

  // Also extract any URLs that contain job-related keywords
  const urlPattern = /https?:\/\/[^\s<>"]+/gi;
  const allUrls = content.match(urlPattern) || [];

  const jobKeywords = ['job', 'career', 'position', 'opening', 'vacancy', 'hiring', 'opportunity'];

  for (const url of allUrls) {
    const urlLower = url.toLowerCase();
    if (jobKeywords.some(keyword => urlLower.includes(keyword))) {
      if (!urls.includes(url)) {
        urls.push(url);
      }
    }
  }

  // Clean and deduplicate URLs
  return [...new Set(urls)]
    .map(url => url.replace(/[<>"']$/, '')) // Remove trailing punctuation
    .filter(url => url.length > 10); // Filter out malformed URLs
}

/**
 * Extract job information from email content using AI-powered parsing.
 */
export async function extractJobInfo(env: { AI: any }, content: string): Promise<ExtractedJobInfo[]> {
  try {
    // Limit content to avoid exceeding token limits, focusing on the body
    const cleanContent = content.replace(/<head>[\s\S]*?<\/head>/i, '').slice(0, 12000);

    const jobSchema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The direct URL to the job posting.' },
          title: { type: 'string', description: 'The job title.' },
          company: { type: 'string', description: 'The name of the company.' },
          location: { type: 'string', description: 'The location of the job.' }
        },
        required: ['url']
      }
    };

    const messages = [
      {
        role: 'system',
        content: `You are an expert at parsing job alert emails. Your task is to extract all job postings from the provided email content (HTML or text). Identify each distinct job and extract its URL, title, company, and location. Return the data as a JSON array following the provided schema. Only include jobs that have a valid URL.`
      },
      {
        role: 'user',
        content: `Here is the email content:\n\n${cleanContent}`
      }
    ];

    const response = await env.AI.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
      messages,
      guided_json: jobSchema
    });

    if (response?.response) {
      const jobData = typeof response.response === 'string'
        ? JSON.parse(response.response)
        : response.response;

      if (Array.isArray(jobData)) {
        return jobData.filter(job => job.url); // Ensure every entry has a URL
      }
    }

    return [];
  } catch (error) {
    console.error('AI-powered job info extraction failed:', error);
    // Fallback to regex if AI fails
    const urls = extractJobUrls(content);
    return urls.map(url => ({ url }));
  }
}

/**
 * Parse email content from Cloudflare Email Routing request.
 * Cloudflare sends emails as multipart MIME in the request body.
 */
export async function parseEmailFromRequest(request: Request): Promise<EmailMessage | null> {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (!contentType.includes('multipart/form-data')) {
      // Simple email format
      const text = await request.text();
      return {
        from: request.headers.get('x-from') || '',
        to: [request.headers.get('x-to') || ''],
        subject: request.headers.get('x-subject') || '',
        text: text,
        raw: text,
        headers: Object.fromEntries(request.headers.entries())
      };
    }

    // Parse multipart email content
    const formData = await request.formData();
    const email: EmailMessage = {
      from: formData.get('from')?.toString() || request.headers.get('x-from') || '',
      to: [formData.get('to')?.toString() || request.headers.get('x-to') || ''],
      subject: formData.get('subject')?.toString() || request.headers.get('x-subject') || '',
      headers: Object.fromEntries(request.headers.entries())
    };

    // Extract text and HTML content
    const textContent = formData.get('text');
    const htmlContent = formData.get('html');

    if (textContent) {
      email.text = textContent.toString();
    }

    if (htmlContent) {
      email.html = htmlContent.toString();
    }

    return email;
  } catch (error) {
    console.error('Failed to parse email:', error);
    return null;
  }
}

/**
 * Generate email insights data for a specific configuration.
 * Aggregates new jobs, job changes, and statistics for email reporting.
 */
export async function generateEmailInsights(env: any, config: EmailConfig): Promise<EmailInsights> {
  const hours = config.frequency_hours;
  const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  // Get new jobs
  const newJobs = config.include_new_jobs ? await env.DB.prepare(`
    SELECT title, company, location, url, first_seen_at as posted_at
    FROM jobs 
    WHERE first_seen_at >= ? AND status = 'open'
    ORDER BY first_seen_at DESC
    LIMIT 50
  `).bind(cutoffTime).all() : { results: [] };

  // Get job changes
  const jobChanges = config.include_job_changes ? await env.DB.prepare(`
    SELECT j.title, j.company, j.url, c.semantic_summary as change_summary
    FROM changes c
    JOIN jobs j ON c.job_id = j.id
    WHERE c.changed_at >= ?
    ORDER BY c.changed_at DESC
    LIMIT 20
  `).bind(cutoffTime).all() : { results: [] };

  // Get statistics
  const totalJobsResult = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM jobs WHERE status = 'open'
  `).first();

  const newJobsCountResult = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM jobs 
    WHERE first_seen_at >= ? AND status = 'open'
  `).bind(cutoffTime).first();

  // Get role statistics
  const roleStatsResult = config.include_statistics ? await env.DB.prepare(`
    SELECT 
      CASE 
        WHEN LOWER(title) LIKE '%engineer%' OR LOWER(title) LIKE '%developer%' THEN 'Engineer/Developer'
        WHEN LOWER(title) LIKE '%manager%' THEN 'Manager'
        WHEN LOWER(title) LIKE '%analyst%' THEN 'Analyst'
        WHEN LOWER(title) LIKE '%designer%' THEN 'Designer'
        WHEN LOWER(title) LIKE '%product%' THEN 'Product'
        WHEN LOWER(title) LIKE '%sales%' THEN 'Sales'
        WHEN LOWER(title) LIKE '%marketing%' THEN 'Marketing'
        ELSE 'Other'
      END as role,
      COUNT(*) as count,
      AVG(salary_min) as avgMinSalary,
      AVG(salary_max) as avgMaxSalary
    FROM jobs 
    WHERE status = 'open' AND title IS NOT NULL
    GROUP BY role
    ORDER BY count DESC
    LIMIT 10
  `).all() : { results: [] };

  return {
    newJobs: newJobs.results || [],
    jobChanges: jobChanges.results || [],
    statistics: {
      totalJobs: totalJobsResult?.count || 0,
      newJobsLastPeriod: newJobsCountResult?.count || 0,
      roleStats: roleStatsResult.results || []
    }
  };
}

/**
 * Send insights email using email service.
 */
export async function sendInsightsEmail(insights: EmailInsights, config: EmailConfig, env: any): Promise<boolean> {
  try {
    const htmlContent = formatInsightsEmail(insights, config.frequency_hours);
    const subject = `9to5-Scout Job Insights - ${insights.statistics.newJobsLastPeriod} new jobs`;

    if (!env.EMAIL_SENDER) {
      console.error("EMAIL_SENDER binding not configured. Cannot send email.");
      // Fallback to KV for demo/testing purposes if sender is not available
      const emailId = crypto.randomUUID();
      await env.KV.put(`email:${emailId}`, JSON.stringify({
        to: config.recipient_email,
        subject,
        html: htmlContent,
        sent_at: new Date().toISOString()
      }));
      return true;
    }

    // Construct the email message
    const message = new CloudflareEmailMessage(
      `digest@${env.EMAIL_ROUTING_DOMAIN}`, // From
      config.recipient_email,               // To
      `Subject: ${subject}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${htmlContent}` // Raw content
    );

    // Send the email
    await env.EMAIL_SENDER.send(message);

    console.log(`Email insights sent successfully to ${config.recipient_email}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Format email insights into HTML email content.
 */
export function formatInsightsEmail(insights: EmailInsights, periodHours: number): string {
  const period = periodHours === 24 ? 'daily' : `${periodHours}-hour`;
  
  return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .section { margin: 20px 0; padding: 15px; border-left: 4px solid #2563eb; }
        .job-item { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; }
        .stats-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .stats-table th, .stats-table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        .stats-table th { background: #f1f3f4; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>9to5-Scout Job Insights</h1>
        <p>Your ${period} job market update</p>
    </div>

    ${insights.newJobs.length > 0 ? `
    <div class="section">
        <h2>New Job Openings (${insights.newJobs.length})</h2>
        ${insights.newJobs.map(job => `
        <div class="job-item">
            <strong><a href="${job.url}">${job.title}</a></strong><br>
            <em>${job.company}${job.location ? ` • ${job.location}` : ''}</em><br>
            <small>Posted: ${new Date(job.posted_at).toLocaleDateString()}</small>
        </div>
        `).join('')}
    </div>
    ` : ''}

    ${insights.jobChanges.length > 0 ? `
    <div class="section">
        <h2>Job Updates (${insights.jobChanges.length})</h2>
        ${insights.jobChanges.map(change => `
        <div class="job-item">
            <strong><a href="${change.url}">${change.title}</a></strong><br>
            <em>${change.company}</em><br>
            <p>${change.change_summary}</p>
        </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="section">
        <h2>Market Statistics</h2>
        <p><strong>Total Active Jobs:</strong> ${insights.statistics.totalJobs}</p>
        <p><strong>New Jobs in Last ${periodHours}h:</strong> ${insights.statistics.newJobsLastPeriod}</p>
        
        ${insights.statistics.roleStats.length > 0 ? `
        <h3>Top Roles</h3>
        <table class="stats-table">
            <thead>
                <tr>
                    <th>Role</th>
                    <th>Count</th>
                    <th>Avg Min Salary</th>
                    <th>Avg Max Salary</th>
                </tr>
            </thead>
            <tbody>
                ${insights.statistics.roleStats.map(stat => `
                <tr>
                    <td>${stat.role}</td>
                    <td>${stat.count}</td>
                    <td>${stat.avgMinSalary ? `$${stat.avgMinSalary.toLocaleString()}` : 'N/A'}</td>
                    <td>${stat.avgMaxSalary ? `$${stat.avgMaxSalary.toLocaleString()}` : 'N/A'}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}
    </div>

    <div class="footer">
        <p>Powered by 9to5-Scout AI Job Discovery Platform</p>
        <p>This is an automated report. Reply to this email to provide feedback.</p>
    </div>
</body>
</html>
  `.trim();
}
