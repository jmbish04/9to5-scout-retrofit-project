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
}

export default ContentUtils;
