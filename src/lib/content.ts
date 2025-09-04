import puppeteer from '@cloudflare/puppeteer';

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
    const document = css ? html.replace('</head>', `<style>${css}</style></head>`) : html;
    await page.setContent(document);
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
    You are a sophisticated web scraper. You are given the user data extraction goal and the JSON schema for the output data format.
    Your task is to extract the requested information from the text and output it in the specified JSON schema format:

        ${JSON.stringify(outputSchema)}

    DO NOT include anything else besides the JSON output, no markdown, no plaintext, just JSON.

    User Data Extraction Goal: ${userPrompt}

    Text extracted from the webpage: ${renderedText}`;

    return this.getLLMResult(env, prompt, outputSchema);
  }

  private static async getLLMResult(env: Env, prompt: string, schema?: any) {
    const model = '@hf/thebloke/deepseek-coder-6.7b-instruct-awq';
    const requestBody = {
      messages: [{
        role: 'user',
        content: prompt,
      }],
    };
    const aiUrl = `https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/ai/run/${model}`;

    const response = await fetch(aiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.API_TOKEN}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`LLM call failed ${aiUrl} ${response.status}`);
    }

    const data = (await response.json()) as { result: { response: string } };
    const text = data.result.response || '';
    const value = (text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, text])[1];
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error(`${e} . Response: ${value}`);
      return undefined;
    }
  }
}

