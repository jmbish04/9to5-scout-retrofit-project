/**
 * @module src/new/core/agents/error-investigation.agent.ts
 * @description
 * An AI agent powered by the Cloudflare Agent SDK that diagnoses critical
 * application errors. It uses a tool to fetch relevant code from GitHub
 * to provide context for its analysis.
 */

import { AppError } from '../errors';
import { ErrorContext } from '../services/error-logging.service';
// Import metadata from all domain error files
import { SiteErrorMetadata } from '../../domains/sites/errors';
// ... import other domain error metadata as they are created

interface AgentEnv {
  AI: Ai;
  GITHUB_API_TOKEN: string;
  GITHUB_REPO_OWNER: string;
  GITHUB_REPO_NAME: string;
}

interface InvestigationResult {
  analysis: string | null;
  solution: string | null;
}

export class ErrorInvestigationAgent {
  private env: AgentEnv;
  private agent: GenericAgent; // Assuming a GenericAgent class from an SDK

  constructor(env: AgentEnv) {
    this.env = env;
    this.agent = new GenericAgent({
      ai: env.AI,
      model: '@cf/meta/llama-3.1-8b-instruct',
      prompt: this.getSystemPrompt(),
      tools: [this.createGitHubTool()],
    });
  }

  private getSystemPrompt(): string {
    return `
      You are an expert software engineer specializing in debugging Cloudflare Workers.
      Your task is to analyze critical errors and provide a root cause analysis and a potential solution.
      1.  You will be given an error message, a stack trace, and contextual metadata.
      2.  The metadata includes a list of potentially relevant source code files.
      3.  Use your 'getGitHubFileContent' tool to read these files.
      4.  Analyze the code in conjunction with the error to form a hypothesis.
      5.  Provide a concise 'analysis' of the likely root cause.
      6.  Provide a clear, actionable 'solution' to fix the bug.
      Your response must be in JSON format with "analysis" and "solution" keys.
    `;
  }

  private createGitHubTool(): Tool {
    return {
      name: 'getGitHubFileContent',
      description: 'Reads the content of a file from the GitHub repository.',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'The full path to the file from the repository root (e.g., "src/new/domains/sites/services/site-storage.service.ts").',
          },
        },
        required: ['filePath'],
      },
      handler: async ({ filePath }: { filePath: string }) => {
        const { GITHUB_API_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME } = this.env;
        const url = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${filePath}`;

        try {
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${GITHUB_API_TOKEN}`,
              'Accept': 'application/vnd.github.v3.raw',
              'User-Agent': '9to5-Scout-Error-Agent',
            },
          });

          if (!response.ok) {
            return `Error: Failed to fetch file from GitHub. Status: ${response.status}. Path: ${filePath}`;
          }
          return await response.text();
        } catch (error) {
          return `Error: Exception while fetching file from GitHub: ${(error as Error).message}`;
        }
      },
    };
  }

  private findErrorMetadata(error: Error): object | null {
    // In a real app, this would be a more sophisticated lookup.
    // For now, we'll just use the SiteErrorMetadata as an example.
    if (error.message.includes('sites')) { // Simple heuristic
        return SiteErrorMetadata['DatabaseError: sites'];
    }
    return null;
  }

  async investigate(error: Error, context: ErrorContext): Promise<InvestigationResult> {
    const metadata = this.findErrorMetadata(error);

    const userPrompt = `
      A critical error has occurred. Please investigate.
      Error Message: ${error.message}
      Stack Trace: ${error.stack}
      Request Context: ${JSON.stringify(context, null, 2)}
      Diagnostic Metadata: ${JSON.stringify(metadata, null, 2)}
    `;

    try {
      const response = await this.agent.run(userPrompt);
      // Assuming the agent's response is a JSON string
      return JSON.parse(response);
    } catch (agentError) {
      console.error("Error investigation agent failed:", agentError);
      return {
        analysis: "The AI agent failed to complete its analysis.",
        solution: "Please review the error logs manually.",
      };
    }
  }
}

// Dummy classes for compilation until the actual SDK is integrated
class GenericAgent {
  constructor(options: any) {}
  async run(prompt: string): Promise<string> { return this.agent.run(userPrompt); }
}
interface Tool { name: string; description: string; parameters: object; handler: (args: any) => Promise<string>; }
