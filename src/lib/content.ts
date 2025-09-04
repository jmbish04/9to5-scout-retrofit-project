import puppeteer from '@cloudflare/puppeteer';

// Minimal type for response_format json_schema
export type JsonSchemaSpec = {
  name?: string;
  strict?: boolean;
  schema: Record<string, unknown>;
};

const DEFAULT_RESPONSE_SCHEMA: JsonSchemaSpec = {
  schema: { type: 'object' },
};

/**
 * Utility class for working with Cloudflare's Browser Rendering API.
 * Provides helpers for converting HTML to Markdown, generating PDFs,
 * proxying rendering endpoints (content, screenshot, pdf, snapshot,
 * scrape, json, links, markdown) and performing AI-powered extraction.
 */
export interface Env {
  API_TOKEN: string;
  ACCOUNT_ID: string;
  BROWSER: any;
  AI: any;
  DEFAULT_MODEL_WEB_BROWSER?: string;
}

export class ContentUtils {
  private static apiUrl(env: Env, endpoint: string) {
    return `https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/browser-rendering/${endpoint}`;
  }

  private static async proxyRequest<T>(env: Env, endpoint: string, payload: Record<string, any>): Promise<T> {
    const response = await fetch(this.apiUrl(env, endpoint), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.API_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`${endpoint} request failed: ${response.status}`);
    }

    if (endpoint === 'pdf' || endpoint === 'screenshot') {
      // Binary responses for pdf and screenshot endpoints
      return (await response.arrayBuffer()) as unknown as T;
    }

    return (await response.json()) as T;
  }

  /**
   * Convert an HTML string to markdown using Cloudflare's browser rendering API.
   */
  static async htmlToMarkdown(env: Env, html: string): Promise<string> {
    const data = await this.proxyRequest<{ result?: string; markdown?: string }>(env, 'markdown', { html });
    return data.result ?? data.markdown ?? '';
  }

  /**
   * Fetch a URL and convert its HTML content to markdown.
   */
  static async urlToMarkdown(env: Env, targetUrl: string): Promise<string> {
    try {
      const res = await fetch(targetUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch ${targetUrl}: ${res.status}`);
      }
      const html = await res.text();
      return this.htmlToMarkdown(env, html);
    } catch (error) {
      console.error(`Error in urlToMarkdown for ${targetUrl}:`, error);
      return '';
    }
  }

  /**
   * Fetch the rendered HTML for a URL.
   */
  static fetchContent(env: Env, url: string) {
    return this.proxyRequest(env, 'content', { url });
  }

  /**
   * Capture a screenshot of a webpage.
   */
  static captureScreenshot(env: Env, url: string) {
    return this.proxyRequest<ArrayBuffer>(env, 'screenshot', { url });
  }

  /**
   * Render a PDF of a webpage via Browser Rendering API.
   */
  static renderPdf(env: Env, url: string) {
    return this.proxyRequest<ArrayBuffer>(env, 'pdf', { url });
  }

  /**
   * Take a snapshot of the page (DOM, screenshot, and metadata).
   */
  static captureSnapshot(env: Env, url: string) {
    return this.proxyRequest(env, 'snapshot', { url });
  }

  /**
   * Scrape specific selectors from a page.
   */
  static scrapeElements(env: Env, url: string, selectors: string[]) {
    return this.proxyRequest(env, 'scrape', { url, elements: selectors });
  }

  /**
   * Capture structured JSON data from a page.
   */
  static captureJson(env: Env, url: string) {
    return this.proxyRequest(env, 'json', { url });
  }

  /**
   * Retrieve all links from a webpage.
   */
  static retrieveLinks(env: Env, url: string) {
    return this.proxyRequest(env, 'links', { url });
  }

  /**
   * Generate a PDF from HTML and optional CSS.
   * Returns the PDF as an ArrayBuffer for storage or download.
   */
  static async generatePdf(env: Env, html: string, css?: string): Promise<ArrayBuffer> {
    const browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();
    await page.setContent(html);
    if (css) {
      await page.addStyleTag({ content: css });
    }
    const pdf = await page.pdf({ printBackground: true });
    await browser.close();
    return pdf;
  }

  /**
   * Convenience wrapper for creating a resume PDF.
   */
  static generateResumePdf(env: Env, html: string, css?: string) {
    return this.generatePdf(env, html, css);
  }

  /**
   * Convenience wrapper for creating a cover letter PDF.
   */
  static generateCoverLetterPdf(env: Env, html: string, css?: string) {
    return this.generatePdf(env, html, css);
  }

  /**
   * Render a page with Puppeteer and extract structured data using Workers AI.
   */
  static async aiExtract(env: Env, userPrompt: string, targetUrl: string, outputSchema: any) {
    const browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();
    await page.goto(targetUrl);

    const renderedText = await page.evaluate(() => {
      // @ts-ignore js code to run in the browser context
      const body = document.querySelector('body');
      return body ? body.innerText : '';
    });
    await browser.close();

    const prompt = `
    You are a sophisticated web scraper. You are given the user data extraction goal.
    Your task is to extract the requested information from the text and output it in the specified JSON schema format.

    DO NOT include anything else besides the JSON output, no markdown, no plaintext, just JSON.

    User Data Extraction Goal: ${userPrompt}

    Text extracted from the webpage: ${renderedText}`;

    return this.getLLMResult(env, prompt, { schema: outputSchema });
  }

  private static async getLLMResult<T>(
    env: Env,
    prompt: string,
    jsonSchema: JsonSchemaSpec = DEFAULT_RESPONSE_SCHEMA
  ): Promise<T> {
    const model = env.DEFAULT_MODEL_WEB_BROWSER ?? '@cf/meta/llama-3.1-8b-instruct';

    try {
      const aiResult = await env.AI.run(model, {
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_schema', json_schema: jsonSchema },
      });

      const raw = (aiResult as any)?.response ?? aiResult;
      const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return parsed as T;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const cause =
        err && typeof err === 'object' && 'cause' in err
          ? // @ts-expect-error loose introspection
            (err.cause?.message ?? JSON.stringify(err.cause))
          : undefined;

      throw new Error(
        `AI.run failed for model "${model}": ${message}${
          cause ? ` | cause: ${cause}` : ''
        }`
      );
    }
  }
}

