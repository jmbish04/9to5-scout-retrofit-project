/**
 * Email management API endpoints
 * Handles email configuration, logs, and insights
 */

import type { Env } from "../../domains/config/env/env.config";

/**
 * Get email logs
 * GET /api/email/logs
 */
export async function handleEmailLogsGet(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const result = await env.DB.prepare(
      `
      SELECT id, uuid, from_email, to_email, subject, ai_category, 
             ai_processing_status, received_at, created_at
      FROM email_logs 
      ORDER BY received_at DESC 
      LIMIT ? OFFSET ?
    `
    )
      .bind(limit, offset)
      .all();

    return new Response(
      JSON.stringify({
        success: true,
        count: result.results?.length || 0,
        results: result.results || [],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Failed to get email logs:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Get email configurations
 * GET /api/email/configs
 */
export async function handleEmailConfigsGet(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const result = await env.DB.prepare(
      `
      SELECT id, name, subject_template, html_template, variables, 
             is_active, created_at, updated_at
      FROM email_templates 
      WHERE is_active = 1
      ORDER BY name
    `
    ).all();

    return new Response(
      JSON.stringify({
        success: true,
        count: result.results?.length || 0,
        results: result.results || [],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Failed to get email configs:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Update email configurations
 * PUT /api/email/configs
 */
export async function handleEmailConfigsPut(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const data = (await request.json()) as {
      id: string;
      name: string;
      subject_template: string;
      html_template: string;
      variables?: Record<string, any>;
      is_active?: boolean;
    };
    const { id, name, subject_template, html_template, variables, is_active } =
      data;

    if (!id || !name || !subject_template || !html_template) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Missing required fields: id, name, subject_template, html_template",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    await env.DB.prepare(
      `
      UPDATE email_templates 
      SET name = ?, subject_template = ?, html_template = ?, 
          variables = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `
    )
      .bind(
        name,
        subject_template,
        html_template,
        variables ? JSON.stringify(variables) : null,
        is_active ? 1 : 0,
        new Date().toISOString(),
        id
      )
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email configuration updated successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Failed to update email configs:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Send email insights
 * POST /api/email/insights/send
 */
export async function handleEmailInsightsSend(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const data = (await request.json()) as {
      email_address: string;
      insights_type?: string;
    };
    const { email_address, insights_type = "daily" } = data;

    if (!email_address) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email address is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Use the existing email insights functionality
    const { generateEmailInsights, sendInsightsEmail } = await import(
      "../../domains/integrations/email/email.service"
    );

    // Create email config based on insights type
    const emailConfig = {
      recipient_email: email_address,
      frequency_hours:
        insights_type === "daily" ? 24 : insights_type === "weekly" ? 168 : 24,
      include_new_jobs: true,
      include_job_changes: true,
      include_statistics: true,
    };

    const insights = await generateEmailInsights(env, emailConfig);
    await sendInsightsEmail(insights, emailConfig, env);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email insights sent successfully",
        insights_type,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Failed to send email insights:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
