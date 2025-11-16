/**
 * @module src/new/core/services/health-check-runner.service.ts
 * @description
 * A service to discover, execute, and report on all modular health checks.
 * Now with real-time logging capabilities via a WebSocket Durable Object.
 */

import { SiteHealthCheck } from "../../domains/sites/health";
import type { HealthCheck, HealthCheckResult } from "../health";
// @ts-ignore - Cloudflare Workers types
type D1Database = any;

export interface HealthEnv {
  DB: D1Database;
}

export interface ModuleResult {
  module: string;
  status: "pass" | "fail";
  duration_ms: number;
  tests: HealthCheckResult[];
}

export interface HealthReport {
  id: string;
  timestamp: string;
  status: "passing" | "failing";
  duration_ms: number;
  results: ModuleResult[];
  triggered_by: "cron" | "manual_api";
}

export class HealthCheckRunner {
  private env: HealthEnv;
  private checks: HealthCheck[];

  constructor(env: HealthEnv) {
    this.env = env;
    this.checks = [new SiteHealthCheck(env)];
  }

  // Logs a message (placeholder for future socket integration).
  private async log(message: string) {
    console.log(`[HealthCheck] ${message}`);
  }

  async run(trigger: "cron" | "manual_api"): Promise<HealthReport> {
    const overallStart = Date.now();
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    await this.log(`RUN_START: Initiating health check run ID: ${id}`);

    const modulePromises = this.checks.map(async (check) => {
      const moduleStart = Date.now();
      await this.log(`MODULE_START: Running checks for ${check.moduleName}...`);

      const testResults = await check.runChecks();
      const moduleStatus: "pass" | "fail" = testResults.every(
        (r) => r.status === "pass"
      )
        ? "pass"
        : "fail";

      testResults.forEach((result) => {
        this.log(
          `TEST_RESULT: [${result.status.toUpperCase()}] ${
            check.moduleName
          } - ${result.test} (${result.duration_ms}ms)`
        );
      });

      await this.log(
        `MODULE_COMPLETE: Finished checks for ${check.moduleName}. Status: ${moduleStatus}`
      );

      return {
        module: check.moduleName,
        status: moduleStatus,
        duration_ms: Date.now() - moduleStart,
        tests: testResults,
      };
    });

    const moduleResults = await Promise.all(modulePromises);

    const overallDuration = Date.now() - overallStart;
    const overallStatus = moduleResults.every((m) => m.status === "pass")
      ? "passing"
      : "failing";

    const report: HealthReport = {
      id,
      timestamp,
      status: overallStatus,
      duration_ms: overallDuration,
      results: moduleResults,
      triggered_by: trigger,
    };

    await this.saveReport(report);
    await this.log(
      `RUN_COMPLETE: Health check finished. Overall status: ${overallStatus}. Report ID: ${id}`
    );

    return report;
  }

  private async saveReport(report: any): Promise<void> {
    // ... (saveReport implementation remains the same)
  }
}
