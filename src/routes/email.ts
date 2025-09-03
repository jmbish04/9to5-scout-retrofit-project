/**
 * Email route handlers for job alert processing and insights reporting.
 */

import { parseEmailFromRequest, extractJobInfo, formatInsightsEmail, EmailInsights } from '../lib/email';
import { Job, EmailLog, EmailConfig } from '../lib/types';
import { crawlJob } from '../lib/crawl';
import { saveJob } from '../lib/storage';

/**
 * Handle incoming email from Cloudflare Email Routing.
 * Extracts job posting links and processes them through the normal workflow.
 */
export async function handleEmailReceived(request: Request, env: any): Promise<Response> {
  try {
    console.log('Processing incoming email...');
    
    // Parse the email content
    const email = await parseEmailFromRequest(request);
    if (!email) {
      return new Response('Failed to parse email', { status: 400 });
    }

    console.log(`Email received from: ${email.from}, subject: ${email.subject}`);

    // Extract job information from email content
    const content = email.html || email.text || '';
    const jobInfo = extractJobInfo(content);
    
    console.log(`Extracted ${jobInfo.length} job links from email`);

    // Log the email processing
    const emailLogId = crypto.randomUUID();
    const contentPreview = content.slice(0, 500);
    
    await env.DB.prepare(`
      INSERT INTO email_logs (id, from_email, subject, content_preview, job_links_extracted, status)
      VALUES (?, ?, ?, ?, ?, 'processing')
    `).bind(emailLogId, email.from, email.subject, contentPreview, jobInfo.length).run();

    let processedJobs = 0;

    // Process each job URL
    for (const job of jobInfo) {
      try {
        console.log(`Processing job URL: ${job.url}`);
        
        // Crawl and extract job data
        const jobData = await crawlJob(env, job.url);
        
        if (jobData) {
          // Merge extracted info with crawled data
          const enhancedJob: Job = {
            ...jobData,
            source: 'EMAIL',
            title: jobData.title || job.title,
            company: jobData.company || job.company,
            location: jobData.location || job.location
          };

          // Save the job to database
          await saveJob(env, enhancedJob);
          processedJobs++;
          
          console.log(`Successfully processed job: ${enhancedJob.title} at ${enhancedJob.company}`);
        }
      } catch (error) {
        console.error(`Failed to process job ${job.url}:`, error);
      }
    }

    // Update email log with results
    await env.DB.prepare(`
      UPDATE email_logs 
      SET jobs_processed = ?, processed_at = CURRENT_TIMESTAMP, status = 'processed'
      WHERE id = ?
    `).bind(processedJobs, emailLogId).run();

    console.log(`Email processing complete. Processed ${processedJobs}/${jobInfo.length} jobs successfully.`);

    return new Response(JSON.stringify({
      success: true,
      email_id: emailLogId,
      job_links_extracted: jobInfo.length,
      jobs_processed: processedJobs
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Email processing failed:', error);
    return new Response(JSON.stringify({ error: 'Email processing failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Get email processing logs.
 */
export async function handleEmailLogsGet(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const result = await env.DB.prepare(`
      SELECT * FROM email_logs 
      ORDER BY received_at DESC 
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    return new Response(JSON.stringify({
      logs: result.results,
      pagination: {
        limit,
        offset,
        total: result.results.length
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to fetch email logs:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch email logs' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Get email configuration settings.
 */
export async function handleEmailConfigsGet(request: Request, env: any): Promise<Response> {
  try {
    const result = await env.DB.prepare(`
      SELECT * FROM email_configs ORDER BY created_at DESC
    `).all();

    return new Response(JSON.stringify({ configs: result.results }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to fetch email configs:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch email configs' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Update email configuration settings.
 */
export async function handleEmailConfigsPut(request: Request, env: any): Promise<Response> {
  try {
    const config: Partial<EmailConfig> = await request.json() as Partial<EmailConfig>;
    
    if (!config.id) {
      return new Response(JSON.stringify({ error: 'Config ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const updateFields: string[] = [];
    const values: any[] = [];

    if (config.enabled !== undefined) {
      updateFields.push('enabled = ?');
      values.push(config.enabled);
    }
    if (config.frequency_hours !== undefined) {
      updateFields.push('frequency_hours = ?');
      values.push(config.frequency_hours);
    }
    if (config.recipient_email !== undefined) {
      updateFields.push('recipient_email = ?');
      values.push(config.recipient_email);
    }
    if (config.include_new_jobs !== undefined) {
      updateFields.push('include_new_jobs = ?');
      values.push(config.include_new_jobs);
    }
    if (config.include_job_changes !== undefined) {
      updateFields.push('include_job_changes = ?');
      values.push(config.include_job_changes);
    }
    if (config.include_statistics !== undefined) {
      updateFields.push('include_statistics = ?');
      values.push(config.include_statistics);
    }

    if (updateFields.length === 0) {
      return new Response(JSON.stringify({ error: 'No fields to update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(config.id);

    await env.DB.prepare(`
      UPDATE email_configs 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).bind(...values).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to update email config:', error);
    return new Response(JSON.stringify({ error: 'Failed to update email config' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Send email insights report manually.
 */
export async function handleEmailInsightsSend(request: Request, env: any): Promise<Response> {
  try {
    const { config_id } = await request.json() as { config_id?: string };
    
    // Get email configuration
    const configResult = await env.DB.prepare(`
      SELECT * FROM email_configs WHERE id = ? AND enabled = 1
    `).bind(config_id || 'default').first();

    if (!configResult) {
      return new Response(JSON.stringify({ error: 'Email config not found or disabled' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const config = configResult as EmailConfig;
    const insights = await generateEmailInsights(env, config);
    
    // Send the email
    const emailSent = await sendInsightsEmail(insights, config, env);
    
    if (emailSent) {
      // Update last sent timestamp
      await env.DB.prepare(`
        UPDATE email_configs SET last_sent_at = CURRENT_TIMESTAMP WHERE id = ?
      `).bind(config.id).run();

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Email insights sent successfully'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Failed to send email insights:', error);
    return new Response(JSON.stringify({ error: 'Failed to send email insights' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Generate email insights data.
 */
async function generateEmailInsights(env: any, config: EmailConfig): Promise<EmailInsights> {
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

  // Get role statistics (extract role from title)
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
 * Send insights email using SMTP or email service.
 */
async function sendInsightsEmail(insights: EmailInsights, config: EmailConfig, env: any): Promise<boolean> {
  try {
    const htmlContent = formatInsightsEmail(insights, config.frequency_hours);
    const subject = `9to5-Scout Job Insights - ${insights.statistics.newJobsLastPeriod} new jobs`;

    // For now, log the email content (in production, you'd use an email service)
    console.log('Email would be sent to:', config.recipient_email);
    console.log('Subject:', subject);
    console.log('Content length:', htmlContent.length);

    // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
    // For now, we'll store the email in KV as a demo
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