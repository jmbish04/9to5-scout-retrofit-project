/**
 * Template loader utility for reading HTML templates from the ASSETS binding.
 * Assumes that templates are located in a `/templates` directory.
 */

import type { Env } from "../env";

export interface TemplateVariables {
  [key: string]: string | number | boolean;
}

/**
 * Loads an HTML template from the /templates directory in the ASSETS binding.
 * @param templateName - The name of the template file (e.g., "email_template.html").
 * @param env - The Cloudflare Worker environment containing the ASSETS binding.
 * @returns A promise that resolves to the text content of the template.
 */
export async function loadTemplate(
  templateName: string,
  env: Env
): Promise<string> {
  try {
    // Construct the path to the template within the static assets.
    const templateUrl = `/templates/${templateName}`;

    // Create a request object to fetch the asset.
    // The URL base is a dummy value as ASSETS.fetch routes by path.
    const request = new Request(`https://example.com${templateUrl}`);
    const response = await env.ASSETS.fetch(request);

    if (!response.ok) {
      throw new Error(
        `Template not found at ${templateUrl}: ${response.status} ${response.statusText}`
      );
    }

    return await response.text();
  } catch (error) {
    console.error(`Failed to load template ${templateName}:`, error);
    // Re-throw a more specific error for the caller to handle.
    throw new Error(`Could not load template: ${templateName}`);
  }
}

/**
 * Replaces template variables with actual values.
 * Variables in the template should be in the format {{key}}.
 * @param template - The HTML template string.
 * @param variables - An object of key/value pairs to replace.
 * @returns The template string with variables replaced.
 */
export function replaceTemplateVariables(
  template: string,
  variables: TemplateVariables
): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    // Use a RegExp with the 'g' flag to replace all occurrences.
    // The curly braces are escaped to ensure they are treated as literal characters.
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    result = result.replace(placeholder, String(value));
  }

  return result;
}

/**
 * Loads and processes a template with variables in a single step.
 * @param templateName - The name of the template file.
 * @param variables - An object of key/value pairs to replace in the template.
 * @param env - The Cloudflare Worker environment.
 * @returns A promise that resolves to the processed HTML string.
 */
export async function loadAndProcessTemplate(
  templateName: string,
  variables: TemplateVariables,
  env: Env
): Promise<string> {
  const template = await loadTemplate(templateName, env);
  return replaceTemplateVariables(template, variables);
}

/**
 * A map of available template types to their filenames.
 * This provides a single source of truth for template names and improves maintainability.
 */
export const TEMPLATE_TYPES = {
  EMAIL: "email_template.html",
  JOB_INSIGHTS: "job_insights_template.html",
  ANNOUNCEMENT: "announcement_template.html",
  COVER_LETTER: "cover_letter_template.html",
  JOB_LIST: "job_list_template.html",
  RESUME: "resume_template.html",
  OTP_ALERT: "otp_alert_template.html",
  WELCOME: "welcome_template.html",
  EMAIL_PREVIEW: "email_preview_template.html",
  JOB_STATS: "job_stats_template.html",
} as const;

/**
 * A type definition that can only be one of the keys of TEMPLATE_TYPES.
 * e.g., 'EMAIL', 'JOB_INSIGHTS', etc.
 */
export type TemplateType = keyof typeof TEMPLATE_TYPES;
