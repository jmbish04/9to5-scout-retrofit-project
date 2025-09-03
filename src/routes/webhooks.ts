/**
 * Webhook notifications for job scraping events.
 */

export async function handleWebhookTest(request: Request, env: any): Promise<Response> {
  try {
    const { message } = await request.json() as { message?: string };
    
    if (!env.SLACK_WEBHOOK_URL) {
      return new Response(JSON.stringify({ error: 'Slack webhook URL not configured' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const testMessage = {
      text: message || 'Test notification from 9to5-scout job scraper',
      username: '9to5-scout',
      icon_emoji: ':briefcase:',
    };

    const response = await fetch(env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testMessage),
    });

    if (response.ok) {
      return new Response(JSON.stringify({ success: true, message: 'Test notification sent' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ error: 'Failed to send notification', status: response.status }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error sending webhook test:', error);
    return new Response(JSON.stringify({ error: 'Failed to send test notification' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Send a notification when new jobs are discovered.
 */
export async function notifyNewJobs(env: any, jobs: any[], siteName: string): Promise<void> {
  if (!env.SLACK_WEBHOOK_URL || jobs.length === 0) {
    return;
  }

  try {
    const jobSummary = jobs.slice(0, 3).map(job => 
      `• *${job.title}* at ${job.company} ${job.location ? `(${job.location})` : ''}`
    ).join('\n');

    const moreText = jobs.length > 3 ? `\n...and ${jobs.length - 3} more jobs` : '';

    const message = {
      text: `:briefcase: *${jobs.length} new job${jobs.length > 1 ? 's' : ''} found on ${siteName}*\n\n${jobSummary}${moreText}`,
      username: '9to5-scout',
      icon_emoji: ':briefcase:',
    };

    await fetch(env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error('Error sending job notification:', error);
  }
}

/**
 * Send a notification when a job status changes.
 */
export async function notifyJobStatusChange(env: any, job: any, oldStatus: string, newStatus: string): Promise<void> {
  if (!env.SLACK_WEBHOOK_URL) {
    return;
  }

  try {
    const emoji = newStatus === 'closed' ? ':x:' : ':warning:';
    const message = {
      text: `${emoji} *Job Status Change*\n\n*${job.title}* at ${job.company}\nStatus: ${oldStatus} → ${newStatus}`,
      username: '9to5-scout',
      icon_emoji: ':briefcase:',
    };

    await fetch(env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error('Error sending status change notification:', error);
  }
}