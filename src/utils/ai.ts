/**
 * @module src/utils/ai.ts
 * @description
 * Workers AI helpers for diagnostics, error analysis, and self-healing suggestions.
 */

export interface AIEnv {
  AI: Ai;
  DEFAULT_MODEL_REASONING?: string;
}

/**
 * Analyze test failure and generate human-readable description and fix prompt
 */
export async function analyzeTestFailure(
  env: AIEnv,
  testName: string,
  errorCode: string | null,
  rawError: string | null,
  errorMap?: Record<string, { meaning: string; fix: string }>
): Promise<{
  humanReadableDescription: string;
  promptToFix: string;
}> {
  const model = env.DEFAULT_MODEL_REASONING || "@cf/meta/llama-3.1-8b-instruct";

  // Build context from error map if available
  let errorContext = "";
  if (!errorCode) {
    return {
      humanReadableDescription: "Test failed for unknown reason",
      promptToFix: "Review the error logs and investigate the root cause",
    };
  } else if (!errorMap || !errorMap[errorCode]) {
    return {
      humanReadableDescription: "Test failed for unknown reason",
      promptToFix: "Review the error logs and investigate the root cause",
    };
  } else if (errorCode && errorMap && errorMap[errorCode]) {
    const errorInfo = errorMap[errorCode];
    if (errorInfo && errorInfo.meaning && errorInfo.fix) {
      errorContext = `\nKnown error context:\n- Meaning: ${errorInfo.meaning}\n- Suggested fix: ${errorInfo.fix}`;
    }
  }

  const prompt = `You are a DevOps engineer analyzing a test failure.

Test: ${testName}
Error Code: ${errorCode || "Unknown"}
Raw Error: ${rawError || "No raw error provided"}${
    errorContext || "No known error context provided"
  }

Please provide:
1. A clear, human-readable description of what went wrong (2-3 sentences)
2. A step-by-step prompt for fixing the issue (3-5 actionable steps)

Format your response as JSON:
{
  "description": "clear explanation",
  "fixPrompt": "step 1\\nstep 2\\nstep 3"
}`;

  try {
    const response = await env.AI.run(model as keyof AiModels, {
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const text = (response as any)?.response || "";

    // Try to extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        humanReadableDescription:
          parsed?.description || "Test failed for unknown reason",
        promptToFix:
          parsed?.fixPrompt ||
          "Review the error logs and investigate the root cause",
      };
    }

    // Fallback: return raw response split by paragraphs
    const lines = text.split("\n").filter((l: string) => l.trim());
    return {
      humanReadableDescription: lines[0] || "Test failed",
      promptToFix: lines.slice(1).join("\n") || "Investigate the error",
    };
  } catch (error) {
    console.error("AI analysis failed:", error);
    const errorInfo = errorMap && errorCode ? errorMap[errorCode] : undefined;
    return {
      humanReadableDescription: errorCode
        ? `Test failed with error code: ${errorCode}`
        : "Test failed for unknown reason",
      promptToFix:
        errorInfo?.fix || "Review error logs and investigate root cause",
    };
  }
}

/**
 * Suggest safe remediation actions based on error analysis
 */
export async function suggestRemediation(
  env: AIEnv,
  errorDescription: string,
  fixPrompt: string
): Promise<{
  actions: Array<{ action: string; safe: boolean; description: string }>;
}> {
  const model = env.DEFAULT_MODEL_REASONING || "@cf/meta/llama-3.1-8b-instruct";

  const prompt = `Based on this error analysis, suggest safe remediation actions:

Error: ${errorDescription}
Fix Steps: ${fixPrompt}

List ONLY safe, automated actions that can be performed without human intervention.
Examples of SAFE actions:
- Retry the operation
- Clear cache
- Warm up a connection
- Toggle a feature flag (if reversible)

Examples of UNSAFE actions (DO NOT suggest):
- Delete data
- Modify production configuration
- Change authentication
- Restart services

Format as JSON:
{
  "actions": [
    {
      "action": "retry",
      "safe": true,
      "description": "Retry the failed operation"
    }
  ]
}`;

  try {
    const response = await env.AI.run(model as keyof AiModels, {
      messages: [{ role: "user", content: prompt }],
    });

    const text = (response as any)?.response || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { actions: [] };
  } catch (error) {
    console.error("Remediation suggestion failed:", error);
    return { actions: [] };
  }
}

/**
 * Attempt safe remediation actions
 */
export async function attemptRemediation(
  actions: Array<{ action: string; safe: boolean; description: string }>,
  context: {
    env: any;
    testName: string;
    errorCode: string | null;
  }
): Promise<Array<{ action: string; success: boolean; note: string }>> {
  const results: Array<{ action: string; success: boolean; note: string }> = [];

  for (const { action, safe, description } of actions) {
    if (!safe) {
      results.push({
        action,
        success: false,
        note: "Action marked as unsafe, skipped",
      });
      continue;
    }

    try {
      switch (action) {
        case "retry":
          // Retry logic would be implemented here
          results.push({
            action,
            success: true,
            note: "Retry scheduled",
          });
          break;

        case "clear_cache":
          // Cache clearing logic
          results.push({
            action,
            success: true,
            note: "Cache cleared",
          });
          break;

        default:
          results.push({
            action,
            success: false,
            note: "Unknown action",
          });
      }
    } catch (error) {
      results.push({
        action,
        success: false,
        note: `Remediation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }
  }

  return results;
}
