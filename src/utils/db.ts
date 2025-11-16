/**
 * @module src/utils/db.ts
 * @description
 * Database utilities using Kysely + Drizzle hybrid approach.
 * Provides helpers for test definitions and results.
 */

import { Kysely } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema';
import type { Database } from '../db/types';

export interface DatabaseEnv {
  DB: D1Database;
}

/**
 * Initialize Kysely client for dynamic queries
 */
export function initKysely(env: DatabaseEnv): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new D1Dialect({ database: env.DB }),
  });
}

/**
 * Initialize Drizzle client for schema-based operations
 */
export function initDrizzle(env: DatabaseEnv) {
  return drizzle(env.DB, { schema });
}

/**
 * Insert a test result
 */
export async function insertTestResult(
  kysely: Kysely<Database>,
  result: {
    id: string;
    sessionUuid: string;
    testFk: string;
    startedAt: string;
    finishedAt?: string;
    durationMs?: number;
    status: 'pass' | 'fail';
    errorCode?: string;
    raw?: string;
    aiHumanReadableErrorDescription?: string;
    aiPromptToFixError?: string;
  }
): Promise<void> {
  await kysely
    .insertInto('test_results')
    .values({
      id: result.id,
      session_uuid: result.sessionUuid,
      test_fk: result.testFk,
      started_at: result.startedAt,
      finished_at: result.finishedAt ?? null,
      duration_ms: result.durationMs ?? null,
      status: result.status,
      error_code: result.errorCode ?? null,
      raw: result.raw ?? null,
      ai_human_readable_error_description: result.aiHumanReadableErrorDescription ?? null,
      ai_prompt_to_fix_error: result.aiPromptToFixError ?? null,
    })
    .execute();
}

/**
 * Get latest test session summary
 */
export async function getLatestSession(kysely: Kysely<Database>) {
  const latestSession = await kysely
    .selectFrom('test_results')
    .select((eb) => [
      'session_uuid',
      eb.fn.count<number>('id').as('total_tests'),
      eb.fn.sum<number>(
        eb.case().when('status', '=', 'pass').then(1).else(0).end()
      ).as('passed'),
      eb.fn.sum<number>(
        eb.case().when('status', '=', 'fail').then(1).else(0).end()
      ).as('failed'),
      eb.fn.max('finished_at').as('finished_at'),
    ])
    .groupBy('session_uuid')
    .orderBy('finished_at', 'desc')
    .limit(1)
    .executeTakeFirst();

  if (!latestSession) {
    return null;
  }

  const details = await kysely
    .selectFrom('test_results')
    .selectAll()
    .where('session_uuid', '=', latestSession.session_uuid)
    .orderBy('started_at', 'asc')
    .execute();

  return {
    sessionUuid: latestSession.session_uuid,
    totalTests: Number(latestSession.total_tests ?? 0),
    passed: Number(latestSession.passed ?? 0),
    failed: Number(latestSession.failed ?? 0),
    finishedAt: latestSession.finished_at,
    details,
  };
}

/**
 * List active test definitions
 */
export async function listActiveTests(kysely: Kysely<Database>) {
  return await kysely
    .selectFrom('test_defs')
    .selectAll()
    .where('is_active', '=', 1)
    .orderBy('category', 'asc')
    .orderBy('name', 'asc')
    .execute();
}

/**
 * Get test definition by ID
 */
export async function getTestDef(kysely: Kysely<Database>, id: string) {
  return await kysely
    .selectFrom('test_defs')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();
}

/**
 * Insert test definition
 */
export async function insertTestDef(
  kysely: Kysely<Database>,
  def: {
    id: string;
    name: string;
    description: string;
    category?: string;
    severity?: string;
    isActive?: boolean;
    errorMap?: string;
  }
): Promise<void> {
  await kysely
    .insertInto('test_defs')
    .values({
      id: def.id,
      name: def.name,
      description: def.description,
      category: def.category ?? null,
      severity: def.severity ?? null,
      is_active: def.isActive ? 1 : 0,
      error_map: def.errorMap ?? null,
    })
    .execute();
}

/**
 * Get test results for a session
 */
export async function getSessionResults(
  kysely: Kysely<Database>,
  sessionUuid: string
) {
  return await kysely
    .selectFrom('test_results')
    .innerJoin('test_defs', 'test_defs.id', 'test_results.test_fk')
    .select([
      'test_results.id',
      'test_results.session_uuid',
      'test_results.started_at',
      'test_results.finished_at',
      'test_results.duration_ms',
      'test_results.status',
      'test_results.error_code',
      'test_results.raw',
      'test_results.ai_human_readable_error_description',
      'test_results.ai_prompt_to_fix_error',
      'test_defs.name as test_name',
      'test_defs.description as test_description',
      'test_defs.category',
      'test_defs.severity',
    ])
    .where('test_results.session_uuid', '=', sessionUuid)
    .orderBy('test_results.started_at', 'asc')
    .execute();
}

