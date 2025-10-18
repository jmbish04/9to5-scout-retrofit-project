/**
 * Email templates using HTML templates from public/templates
 */

import type { Env } from "../../config/env";
import {
  loadAndProcessTemplate,
  TEMPLATE_TYPES,
  type TemplateVariables,
} from "./template-loader";

export interface JobInsightsData {
  date: string;
  new_jobs_count: number;
  total_jobs_count: number;
  new_jobs_7d: number;
  email_jobs: number;
  scraped_jobs: number;
  top_companies: string;
  top_locations: string;
}

export interface OTPAlertData {
  service_name: string;
  otp_code: string;
  timestamp: string;
  original_subject: string;
}

export interface EmailTemplateData {
  current_date: string;
  last_scrape_run: string;
  new_roles_count: number;
  recommended_roles_count: number;
  updated_roles_count: number;
  closed_roles_count: number;
  description_new_open_roles: string;
  description_roles_you_may_have_missed: string;
  description_changes_on_tracked_roles: string;
  description_recently_closed_roles: string;
  new_roles_html: string;
  recommended_roles_html: string;
  updated_roles_html: string;
  closed_roles_html: string;
  stats_by_role_html: string;
  unsubscribe_link: string;
}

export interface JobInsightsTemplateData {
  R2_LOGO_URL: string;
  user_name: string;
  cream_of_crop_job_exists: boolean;
  job_title?: string;
  company_name?: string;
  location?: string;
  salary_range?: string;
  fit_score?: number;
  job_link?: string;
  monitored_job_alerts_exists: boolean;
  new_job_trends_exists: boolean;
  compensation_trends_exists: boolean;
  interview_reminders_exists: boolean;
  market_trends_link: string;
  compensation_trends_link: string;
  interview_prep_link: string;
}

export interface AnnouncementTemplateData {
  R2_LOGO_URL: string;
  user_name: string;
  announcement_title: string;
  announcement_summary: string;
  announcement_body_1: string;
  announcement_body_2?: string;
  call_to_action_text: string;
  call_to_action_link: string;
}

/**
 * Generate job insights HTML email template using the template system
 */
export async function generateJobInsightsHTML(
  data: JobInsightsData,
  env: Env
): Promise<string> {
  const templateData: TemplateVariables = {
    current_date: data.date,
    last_scrape_run: new Date().toISOString(),
    new_roles_count: data.new_jobs_count,
    recommended_roles_count: data.new_jobs_7d,
    updated_roles_count: 0, // This would come from change tracking
    closed_roles_count: 0, // This would come from change tracking
    description_new_open_roles: `Found ${data.new_jobs_count} new job opportunities today`,
    description_roles_you_may_have_missed: `Here are ${data.new_jobs_7d} roles from the past week you might find interesting`,
    description_changes_on_tracked_roles: "Updates on jobs you're monitoring",
    description_recently_closed_roles: "Jobs that have been closed recently",
    new_roles_html: generateJobListHTML(data.new_jobs_count, "new"),
    recommended_roles_html: generateJobListHTML(
      data.new_jobs_7d,
      "recommended"
    ),
    updated_roles_html: "<p>No role updates today</p>",
    closed_roles_html: "<p>No roles closed recently</p>",
    stats_by_role_html: await generateStatsHTML(data, env),
    unsubscribe_link: `${env.WORKER_URL}/unsubscribe`,
    WORKER_URL: env.WORKER_URL,
  };

  return await loadAndProcessTemplate(TEMPLATE_TYPES.EMAIL, templateData, env);
}

/**
 * Generate job insights using the job insights template
 */
export async function generateJobInsightsTemplate(
  data: JobInsightsTemplateData,
  env: Env
): Promise<string> {
  const templateData: TemplateVariables = {
    R2_LOGO_URL: data.R2_LOGO_URL,
    user_name: data.user_name,
    // Conditional sections - we'll handle these in the template
    cream_of_crop_job_exists: data.cream_of_crop_job_exists,
    job_title: data.job_title || "",
    company_name: data.company_name || "",
    location: data.location || "",
    salary_range: data.salary_range || "",
    fit_score: data.fit_score || 0,
    job_link: data.job_link || "",
    monitored_job_alerts_exists: data.monitored_job_alerts_exists,
    new_job_trends_exists: data.new_job_trends_exists,
    compensation_trends_exists: data.compensation_trends_exists,
    interview_reminders_exists: data.interview_reminders_exists,
    market_trends_link: data.market_trends_link,
    compensation_trends_link: data.compensation_trends_link,
    interview_prep_link: data.interview_prep_link,
    WORKER_URL: env.WORKER_URL,
  };

  return await loadAndProcessTemplate(
    TEMPLATE_TYPES.JOB_INSIGHTS,
    templateData,
    env
  );
}

/**
 * Generate announcement email using the announcement template
 */
export async function generateAnnouncementTemplate(
  data: AnnouncementTemplateData,
  env: Env
): Promise<string> {
  const templateData: TemplateVariables = {
    R2_LOGO_URL: data.R2_LOGO_URL,
    user_name: data.user_name,
    announcement_title: data.announcement_title,
    announcement_summary: data.announcement_summary,
    announcement_body_1: data.announcement_body_1,
    announcement_body_2: data.announcement_body_2 || "",
    call_to_action_text: data.call_to_action_text,
    call_to_action_link: data.call_to_action_link,
    WORKER_URL: env.WORKER_URL,
  };

  return await loadAndProcessTemplate(
    TEMPLATE_TYPES.ANNOUNCEMENT,
    templateData,
    env
  );
}

/**
 * Generate OTP alert HTML email template
 */
export async function generateOTPAlertHTML(
  data: OTPAlertData,
  env: Env
): Promise<string> {
  const templateData: TemplateVariables = {
    service_name: data.service_name,
    otp_code: data.otp_code,
    timestamp: data.timestamp,
    original_subject: data.original_subject,
    R2_LOGO_URL: `${env.WORKER_URL}/assets/logo.png`, // This should come from env
    user_name: "User", // This should come from user data
    WORKER_URL: env.WORKER_URL,
  };

  return await loadAndProcessTemplate(
    TEMPLATE_TYPES.OTP_ALERT,
    templateData,
    env
  );
}

/**
 * Generate welcome HTML email template
 */
export async function generateWelcomeHTML(
  userName: string,
  env: Env
): Promise<string> {
  const templateData: TemplateVariables = {
    user_name: userName,
    R2_LOGO_URL: `${env.WORKER_URL}/assets/logo.png`, // This should come from env
    current_date: new Date().toLocaleDateString(),
    WORKER_URL: env.WORKER_URL,
  };

  return await loadAndProcessTemplate(
    TEMPLATE_TYPES.WELCOME,
    templateData,
    env
  );
}

/**
 * Generate a simple job list HTML for template injection
 */
function generateJobListHTML(count: number, type: string): string {
  if (count === 0) {
    return `<p style="color: #6b7280; font-style: italic;">No ${type} jobs found today.</p>`;
  }

  return `<p style="color: #1f2937;">Found ${count} ${type} job${
    count > 1 ? "s" : ""
  } today. Check your dashboard for details.</p>`;
}

/**
 * Generate stats HTML for template injection
 */
async function generateStatsHTML(
  data: JobInsightsData,
  env: Env
): Promise<string> {
  const templateData: TemplateVariables = {
    new_jobs_count: data.new_jobs_count,
    total_jobs_count: data.total_jobs_count,
    top_companies: data.top_companies,
    top_locations: data.top_locations,
  };

  // This assumes you've added JOB_STATS to TEMPLATE_TYPES
  // and created the corresponding job_stats_template.html file.
  // If not, you'll need to do that.
  // For now, let's assume it exists.
  // NOTE: You need to add JOB_STATS: "job_stats_template.html" to TEMPLATE_TYPES in template-loader.ts
  // I will add this in the next step.
  return await loadAndProcessTemplate(
    TEMPLATE_TYPES.JOB_STATS,
    templateData,
    env
  );
}

/**
 * Send HTML email using Cloudflare Email
 */
export async function sendHTMLEmail(
  to: string,
  subject: string,
  htmlContent: string,
  env: Env
): Promise<void> {
  if (!env.EMAIL_SENDER) {
    throw new Error("EMAIL_SENDER binding not configured");
  }

  await env.EMAIL_SENDER.send({
    to: [to],
    subject: subject,
    html: htmlContent,
  });
}

/**
 * Generate HTML email preview
 */
export async function generateEmailHTMLPreview(
  htmlContent: string,
  env: Env
): Promise<string> {
  return await loadAndProcessTemplate(
    TEMPLATE_TYPES.EMAIL_PREVIEW,
    { htmlContent, WORKER_URL: env.WORKER_URL },
    env
  );
}
