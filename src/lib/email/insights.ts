/**
 * Email insights and reporting functionality
 */

import { EmailMessage as CloudflareEmailMessage } from "cloudflare:email";
import { EmailConfig, EmailInsights } from "./types";

/**
 * Generate email insights data for a specific configuration.
 * Aggregates new jobs, job changes, and statistics for email reporting.
 */
export async function generateEmailInsights(
  env: any,
  config: EmailConfig
): Promise<EmailInsights> {
  const hours = config.frequency_hours;
  const cutoffTime = new Date(
    Date.now() - hours * 60 * 60 * 1000
  ).toISOString();

  // Get new jobs
  const newJobs = config.include_new_jobs
    ? await env.DB.prepare(
        `
    SELECT title, company, location, url, first_seen_at as posted_at
    FROM jobs 
    WHERE first_seen_at >= ? AND status = 'open'
    ORDER BY first_seen_at DESC
    LIMIT 50
  `
      )
        .bind(cutoffTime)
        .all()
    : { results: [] };

  // Get job changes
  const jobChanges = config.include_job_changes
    ? await env.DB.prepare(
        `
    SELECT j.title, j.company, j.url, c.semantic_summary as change_summary
    FROM changes c
    JOIN jobs j ON c.job_id = j.id
    WHERE c.changed_at >= ?
    ORDER BY c.changed_at DESC
    LIMIT 20
  `
      )
        .bind(cutoffTime)
        .all()
    : { results: [] };

  // Get statistics
  const totalJobsResult = await env.DB.prepare(
    `
    SELECT COUNT(*) as count FROM jobs WHERE status = 'open'
  `
  ).first();

  const newJobsCountResult = await env.DB.prepare(
    `
    SELECT COUNT(*) as count FROM jobs 
    WHERE first_seen_at >= ? AND status = 'open'
  `
  )
    .bind(cutoffTime)
    .first();

  // Get role statistics
  const roleStatsResult = config.include_statistics
    ? await env.DB.prepare(
        `
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
  `
      ).all()
    : { results: [] };

  return {
    newJobs: newJobs.results || [],
    jobChanges: jobChanges.results || [],
    statistics: {
      totalJobs: totalJobsResult?.count || 0,
      newJobsLastPeriod: newJobsCountResult?.count || 0,
      roleStats: roleStatsResult.results || [],
    },
  };
}

/**
 * Send insights email using email service.
 */
export async function sendInsightsEmail(
  insights: EmailInsights,
  config: EmailConfig,
  env: any
): Promise<boolean> {
  try {
    const htmlContent = formatInsightsEmail(insights, config.frequency_hours);
    const subject = `9to5-Scout Job Insights - ${insights.statistics.newJobsLastPeriod} new jobs`;

    if (!env.EMAIL_SENDER) {
      console.error("EMAIL_SENDER binding not configured. Cannot send email.");
      // Fallback to KV for demo/testing purposes if sender is not available
      const emailId = crypto.randomUUID();
      await env.KV.put(
        `email:${emailId}`,
        JSON.stringify({
          to: config.recipient_email,
          subject,
          html: htmlContent,
          sent_at: new Date().toISOString(),
        })
      );
      return true;
    }

    // Construct the email message
    const message = new CloudflareEmailMessage(
      `digest@${env.EMAIL_ROUTING_DOMAIN}`, // From
      config.recipient_email, // To
      `Subject: ${subject}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${htmlContent}` // Raw content
    );

    // Send the email
    await env.EMAIL_SENDER.send(message);

    console.log(
      `Email insights sent successfully to ${config.recipient_email}`
    );
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

/**
 * Format email insights into HTML email content.
 */
export function formatInsightsEmail(
  insights: EmailInsights,
  periodHours: number
): string {
  const period = periodHours === 24 ? "daily" : `${periodHours}-hour`;

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

    ${
      insights.newJobs.length > 0
        ? `
    <div class="section">
        <h2>New Job Openings (${insights.newJobs.length})</h2>
        ${insights.newJobs
          .map(
            (job) => `
        <div class="job-item">
            <strong><a href="${job.url}">${job.title}</a></strong><br>
            <em>${job.company}${
              job.location ? ` • ${job.location}` : ""
            }</em><br>
            <small>Posted: ${new Date(
              job.posted_at
            ).toLocaleDateString()}</small>
        </div>
        `
          )
          .join("")}
    </div>
    `
        : ""
    }

    ${
      insights.jobChanges.length > 0
        ? `
    <div class="section">
        <h2>Job Updates (${insights.jobChanges.length})</h2>
        ${insights.jobChanges
          .map(
            (change) => `
        <div class="job-item">
            <strong><a href="${change.url}">${change.title}</a></strong><br>
            <em>${change.company}</em><br>
            <p>${change.change_summary}</p>
        </div>
        `
          )
          .join("")}
    </div>
    `
        : ""
    }

    <div class="section">
        <h2>Market Statistics</h2>
        <p><strong>Total Active Jobs:</strong> ${
          insights.statistics.totalJobs
        }</p>
        <p><strong>New Jobs in Last ${periodHours}h:</strong> ${
    insights.statistics.newJobsLastPeriod
  }</p>
        
        ${
          insights.statistics.roleStats.length > 0
            ? `
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
                ${insights.statistics.roleStats
                  .map(
                    (stat) => `
                <tr>
                    <td>${stat.role}</td>
                    <td>${stat.count}</td>
                    <td>${
                      stat.avgMinSalary
                        ? `$${stat.avgMinSalary.toLocaleString()}`
                        : "N/A"
                    }</td>
                    <td>${
                      stat.avgMaxSalary
                        ? `$${stat.avgMaxSalary.toLocaleString()}`
                        : "N/A"
                    }</td>
                </tr>
                `
                  )
                  .join("")}
            </tbody>
        </table>
        `
            : ""
        }
    </div>

    <div class="footer">
        <p>Powered by 9to5-Scout AI Job Discovery Platform</p>
        <p>This is an automated report. Reply to this email to provide feedback.</p>
    </div>
</body>
</html>
  `.trim();
}
