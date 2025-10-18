/**
 * Email utility functions
 */

import { EmailMessage as CloudflareEmailMessage } from "cloudflare:email";
import { assertBrowserRenderingToken } from "../auth";
import type { Env } from "../env";
import { EmailMessage, EnhancedEmailMessage } from "./types";

const DEFAULT_R2_BASE_URL =
  "https://pub-ec5964c07cf044798c801b9a2c72f86b.r2.dev/";

function sanitizeHtml(input: string): string {
  if (!input) {
    return "";
  }

  return input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/ on[a-z]+="[^"]*"/gi, "")
    .replace(/ on[a-z]+='[^']*'/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/data:text\/html/gi, "data:text/plain");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function extractEmailAddress(value: string): string {
  if (!value) {
    return "";
  }
  const match = value.match(/<([^>]+)>/);
  if (match && match[1]) {
    return match[1].trim().toLowerCase();
  }
  return value.trim().toLowerCase();
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>(?=\s*<br\s*\/?>(?:\s*<br\s*\/?>)*)/gi, "\n")
    .replace(/<br\s*\/?>(?!\n)/gi, "\n")
    .replace(/<\/(p|div|h\d|li)>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+$/g, "")
    .trim();
}

export function getPlainTextContent(email: EmailMessage): string {
  if (email.text && email.text.trim()) {
    return email.text.trim();
  }
  if (email.html) {
    return htmlToPlainText(email.html);
  }
  return "";
}

export function buildOutlookHtml(
  email: EmailMessage,
  plainText: string
): string {
  const subject = escapeHtml(email.subject || "(no subject)");
  const from = escapeHtml(email.from || "");
  const to = escapeHtml(email.to?.join(", ") || "");
  const bodyHtml = email.html
    ? sanitizeHtml(email.html)
    : escapeHtml(plainText).replace(/\n/g, "<br />");

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
      <dd>${to || "N/A"}</dd>
    </dl>
    <div class="content">
      ${bodyHtml}
    </div>
  </div>
</body>
</html>`;
}

export function buildR2Url(
  env: { BUCKET_BASE_URL?: string },
  key?: string | null
): string | null {
  if (!key) {
    return null;
  }

  const baseUrl = (env.BUCKET_BASE_URL || DEFAULT_R2_BASE_URL).trim();
  if (!baseUrl) {
    console.warn(
      "BUCKET_BASE_URL is not configured; unable to construct R2 URL."
    );
    return null;
  }

  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${normalizedBase}${key}`;
}

export async function forwardEmail(
  env: any,
  email: EmailMessage,
  plainText: string
): Promise<void> {
  try {
    const forwardAddress =
      env.FORWARD_EMAIL_ADDRESS ||
      env.NOTIFICATION_EMAIL_ADDRESS ||
      "justin@126colby.com";

    if (!forwardAddress) {
      return;
    }

    const fromDomain =
      env.EMAIL_ROUTING_DOMAIN || "notifications.9to5scout.dev";
    const fromAddress = `forwarder@${fromDomain}`;
    const raw = [
      `Subject: Fwd: ${email.subject || "(no subject)"}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      plainText || "(no body content)",
    ].join("\r\n");

    if (env.EMAIL_SENDER?.send) {
      const message = new CloudflareEmailMessage(
        fromAddress,
        forwardAddress,
        raw
      );
      await env.EMAIL_SENDER.send(message);
    } else if (env.KV?.put) {
      await env.KV.put(
        `email-forward:${crypto.randomUUID()}`,
        JSON.stringify({
          to: forwardAddress,
          from: fromAddress,
          subject: email.subject,
          body: plainText,
          stored_at: new Date().toISOString(),
        })
      );
    }
  } catch (error) {
    console.error("Failed to forward email copy:", error);
  }
}

export async function renderEmailPdf(
  env: any,
  html: string
): Promise<ArrayBuffer | null> {
  try {
    const browserToken = assertBrowserRenderingToken(env);
    const browser = env.MYBROWSER || env.BROWSER;
    if (!browser) {
      throw new Error("Browser binding is not configured.");
    }

    const response = await browser.fetch(
      "https://browser.render.cloudflare.com",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${browserToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ html, pdf: true, waitFor: 0 }),
      }
    );

    if (!response.ok) {
      console.error("Browser rendering for email PDF failed:", response.status);
      return null;
    }

    const result = await response.json();
    if (!result?.pdf) {
      return null;
    }

    const pdfArray = new Uint8Array(result.pdf);
    return pdfArray.buffer;
  } catch (error) {
    console.error("Failed to render email PDF:", error);
    return null;
  }
}

/**
 * Generate embeddings for email content using Cloudflare AI
 */
export async function generateEmailEmbeddings(
  env: Env,
  emailUuid: string,
  content: string
): Promise<string> {
  try {
    const embeddingsId = generateUUID();

    // Generate embedding for the content using environment variable
    const embedding = await env.AI.run(env.EMBEDDING_MODEL, {
      text: content,
    });

    // Extract embedding data - handle different response formats
    let embeddingVector: number[];
    const embeddingResponse = embedding as { data?: number[][] };

    if (embeddingResponse?.data && Array.isArray(embeddingResponse.data[0])) {
      // Response is an array of vectors, take the first one
      embeddingVector = embeddingResponse.data[0];
    } else if (
      embeddingResponse?.data &&
      Array.isArray(embeddingResponse.data)
    ) {
      // Response is a single vector in the data property - flatten if needed
      embeddingVector = embeddingResponse.data.flat();
    } else if (Array.isArray(embedding)) {
      // Response is the vector itself
      embeddingVector = embedding as number[];
    } else {
      // Fallback for unexpected formats, e.g., a single number
      embeddingVector = [embedding as number];
    }

    // Save embedding to database
    await env.DB.prepare(
      `
      INSERT INTO email_embeddings (email_uuid, content_type, content, embedding)
      VALUES (?, ?, ?, ?)
    `
    )
      .bind(emailUuid, "full", content, JSON.stringify(embeddingVector))
      .run();

    return embeddingsId;
  } catch (error) {
    console.error("Failed to generate email embeddings:", error);
    throw error;
  }
}

/**
 * Save email to enhanced email logs table
 */
export async function saveEnhancedEmail(
  env: Env,
  email: EnhancedEmailMessage
): Promise<number> {
  try {
    const result = await env.DB.prepare(
      `
      INSERT INTO email_logs (
        uuid, from_email, to_email, subject, message_id, date_received,
        content_text, content_html, content_preview, headers, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        email.uuid || generateUUID(),
        email.from || "unknown@example.com",
        email.to || "unknown@example.com",
        email.subject || "No Subject",
        email.messageId || `msg-${Date.now()}`,
        email.dateReceived || new Date().toISOString(),
        email.contentText || null,
        email.contentHtml || null,
        email.contentPreview || null,
        JSON.stringify(email.headers || {}),
        email.status || "pending"
      )
      .run();

    return result.meta.last_row_id as number;
  } catch (error) {
    console.error("Failed to save enhanced email:", error);
    throw error;
  }
}

// Helper function
function generateUUID(): string {
  return crypto.randomUUID();
}
