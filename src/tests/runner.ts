/**
 * @module src/tests/runner.ts
 * @description
 * Test orchestrator that runs tests in parallel, records results,
 * and uses Workers AI for failure analysis and self-healing.
 */

import type { AIEnv, DatabaseEnv } from "../types";
import {
  analyzeTestFailure,
  attemptRemediation,
  suggestRemediation,
} from "../utils/ai";
import {
  getTestDef,
  initKysely,
  insertTestResult,
  listActiveTests,
} from "../utils/db";
import { seedDefaultTests } from "./defs";

export interface TestContext extends DatabaseEnv, AIEnv {}

export interface TestResult {
  testId: string;
  status: "pass" | "fail";
  durationMs: number;
  errorCode: string | null;
  raw: string | null;
  aiHumanReadableErrorDescription?: string;
  aiPromptToFixError?: string;
}

const MAX_CONCURRENCY = 5;

/**
 * Run a single test
 */
async function runTest(
  testId: string,
  testName: string,
  baseUrl: string,
  context: TestContext
): Promise<TestResult> {
  const startTime = Date.now();
  let status: "pass" | "fail" = "pass";
  let errorCode: string | null = null;
  let raw: string | null = null;

  try {
    switch (testId) {
      case "test-health-endpoint":
        const healthResponse = await fetch(`${baseUrl}/api/health`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!healthResponse.ok) {
          status = "fail";
          errorCode = String(healthResponse.status);
          raw = JSON.stringify({
            status: healthResponse.status,
            statusText: healthResponse.statusText,
          });
        }
        break;

      case "test-openapi-json":
        const openapiResponse = await fetch(`${baseUrl}/openapi.json`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!openapiResponse.ok) {
          status = "fail";
          errorCode = String(openapiResponse.status);
          raw = JSON.stringify({ status: openapiResponse.status });
        } else {
          try {
            await openapiResponse.json();
          } catch (e) {
            status = "fail";
            errorCode = "INVALID_JSON";
            raw = JSON.stringify({ error: "Invalid JSON" });
          }
        }
        break;

      case "test-openapi-yaml":
        const yamlResponse = await fetch(`${baseUrl}/openapi.yaml`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!yamlResponse.ok) {
          status = "fail";
          errorCode = String(yamlResponse.status);
          raw = JSON.stringify({ status: yamlResponse.status });
        }
        break;

      case "test-websocket-handshake":
        // WebSocket test - try to establish connection
        try {
          const wsUrl = baseUrl
            .replace("https://", "wss://")
            .replace("http://", "ws://");
          const ws = new WebSocket(`${wsUrl}/ws?room=test-room`);

          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              ws.close();
              reject(new Error("WebSocket timeout"));
            }, 5000);

            ws.onopen = () => {
              clearTimeout(timeout);
              ws.close();
              resolve(null);
            };

            ws.onerror = (error) => {
              clearTimeout(timeout);
              reject(error);
            };
          });
        } catch (error) {
          status = "fail";
          errorCode = "CONNECTION_FAILED";
          raw = JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
        break;

      case "test-database-connectivity":
        const kysely = initKysely(context);
        try {
          await kysely.selectFrom("test_defs").select("id").limit(1).execute();
        } catch (error) {
          status = "fail";
          errorCode = "QUERY_FAILED";
          raw = JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
        break;

      case "test-test-defs-endpoint":
        const defsResponse = await fetch(`${baseUrl}/api/tests/defs`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!defsResponse.ok) {
          status = "fail";
          errorCode = String(defsResponse.status);
          raw = JSON.stringify({ status: defsResponse.status });
        } else {
          const defs = await defsResponse.json();
          if (!Array.isArray(defs) || defs.length === 0) {
            status = "fail";
            errorCode = "EMPTY_RESULT";
            raw = JSON.stringify({ result: "empty" });
          }
        }
        break;

      default:
        status = "fail";
        errorCode = "UNKNOWN_TEST";
        raw = JSON.stringify({ error: "Unknown test ID" });
    }
  } catch (error) {
    status = "fail";
    errorCode = "EXCEPTION";
    raw = JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  const durationMs = Date.now() - startTime;

  return {
    testId,
    status,
    durationMs,
    errorCode,
    raw,
  };
}

/**
 * Run all active tests and record results
 */
export async function runAllTests(
  context: TestContext,
  baseUrl: string = "https://9to5-scout.hacolby.workers.dev",
  sessionUuid?: string
): Promise<string> {
  const kysely = initKysely(context);

  // Seed default tests if needed
  await seedDefaultTests(kysely);

  // Generate session UUID if not provided
  const sessionId = sessionUuid || crypto.randomUUID();
  const startedAt = new Date().toISOString();

  // Get active tests
  const activeTests = await listActiveTests(kysely);

  if (activeTests.length === 0) {
    throw new Error("No active tests found");
  }

  // Run tests with concurrency limit
  const results: TestResult[] = [];
  const testQueue = [...activeTests];

  while (testQueue.length > 0) {
    const batch = testQueue.splice(0, MAX_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((test) => runTest(String(test.id), test.name, baseUrl, context))
    );
    results.push(...batchResults);
  }

  // Process results and store in database
  for (const result of results) {
    const testDef = await getTestDef(kysely, result.testId);
    let aiDescription: string | undefined;
    let aiFixPrompt: string | undefined;

    // If test failed, analyze with AI
    if (result.status === "fail" && testDef) {
      const errorMap = (testDef as any).error_map
        ? JSON.parse((testDef as any).error_map)
        : undefined;
      const analysis = await analyzeTestFailure(
        context,
        testDef.name,
        result.errorCode || "UNKNOWN_ERROR",
        result.raw,
        errorMap
      );
      aiDescription = analysis.humanReadableDescription;
      aiFixPrompt = analysis.promptToFix;

      // Attempt remediation
      const remediation = await suggestRemediation(
        context,
        aiDescription,
        aiFixPrompt
      );

      const remediationResults = await attemptRemediation(remediation.actions, {
        env: context,
        testName: testDef.name!,
        errorCode: result.errorCode,
      });

      // Append remediation results to raw
      const rawData = result.raw ? JSON.parse(result.raw) : {};
      rawData.remediation = remediationResults;
      result.raw = JSON.stringify(rawData);
    }

    // Store result
    await insertTestResult(kysely, {
      id: crypto.randomUUID(),
      sessionUuid: sessionId,
      testFk: result.testId,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: result.durationMs,
      status: result.status,
      errorCode: result.errorCode || undefined,
      raw: result.raw || undefined,
      aiHumanReadableErrorDescription: aiDescription,
      aiPromptToFixError: aiFixPrompt,
    });
  }

  return sessionId;
}
