/**
 * Email route handlers for job alert processing and insights reporting.
 */

import {
  parseEmailFromRequest,
  extractJobInfo,
  formatInsightsEmail,
  generateEmailInsights,
  sendInsightsEmail,
  getPlainTextContent,
  buildOutlookHtml,
  buildR2Url,
  renderEmailPdf,
  extractEmailAddress,
} from '../lib/email';
import type { Job, EmailLog, EmailConfig, EmailInsights } from '../lib/types';
import { crawlJob } from '../lib/crawl';
import { saveJob } from '../lib/storage';

/**
 * Handle incoming email from Cloudflare Email Routing.
 * Extracts job posting links and processes them through the normal workflow.
 */
export async function handleEmailReceived(request: Request, env: any): Promise<Response> {
  try {
    console.log('Processing incoming email...');

    const rawBuffer = await request.clone().arrayBuffer();

    // Parse the email content
    const email = await parseEmailFromRequest(request);
    if (!email) {
      return new Response('Failed to parse email', { status: 400 });
    }

    console.log(`Email received from: ${email.from}, subject: ${email.subject}`);

    if (!email.raw && rawBuffer.byteLength > 0) {
      email.raw = new TextDecoder().decode(rawBuffer);
    }

    const plainText = getPlainTextContent(email);
    const jobInfo = await extractJobInfo(env, email.html || email.text || plainText);

    console.log(`Extracted ${jobInfo.length} job links from email`);

    const emailLogId = crypto.randomUUID();
    const baseKey = `emails/${emailLogId}`;
    const emlKey = `${baseKey}/original.eml`;
    const htmlKey = `${baseKey}/render.html`;
    const pdfKey = `${baseKey}/render.pdf`;

    try {
      const emlPayload = rawBuffer.byteLength > 0
        ? rawBuffer
        : new TextEncoder().encode(email.raw || plainText);
      await env.R2.put(emlKey, emlPayload, {
        httpMetadata: { contentType: 'message/rfc822' },
      });
    } catch (storageError) {
      console.error('Failed to store raw email in R2:', storageError);
    }

    let renderedHtml = '';
    try {
      renderedHtml = buildOutlookHtml(email, plainText);
      await env.R2.put(htmlKey, renderedHtml, {
        httpMetadata: { contentType: 'text/html; charset=utf-8' },
      });
    } catch (htmlError) {
      console.error('Failed to store HTML email view:', htmlError);
    }

    let pdfStored = false;
    try {
      if (!renderedHtml) {
        renderedHtml = buildOutlookHtml(email, plainText);
      }
      const pdfBuffer = await renderEmailPdf(env, renderedHtml);
      if (pdfBuffer) {
        await env.R2.put(pdfKey, pdfBuffer, {
          httpMetadata: { contentType: 'application/pdf' },
        });
        pdfStored = true;
      }
    } catch (pdfError) {
      console.error('Failed to generate PDF for email:', pdfError);
    }

    const fromEmail = extractEmailAddress(email.from) || email.from;
    const contentPreview = plainText.slice(0, 500);

    await env.DB.prepare(`
      INSERT INTO email_logs (
        id, from_email, subject, content_preview, email_content,
        job_links_extracted, jobs_processed, status,
        r2_eml_key, r2_eml_url, r2_html_key, r2_html_url, r2_pdf_key, r2_pdf_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'processing', ?, ?, ?, ?, ?, ?)
    `).bind(
      emailLogId,
      fromEmail,
      email.subject,
      contentPreview,
      plainText,
      jobInfo.length,
      0,
      emlKey,
      buildR2Url(env, emlKey),
      htmlKey,
      buildR2Url(env, htmlKey),
      pdfStored ? pdfKey : null,
      pdfStored ? buildR2Url(env, pdfKey) : null,
    ).run();

    let processedJobs = 0;

    // Process each job URL
    for (const job of jobInfo) {
      try {
        console.log(`Processing job URL: ${job.url}`);
        
        // Pass job title and company to the crawler for the fallback mechanism
        const jobData = await crawlJob(env, job.url, undefined, job.title, job.company);
        
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
      jobs_processed: processedJobs,
      r2_assets: {
        eml: buildR2Url(env, emlKey),
        html: buildR2Url(env, htmlKey),
        pdf: pdfStored ? buildR2Url(env, pdfKey) : null,
      }
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