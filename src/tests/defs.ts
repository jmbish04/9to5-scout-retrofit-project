/**
 * @module src/tests/defs.ts
 * @description
 * Default test definitions. Seeded into database if test_defs table is empty.
 */

import type { Database } from '../db/types';
import type { Kysely } from 'kysely';
import { insertTestDef } from '../utils/db';

export interface TestDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  errorMap?: Record<string, { meaning: string; fix: string }>;
}

export const DEFAULT_TESTS: TestDefinition[] = [
  {
    id: 'test-health-endpoint',
    name: 'Health Endpoint Check',
    description: 'Verifies that the /api/health endpoint responds correctly',
    category: 'connectivity',
    severity: 'critical',
    errorMap: {
      'TIMEOUT': {
        meaning: 'Health endpoint did not respond within timeout period',
        fix: 'Check worker logs, verify worker is deployed and running',
      },
      '500': {
        meaning: 'Health endpoint returned server error',
        fix: 'Check database connectivity and worker logs for errors',
      },
    },
  },
  {
    id: 'test-openapi-json',
    name: 'OpenAPI JSON Availability',
    description: 'Verifies that /openapi.json is accessible and valid JSON',
    category: 'api',
    severity: 'high',
    errorMap: {
      '404': {
        meaning: 'OpenAPI JSON endpoint not found',
        fix: 'Verify OpenAPI generator is registered in router',
      },
      'INVALID_JSON': {
        meaning: 'OpenAPI JSON is malformed',
        fix: 'Check OpenAPI generator implementation for syntax errors',
      },
    },
  },
  {
    id: 'test-openapi-yaml',
    name: 'OpenAPI YAML Availability',
    description: 'Verifies that /openapi.yaml is accessible',
    category: 'api',
    severity: 'medium',
    errorMap: {
      '404': {
        meaning: 'OpenAPI YAML endpoint not found',
        fix: 'Verify YAML generator is implemented and registered',
      },
    },
  },
  {
    id: 'test-websocket-handshake',
    name: 'WebSocket Handshake',
    description: 'Tests WebSocket connection establishment via Durable Object',
    category: 'websocket',
    severity: 'high',
    errorMap: {
      'CONNECTION_FAILED': {
        meaning: 'WebSocket connection could not be established',
        fix: 'Verify Durable Object binding is correct, check DO class implementation',
      },
      'UPGRADE_REJECTED': {
        meaning: 'WebSocket upgrade request was rejected',
        fix: 'Check RoomDO fetch handler and Upgrade header handling',
      },
    },
  },
  {
    id: 'test-database-connectivity',
    name: 'Database Connectivity',
    description: 'Verifies D1 database is accessible and queries execute',
    category: 'database',
    severity: 'critical',
    errorMap: {
      'CONNECTION_ERROR': {
        meaning: 'Cannot connect to D1 database',
        fix: 'Verify D1 binding is configured correctly in wrangler.toml',
      },
      'QUERY_FAILED': {
        meaning: 'Database query execution failed',
        fix: 'Check database schema and migration status',
      },
    },
  },
  {
    id: 'test-test-defs-endpoint',
    name: 'Test Definitions Endpoint',
    description: 'Verifies /api/tests/defs returns active test definitions',
    category: 'api',
    severity: 'medium',
    errorMap: {
      '404': {
        meaning: 'Test definitions endpoint not found',
        fix: 'Verify route is registered in API router',
      },
      'EMPTY_RESULT': {
        meaning: 'No test definitions returned',
        fix: 'Check if test_defs table is seeded, verify database query',
      },
    },
  },
];

/**
 * Seed default tests into database if table is empty
 */
export async function seedDefaultTests(kysely: Kysely<Database>): Promise<void> {
  const existing = await kysely
    .selectFrom('test_defs')
    .select('id')
    .limit(1)
    .executeTakeFirst();

  if (existing) {
    // Tests already exist, skip seeding
    return;
  }

  // Insert all default tests
  for (const test of DEFAULT_TESTS) {
    await insertTestDef(kysely, {
      id: test.id,
      name: test.name,
      description: test.description,
      category: test.category,
      severity: test.severity,
      isActive: true,
      errorMap: test.errorMap ? JSON.stringify(test.errorMap) : undefined,
    });
  }
}

