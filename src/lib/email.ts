/**
 * Email processing utilities for parsing job alert emails and extracting URLs.
 * Handles both HTML and plain text email formats.
 */

export interface EmailMessage {
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  headers: Record<string, string>;
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
 * This attempts to find structured job data in addition to URLs.
 */
export function extractJobInfo(content: string): ExtractedJobInfo[] {
  const urls = extractJobUrls(content);
  const jobs: ExtractedJobInfo[] = [];

  // For each URL, try to extract additional context from surrounding text
  for (const url of urls) {
    const job: ExtractedJobInfo = { url };
    
    // Find the URL in the content and extract surrounding context
    const urlIndex = content.indexOf(url);
    if (urlIndex >= 0) {
      // Extract 200 characters before and after the URL
      const start = Math.max(0, urlIndex - 200);
      const end = Math.min(content.length, urlIndex + url.length + 200);
      const context = content.slice(start, end);
      
      // Try to extract job title (usually in bold, headings, or near the URL)
      const titlePatterns = [
        /(?:position|role|job|title):\s*([^\n\r]{5,100})/gi,
        /<strong[^>]*>([^<]{5,100})<\/strong>/gi,
        /<b[^>]*>([^<]{5,100})<\/b>/gi,
        /^([A-Z][^\n\r]{10,80})$/gm // Capitalized lines that could be titles
      ];
      
      for (const pattern of titlePatterns) {
        const match = pattern.exec(context);
        if (match && match[1]) {
          job.title = match[1].trim();
          break;
        }
      }
      
      // Try to extract company name
      const companyPatterns = [
        /(?:company|employer|organization):\s*([^\n\r]{2,50})/gi,
        /at\s+([A-Z][a-zA-Z\s&,-]{2,40})\s*(?:\n|\r|$)/gi
      ];
      
      for (const pattern of companyPatterns) {
        const match = pattern.exec(context);
        if (match && match[1]) {
          job.company = match[1].trim();
          break;
        }
      }
      
      // Try to extract location
      const locationPatterns = [
        /(?:location|city|state):\s*([^\n\r]{2,50})/gi,
        /\b([A-Z][a-z]+,\s*[A-Z]{2})\b/g, // City, State format
        /\b([A-Z][a-z\s]+,\s*[A-Z][a-z\s]+)\b/g // City, Country format
      ];
      
      for (const pattern of locationPatterns) {
        const match = pattern.exec(context);
        if (match && match[1]) {
          job.location = match[1].trim();
          break;
        }
      }
    }
    
    jobs.push(job);
  }

  return jobs;
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
 * Generate email insights content for sending reports.
 */
export interface EmailInsights {
  newJobs: Array<{
    title: string;
    company: string;
    location?: string;
    url: string;
    posted_at: string;
  }>;
  jobChanges: Array<{
    title: string;
    company: string;
    change_summary: string;
    url: string;
  }>;
  statistics: {
    totalJobs: number;
    newJobsLastPeriod: number;
    roleStats: Array<{
      role: string;
      count: number;
      avgMinSalary?: number;
      avgMaxSalary?: number;
      avgTimeOpen?: number;
    }>;
  };
}

/**
 * Generate email insights data for a specific configuration.
 * Aggregates new jobs, job changes, and statistics for email reporting.
 */
export async function generateEmailInsights(env: any, config: any): Promise<EmailInsights> {
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
 * Currently stores emails in KV for demo purposes.
 */
export async function sendInsightsEmail(insights: EmailInsights, config: any, env: any): Promise<boolean> {
  try {
    const htmlContent = formatInsightsEmail(insights, config.frequency_hours);
    const subject = `9to5-Scout Job Insights - ${insights.statistics.newJobsLastPeriod} new jobs`;

    // For now, log the email content (in production, integrate with email service)
    console.log('Email would be sent to:', config.recipient_email);
    console.log('Subject:', subject);
    console.log('Content length:', htmlContent.length);

    // Store the email in KV for demo purposes
    const emailId = crypto.randomUUID();
    await env.KV.put(`email:${emailId}`, JSON.stringify({
      to: config.recipient_email,
      subject,
      html: htmlContent,
      sent_at: new Date().toISOString()
    }));

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
        <h1>🎯 9to5-Scout Job Insights</h1>
        <p>Your ${period} job market update</p>
    </div>

    ${insights.newJobs.length > 0 ? `
    <div class="section">
        <h2>🆕 New Job Openings (${insights.newJobs.length})</h2>
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
        <h2>🔄 Job Updates (${insights.jobChanges.length})</h2>
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
        <h2>📊 Market Statistics</h2>
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