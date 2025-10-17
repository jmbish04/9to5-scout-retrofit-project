/**
 * Cloudflare Browser Rendering API Integration Module
 *
 * Provides a comprehensive interface for web scraping using Cloudflare's Browser Rendering REST API.
 * This module handles all browser automation tasks including screenshots, content extraction,
 * PDF generation, and structured data extraction with authentication support.
 */
import { R2Storage } from "./r2";
export class BrowserRenderingClient {
    baseUrl;
    accountId;
    apiToken;
    r2Storage;
    constructor(env) {
        this.baseUrl = "https://api.cloudflare.com/client/v4/accounts";
        this.accountId = env.CLOUDFLARE_ACCOUNT_ID;
        this.apiToken = env.BROWSER_RENDERING_TOKEN;
        this.r2Storage = new R2Storage(env.R2, env.BUCKET_BASE_URL);
    }
    /**
     * Make authenticated request to Browser Rendering API
     */
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}/${this.accountId}/browser-rendering/${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                Authorization: `Bearer ${this.apiToken}`,
                "Content-Type": "application/json",
                ...options.headers,
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Browser Rendering API error: ${response.status} ${errorText}`);
        }
        return await response.json();
    }
    /**
     * Take a screenshot of a webpage
     */
    async takeScreenshot(options) {
        const response = await this.makeRequest("screenshot", {
            method: "POST",
            body: JSON.stringify(options),
        });
        if (!response.success) {
            throw new Error("Failed to take screenshot");
        }
        return response.result;
    }
    /**
     * Get fully rendered HTML content
     */
    async getContent(options) {
        const response = await this.makeRequest("content", {
            method: "POST",
            body: JSON.stringify(options),
        });
        if (!response.success) {
            throw new Error("Failed to get content");
        }
        return response.result.content;
    }
    /**
     * Generate PDF from webpage
     */
    async generatePdf(options) {
        const response = await this.makeRequest("pdf", {
            method: "POST",
            body: JSON.stringify(options),
        });
        if (!response.success) {
            throw new Error("Failed to generate PDF");
        }
        return response.result;
    }
    /**
     * Scrape specific elements from webpage
     */
    async scrapeElements(options) {
        const response = await this.makeRequest("scrape", {
            method: "POST",
            body: JSON.stringify(options),
        });
        if (!response.success) {
            throw new Error("Failed to scrape elements");
        }
        return response.result.results;
    }
    /**
     * Extract markdown from webpage
     */
    async extractMarkdown(options) {
        const response = await this.makeRequest("markdown", {
            method: "POST",
            body: JSON.stringify(options),
        });
        if (!response.success) {
            throw new Error("Failed to extract markdown");
        }
        return response.result.markdown;
    }
    /**
     * Extract structured JSON data using AI
     */
    async extractJson(options) {
        const response = await this.makeRequest("json", {
            method: "POST",
            body: JSON.stringify(options),
        });
        if (!response.success) {
            throw new Error("Failed to extract JSON");
        }
        return response.result.output;
    }
    /**
     * Get all links from webpage
     */
    async getLinks(options) {
        const response = await this.makeRequest("links", {
            method: "POST",
            body: JSON.stringify(options),
        });
        if (!response.success) {
            throw new Error("Failed to get links");
        }
        return response.result.links;
    }
    /**
     * Take a snapshot (screenshot + HTML) of webpage
     */
    async takeSnapshot(options) {
        const response = await this.makeRequest("snapshot", {
            method: "POST",
            body: JSON.stringify(options),
        });
        if (!response.success) {
            throw new Error("Failed to take snapshot");
        }
        return response.result;
    }
    /**
     * Comprehensive web scraping with all content types
     */
    async scrapeWebpage(url, options = {}) {
        const resultId = crypto.randomUUID();
        const timestamp = new Date().toISOString();
        const { includeHtml = true, includeScreenshot = true, includePdf = false, includeMarkdown = true, includeJson = false, includeLinks = true, includeSnapshot = false, includeScraped = false, scrapeElements = [], jsonPrompt, jsonSchema, authentication, viewport, screenshotOptions, gotoOptions, } = options;
        const baseOptions = {
            url,
            viewport,
            gotoOptions,
            authenticate: authentication,
        };
        const result = {
            id: resultId,
            url,
            timestamp,
        };
        try {
            // Execute all operations in parallel for efficiency
            const operations = [];
            if (includeHtml) {
                operations.push(this.getContent(baseOptions).then(async (content) => {
                    const htmlFile = await this.r2Storage.uploadFile(content, {
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
                }));
            }
            if (includeScreenshot) {
                operations.push(this.takeScreenshot({
                    ...baseOptions,
                    screenshotOptions: {
                        fullPage: true,
                        type: "png",
                        ...screenshotOptions,
                    },
                }).then(async (screenshot) => {
                    const screenshotFile = await this.r2Storage.uploadFile(screenshot, {
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
                }));
            }
            if (includePdf) {
                operations.push(this.generatePdf(baseOptions).then(async (pdf) => {
                    const pdfFile = await this.r2Storage.uploadFile(pdf, {
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
                }));
            }
            if (includeMarkdown) {
                operations.push(this.extractMarkdown(baseOptions).then(async (markdown) => {
                    const markdownFile = await this.r2Storage.uploadFile(markdown, {
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
                }));
            }
            if (includeJson && jsonPrompt && jsonSchema) {
                operations.push(this.extractJson({
                    ...baseOptions,
                    prompt: jsonPrompt,
                    responseFormat: {
                        type: "json_schema",
                        schema: jsonSchema,
                    },
                }).then(async (jsonData) => {
                    const jsonString = JSON.stringify(jsonData, null, 2);
                    const jsonFile = await this.r2Storage.uploadFile(jsonString, {
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
                }));
            }
            if (includeLinks) {
                operations.push(this.getLinks(baseOptions).then(async (links) => {
                    const linksString = JSON.stringify(links, null, 2);
                    const linksFile = await this.r2Storage.uploadFile(linksString, {
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
                }));
            }
            if (includeSnapshot) {
                operations.push(this.takeSnapshot(baseOptions).then(async (snapshot) => {
                    const snapshotString = JSON.stringify(snapshot, null, 2);
                    const snapshotFile = await this.r2Storage.uploadFile(snapshotString, {
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
                }));
            }
            if (includeScraped && scrapeElements.length > 0) {
                operations.push(this.scrapeElements({
                    ...baseOptions,
                    elements: scrapeElements,
                }).then(async (scrapedResults) => {
                    const scrapedString = JSON.stringify(scrapedResults, null, 2);
                    const scrapedFile = await this.r2Storage.uploadFile(scrapedString, {
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
                }));
            }
            // Wait for all operations to complete
            await Promise.allSettled(operations);
            return result;
        }
        catch (error) {
            result.error = error instanceof Error ? error.message : "Unknown error";
            return result;
        }
    }
    /**
     * Store browser rendering result in D1 database
     */
    async storeResult(db, result, jobId, siteId) {
        try {
            // Create a snapshot record if we have content
            if (result.html || result.screenshot || result.pdf || result.markdown) {
                const snapshotId = crypto.randomUUID();
                const contentHash = await this.generateContentHash(result);
                await db
                    .prepare(`
            INSERT INTO snapshots (
              id, job_id, content_hash, html_r2_key, json_r2_key,
              screenshot_r2_key, pdf_r2_key, markdown_r2_key, fetched_at,
              http_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
                    .bind(snapshotId, jobId || null, contentHash, result.html?.r2Key || null, result.json?.r2Key || null, result.screenshot?.r2Key || null, result.pdf?.r2Key || null, result.markdown?.r2Key || null, result.timestamp, result.httpStatus || 200)
                    .run();
            }
            return { success: true };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
    /**
     * Generate content hash for deduplication
     */
    async generateContentHash(result) {
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
}
/**
 * Factory function to create BrowserRenderingClient
 */
export function createBrowserRenderingClient(env) {
    return new BrowserRenderingClient(env);
}
