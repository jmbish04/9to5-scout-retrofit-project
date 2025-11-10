/**
 * @file src/domains/integrations/pdf/pdf.routes.ts
 * @description PDF generation API routes
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "../../../config/env";
import { createPDFRenderingTool } from "../../../shared/tools";

const app = new Hono<{ Bindings: Env }>();

// Add CORS middleware
app.use("*", cors());

/**
 * @route POST /api/pdf/generate
 * @description Generate PDF from HTML content
 */
app.post("/generate", async (c) => {
  try {
    const { html, options, metadata } = await c.req.json();

    if (!html) {
      return c.json({ error: "HTML content is required" }, 400);
    }

    const pdfTool = createPDFRenderingTool(c.env);
    const result = await pdfTool.generatePDF(html, options, metadata);

    return new Response(result.pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": result.metadata.size.toString(),
        "Cache-Control": "private, max-age=0",
        "Content-Disposition": "attachment; filename=document.pdf",
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return c.json(
      {
        error: "PDF generation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * @route POST /api/pdf/resume
 * @description Generate PDF resume from structured data
 */
app.post("/resume", async (c) => {
  try {
    const { resumeData, template = "modern", options } = await c.req.json();

    if (!resumeData) {
      return c.json({ error: "Resume data is required" }, 400);
    }

    const pdfTool = createPDFRenderingTool(c.env);
    const result = await pdfTool.generateResume(resumeData, template, options);

    const filename = `${resumeData.name?.replace(/\s+/g, "_") || "resume"}.pdf`;

    return new Response(result.pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": result.metadata.size.toString(),
        "Cache-Control": "private, max-age=0",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Resume generation error:", error);
    return c.json(
      {
        error: "Resume generation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * @route POST /api/pdf/cover-letter
 * @description Generate PDF cover letter from structured data
 */
app.post("/cover-letter", async (c) => {
  try {
    const {
      coverLetterData,
      template = "professional",
      options,
    } = await c.req.json();

    if (!coverLetterData) {
      return c.json({ error: "Cover letter data is required" }, 400);
    }

    const pdfTool = createPDFRenderingTool(c.env);
    const result = await pdfTool.generateCoverLetter(
      coverLetterData,
      template,
      options
    );

    const filename = `cover_letter_${
      coverLetterData.position?.replace(/\s+/g, "_") || "application"
    }.pdf`;

    return new Response(result.pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": result.metadata.size.toString(),
        "Cache-Control": "private, max-age=0",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Cover letter generation error:", error);
    return c.json(
      {
        error: "Cover letter generation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * @route POST /api/pdf/document
 * @description Generate PDF from document template
 */
app.post("/document", async (c) => {
  try {
    const { template, options } = await c.req.json();

    if (!template || !template.html) {
      return c.json({ error: "Document template with HTML is required" }, 400);
    }

    const pdfTool = createPDFRenderingTool(c.env);
    const result = await pdfTool.generateDocument(template, options);

    const filename = `${
      template.title?.replace(/\s+/g, "_") || "document"
    }.pdf`;

    return new Response(result.pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": result.metadata.size.toString(),
        "Cache-Control": "private, max-age=0",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Document generation error:", error);
    return c.json(
      {
        error: "Document generation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * @route GET /api/pdf/templates
 * @description Get available PDF templates
 */
app.get("/templates", async (c) => {
  return c.json({
    success: true,
    templates: {
      resume: ["modern", "classic"],
      coverLetter: ["professional", "formal"],
    },
  });
});

/**
 * @route GET /api/pdf/health
 * @description Health check for PDF service
 */
app.get("/health", async (c) => {
  try {
    const pdfTool = createPDFRenderingTool(c.env);

    // Test basic functionality with simple HTML
    const testHTML = "<html><body><h1>Test PDF</h1></body></html>";
    const result = await pdfTool.generatePDF(testHTML);

    return c.json({
      success: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
      testResult: {
        pdfGenerated: result.pdf.length > 0,
        size: result.metadata.size,
      },
    });
  } catch (error) {
    console.error("PDF health check failed:", error);
    return c.json(
      {
        success: false,
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

export default app;

