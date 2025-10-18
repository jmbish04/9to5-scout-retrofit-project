/**
 * Test endpoint for EmailProcessorAgent
 * Provides a REST API endpoint to test email processing without actual email routing
 */

import type { Env } from "../../lib/env";

export async function handleTestEmail(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const emailData = (await request.json()) as {
      from?: string;
      to?: string;
      subject?: string;
      body?: string;
      html?: string;
      headers?: Record<string, string>;
    };

    const { from, to, subject, body, html, headers = {} } = emailData;

    // Validate required fields
    if (!from || !to || !subject) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields",
          required: ["from", "to", "subject"],
          received: { from, to, subject },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("🧪 Received test email data:", emailData);

    // Create mock ForwardableEmailMessage
    const mockEmail: ForwardableEmailMessage = {
      from,
      to,
      headers: new Headers({
        subject,
        "Message-ID": `test-message-id-${crypto.randomUUID()}`,
        From: from,
        To: to,
        ...headers,
      }),
      raw: new ReadableStream({
        start(controller) {
          // Create a simple MIME email structure
          const emailContent = `From: ${from}
To: ${to}
Subject: ${subject}
Content-Type: text/plain; charset=utf-8

${body || "Test email body"}

${
  html
    ? `
--boundary
Content-Type: text/html; charset=utf-8

${html}
`
    : ""
}`;

          controller.enqueue(new TextEncoder().encode(emailContent));
          controller.close();
        },
      }),
      rawSize: (body || "").length + (html || "").length,
      reply: async (message: any) => {
        console.log("📧 Reply to email:", message);
      },
      forward: async (rcptTo: string, headers?: Headers) => {
        console.log("📧 Forwarding email to:", rcptTo, headers);
      },
      setReject: (reason: string) => {
        console.log("📧 Rejecting email:", reason);
      },
    };

    // Process the email using EmailProcessorAgent
    const agentId = env.EMAIL_PROCESSOR_AGENT.newUniqueId();
    const agent = env.EMAIL_PROCESSOR_AGENT.get(agentId);

    console.log(`🤖 Processing email with agent ID: ${agentId}`);

    // Process the email
    await agent.email(mockEmail, env);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Email processed successfully",
        agentId: agentId.toString(),
        emailData: {
          from,
          to,
          subject,
          bodyLength: (body || "").length,
          htmlLength: (html || "").length,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Error in test email handler:", error);

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
}
