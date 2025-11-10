/**
 * @file src/shared/tools/pdf-rendering-tool.ts
 * @description PDF rendering tool for generating PDFs from HTML content
 */

import puppeteer from "@cloudflare/puppeteer";
import type { Env } from "../../config/env";

// PDF rendering options
export interface PDFOptions {
  format?: "A4" | "A3" | "Letter" | "Legal" | "Tabloid";
  orientation?: "portrait" | "landscape";
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  printBackground?: boolean;
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
  scale?: number;
  width?: string;
  height?: string;
  preferCSSPageSize?: boolean;
  tagged?: boolean;
  outline?: boolean;
  timeout?: number;
}

// Resume/Cover letter specific options
export interface DocumentOptions {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}

// PDF generation result
export interface PDFResult {
  pdf: Uint8Array;
  metadata: {
    size: number;
    pages?: number;
    generatedAt: string;
    options: PDFOptions;
  };
}

// HTML template for resumes/cover letters
export interface DocumentTemplate {
  html: string;
  css?: string;
  title?: string;
  metadata?: DocumentOptions;
}

/**
 * @class PDFRenderingTool
 * @description Provides PDF generation capabilities using Cloudflare's Browser Rendering API
 *
 * @example
 * // In a Worker:
 * const pdfTool = new PDFRenderingTool(env);
 * const pdf = await pdfTool.generatePDF(htmlContent);
 *
 * // For resume generation:
 * const resume = await pdfTool.generateResume(resumeData, template);
 */
export class PDFRenderingTool {
  private env: Env;

  /**
   * @constructor
   * @param {Env} env - The Cloudflare Worker environment object
   */
  constructor(env: Env) {
    this.env = env;
  }

  /**
   * @method generatePDF
   * @description Generates a PDF from HTML content
   * @param {string} html - HTML content to convert to PDF
   * @param {PDFOptions} [options] - PDF generation options
   * @param {DocumentOptions} [metadata] - PDF metadata
   * @returns {Promise<PDFResult>} Generated PDF and metadata
   */
  public async generatePDF(
    html: string,
    options: PDFOptions = {},
    metadata?: DocumentOptions
  ): Promise<PDFResult> {
    let browser;
    const startTime = Date.now();

    try {
      browser = await puppeteer.launch(this.env.MYBROWSER);
      const page = await browser.newPage();

      // Set default options
      const pdfOptions: PDFOptions = {
        format: "A4",
        orientation: "portrait",
        printBackground: true,
        margin: {
          top: "0.5in",
          right: "0.5in",
          bottom: "0.5in",
          left: "0.5in",
        },
        timeout: 30000,
        ...options,
      };

      // Set page content
      await page.setContent(html, { waitUntil: "networkidle0" });

      // Generate PDF
      const pdf = await page.pdf(pdfOptions);

      const generationTime = Date.now() - startTime;

      return {
        pdf,
        metadata: {
          size: pdf.length,
          generatedAt: new Date().toISOString(),
          options: pdfOptions,
        },
      };
    } catch (error) {
      console.error("PDF generation error:", error);
      throw new Error(
        `PDF generation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * @method generateResume
   * @description Generates a PDF resume from structured data
   * @param {any} resumeData - Resume data object
   * @param {string} [template] - HTML template name or custom template
   * @param {PDFOptions} [options] - PDF generation options
   * @returns {Promise<PDFResult>} Generated resume PDF
   */
  public async generateResume(
    resumeData: any,
    template: string = "modern",
    options: PDFOptions = {}
  ): Promise<PDFResult> {
    const html = this.buildResumeHTML(resumeData, template);
    const metadata: DocumentOptions = {
      title: `${resumeData.name || "Resume"} - Resume`,
      author: resumeData.name || "Unknown",
      subject: "Professional Resume",
      keywords: ["resume", "CV", "professional", resumeData.skills || []],
      creator: "9to5 Scout AI",
      producer: "Cloudflare Workers",
    };

    return this.generatePDF(html, options, metadata);
  }

  /**
   * @method generateCoverLetter
   * @description Generates a PDF cover letter from structured data
   * @param {any} coverLetterData - Cover letter data object
   * @param {string} [template] - HTML template name
   * @param {PDFOptions} [options] - PDF generation options
   * @returns {Promise<PDFResult>} Generated cover letter PDF
   */
  public async generateCoverLetter(
    coverLetterData: any,
    template: string = "professional",
    options: PDFOptions = {}
  ): Promise<PDFResult> {
    const html = this.buildCoverLetterHTML(coverLetterData, template);
    const metadata: DocumentOptions = {
      title: `Cover Letter - ${coverLetterData.position || "Position"}`,
      author: coverLetterData.name || "Unknown",
      subject: "Cover Letter",
      keywords: ["cover letter", "application", coverLetterData.position || ""],
      creator: "9to5 Scout AI",
      producer: "Cloudflare Workers",
    };

    return this.generatePDF(html, options, metadata);
  }

  /**
   * @method generateDocument
   * @description Generates a PDF from a document template
   * @param {DocumentTemplate} template - Document template with HTML and CSS
   * @param {PDFOptions} [options] - PDF generation options
   * @returns {Promise<PDFResult>} Generated document PDF
   */
  public async generateDocument(
    template: DocumentTemplate,
    options: PDFOptions = {}
  ): Promise<PDFResult> {
    const html = this.buildDocumentHTML(template);
    return this.generatePDF(html, options, template.metadata);
  }

  /**
   * @method buildResumeHTML
   * @description Builds HTML for resume from structured data
   * @param {any} data - Resume data
   * @param {string} template - Template name
   * @returns {string} HTML content
   */
  private buildResumeHTML(data: any, template: string): string {
    const css = this.getResumeCSS(template);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.name || "Resume"}</title>
    <style>${css}</style>
</head>
<body>
    <div class="resume">
        <header class="resume-header">
            <h1 class="name">${data.name || "Your Name"}</h1>
            <div class="contact-info">
                ${data.email ? `<span class="email">${data.email}</span>` : ""}
                ${data.phone ? `<span class="phone">${data.phone}</span>` : ""}
                ${
                  data.location
                    ? `<span class="location">${data.location}</span>`
                    : ""
                }
                ${
                  data.linkedin
                    ? `<span class="linkedin">${data.linkedin}</span>`
                    : ""
                }
            </div>
        </header>

        ${
          data.summary
            ? `
        <section class="summary">
            <h2>Professional Summary</h2>
            <p>${data.summary}</p>
        </section>
        `
            : ""
        }

        ${
          data.experience && data.experience.length > 0
            ? `
        <section class="experience">
            <h2>Professional Experience</h2>
            ${data.experience
              .map(
                (exp: any) => `
                <div class="experience-item">
                    <div class="job-header">
                        <h3 class="job-title">${exp.title || "Job Title"}</h3>
                        <span class="company">${exp.company || "Company"}</span>
                        <span class="dates">${exp.startDate || "Start"} - ${
                  exp.endDate || "Present"
                }</span>
                    </div>
                    ${
                      exp.description
                        ? `<p class="job-description">${exp.description}</p>`
                        : ""
                    }
                    ${
                      exp.achievements && exp.achievements.length > 0
                        ? `
                        <ul class="achievements">
                            ${exp.achievements
                              .map(
                                (achievement: string) =>
                                  `<li>${achievement}</li>`
                              )
                              .join("")}
                        </ul>
                    `
                        : ""
                    }
                </div>
            `
              )
              .join("")}
        </section>
        `
            : ""
        }

        ${
          data.education && data.education.length > 0
            ? `
        <section class="education">
            <h2>Education</h2>
            ${data.education
              .map(
                (edu: any) => `
                <div class="education-item">
                    <h3 class="degree">${edu.degree || "Degree"}</h3>
                    <span class="school">${edu.school || "School"}</span>
                    <span class="year">${edu.year || "Year"}</span>
                </div>
            `
              )
              .join("")}
        </section>
        `
            : ""
        }

        ${
          data.skills && data.skills.length > 0
            ? `
        <section class="skills">
            <h2>Skills</h2>
            <div class="skills-list">
                ${data.skills
                  .map((skill: string) => `<span class="skill">${skill}</span>`)
                  .join("")}
            </div>
        </section>
        `
            : ""
        }
    </div>
</body>
</html>`;
  }

  /**
   * @method buildCoverLetterHTML
   * @description Builds HTML for cover letter from structured data
   * @param {any} data - Cover letter data
   * @param {string} template - Template name
   * @returns {string} HTML content
   */
  private buildCoverLetterHTML(data: any, template: string): string {
    const css = this.getCoverLetterCSS(template);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cover Letter - ${data.position || "Position"}</title>
    <style>${css}</style>
</head>
<body>
    <div class="cover-letter">
        <header class="letter-header">
            <div class="sender-info">
                <h1>${data.name || "Your Name"}</h1>
                ${data.email ? `<p>${data.email}</p>` : ""}
                ${data.phone ? `<p>${data.phone}</p>` : ""}
                ${data.location ? `<p>${data.location}</p>` : ""}
            </div>
            <div class="date">
                <p>${new Date().toLocaleDateString()}</p>
            </div>
        </header>

        <div class="recipient-info">
            <p>${data.hiringManager || "Hiring Manager"}</p>
            <p>${data.company || "Company Name"}</p>
            ${data.address ? `<p>${data.address}</p>` : ""}
        </div>

        <div class="letter-body">
            <p class="greeting">Dear ${
              data.hiringManager || "Hiring Manager"
            },</p>
            
            <p class="opening">${
              data.opening ||
              "I am writing to express my interest in the " +
                (data.position || "position") +
                " at " +
                (data.company || "your company") +
                "."
            }</p>
            
            ${
              data.body
                ? data.body
                    .split("\n")
                    .map((paragraph: string) =>
                      paragraph.trim() ? `<p>${paragraph}</p>` : ""
                    )
                    .join("")
                : ""
            }
            
            <p class="closing">${
              data.closing ||
              "Thank you for your consideration. I look forward to hearing from you."
            }</p>
            
            <p class="signature">Sincerely,<br>${data.name || "Your Name"}</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * @method buildDocumentHTML
   * @description Builds HTML from document template
   * @param {DocumentTemplate} template - Document template
   * @returns {string} HTML content
   */
  private buildDocumentHTML(template: DocumentTemplate): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${template.title || "Document"}</title>
    <style>${template.css || ""}</style>
</head>
<body>
    ${template.html}
</body>
</html>`;
  }

  /**
   * @method getResumeCSS
   * @description Gets CSS for resume template
   * @param {string} template - Template name
   * @returns {string} CSS content
   */
  private getResumeCSS(template: string): string {
    const baseCSS = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
      .resume { max-width: 800px; margin: 0 auto; padding: 20px; }
      .resume-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
      .name { font-size: 2.5em; font-weight: bold; margin-bottom: 10px; }
      .contact-info { display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; }
      .contact-info span { font-size: 0.9em; }
      section { margin-bottom: 25px; }
      h2 { font-size: 1.4em; color: #2c3e50; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px; margin-bottom: 15px; }
      .experience-item, .education-item { margin-bottom: 20px; }
      .job-header, .education-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
      .job-title, .degree { font-weight: bold; font-size: 1.1em; }
      .company, .school { color: #7f8c8d; }
      .dates, .year { color: #95a5a6; font-size: 0.9em; }
      .skills-list { display: flex; flex-wrap: wrap; gap: 10px; }
      .skill { background: #ecf0f1; padding: 5px 10px; border-radius: 15px; font-size: 0.9em; }
      .achievements { margin-left: 20px; }
      .achievements li { margin-bottom: 5px; }
    `;

    switch (template) {
      case "modern":
        return (
          baseCSS +
          `
          .resume { background: white; }
          .name { color: #2c3e50; }
          h2 { color: #34495e; }
        `
        );
      case "classic":
        return (
          baseCSS +
          `
          .resume { background: #f8f9fa; }
          .name { color: #000; }
          h2 { color: #000; text-transform: uppercase; letter-spacing: 1px; }
        `
        );
      default:
        return baseCSS;
    }
  }

  /**
   * @method getCoverLetterCSS
   * @description Gets CSS for cover letter template
   * @param {string} template - Template name
   * @returns {string} CSS content
   */
  private getCoverLetterCSS(template: string): string {
    const baseCSS = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Times New Roman', serif; line-height: 1.6; color: #333; }
      .cover-letter { max-width: 800px; margin: 0 auto; padding: 40px; }
      .letter-header { display: flex; justify-content: space-between; margin-bottom: 30px; }
      .sender-info h1 { font-size: 1.5em; margin-bottom: 10px; }
      .sender-info p { margin-bottom: 5px; }
      .date { text-align: right; }
      .recipient-info { margin-bottom: 30px; }
      .letter-body p { margin-bottom: 15px; text-align: justify; }
      .greeting { margin-bottom: 20px; }
      .opening { font-weight: bold; }
      .closing { margin-top: 20px; }
      .signature { margin-top: 30px; }
    `;

    switch (template) {
      case "professional":
        return (
          baseCSS +
          `
          .cover-letter { background: white; }
        `
        );
      case "formal":
        return (
          baseCSS +
          `
          .cover-letter { background: #f8f9fa; padding: 50px; }
          .letter-header { border-bottom: 1px solid #ddd; padding-bottom: 20px; }
        `
        );
      default:
        return baseCSS;
    }
  }
}

/**
 * @function createPDFRenderingTool
 * @description Factory function to create a new instance of PDFRenderingTool
 * @param {Env} env - The Cloudflare Worker environment object
 * @returns {PDFRenderingTool} A new PDFRenderingTool instance
 */
export function createPDFRenderingTool(env: Env): PDFRenderingTool {
  return new PDFRenderingTool(env);
}

