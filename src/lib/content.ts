import puppeteer from '@cloudflare/puppeteer';


/**
 * Environment bindings required for content utilities.
 * These names align with the worker configuration.
 */
export interface Env {
  AI: Ai; // Use the built-in AI binding
  MYBROWSER: Fetcher;
  DEFAULT_MODEL_WEB_BROWSER?: string;
}

const DEFAULT_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';

// Common schema for structured LLM responses
const COMMON_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    response: {
      type: 'string',
      description: 'The generated text response from the model'
    },
    usage: {
      type: 'object',
      description: 'Usage statistics for the inference request',
      properties: {
        prompt_tokens: {
          type: 'number',
          description: 'Total number of tokens in input',
          default: 0
        },
        completion_tokens: {
          type: 'number',
          description: 'Total number of tokens in output',
          default: 0
        },
        total_tokens: {
          type: 'number',
          description: 'Total number of input and output tokens',
          default: 0
        }
      }
    },
    tool_calls: {
      type: 'array',
      description: 'An array of tool calls requests made during the response generation',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The tool call id.'
          },
          type: {
            type: 'string',
            description: "Specifies the type of tool (e.g., 'function')."
          },
          function: {
            type: 'object',
            description: 'Details of the function tool.',
            properties: {
              name: {
                type: 'string',
                description: 'The name of the tool to be called'
              },
              arguments: {
                type: 'object',
                description: 'The arguments passed to be passed to the tool call request'
              }
            }
          }
        }
      }
    }
  },
  required: ['response']
};

export class ContentUtils {
  /**
   * Render a URL using Cloudflare's browser and return the page text.
   */
  static async fetchRenderedText(env: Env, targetUrl: string): Promise<string> {
    const browser = await puppeteer.launch(env.MYBROWSER);
    try {
      const page = await browser.newPage();
      await page.goto(targetUrl);
      const renderedText = await page.evaluate(() => {
        const body = document.querySelector('body');
        return body ? body.innerText : '';
      });
      return renderedText;
    } finally {
      await browser.close();
    }
  }

  /**
   * Execute an LLM call using the Cloudflare Workers AI binding.
   */
  static async getLLMResult<T>(env: Env, prompt: string, schema: object = COMMON_RESPONSE_SCHEMA): Promise<T> {
    const model = env.DEFAULT_MODEL_WEB_BROWSER || DEFAULT_MODEL;

    const result = await env.AI.run(model as any, { // Cast to 'any' to accommodate dynamic model name
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_schema', json_schema: schema }
    });

    return result as T;
  }

  /**
   * Convert a URL's content to markdown by rendering it and summarizing with an LLM.
   */
  static async urlToMarkdown(env: Env, targetUrl: string): Promise<string> {
    const textContent = await this.fetchRenderedText(env, targetUrl);
    const prompt = `Please convert the following text content from the website ${targetUrl} into well-structured Markdown. Focus on preserving the semantic structure, including headings, lists, and code blocks.`;
    
    const schema = {
      type: 'object',
      properties: {
        markdown: {
          type: 'string',
          description: 'The Markdown representation of the page content.'
        }
      },
      required: ['markdown']
    };
    
    const result = await this.getLLMResult<{ markdown: string }>(env, `${prompt}\n\n---\n\n${textContent.substring(0, 15000)}`, schema);
    return result.markdown ?? '';
  }

  /**
   * Generate a PDF from HTML and optional CSS.
   */
  static async generatePdf(env: Env, html: string, css?: string): Promise<ArrayBuffer> {
    const browser = await puppeteer.launch(env.MYBROWSER);
    try {
      const page = await browser.newPage();
      await page.setContent(html);
      if (css) {
        await page.addStyleTag({ content: css });
      }
      const pdf = await page.pdf({ printBackground: true });
      return pdf;
    } finally {
        await browser.close();
    }
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
  static async aiExtract<T>(env: Env, userPrompt: string, targetUrl: string, outputSchema: any): Promise<T> {
    const renderedText = await this.fetchRenderedText(env, targetUrl);

    const prompt = `
      You are a sophisticated web scraper. You are given a user's data extraction goal and the JSON schema for the output data format.
      Your task is to extract the requested information from the provided text and output it in the specified JSON schema format.
      DO NOT include anything else besides the JSON output.

      User Data Extraction Goal: ${userPrompt}

      Text extracted from the webpage at ${targetUrl}:
      ---
      ${renderedText.substring(0, 15000)}
      ---
    `;

    return this.getLLMResult<T>(env, prompt, outputSchema);
  }
}

export default ContentUtils;