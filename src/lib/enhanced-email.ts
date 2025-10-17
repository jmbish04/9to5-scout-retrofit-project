/**
 * Enhanced email processing system with embeddings, OTP detection, and job scraping
 */

import { EmailMessage as CloudflareEmailMessage } from "cloudflare:email";
import type { Env } from "../index";
import { crawlJob } from "./crawl";
import { generateOTPAlertHTML } from "./email-templates";
import {
  EmailAIExtractionSchema,
  emailAIExtractionJSONSchema,
  type EmailAIExtraction,
} from "./schemas";
import { saveJob } from "./storage";
import type { Job } from "./types";

export interface EnhancedEmailMessage {
  id?: number;
  uuid?: string;
  from: string;
  to: string;
  subject: string;
  messageId: string;
  dateReceived: string;
  contentText?: string;
  contentHtml?: string;
  contentPreview?: string;
  headers: Record<string, string>;
  jobLinksExtracted?: number;
  jobsProcessed?: number;
  embeddingsId?: string;
  otpDetected?: boolean;
  otpCode?: string;
  otpForwardedTo?: string;
  status: "pending" | "processing" | "processed" | "failed";
  receivedAt?: string;
  processedAt?: string;
  ai_classification?: string;
  html_preview_url?: string;
  pdf_preview_url?: string;
}

export interface EmailEmbedding {
  id?: number;
  emailUuid: string;
  contentType: "subject" | "body" | "full";
  content: string;
  embedding: number[];
  createdAt?: string;
}

export interface OTPForwardingLog {
  id?: number;
  emailUuid: string;
  otpCode: string;
  forwardedTo: string;
  forwardedAt?: string;
  status: "sent" | "failed";
}

export interface EmailTemplate {
  id?: number;
  name: string;
  subjectTemplate: string;
  htmlTemplate: string;
  variables?: string[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Parse email from Cloudflare Email Routing request using postal-mime
 */
export async function parseEnhancedEmailFromRequest(
  request: Request
): Promise<EnhancedEmailMessage | null> {
  try {
    console.log("🔍 Starting email parsing...");

    // Import postal-mime dynamically
    const PostalMime = await import("postal-mime");
    const parser = new (PostalMime as any).default();

    // Get the raw email content from multipart form data
    const formData = await request.formData();
    const rawEmailContent = formData.get("raw");

    console.log("📧 Raw email content type:", typeof rawEmailContent);
    console.log(
      "📧 Raw email content length:",
      rawEmailContent ? rawEmailContent.toString().length : 0
    );

    if (!rawEmailContent) {
      console.error("No raw email content found in form data");
      return null;
    }

    // Convert to ArrayBuffer for postal-mime
    const rawEmail =
      typeof rawEmailContent === "string"
        ? new TextEncoder().encode(rawEmailContent).buffer
        : rawEmailContent;

    console.log("🔍 Parsing email with postal-mime...");
    const email = await parser.parse(rawEmail);
    console.log("📧 Parsed email object:", JSON.stringify(email, null, 2));

    // Extract headers
    const headers: Record<string, string> = {};
    if (email.headers) {
      for (const header of email.headers) {
        headers[header.key.toLowerCase()] = header.value;
      }
    }

    // Generate UUID for the email
    const uuid = generateUUID();

    // Extract plain text content (prefer text over html for content_text)
    const contentText = email.text || "";
    const contentHtml = email.html || "";

    // Create content preview from plain text (first 200 chars of actual body content)
    const contentPreview =
      contentText.slice(0, 200) ||
      (contentHtml ? contentHtml.replace(/<[^>]*>/g, "").slice(0, 200) : "");

    return {
      uuid,
      from: email.from?.address || "unknown@example.com",
      to: email.to?.[0]?.address || "unknown@example.com",
      subject: email.subject || "No Subject",
      messageId: email.messageId || `msg-${Date.now()}`,
      dateReceived: email.date || new Date().toISOString(),
      contentText: contentText, // Store only plain text body content
      contentHtml: contentHtml,
      contentPreview: contentPreview,
      headers,
      status: "pending",
    };
  } catch (error) {
    console.error("Failed to parse email:", error);
    return null;
  }
}

/**
 * Generate a UUID v4 using Web Crypto API
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Helper function to mark a job link as failed
 */
async function markJobLinkAsFailed(
  env: Env,
  linkId: number | undefined
): Promise<void> {
  if (!linkId) return;

  try {
    await env.DB.prepare(
      `UPDATE email_job_links 
       SET status = 'failed', 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`
    )
      .bind(linkId)
      .run();
  } catch (error) {
    console.error("Failed to mark job link as failed:", error);
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
      INSERT INTO enhanced_email_logs (
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
    } else if (embeddingResponse?.data && Array.isArray(embeddingResponse.data)) {
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
 * Extract job URLs from email content with enhanced patterns
 */
export function extractJobUrlsEnhanced(content: string): string[] {
  const urls: string[] = [];

  // Enhanced job site URL patterns
  const jobSitePatterns = [
    // LinkedIn Jobs
    /https?:\/\/(?:www\.)?linkedin\.com\/jobs\/view\/\d+/gi,
    /https?:\/\/(?:www\.)?linkedin\.com\/jobs\/collections\/recommended\/\?currentJobId=\d+/gi,

    // Indeed
    /https?:\/\/(?:www\.)?indeed\.com\/viewjob\?jk=[\w-]+/gi,
    /https?:\/\/(?:www\.)?indeed\.com\/jobs\/[^?\s]+/gi,

    // Glassdoor
    /https?:\/\/(?:www\.)?glassdoor\.com\/job-listing\/[^?\s]+/gi,
    /https?:\/\/(?:www\.)?glassdoor\.com\/Jobs\/[^?\s]+/gi,

    // Monster
    /https?:\/\/(?:www\.)?monster\.com\/job-openings\/[^?\s]+/gi,
    /https?:\/\/(?:www\.)?monster\.com\/jobs\/[^?\s]+/gi,

    // ZipRecruiter
    /https?:\/\/(?:www\.)?ziprecruiter\.com\/jobs\/[^?\s]+/gi,
    /https?:\/\/(?:www\.)?ziprecruiter\.com\/c\/[^?\s]+/gi,

    // CareerBuilder
    /https?:\/\/(?:www\.)?careerbuilder\.com\/job\/[^?\s]+/gi,
    /https?:\/\/(?:www\.)?careerbuilder\.com\/jobs\/[^?\s]+/gi,

    // Google Jobs (redirects)
    /https?:\/\/(?:www\.)?google\.com\/search\?[^&]*&q=.*job/gi,

    // Company career pages (common patterns)
    /https?:\/\/[^\/]+\/careers\/[^?\s]+/gi,
    /https?:\/\/[^\/]+\/jobs\/[^?\s]+/gi,
    /https?:\/\/[^\/]+\/career\/[^?\s]+/gi,

    // AngelList/Wellfound
    /https?:\/\/(?:angel\.co|wellfound\.com)\/[^\/]+\/jobs\/\d+/gi,

    // Remote job sites
    /https?:\/\/(?:www\.)?remote\.co\/[^?\s]+/gi,
    /https?:\/\/(?:www\.)?flexjobs\.com\/[^?\s]+/gi,
    /https?:\/\/(?:www\.)?weworkremotely\.com\/[^?\s]+/gi,

    // Stack Overflow Jobs
    /https?:\/\/(?:www\.)?stackoverflow\.com\/jobs\/\d+\/[^?\s]+/gi,

    // Dice
    /https?:\/\/(?:www\.)?dice\.com\/jobs\/detail\/[^?\s]+/gi,

    // Generic job URL patterns
    /https?:\/\/[^\/]+\/(?:job|jobs|career|careers|position|positions)\/[^?\s]+/gi,
  ];

  for (const pattern of jobSitePatterns) {
    const matches = content.match(pattern);
    if (matches) {
      urls.push(...matches);
    }
  }

  // Remove duplicates and clean URLs
  return [...new Set(urls)].map((url) => {
    // Remove common tracking parameters
    return url.replace(
      /[?&](utm_[^&]*|ref=[^&]*|source=[^&]*|medium=[^&]*|campaign=[^&]*)/gi,
      ""
    );
  });
}

/**
 * Detect OTP codes in email content
 */
export function detectOTPCode(content: string): {
  detected: boolean;
  code?: string;
  service?: string;
} {
  console.log("🔍 OTP Detection - Content:", content);

  // Common OTP patterns - consolidated and optimized
  const otpKeywords = ["verification\\s+code", "code", "otp", "pin"];
  const otpPatterns = [
    // Pattern: "keyword is: 123456" or "keyword: 123456"
    new RegExp(
      `(?:${otpKeywords.join("|")})(?:\\s+is)?\\s*:?\\s*([A-Z0-9]{4,8})`,
      "i"
    ),
    // Pattern: "123456 is your code" or "123456 code"
    new RegExp(
      `([A-Z0-9]{4,8})[\\s]*(?:is your|is the|${otpKeywords.join("|")})`,
      "i"
    ),
    // Additional common patterns
    /(?:authentication|security|access)\s+code\s*:?\s*([A-Z0-9]{4,8})/i,
    /your\s+(?:verification|security|access|authentication)\s+code\s*:?\s*([A-Z0-9]{4,8})/i,
  ];

  for (let i = 0; i < otpPatterns.length; i++) {
    const pattern = otpPatterns[i];
    if (!pattern) continue;
    console.log(`🔍 Testing pattern ${i + 1}:`, pattern);
    const match = content.match(pattern);
    console.log(`🔍 Pattern ${i + 1} match:`, match);

    if (match && match[1]) {
      const code = match[1];
      console.log(`🔍 OTP Code found: ${code}`);

      // Try to detect service from content with more specific pattern
      const serviceMatch = content.match(
        /(?:from|for|with)\s+([A-Z][a-zA-Z0-9\s-]{2,20})/i
      );
      const service = serviceMatch
        ? serviceMatch[1]?.trim()
        : "Unknown Service";

      console.log(
        `🔍 OTP Detection result: detected=true, code=${code}, service=${service}`
      );
      return { detected: true, code, service };
    }
  }

  console.log("🔍 No OTP detected");
  return { detected: false };
}

/**
 * Process email directly from Cloudflare Email Routing email handler
 */
export async function processEmailFromRouting(
  env: Env,
  rawEmail: string,
  from: string,
  to: string
): Promise<{
  success: boolean;
  emailId?: number;
  emailUuid?: string;
  jobLinksExtracted?: number;
  jobsProcessed?: number;
  otpDetected?: boolean;
  embeddingsGenerated?: boolean;
  aiProcessed?: boolean;
  classification?: string;
}> {
  try {
    console.log("📧 Processing email from Cloudflare Email Routing...");

    // Use AI to process the email
    const aiResult = await processEmailWithAI(env, rawEmail);

    // Create email message object with UUID
    const email: EnhancedEmailMessage = {
      uuid: generateUUID(),
      from: from || aiResult.from,
      to: to || aiResult.to,
      subject: aiResult.subject,
      messageId: aiResult.messageId,
      dateReceived: aiResult.dateReceived,
      contentText: aiResult.contentText,
      contentHtml: aiResult.contentHtml,
      contentPreview: aiResult.contentPreview,
      headers: aiResult.headers,
      status: "processing",
      ai_classification: aiResult.classification,
    };

    // Save email to database
    const emailId = await saveEnhancedEmail(env, email);
    console.log(`📧 Email saved with ID: ${emailId}`);

    // Generate embeddings
    let embeddingsGenerated = false;
    try {
      email.embeddingsId = await generateEmailEmbeddings(
        env,
        email.uuid!,
        aiResult.contentText
      );
      embeddingsGenerated = true;
      console.log("📧 Embeddings generated successfully");
    } catch (error) {
      console.error("Failed to generate embeddings:", error);
    }

    // Process job links
    let jobLinksExtracted = 0;
    let jobsProcessed = 0;
    if (aiResult.jobLinks.length > 0) {
      jobLinksExtracted = aiResult.jobLinks.length;
      console.log(`📧 Processing ${aiResult.jobLinks.length} job links...`);

      // Save job links to email_job_links table
      for (const jobUrl of aiResult.jobLinks) {
        try {
          // Insert job link record
          const linkResult = await env.DB.prepare(
            `INSERT INTO email_job_links (email_auto_id, job_url, status) 
             VALUES (?, ?, 'pending')`
          )
            .bind(emailId, jobUrl)
            .run();

          console.log(`📧 Job link saved: ${jobUrl}`);

          // Process the job URL using Cloudflare Browser Rendering API
          try {
            const browserResponse = await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser/render`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  url: jobUrl,
                  html: true,
                  waitUntil: "networkidle0",
                }),
              }
            );

            if (browserResponse.ok) {
              const browserResult = (await browserResponse.json()) as any;
              const html = browserResult.result?.html;

              if (html) {
                // Extract job information from the rendered HTML
                const jobInfo = extractJobInfoFromUrl(jobUrl);
                if (jobInfo) {
                  // Create a proper Job object
                  const job: Job = {
                    url: jobUrl,
                    title: jobInfo.title || "Unknown Title",
                    company: jobInfo.company || "Unknown Company",
                    location: jobInfo.location || "Unknown Location",
                    description_md: html.slice(0, 1000), // Use first 1000 chars of HTML as description
                    salary_min: 0,
                    salary_max: 0,
                    posted_at: new Date().toISOString(),
                    source: "EMAIL",
                  };
                  const savedJobId = await saveJob(env, job);

                  // Update the job link record with the job ID and status
                  await env.DB.prepare(
                    `UPDATE email_job_links 
                     SET status = 'completed', 
                         job_id = ?, 
                         updated_at = CURRENT_TIMESTAMP 
                     WHERE id = ?`
                  )
                    .bind(savedJobId, linkResult.meta.last_row_id)
                    .run();

                  jobsProcessed++;
                  console.log(
                    `📧 Job processed: ${jobUrl} -> Job ID: ${savedJobId}`
                  );
                } else {
                  // Update status to failed if no job info could be extracted
                  await markJobLinkAsFailed(
                    env,
                    linkResult.meta.last_row_id as number
                  );
                }
              } else {
                // Update status to failed if no HTML could be rendered
                await markJobLinkAsFailed(
                  env,
                  linkResult.meta.last_row_id as number
                );
              }
            } else {
              // Update status to failed if browser rendering failed
              await markJobLinkAsFailed(
                env,
                linkResult.meta.last_row_id as number
              );
            }
          } catch (browserError) {
            console.error(`Failed to process job URL ${jobUrl}:`, browserError);

            // Update status to failed
            await markJobLinkAsFailed(
              env,
              linkResult.meta.last_row_id as number
            );
          }
        } catch (error) {
          console.error(`Failed to save job link ${jobUrl}:`, error);
        }
      }
    }

    // Handle OTP detection and forwarding
    if (aiResult.otpDetected && aiResult.otpCode) {
      console.log(
        `📧 OTP detected: ${aiResult.otpCode} for service: ${aiResult.otpService}`
      );

      try {
        await sendOTPAlert(
          env,
          aiResult.otpCode,
          aiResult.otpService || "Unknown",
          aiResult.subject
        );

        await logOTPForwarding(
          env,
          email.uuid!,
          aiResult.otpCode,
          "justin@126colby.com",
          "sent"
        );

        console.log("📧 OTP alert sent successfully");
      } catch (error) {
        console.error("Failed to send OTP alert:", error);
      }
    }

    // Update email status to processed
    await env.DB.prepare(
      `UPDATE enhanced_email_logs 
       SET status = 'processed', 
           job_links_extracted = ?, 
           jobs_processed = ?, 
           otp_detected = ?, 
           otp_code = ?, 
           embeddings_id = ?,
           processed_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind(
        jobLinksExtracted,
        jobsProcessed,
        aiResult.otpDetected ? 1 : 0,
        aiResult.otpCode || null,
        email.embeddingsId || null,
        emailId
      )
      .run();

    console.log("📧 Email processing complete");

    return {
      success: true,
      emailId,
      emailUuid: email.uuid,
      jobLinksExtracted,
      jobsProcessed,
      otpDetected: aiResult.otpDetected,
      embeddingsGenerated,
      aiProcessed: true,
      classification: aiResult.classification,
    };
  } catch (error) {
    console.error("Email processing failed:", error);
    return {
      success: false,
    };
  }
}

/**
 * AI-powered email processor using Llama 4 with structured JSON schema responses
 */
export async function processEmailWithAI(
  env: Env,
  rawEmail: string
): Promise<EmailAIExtraction> {
  try {
    console.log("🤖 Starting AI-powered email processing with Llama 4...");

    // Use Llama 3.3 70B (fastest Llama 4 model) with structured JSON schema
    const llamaModel = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

    const systemPrompt = `You are an expert email analyzer. Extract structured information from raw email content according to the provided JSON schema.

Classification rules:
- job_alert: Job posting notifications, career opportunities, job alerts from job boards
- announcement: General announcements, newsletters, company updates, marketing emails
- otp: One-time passwords, verification codes, security codes, 2FA codes
- spam: Unwanted promotional content, suspicious emails, phishing attempts
- personal: Personal messages, conversations, private communications
- other: Anything that doesn't fit the above categories

OTP Detection rules:
- Look for 4-8 digit numeric codes
- Look for 6-8 character alphanumeric codes
- Common phrases: "verification code", "OTP", "security code", "PIN", "authentication code"
- Set otpDetected to true if any OTP pattern is found

Job Link Detection:
- Look for URLs containing: job, career, position, opening, hiring, employment, apply
- Include URLs from: LinkedIn, Indeed, Glassdoor, company career pages, job boards
- Extract clean URLs without tracking parameters

Email parsing:
- Extract sender and recipient from headers or email body
- Parse subject line accurately
- Extract plain text content (strip HTML tags)
- Generate preview from first 200 characters of plain text
- Parse date in ISO 8601 format
- Extract relevant headers as key-value pairs`;

    const userPrompt = `Analyze this raw email content and extract structured information:

${rawEmail.slice(0, 6000)}`;

    const response = await env.AI.run(llamaModel, {
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: emailAIExtractionJSONSchema,
      },
    });

    console.log("🤖 Llama 4 structured response received");

    const aiResponse = (response as any).response;
    let parsedResult: any;

    try {
      // Parse the structured JSON response
      if (typeof aiResponse === "string") {
        parsedResult = JSON.parse(aiResponse);
      } else if (typeof aiResponse === "object") {
        parsedResult = aiResponse;
      } else {
        throw new Error("Invalid response format from Llama 4");
      }

      console.log(
        "🤖 Parsed AI result:",
        JSON.stringify(parsedResult, null, 2)
      );

      // Validate with Zod schema
      const validatedResult = EmailAIExtractionSchema.parse(parsedResult);

      console.log("✅ Llama 4 structured extraction successful:", {
        classification: validatedResult.classification,
        otpDetected: validatedResult.otpDetected,
        jobLinksCount: validatedResult.jobLinks.length,
        contentLength: validatedResult.contentText.length,
      });

      return validatedResult;
    } catch (parseError) {
      console.error("Failed to parse/validate Llama 4 response:", parseError);
      console.log("Raw AI response:", aiResponse);

      // Fallback parsing with manual validation
      const fallbackResult = createFallbackEmailExtraction(
        rawEmail,
        parsedResult
      );
      return fallbackResult;
    }
  } catch (error) {
    console.error("Llama 4 email processing failed:", error);

    // Complete fallback to basic parsing
    const fallbackResult = createFallbackEmailExtraction(rawEmail);
    return fallbackResult;
  }
}

/**
 * Create fallback email extraction when AI processing fails
 */
function createFallbackEmailExtraction(
  rawEmail: string,
  partialResult?: any
): EmailAIExtraction {
  console.log("🔄 Using fallback email extraction");

  // Try to extract basic info from raw email
  const lines = rawEmail.split("\n");
  let from = "unknown@example.com";
  let to = "unknown@example.com";
  let subject = "No Subject";
  let messageId = `msg-${Date.now()}`;
  let dateReceived = new Date().toISOString();

  // Basic header parsing
  for (const line of lines.slice(0, 50)) {
    // Check first 50 lines for headers
    const lowerLine = line.toLowerCase();
    if (lowerLine.startsWith("from:")) {
      const match = line.match(/from:\s*(.+)/i);
      if (match && match[1]) from = match[1].trim();
    } else if (lowerLine.startsWith("to:")) {
      const match = line.match(/to:\s*(.+)/i);
      if (match && match[1]) to = match[1].trim();
    } else if (lowerLine.startsWith("subject:")) {
      const match = line.match(/subject:\s*(.+)/i);
      if (match && match[1]) subject = match[1].trim();
    } else if (lowerLine.startsWith("message-id:")) {
      const match = line.match(/message-id:\s*(.+)/i);
      if (match && match[1]) messageId = match[1].trim();
    } else if (lowerLine.startsWith("date:")) {
      const match = line.match(/date:\s*(.+)/i);
      if (match && match[1]) {
        try {
          dateReceived = new Date(match[1].trim()).toISOString();
        } catch {
          // Keep default if date parsing fails
        }
      }
    }
  }

  // Extract content (simple approach)
  const contentText = rawEmail.slice(0, 2000);
  const contentPreview = contentText.slice(0, 200);

  // Enhanced OTP detection using existing function
  const otpResult = detectOTPCode(contentText);
  const otpDetected = otpResult.detected;
  const otpCode = otpResult.code;

  // Enhanced job link detection using existing function
  const jobLinks = extractJobUrlsEnhanced(contentText);

  // Use partial result if available, otherwise use fallback values
  const result: EmailAIExtraction = {
    from: partialResult?.from || from,
    to: partialResult?.to || to,
    subject: partialResult?.subject || subject,
    messageId: partialResult?.messageId || messageId,
    dateReceived: partialResult?.dateReceived || dateReceived,
    contentText: partialResult?.contentText || contentText,
    contentHtml: partialResult?.contentHtml || "",
    contentPreview: partialResult?.contentPreview || contentPreview,
    classification: partialResult?.classification || "other",
    otpDetected: partialResult?.otpDetected ?? otpDetected,
    otpCode: partialResult?.otpCode || otpCode,
    otpService: partialResult?.otpService,
    jobLinks: partialResult?.jobLinks || jobLinks,
    headers: partialResult?.headers || { from, to, subject },
  };

  console.log("🔄 Fallback extraction complete:", {
    classification: result.classification,
    otpDetected: result.otpDetected,
    jobLinksCount: result.jobLinks.length,
  });

  return result;
}

/**
 * Classify email content using AI
 */
export async function classifyEmailContent(
  env: Env,
  subject: string,
  content: string
): Promise<string> {
  try {
    const prompt = `Analyze this email and classify it into one of these categories:
- job_alert: Job posting notifications, career opportunities, job alerts
- announcement: General announcements, newsletters, updates
- otp: One-time passwords, verification codes, security codes
- spam: Unwanted promotional content, suspicious emails
- personal: Personal messages, conversations
- other: Anything that doesn't fit the above categories

Email Subject: "${subject}"
Email Content: "${content.slice(0, 1000)}"

Respond with only the category name (e.g., "job_alert"):`;

    const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct" as any, {
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const classification =
      (response as any).response?.trim().toLowerCase() || "other";

    // Validate classification
    const validClassifications = [
      "job_alert",
      "announcement",
      "otp",
      "spam",
      "personal",
      "other",
    ];
    return validClassifications.includes(classification)
      ? classification
      : "other";
  } catch (error) {
    console.error("Failed to classify email content:", error);
    return "other";
  }
}

/**
 * Generate HTML preview for email using browser rendering
 */
export async function generateEmailHTMLPreview(
  env: Env,
  email: EnhancedEmailMessage
): Promise<{ htmlUrl: string; pdfUrl?: string }> {
  try {
    // Create HTML content that looks like Outlook
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Preview - ${email.subject}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .email-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .email-header {
            background: #0078d4;
            color: white;
            padding: 20px;
        }
        .email-subject {
            font-size: 24px;
            font-weight: 600;
            margin: 0 0 10px 0;
        }
        .email-meta {
            font-size: 14px;
            opacity: 0.9;
        }
        .email-meta div {
            margin: 5px 0;
        }
        .email-body {
            padding: 30px;
            line-height: 1.6;
            color: #333;
        }
        .email-content {
            white-space: pre-wrap;
            font-size: 16px;
        }
        .email-footer {
            background: #f8f9fa;
            padding: 20px;
            border-top: 1px solid #e9ecef;
            font-size: 12px;
            color: #6c757d;
        }
        .classification-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .job-alert { background: #d4edda; color: #155724; }
        .announcement { background: #d1ecf1; color: #0c5460; }
        .otp { background: #fff3cd; color: #856404; }
        .spam { background: #f8d7da; color: #721c24; }
        .personal { background: #e2e3e5; color: #383d41; }
        .other { background: #f8f9fa; color: #6c757d; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <div class="email-subject">${email.subject}</div>
            <div class="email-meta">
                <div><strong>From:</strong> ${email.from}</div>
                <div><strong>To:</strong> ${email.to}</div>
                <div><strong>Date:</strong> ${new Date(
                  email.dateReceived
                ).toLocaleString()}</div>
                <div><strong>Message ID:</strong> ${email.messageId}</div>
                ${
                  email.ai_classification
                    ? `<div><strong>Classification:</strong> <span class="classification-badge ${email.ai_classification}">${email.ai_classification}</span></div>`
                    : ""
                }
            </div>
        </div>
        <div class="email-body">
            <div class="email-content">${
              email.contentText || "No content available"
            }</div>
        </div>
        <div class="email-footer">
            <div><strong>UUID:</strong> ${email.uuid}</div>
            <div><strong>Status:</strong> ${email.status}</div>
            ${
              email.jobLinksExtracted
                ? `<div><strong>Job Links Found:</strong> ${email.jobLinksExtracted}</div>`
                : ""
            }
            ${
              email.otpDetected
                ? `<div><strong>OTP Code:</strong> ${email.otpCode}</div>`
                : ""
            }
        </div>
    </div>
</body>
</html>`;

    // Upload HTML to R2
    const htmlKey = `email-previews/${email.uuid}.html`;
    await env.R2.put(htmlKey, htmlContent, {
      httpMetadata: {
        contentType: "text/html",
      },
    });

    const htmlUrl = `${env.BUCKET_BASE_URL}/${htmlKey}`;

    // Generate PDF using browser rendering
    let pdfUrl: string | undefined;
    try {
      const pdfResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/pdf`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.BROWSER_RENDERING_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            html: htmlContent,
            pdfOptions: {
              format: "a4",
              printBackground: true,
              margin: {
                top: "20px",
                right: "20px",
                bottom: "20px",
                left: "20px",
              },
            },
          }),
        }
      );

      if (pdfResponse.ok) {
        const pdfBuffer = await pdfResponse.arrayBuffer();
        const pdfKey = `email-previews/${email.uuid}.pdf`;
        await env.R2.put(pdfKey, pdfBuffer, {
          httpMetadata: {
            contentType: "application/pdf",
          },
        });
        pdfUrl = `${env.BUCKET_BASE_URL}/${pdfKey}`;
      }
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    }

    return { htmlUrl, pdfUrl };
  } catch (error) {
    console.error("Failed to generate email HTML preview:", error);
    throw error;
  }
}

/**
 * Generate AI search terms from natural language query
 */
export async function generateAISearchTerms(
  env: Env,
  query: string
): Promise<string[]> {
  try {
    const prompt = `Analyze this search query and extract relevant search terms for finding emails. 
    Return only the most important keywords and phrases that would help find relevant emails.
    
    Query: "${query}"
    
    Return the terms as a comma-separated list, maximum 5 terms:`;

    const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct" as any, {
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const terms =
      (response as any).response
        ?.trim()
        .split(",")
        .map((term: string) => term.trim()) || [];
    return terms.filter((term: string) => term.length > 0).slice(0, 5);
  } catch (error) {
    console.error("Failed to generate AI search terms:", error);
    return [query]; // Fallback to original query
  }
}

/**
 * Process job URLs from email and scrape them
 */
export async function processJobUrlsFromEmail(
  env: Env,
  emailUuid: string,
  urls: string[],
  emailSubject: string
): Promise<number> {
  let processedJobs = 0;

  for (const url of urls) {
    try {
      console.log(`Processing job URL: ${url}`);

      // Extract basic info from URL or subject for fallback
      const urlInfo = extractJobInfoFromUrl(url);
      const subjectInfo = extractJobInfoFromSubject(emailSubject);

      // Crawl the job
      const jobData = await crawlJob(
        env,
        url,
        undefined, // siteId
        urlInfo?.title || subjectInfo?.title,
        urlInfo?.company || subjectInfo?.company
      );

      if (jobData) {
        // Enhance job data with email source
        const enhancedJob: Job = {
          ...jobData,
          source: "EMAIL",
          title: jobData.title || urlInfo.title || subjectInfo.title,
          company: jobData.company || urlInfo.company || subjectInfo.company,
          location:
            jobData.location || urlInfo.location || subjectInfo.location,
          url: url,
        };

        // Save the job
        await saveJob(env, enhancedJob);
        processedJobs++;

        console.log(
          `Successfully processed job: ${enhancedJob.title} at ${enhancedJob.company}`
        );
      }
    } catch (error) {
      console.error(`Failed to process job ${url}:`, error);
    }
  }

  return processedJobs;
}

/**
 * Extract job info from URL
 */
function extractJobInfoFromUrl(url: string): {
  title?: string;
  company?: string;
  location?: string;
} {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Extract from common URL patterns
    if (url.includes("linkedin.com/jobs")) {
      // LinkedIn job URLs often have job titles in the path
      const segments = pathname
        .split("/")
        .filter((s) => s && s !== "jobs" && s !== "view");
      if (segments.length > 0) {
        return { title: segments[0]?.replace(/-/g, " ") };
      }
    }

    if (url.includes("indeed.com")) {
      // Indeed URLs might have job titles
      const titleMatch = pathname.match(/\/jobs\/([^\/]+)/);
      if (titleMatch) {
        return { title: titleMatch[1]?.replace(/-/g, " ") };
      }
    }

    return {};
  } catch {
    return {};
  }
}

/**
 * Extract job info from email subject
 */
function extractJobInfoFromSubject(subject: string): {
  title?: string;
  company?: string;
  location?: string;
} {
  // Common patterns in job alert subjects
  const patterns = [
    // "Software Engineer at Google - San Francisco, CA"
    /(.+?)\s+at\s+(.+?)(?:\s*-\s*(.+))?$/i,
    // "New Job: Software Engineer (Google)"
    /(?:new job|job alert):\s*(.+?)(?:\s*\((.+?)\))?/i,
    // "Software Engineer - Google - Remote"
    /(.+?)\s*-\s*(.+?)\s*-\s*(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = subject.match(pattern);
    if (match) {
      return {
        title: match[1]?.trim(),
        company: match[2]?.trim(),
        location: match[3]?.trim(),
      };
    }
  }

  return {};
}

/**
 * Send OTP alert email
 */
export async function sendOTPAlert(
  env: Env,
  otpCode: string,
  service: string,
  originalSubject: string
): Promise<boolean> {
  try {
    // Generate HTML using the template
    const html = generateOTPAlertHTML({
      service_name: service,
      otp_code: otpCode,
      timestamp: new Date().toLocaleString(),
      original_subject: originalSubject,
    });

    const subject = `🔐 OTP Code Alert - ${service}`;

    // Create email message
    const emailMessage = new CloudflareEmailMessage(
      "job-alerts@hacolby.app",
      "justin@126colby.com",
      html
    );

    // Send email
    await env.EMAIL_SENDER.send(emailMessage);

    console.log(`OTP alert sent: ${otpCode} for ${service}`);
    return true;
  } catch (error) {
    console.error("Failed to send OTP alert:", error);
    return false;
  }
}

/**
 * Log OTP forwarding
 */
export async function logOTPForwarding(
  env: Env,
  emailUuid: string,
  otpCode: string,
  forwardedTo: string,
  status: "sent" | "failed"
): Promise<void> {
  try {
    await env.DB.prepare(
      `
      INSERT INTO otp_forwarding_log (email_uuid, otp_code, forwarded_to, status)
      VALUES (?, ?, ?, ?)
    `
    )
      .bind(emailUuid, otpCode, forwardedTo, status)
      .run();
  } catch (error) {
    console.error("Failed to log OTP forwarding:", error);
  }
}

/**
 * Generate HTML email using template
 */
export async function generateHTMLEmail(
  env: Env,
  templateName: string,
  variables: Record<string, any>
): Promise<{ subject: string; html: string } | null> {
  try {
    const templateResult = await env.DB.prepare(
      `
      SELECT * FROM email_templates WHERE name = ? AND is_active = 1
    `
    )
      .bind(templateName)
      .first();

    if (!templateResult) {
      console.error(`Template ${templateName} not found`);
      return null;
    }

    const template = templateResult as unknown as EmailTemplate;

    // Replace variables in subject and HTML
    let subject = template.subjectTemplate;
    let html = template.htmlTemplate;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, "g"), String(value));
      html = html.replace(new RegExp(placeholder, "g"), String(value));
    }

    return { subject, html };
  } catch (error) {
    console.error("Failed to generate HTML email:", error);
    return null;
  }
}

/**
 * Send HTML email
 */
export async function sendHTMLEmail(
  env: Env,
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    const emailMessage = new CloudflareEmailMessage(
      "job-alerts@hacolby.app",
      to,
      html
    );

    await env.EMAIL_SENDER.send(emailMessage);
    return true;
  } catch (error) {
    console.error("Failed to send HTML email:", error);
    return false;
  }
}
