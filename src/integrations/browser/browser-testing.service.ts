import {
  BrowserRenderingClient,
  type BrowserRenderingResult,
  type ScrapeElement,
  type AuthenticationOptions,
  type ViewportOptions,
  type ScreenshotOptions,
  type GotoOptions,
  type BrowserRenderingEnv,
} from "./browser-rendering.service";
import { R2Storage } from "../../../lib/r2";

/**
 * Comprehensive web scraping with all content types
 */
export async function scrapeWebpage(
  client: BrowserRenderingClient,
  url: string,
  options: {
    includeHtml?: boolean;
    includeScreenshot?: boolean;
    includePdf?: boolean;
    includeMarkdown?: boolean;
    includeJson?: boolean;
    includeLinks?: boolean;
    includeSnapshot?: boolean;
    includeScraped?: boolean;
    scrapeElements?: ScrapeElement[];
    jsonPrompt?: string;
    jsonSchema?: any;
    authentication?: AuthenticationOptions;
    viewport?: ViewportOptions;
    screenshotOptions?: ScreenshotOptions;
    gotoOptions?: GotoOptions;
  } = {}
): Promise<BrowserRenderingResult> {
  const resultId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const {
    includeHtml = true,
    includeScreenshot = true,
    includePdf = false,
    includeMarkdown = true,
    includeJson = false,
    includeLinks = true,
    includeSnapshot = false,
    includeScraped = false,
    scrapeElements = [],
    jsonPrompt,
    jsonSchema,
    authentication,
    viewport,
    screenshotOptions,
    gotoOptions,
  } = options;

  const baseOptions = {
    url,
    viewport,
    gotoOptions,
    authenticate: authentication,
  };

  const result: BrowserRenderingResult = {
    id: resultId,
    url,
    timestamp,
  };

  try {
    // Execute all operations in parallel for efficiency
    const operations: Promise<any>[] = [];

    if (includeHtml) {
      operations.push(
        client.getContent(baseOptions).then(async (content) => {
          const r2Storage = new R2Storage(
            (client as any).env.R2,
            (client as any).env.BUCKET_BASE_URL
          );
          const htmlFile = await r2Storage.uploadFile(content, {
            type: "scraped-content",
            originalName: `content-${resultId}.html`,
            contentType: "text/html",
            timestamp,
          });
          result.html = {
            r2Key: htmlFile.key,
            r2Url: htmlFile.url,
            size: htmlFile.size,
          };
        })
      );
    }

    if (includeScreenshot) {
      operations.push(
        client
          .takeScreenshot({
            ...baseOptions,
            screenshotOptions: {
              fullPage: true,
              type: "png",
              ...screenshotOptions,
            },
          })
          .then(async (screenshot) => {
            const r2Storage = new R2Storage(
              (client as any).env.R2,
              (client as any).env.BUCKET_BASE_URL
            );
            const screenshotFile = await r2Storage.uploadFile(screenshot, {
              type: "scraped-content",
              originalName: `screenshot-${resultId}.png`,
              contentType: "image/png",
              timestamp,
            });
            result.screenshot = {
              r2Key: screenshotFile.key,
              r2Url: screenshotFile.url,
              size: screenshotFile.size,
            };
          })
      );
    }

    if (includePdf) {
      operations.push(
        client.generatePdf(baseOptions).then(async (pdf) => {
          const r2Storage = new R2Storage(
            (client as any).env.R2,
            (client as any).env.BUCKET_BASE_URL
          );
          const pdfFile = await r2Storage.uploadFile(pdf, {
            type: "scraped-content",
            originalName: `document-${resultId}.pdf`,
            contentType: "application/pdf",
            timestamp,
          });
          result.pdf = {
            r2Key: pdfFile.key,
            r2Url: pdfFile.url,
            size: pdfFile.size,
          };
        })
      );
    }

    if (includeMarkdown) {
      operations.push(
        client.extractMarkdown(baseOptions).then(async (markdown) => {
          const r2Storage = new R2Storage(
            (client as any).env.R2,
            (client as any).env.BUCKET_BASE_URL
          );
          const markdownFile = await r2Storage.uploadFile(markdown, {
            type: "scraped-content",
            originalName: `markdown-${resultId}.md`,
            contentType: "text/markdown",
            timestamp,
          });
          result.markdown = {
            r2Key: markdownFile.key,
            r2Url: markdownFile.url,
            size: markdownFile.size,
          };
        })
      );
    }

    if (includeJson && jsonPrompt && jsonSchema) {
      operations.push(
        client
          .extractJson({
            ...baseOptions,
            prompt: jsonPrompt,
            responseFormat: {
              type: "json_schema",
              schema: jsonSchema,
            },
          })
          .then(async (jsonData) => {
            const jsonString = JSON.stringify(jsonData, null, 2);
            const r2Storage = new R2Storage(
              (client as any).env.R2,
              (client as any).env.BUCKET_BASE_URL
            );
            const jsonFile = await r2Storage.uploadFile(jsonString, {
              type: "scraped-content",
              originalName: `data-${resultId}.json`,
              contentType: "application/json",
              timestamp,
            });
            result.json = {
              r2Key: jsonFile.key,
              r2Url: jsonFile.url,
              size: jsonFile.size,
              data: jsonData,
            };
          })
      );
    }

    if (includeLinks) {
      operations.push(
        client.getLinks(baseOptions).then(async (links) => {
          const linksString = JSON.stringify(links, null, 2);
          const r2Storage = new R2Storage(
            (client as any).env.R2,
            (client as any).env.BUCKET_BASE_URL
          );
          const linksFile = await r2Storage.uploadFile(linksString, {
            type: "scraped-content",
            originalName: `links-${resultId}.json`,
            contentType: "application/json",
            timestamp,
          });
          result.links = {
            r2Key: linksFile.key,
            r2Url: linksFile.url,
            size: linksFile.size,
            links,
          };
        })
      );
    }

    if (includeSnapshot) {
      operations.push(
        client.takeSnapshot(baseOptions).then(async (snapshot) => {
          const snapshotString = JSON.stringify(snapshot, null, 2);
          const r2Storage = new R2Storage(
            (client as any).env.R2,
            (client as any).env.BUCKET_BASE_URL
          );
          const snapshotFile = await r2Storage.uploadFile(snapshotString, {
            type: "scraped-content",
            originalName: `snapshot-${resultId}.json`,
            contentType: "application/json",
            timestamp,
          });
          result.snapshot = {
            r2Key: snapshotFile.key,
            r2Url: snapshotFile.url,
            size: snapshotFile.size,
            screenshot: snapshot.screenshot,
            content: snapshot.content,
          };
        })
      );
    }

    if (includeScraped && scrapeElements.length > 0) {
      operations.push(
        client
          .scrapeElements({
            ...baseOptions,
            elements: scrapeElements,
          })
          .then(async (scrapedResults) => {
            const scrapedString = JSON.stringify(scrapedResults, null, 2);
            const r2Storage = new R2Storage(
              (client as any).env.R2,
              (client as any).env.BUCKET_BASE_URL
            );
            const scrapedFile = await r2Storage.uploadFile(scrapedString, {
              type: "scraped-content",
              originalName: `scraped-${resultId}.json`,
              contentType: "application/json",
              timestamp,
            });
            result.scraped = {
              r2Key: scrapedFile.key,
              r2Url: scrapedFile.url,
              size: scrapedFile.size,
              results: scrapedResults,
            };
          })
      );
    }

    // Wait for all operations to complete
    await Promise.allSettled(operations);

    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : "Unknown error";
    return result;
  }
}

/**
 * Store browser rendering result in D1 database
 */
export async function storeResult(
  db: D1Database,
  result: BrowserRenderingResult,
  jobId?: string,
  siteId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Create a snapshot record if we have content
    if (result.html || result.screenshot || result.pdf || result.markdown) {
      const snapshotId = crypto.randomUUID();
      const contentHash = await generateContentHash(result);

      await db
        .prepare(
          `
            INSERT INTO snapshots (
              id, job_id, content_hash, html_r2_key, json_r2_key,
              screenshot_r2_key, pdf_r2_key, markdown_r2_key, fetched_at,
              http_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
        )
        .bind(
          snapshotId,
          jobId || null,
          contentHash,
          result.html?.r2Key || null,
          result.json?.r2Key || null,
          result.screenshot?.r2Key || null,
          result.pdf?.r2Key || null,
          result.markdown?.r2Key || null,
          result.timestamp,
          result.httpStatus || 200
        )
        .run();
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate content hash for deduplication
 */
async function generateContentHash(
  result: BrowserRenderingResult
): Promise<string> {
  const content = [
    result.url,
    result.html?.r2Key || "",
    result.screenshot?.r2Key || "",
    result.pdf?.r2Key || "",
    result.markdown?.r2Key || "",
  ].join("|");

  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
