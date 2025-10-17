/**
 * Enhanced email route handlers with embeddings, OTP detection, and job scraping
 */

import type { Env } from "../index";
import {
  generateJobInsightsHTML,
  generateWelcomeHTML,
} from "../lib/email-templates";
import {
  classifyEmailContent,
  detectOTPCode,
  extractJobUrlsEnhanced,
  generateAISearchTerms,
  generateEmailEmbeddings,
  generateEmailHTMLPreview,
  generateHTMLEmail,
  logOTPForwarding,
  parseEnhancedEmailFromRequest,
  processEmailWithAI,
  processJobUrlsFromEmail,
  saveEnhancedEmail,
  sendHTMLEmail,
  sendOTPAlert,
  type EnhancedEmailMessage,
} from "../lib/enhanced-email";

/**
 * Handle incoming email with AI-powered processing pipeline
 */
export async function handleAIPoweredEmailReceived(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    console.log("📧 AI-powered email processing started...");

    // Get raw email content from form data
    const formData = await request.formData();
    const rawEmail = formData.get("raw") as string;

    if (!rawEmail) {
      return new Response(
        JSON.stringify({ error: "No raw email content found" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("📧 Raw email content length:", rawEmail.length);

    // Process email with AI
    const aiResult = await processEmailWithAI(env, rawEmail);

    console.log("🤖 AI processing complete:", {
      from: aiResult.from,
      subject: aiResult.subject,
      classification: aiResult.classification,
      otpDetected: aiResult.otpDetected,
      jobLinksCount: aiResult.jobLinks.length,
    });

    // Create EnhancedEmailMessage object
    const email: EnhancedEmailMessage = {
      uuid: crypto.randomUUID(),
      from: aiResult.from,
      to: aiResult.to,
      subject: aiResult.subject,
      messageId: aiResult.messageId,
      dateReceived: aiResult.dateReceived,
      contentText: aiResult.contentText,
      contentHtml: aiResult.contentHtml,
      contentPreview: aiResult.contentPreview,
      headers: aiResult.headers,
      status: "pending",
      ai_classification: aiResult.classification,
      otpDetected: aiResult.otpDetected,
      otpCode: aiResult.otpCode,
    };

    // Save email to database
    const emailId = await saveEnhancedEmail(env, email);
    if (!emailId) {
      return new Response(
        JSON.stringify({ error: "Failed to save email to database" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(`💾 Email saved with ID: ${emailId}`);

    // Prepare variables for consolidated update
    let embeddingsId: string | null = null;
    let otpForwardedTo: string | null = null;

    // Generate embeddings for the email content
    try {
      embeddingsId = await generateEmailEmbeddings(
        env,
        email.uuid!,
        aiResult.contentText
      );
      console.log(`🧠 Generated embeddings with ID: ${embeddingsId}`);
    } catch (error) {
      console.error("Failed to generate embeddings:", error);
    }

    // Handle OTP detection and forwarding
    if (aiResult.otpDetected && aiResult.otpCode) {
      console.log(
        `🔐 OTP detected: ${aiResult.otpCode} for ${aiResult.otpService}`
      );

      // Send OTP alert
      const otpSent = await sendOTPAlert(
        env,
        aiResult.otpCode,
        aiResult.otpService || "Unknown Service",
        aiResult.subject
      );

      if (otpSent) {
        await logOTPForwarding(
          env,
          email.uuid!,
          aiResult.otpCode,
          "justin@126colby.com",
          "sent"
        );

        otpForwardedTo = "justin@126colby.com";
        console.log(`📤 OTP forwarded to justin@126colby.com`);
      }
    } else {
      console.log("🔐 No OTP detected in email content");
    }

    // Process job URLs found by AI
    let processedJobs = 0;
    if (aiResult.jobLinks.length > 0) {
      console.log(
        `🔗 Processing ${aiResult.jobLinks.length} job URLs found by AI...`
      );
      processedJobs = await processJobUrlsFromEmail(
        env,
        email.uuid!,
        aiResult.jobLinks,
        aiResult.subject
      );
      console.log(
        `✅ Processed ${processedJobs}/${aiResult.jobLinks.length} jobs successfully`
      );
    }

    // Generate HTML preview and PDF
    console.log("🖼️ Generating HTML preview and PDF...");
    let htmlPreviewUrl: string | undefined;
    let pdfPreviewUrl: string | undefined;
    try {
      const previews = await generateEmailHTMLPreview(env, email);
      htmlPreviewUrl = previews.htmlUrl;
      pdfPreviewUrl = previews.pdfUrl;

      console.log(`📄 HTML preview: ${htmlPreviewUrl}`);
      if (pdfPreviewUrl) {
        console.log(`📄 PDF preview: ${pdfPreviewUrl}`);
      }
    } catch (error) {
      console.error("Failed to generate HTML preview:", error);
      // Continue processing even if preview generation fails
    }

    // Consolidated update with all email processing results
    await env.DB.prepare(
      `
      UPDATE enhanced_email_logs 
      SET 
        embeddings_id = ?,
        otp_detected = ?,
        otp_code = ?,
        otp_forwarded_to = ?,
        job_links_extracted = ?,
        jobs_processed = ?, 
        html_preview_url = ?, 
        pdf_preview_url = ?, 
        status = 'processed', 
        processed_at = CURRENT_TIMESTAMP, 
        updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `
    )
      .bind(
        embeddingsId,
        aiResult.otpDetected ? 1 : 0,
        aiResult.otpCode || null,
        otpForwardedTo,
        aiResult.jobLinks.length,
        processedJobs,
        htmlPreviewUrl || null,
        pdfPreviewUrl || null,
        emailId
      )
      .run();

    console.log(
      `🎉 AI-powered email processing complete. Processed ${processedJobs}/${aiResult.jobLinks.length} jobs successfully.`
    );

    return new Response(
      JSON.stringify({
        success: true,
        email_id: emailId,
        email_uuid: email.uuid,
        job_links_extracted: aiResult.jobLinks.length,
        jobs_processed: processedJobs,
        otp_detected: aiResult.otpDetected,
        embeddings_generated: true,
        ai_processed: true,
        classification: aiResult.classification,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("AI-powered email processing failed:", error);
    return new Response(
      JSON.stringify({
        error: "AI-powered email processing failed",
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Test email forwarding function - triggers email forwarding programmatically
 */
export async function handleTestEmailForward(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    console.log("📧 Testing email forwarding...");

    // Get parameters from query string
    const url = new URL(request.url);
    const hours = url.searchParams.get("hours") || "3";
    const action = url.searchParams.get("action") || "forward";

    // Call the Google Apps Script endpoint
    const scriptUrl = `https://script.google.com/macros/s/AKfycbwvFpcKkk94q23mRZytZShoJu8T3Q83Wq83jOUy8mAxlOODarWDyWZOfjjLDWF2FpRzqw/exec?action=${action}&hours=${hours}`;

    console.log(`📧 Calling Google Apps Script: ${scriptUrl}`);

    const response = await fetch(scriptUrl, {
      method: "GET",
      redirect: "follow", // Follow redirects like curl -L
    });

    if (!response.ok) {
      throw new Error(
        `Google Apps Script call failed: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.text();
    console.log("📧 Google Apps Script response:", result);

    // Parse the response
    let parsedResult;
    try {
      parsedResult = JSON.parse(result);
    } catch (parseError) {
      parsedResult = { status: "success", message: result };
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email forwarding test completed",
        googleScriptResponse: parsedResult,
        scriptUrl: scriptUrl,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Email forwarding test failed:", error);
    return new Response(
      JSON.stringify({
        error: "Email forwarding test failed",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Test OTP detection function
 */
export async function handleOTPTest(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const content =
      url.searchParams.get("content") || "Your verification code is: 123456";

    const result = detectOTPCode(content);

    return new Response(
      JSON.stringify({
        content,
        result,
        patterns: [
          "/verification\\s+code\\s+is\\s*:?\\s*(\\d{6})/gi",
          "/code\\s+is\\s*:?\\s*(\\d{6})/gi",
          "/otp\\s+is\\s*:?\\s*(\\d{6})/gi",
          "/verification\\s+code\\s*:?\\s*(\\d{6})/gi",
          "/code\\s*:?\\s*(\\d{6})/gi",
          "/otp\\s*:?\\s*(\\d{6})/gi",
        ],
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("OTP test failed:", error);
    return new Response(JSON.stringify({ error: "OTP test failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Handle incoming email with enhanced processing pipeline
 */
export async function handleEnhancedEmailReceived(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    console.log("🚀 Processing enhanced email...");

    // Parse the email content
    console.log("🔍 Attempting to parse email...");
    const email = await parseEnhancedEmailFromRequest(request);
    console.log("📧 Parsed email:", JSON.stringify(email, null, 2));
    if (!email) {
      console.error("❌ Failed to parse email");
      return new Response("Failed to parse email", { status: 400 });
    }

    console.log(
      `📧 Email received from: ${email.from}, subject: ${email.subject}`
    );

    // Save email to database
    const emailId = await saveEnhancedEmail(env, email);
    console.log(`💾 Email saved with ID: ${emailId}, UUID: ${email.uuid}`);

    // Update status to processing
    await env.DB.prepare(
      `
      UPDATE enhanced_email_logs 
      SET status = 'processing', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `
    )
      .bind(emailId)
      .run();

    // Get content for processing (declare once and reuse)
    const content = email.contentHtml || email.contentText || "";

    // Generate embeddings for the email content
    try {
      const embeddingsId = await generateEmailEmbeddings(
        env,
        email.uuid!,
        content
      );
      console.log(`🧠 Generated embeddings with ID: ${embeddingsId}`);

      // Update email with embeddings ID
      await env.DB.prepare(
        `
        UPDATE enhanced_email_logs 
        SET embeddings_id = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `
      )
        .bind(embeddingsId, emailId)
        .run();
    } catch (error) {
      console.error("Failed to generate embeddings:", error);
    }

    // AI Classification
    console.log("🤖 Classifying email content...");
    const classification = await classifyEmailContent(
      env,
      email.subject,
      content
    );
    console.log(`🏷️ Email classified as: ${classification}`);

    // Update email with classification
    await env.DB.prepare(
      `
      UPDATE enhanced_email_logs 
      SET ai_classification = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `
    )
      .bind(classification, emailId)
      .run();

    // Check for OTP codes
    const otpDetection = detectOTPCode(content);
    if (otpDetection.detected && otpDetection.code) {
      console.log(
        `🔐 OTP detected: ${otpDetection.code} for ${otpDetection.service}`
      );

      // Update email with OTP info
      await env.DB.prepare(
        `
        UPDATE enhanced_email_logs 
        SET otp_detected = 1, otp_code = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `
      )
        .bind(otpDetection.code, emailId)
        .run();

      // Send OTP alert
      const otpSent = await sendOTPAlert(
        env,
        otpDetection.code,
        otpDetection.service || "Unknown Service",
        email.subject
      );

      if (otpSent) {
        await logOTPForwarding(
          env,
          email.uuid!,
          otpDetection.code,
          "justin@126colby.com",
          "sent"
        );

        // Update email with forwarding info
        await env.DB.prepare(
          `
          UPDATE enhanced_email_logs 
          SET otp_forwarded_to = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `
        )
          .bind("justin@126colby.com", emailId)
          .run();

        console.log(`📤 OTP forwarded to justin@126colby.com`);
      }
    } else {
      console.log("🔐 No OTP detected in email content");
    }

    // Extract job URLs
    const jobUrls = extractJobUrlsEnhanced(content);
    console.log(`🔗 Extracted ${jobUrls.length} job URLs from email`);

    // Update email with job links count
    await env.DB.prepare(
      `
      UPDATE enhanced_email_logs 
      SET job_links_extracted = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `
    )
      .bind(jobUrls.length, emailId)
      .run();

    // Process job URLs
    let processedJobs = 0;
    if (jobUrls.length > 0) {
      processedJobs = await processJobUrlsFromEmail(
        env,
        email.uuid!,
        jobUrls,
        email.subject
      );
      console.log(
        `✅ Processed ${processedJobs}/${jobUrls.length} jobs successfully`
      );
    }

    // Generate HTML preview and PDF
    console.log("🖼️ Generating HTML preview and PDF...");
    let htmlPreviewUrl: string | undefined;
    let pdfPreviewUrl: string | undefined;
    try {
      const previews = await generateEmailHTMLPreview(env, email);
      htmlPreviewUrl = previews.htmlUrl;
      pdfPreviewUrl = previews.pdfUrl;

      console.log(`📄 HTML preview: ${htmlPreviewUrl}`);
      if (pdfPreviewUrl) {
        console.log(`📄 PDF preview: ${pdfPreviewUrl}`);
      }
    } catch (error) {
      console.error("Failed to generate HTML preview:", error);
      // Continue processing even if preview generation fails
    }

    // Update email with final results including preview URLs
    await env.DB.prepare(
      `
      UPDATE enhanced_email_logs 
      SET jobs_processed = ?, html_preview_url = ?, pdf_preview_url = ?, status = 'processed', processed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `
    )
      .bind(
        processedJobs,
        htmlPreviewUrl || null,
        pdfPreviewUrl || null,
        emailId
      )
      .run();

    console.log(
      `🎉 Enhanced email processing complete. Processed ${processedJobs}/${jobUrls.length} jobs successfully.`
    );

    return new Response(
      JSON.stringify({
        success: true,
        email_id: emailId,
        email_uuid: email.uuid,
        job_links_extracted: jobUrls.length,
        jobs_processed: processedJobs,
        otp_detected: otpDetection.detected,
        embeddings_generated: true,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Enhanced email processing failed:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return new Response(
      JSON.stringify({
        error: "Enhanced email processing failed",
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Get enhanced email logs with pagination and filtering
 */
export async function handleEnhancedEmailLogsGet(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "50"),
      100
    );
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Filter parameters
    const status = url.searchParams.get("status");
    const fromEmail = url.searchParams.get("from_email");
    const toEmail = url.searchParams.get("to_email");
    const otpDetected = url.searchParams.get("otp_detected");
    const classification = url.searchParams.get("classification");
    const dateFrom = url.searchParams.get("date_from");
    const dateTo = url.searchParams.get("date_to");
    const subject = url.searchParams.get("subject");
    const otpOnly = url.searchParams.get("otp_only") === "true";

    // Search parameters
    const search = url.searchParams.get("search");
    const searchType = url.searchParams.get("search_type") || "fulltext"; // fulltext, embedding, ai
    const aiQuery = url.searchParams.get("ai_query");

    // Include related data
    const includeJobs = url.searchParams.get("include_jobs") === "true";
    const includeEmbeddings =
      url.searchParams.get("include_embeddings") === "true";

    let query = `
      SELECT 
        e.id, e.uuid, e.from_email, e.to_email, e.subject, e.message_id, e.date_received,
        e.content_text, e.content_html, e.content_preview, e.headers,
        e.job_links_extracted, e.jobs_processed, e.embeddings_id,
        e.otp_detected, e.otp_code, e.otp_forwarded_to, e.ai_classification,
        e.status, e.received_at, e.processed_at, e.created_at, e.updated_at
    `;

    // Add job data if requested
    if (includeJobs) {
      query += `,
        (SELECT json_group_array(
          json_object(
            'id', j.id,
            'title', j.title,
            'company', j.company,
            'location', j.location,
            'url', j.url,
            'description', j.description,
            'salary_min', j.salary_min,
            'salary_max', j.salary_max,
            'created_at', j.created_at
          )
        ) FROM jobs j WHERE j.email_uuid = e.uuid) as jobs
      `;
    }

    query += ` FROM enhanced_email_logs e WHERE 1=1`;
    const params: any[] = [];

    // Apply filters
    if (status) {
      query += ` AND e.status = ?`;
      params.push(status);
    }

    if (fromEmail) {
      query += ` AND e.from_email LIKE ?`;
      params.push(`%${fromEmail}%`);
    }

    if (toEmail) {
      query += ` AND e.to_email LIKE ?`;
      params.push(`%${toEmail}%`);
    }

    if (otpDetected !== null) {
      query += ` AND e.otp_detected = ?`;
      params.push(otpDetected === "true" ? 1 : 0);
    }

    if (otpOnly) {
      query += ` AND e.otp_detected = 1`;
    }

    if (classification) {
      query += ` AND e.ai_classification = ?`;
      params.push(classification);
    }

    if (dateFrom) {
      query += ` AND e.received_at >= ?`;
      params.push(dateFrom);
    }

    if (dateTo) {
      query += ` AND e.received_at <= ?`;
      params.push(dateTo);
    }

    if (subject) {
      query += ` AND e.subject LIKE ?`;
      params.push(`%${subject}%`);
    }

    // Apply search
    if (search) {
      if (searchType === "fulltext") {
        query += ` AND (
          e.subject LIKE ? OR 
          e.content_text LIKE ? OR 
          e.content_html LIKE ? OR
          e.from_email LIKE ? OR
          e.to_email LIKE ?
        )`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      } else if (searchType === "embedding") {
        // For embedding search, we'll need to use vector similarity
        // This is a placeholder - actual implementation would use vector search
        query += ` AND (
          e.subject LIKE ? OR 
          e.content_text LIKE ? OR 
          e.content_html LIKE ?
        )`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
    }

    // AI-powered search
    if (aiQuery && searchType === "ai") {
      try {
        // Use AI to understand the query and generate search terms
        const aiSearchTerms = await generateAISearchTerms(env, aiQuery);
        if (aiSearchTerms.length > 0) {
          const aiConditions = aiSearchTerms
            .map(
              () =>
                `(e.subject LIKE ? OR e.content_text LIKE ? OR e.content_html LIKE ?)`
            )
            .join(" OR ");
          query += ` AND (${aiConditions})`;
          aiSearchTerms.forEach((term) => {
            const searchTerm = `%${term}%`;
            params.push(searchTerm, searchTerm, searchTerm);
          });
        }
      } catch (error) {
        console.error("AI search failed, falling back to fulltext:", error);
        query += ` AND (
          e.subject LIKE ? OR 
          e.content_text LIKE ? OR 
          e.content_html LIKE ?
        )`;
        const searchTerm = `%${aiQuery}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
    }

    query += ` ORDER BY e.received_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const result = await env.DB.prepare(query)
      .bind(...params)
      .all();

    // Get total count with same filters
    let countQuery = `SELECT COUNT(*) as total FROM enhanced_email_logs e WHERE 1=1`;
    const countParams: any[] = [];

    // Apply same filters for count
    if (status) {
      countQuery += ` AND e.status = ?`;
      countParams.push(status);
    }
    if (fromEmail) {
      countQuery += ` AND e.from_email LIKE ?`;
      countParams.push(`%${fromEmail}%`);
    }
    if (toEmail) {
      countQuery += ` AND e.to_email LIKE ?`;
      countParams.push(`%${toEmail}%`);
    }
    if (otpDetected !== null) {
      countQuery += ` AND e.otp_detected = ?`;
      countParams.push(otpDetected === "true" ? 1 : 0);
    }
    if (otpOnly) {
      countQuery += ` AND e.otp_detected = 1`;
    }
    if (classification) {
      countQuery += ` AND e.ai_classification = ?`;
      countParams.push(classification);
    }
    if (dateFrom) {
      countQuery += ` AND e.received_at >= ?`;
      countParams.push(dateFrom);
    }
    if (dateTo) {
      countQuery += ` AND e.received_at <= ?`;
      countParams.push(dateTo);
    }
    if (subject) {
      countQuery += ` AND e.subject LIKE ?`;
      countParams.push(`%${subject}%`);
    }
    if (search) {
      if (searchType === "fulltext") {
        countQuery += ` AND (
          e.subject LIKE ? OR 
          e.content_text LIKE ? OR 
          e.content_html LIKE ? OR
          e.from_email LIKE ? OR
          e.to_email LIKE ?
        )`;
        const searchTerm = `%${search}%`;
        countParams.push(
          searchTerm,
          searchTerm,
          searchTerm,
          searchTerm,
          searchTerm
        );
      }
    }

    const countResult = await env.DB.prepare(countQuery)
      .bind(...countParams)
      .first();
    const total = (countResult as any).total;

    // Get classification statistics
    const statsQuery = `
      SELECT 
        ai_classification,
        COUNT(*) as count
      FROM enhanced_email_logs 
      WHERE ai_classification IS NOT NULL
      GROUP BY ai_classification
      ORDER BY count DESC
    `;
    const statsResult = await env.DB.prepare(statsQuery).all();

    return new Response(
      JSON.stringify({
        logs: result.results || [],
        pagination: {
          limit,
          offset,
          total,
          pages: Math.ceil(total / limit),
        },
        statistics: {
          classifications: statsResult.results || [],
        },
        filters: {
          status,
          from_email: fromEmail,
          to_email: toEmail,
          otp_detected: otpDetected,
          classification,
          date_from: dateFrom,
          date_to: dateTo,
          subject,
          search,
          search_type: searchType,
          ai_query: aiQuery,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Failed to fetch enhanced email logs:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch enhanced email logs" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Advanced search endpoint with embedding similarity
 */
export async function handleEmailSearch(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q");
    const searchType = url.searchParams.get("type") || "semantic"; // semantic, keyword, ai
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query parameter 'q' is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let results: any[] = [];

    if (searchType === "semantic") {
      // Use Cloudflare Vectorize for semantic search
      try {
        const queryVectorResponse = await env.AI.run(
          "@cf/baai/bge-large-en-v1.5",
          {
            text: query,
          }
        );

        // Extract the query vector
        const queryVector = Array.isArray(queryVectorResponse)
          ? queryVectorResponse
          : (queryVectorResponse as any).data || queryVectorResponse;

        // Use Vectorize for similarity search
        const vectorMatches = await env.VECTORIZE_INDEX.query(queryVector, {
          topK: limit,
          returnMetadata: true,
        });

        if (!vectorMatches.matches.length) {
          results = [];
        } else {
          // Get email UUIDs from vector matches
          const emailUuids = vectorMatches.matches.map((match) => match.id);
          const placeholders = emailUuids.map(() => "?").join(",");

          const searchQuery = `
            SELECT 
              e.id, e.uuid, e.from_email, e.to_email, e.subject, e.date_received,
              e.content_text, e.content_preview, e.ai_classification,
              e.job_links_extracted, e.jobs_processed, e.otp_detected,
              e.received_at, e.status
            FROM enhanced_email_logs e
            WHERE e.uuid IN (${placeholders})
            ORDER BY e.received_at DESC
          `;

          const searchResult = await env.DB.prepare(searchQuery)
            .bind(...emailUuids)
            .all();

          results = searchResult.results || [];
        }
      } catch (error) {
        console.error("Semantic search failed:", error);
        // Fallback to keyword search directly
        const searchQuery = `
          SELECT 
            e.id, e.uuid, e.from_email, e.to_email, e.subject, e.date_received,
            e.content_text, e.content_preview, e.ai_classification,
            e.job_links_extracted, e.jobs_processed, e.otp_detected,
            e.received_at, e.status
          FROM enhanced_email_logs e
          WHERE (
            e.subject LIKE ? OR 
            e.content_text LIKE ? OR 
            e.content_html LIKE ? OR
            e.from_email LIKE ? OR
            e.to_email LIKE ?
          )
          ORDER BY e.received_at DESC
          LIMIT ? OFFSET ?
        `;

        const searchTerm = `%${query}%`;
        const fallbackResult = await env.DB.prepare(searchQuery)
          .bind(
            searchTerm,
            searchTerm,
            searchTerm,
            searchTerm,
            searchTerm,
            limit,
            offset
          )
          .all();

        results = fallbackResult.results || [];
      }
    } else if (searchType === "ai") {
      // AI-powered search with natural language understanding
      const searchTerms = await generateAISearchTerms(env, query);

      const conditions = searchTerms
        .map(
          () =>
            `(e.subject LIKE ? OR e.content_text LIKE ? OR e.content_html LIKE ?)`
        )
        .join(" OR ");

      const searchQuery = `
        SELECT 
          e.id, e.uuid, e.from_email, e.to_email, e.subject, e.date_received,
          e.content_text, e.content_preview, e.ai_classification,
          e.job_links_extracted, e.jobs_processed, e.otp_detected,
          e.received_at, e.status
        FROM enhanced_email_logs e
        WHERE ${conditions}
        ORDER BY e.received_at DESC
        LIMIT ? OFFSET ?
      `;

      const params: any[] = [];
      searchTerms.forEach((term) => {
        const searchTerm = `%${term}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      });
      params.push(limit, offset);

      const searchResult = await env.DB.prepare(searchQuery)
        .bind(...params)
        .all();
      results = searchResult.results || [];
    } else {
      // Keyword search
      const searchQuery = `
        SELECT 
          e.id, e.uuid, e.from_email, e.to_email, e.subject, e.date_received,
          e.content_text, e.content_preview, e.ai_classification,
          e.job_links_extracted, e.jobs_processed, e.otp_detected,
          e.received_at, e.status
        FROM enhanced_email_logs e
        WHERE (
          e.subject LIKE ? OR 
          e.content_text LIKE ? OR 
          e.content_html LIKE ? OR
          e.from_email LIKE ? OR
          e.to_email LIKE ?
        )
        ORDER BY e.received_at DESC
        LIMIT ? OFFSET ?
      `;

      const searchTerm = `%${query}%`;
      const searchResult = await env.DB.prepare(searchQuery)
        .bind(
          searchTerm,
          searchTerm,
          searchTerm,
          searchTerm,
          searchTerm,
          limit,
          offset
        )
        .all();

      results = searchResult.results || [];
    }

    return new Response(
      JSON.stringify({
        results,
        query,
        search_type: searchType,
        pagination: {
          limit,
          offset,
          total: results.length,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Email search failed:", error);
    return new Response(JSON.stringify({ error: "Email search failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Get email statistics and analytics
 */
export async function handleEmailAnalytics(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get("period") || "30d"; // 7d, 30d, 90d, 1y

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "1y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const startDateStr = startDate.toISOString().split("T")[0];

    // Get classification distribution
    const classificationStats = await env.DB.prepare(
      `
      SELECT 
        ai_classification,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM enhanced_email_logs WHERE received_at >= ?), 2) as percentage
      FROM enhanced_email_logs 
      WHERE received_at >= ? AND ai_classification IS NOT NULL
      GROUP BY ai_classification
      ORDER BY count DESC
    `
    )
      .bind(startDateStr, startDateStr)
      .all();

    // Get daily email volume
    const dailyVolume = await env.DB.prepare(
      `
      SELECT 
        DATE(received_at) as date,
        COUNT(*) as count
      FROM enhanced_email_logs 
      WHERE received_at >= ?
      GROUP BY DATE(received_at)
      ORDER BY date DESC
    `
    )
      .bind(startDateStr)
      .all();

    // Get top senders
    const topSenders = await env.DB.prepare(
      `
      SELECT 
        from_email,
        COUNT(*) as count
      FROM enhanced_email_logs 
      WHERE received_at >= ?
      GROUP BY from_email
      ORDER BY count DESC
      LIMIT 10
    `
    )
      .bind(startDateStr)
      .all();

    // Get job extraction stats
    const jobStats = await env.DB.prepare(
      `
      SELECT 
        COUNT(*) as total_emails,
        SUM(job_links_extracted) as total_job_links,
        SUM(jobs_processed) as total_jobs_processed,
        ROUND(AVG(job_links_extracted), 2) as avg_job_links_per_email
      FROM enhanced_email_logs 
      WHERE received_at >= ?
    `
    )
      .bind(startDateStr)
      .first();

    // Get OTP stats
    const otpStats = await env.DB.prepare(
      `
      SELECT 
        COUNT(*) as total_otp_emails,
        COUNT(CASE WHEN otp_forwarded_to IS NOT NULL THEN 1 END) as forwarded_otps
      FROM enhanced_email_logs 
      WHERE received_at >= ? AND otp_detected = 1
    `
    )
      .bind(startDateStr)
      .first();

    return new Response(
      JSON.stringify({
        period,
        date_range: {
          start: startDateStr,
          end: now.toISOString().split("T")[0],
        },
        statistics: {
          classifications: classificationStats.results || [],
          daily_volume: dailyVolume.results || [],
          top_senders: topSenders.results || [],
          job_extraction: jobStats || {},
          otp_processing: otpStats || {},
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Email analytics failed:", error);
    return new Response(JSON.stringify({ error: "Email analytics failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Get OTP forwarding logs
 */
export async function handleOTPForwardingLogsGet(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "50"),
      100
    );
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const result = await env.DB.prepare(
      `
      SELECT 
        otp.*,
        email.from_email,
        email.subject,
        email.received_at
      FROM otp_forwarding_log otp
      JOIN enhanced_email_logs email ON otp.email_uuid = email.uuid
      ORDER BY otp.forwarded_at DESC 
      LIMIT ? OFFSET ?
    `
    )
      .bind(limit, offset)
      .all();

    return new Response(
      JSON.stringify({
        logs: result.results,
        pagination: {
          limit,
          offset,
          total: result.results.length,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Failed to fetch OTP forwarding logs:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch OTP forwarding logs" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Send HTML email using templates
 */
export async function handleSendHTMLEmail(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { template_name, to, variables } = (await request.json()) as {
      template_name: string;
      to: string;
      variables: Record<string, any>;
    };

    if (!template_name || !to) {
      return new Response(
        JSON.stringify({ error: "template_name and to are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Generate HTML email
    const emailContent = await generateHTMLEmail(env, template_name, variables);
    if (!emailContent) {
      return new Response(
        JSON.stringify({ error: "Failed to generate email content" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Send email
    const sent = await sendHTMLEmail(
      env,
      to,
      emailContent.subject,
      emailContent.html
    );
    if (!sent) {
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Failed to send HTML email:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send HTML email" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Get email templates
 */
export async function handleEmailTemplatesGet(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const result = await env.DB.prepare(
      `
      SELECT * FROM email_templates 
      ORDER BY created_at DESC
    `
    ).all();

    return new Response(JSON.stringify({ templates: result.results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to fetch email templates:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch email templates" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Create or update email template
 */
export async function handleEmailTemplatePost(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { name, subject_template, html_template, variables, is_active } =
      (await request.json()) as {
        name: string;
        subject_template: string;
        html_template: string;
        variables?: string[];
        is_active?: boolean;
      };

    if (!name || !subject_template || !html_template) {
      return new Response(
        JSON.stringify({
          error: "name, subject_template, and html_template are required",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if template exists
    const existing = await env.DB.prepare(
      `
      SELECT id FROM email_templates WHERE name = ?
    `
    )
      .bind(name)
      .first();

    if (existing) {
      // Update existing template
      await env.DB.prepare(
        `
        UPDATE email_templates 
        SET subject_template = ?, html_template = ?, variables = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE name = ?
      `
      )
        .bind(
          subject_template,
          html_template,
          JSON.stringify(variables || []),
          is_active !== false,
          name
        )
        .run();
    } else {
      // Create new template
      await env.DB.prepare(
        `
        INSERT INTO email_templates (name, subject_template, html_template, variables, is_active)
        VALUES (?, ?, ?, ?, ?)
      `
      )
        .bind(
          name,
          subject_template,
          html_template,
          JSON.stringify(variables || []),
          is_active !== false
        )
        .run();
    }

    return new Response(
      JSON.stringify({ success: true, message: "Template saved successfully" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Failed to save email template:", error);
    return new Response(
      JSON.stringify({ error: "Failed to save email template" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Send job insights email with statistics
 */
export async function handleSendJobInsights(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { to = "justin@126colby.com" } = (await request.json()) as {
      to?: string;
    };

    // Get job statistics
    const statsResult = await env.DB.prepare(
      `
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN created_at >= datetime('now', '-24 hours') THEN 1 END) as new_jobs_24h,
        COUNT(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 END) as new_jobs_7d,
        COUNT(CASE WHEN source = 'EMAIL' THEN 1 END) as email_jobs,
        COUNT(CASE WHEN source = 'SCRAPED' THEN 1 END) as scraped_jobs
      FROM jobs
    `
    ).first();

    const stats = statsResult as any;

    // Get top companies
    const topCompaniesResult = await env.DB.prepare(
      `
      SELECT company, COUNT(*) as count
      FROM jobs 
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY company 
      ORDER BY count DESC 
      LIMIT 5
    `
    ).all();

    // Get top locations
    const topLocationsResult = await env.DB.prepare(
      `
      SELECT location, COUNT(*) as count
      FROM jobs 
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY location 
      ORDER BY count DESC 
      LIMIT 5
    `
    ).all();

    // Generate email content using the template
    const html = generateJobInsightsHTML({
      date: new Date().toLocaleDateString(),
      new_jobs_count: stats.new_jobs_24h,
      total_jobs_count: stats.total_jobs,
      new_jobs_7d: stats.new_jobs_7d,
      email_jobs: stats.email_jobs,
      scraped_jobs: stats.scraped_jobs,
      top_companies: topCompaniesResult.results
        .map((c: any) => `${c.company} (${c.count})`)
        .join(", "),
      top_locations: topLocationsResult.results
        .map((l: any) => `${l.location} (${l.count})`)
        .join(", "),
    });

    const subject = `📊 Daily Job Insights - ${new Date().toLocaleDateString()}`;

    // Send email
    const sent = await sendHTMLEmail(env, to, subject, html);
    if (!sent) {
      return new Response(
        JSON.stringify({ error: "Failed to send insights email" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Job insights email sent successfully",
        stats: {
          total_jobs: stats.total_jobs,
          new_jobs_24h: stats.new_jobs_24h,
          new_jobs_7d: stats.new_jobs_7d,
        },
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Failed to send job insights:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send job insights" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Send welcome email
 */
export async function handleSendWelcomeEmail(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { to, user_name } = (await request.json()) as {
      to: string;
      user_name?: string;
    };

    if (!to) {
      return new Response(
        JSON.stringify({ error: "to email address is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const html = generateWelcomeHTML(user_name || "User");
    const subject = "🎉 Welcome to 9to5 Scout!";

    const sent = await sendHTMLEmail(env, to, subject, html);
    if (!sent) {
      return new Response(
        JSON.stringify({ error: "Failed to send welcome email" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Welcome email sent successfully",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send welcome email" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
