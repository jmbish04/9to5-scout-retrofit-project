/**
 * @module src/new/core/health.ts
 * @description
 * Defines the core interfaces and types for the modular health check system.
 */

/**
 * The result of a single health check test.
 */
export interface HealthCheckResult {
  test: string;
  status: 'pass' | 'fail';
  message?: string;
  duration_ms: number;
}

/**
 * An interface that every modular health check service must implement.
 */
export interface HealthCheck {
  /**
   * The name of the module being tested (e.g., "SiteStorageService").
   */
  moduleName: string;

  /**
   * Executes all health checks for the module.
   * @returns A promise that resolves to an array of HealthCheckResult objects.
   */
  runChecks(): Promise<HealthCheckResult[]>;
}
