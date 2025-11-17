/**
 * @module src/db/client.ts
 * @description
 * Hybrid ORM client initialization combining Drizzle ORM and Kysely.
 * - Drizzle: Schema definition, type inference, simple CRUD operations
 * - Kysely: Advanced query composition, dynamic filtering, complex joins
 */

import { drizzle } from 'drizzle-orm/d1';
import { Kysely } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import * as schema from './schema';
import type { Database } from './types';

/**
 * Environment interface for database access
 */
export interface DatabaseEnv {
  DB: D1Database;
}

/**
 * Hybrid ORM client containing both Drizzle and Kysely instances
 */
export interface DatabaseClient {
  drizzle: ReturnType<typeof drizzle<typeof schema>>;
  kysely: Kysely<Database>;
}

/**
 * Initialize database clients (Drizzle + Kysely)
 * 
 * @param env - Environment containing D1Database binding
 * @returns Database client with both ORM instances
 * 
 * @example
 * ```ts
 * const db = initDb(env);
 * 
 * // Use Drizzle for simple operations
 * const sites = await db.drizzle.select().from(schema.sites).all();
 * 
 * // Use Kysely for complex queries
 * const results = await db.kysely
 *   .selectFrom('jobs')
 *   .selectAll()
 *   .where('status', '=', 'open')
 *   .limit(10)
 *   .execute();
 * ```
 */
export function initDb(env: DatabaseEnv): DatabaseClient {
  return {
    drizzle: drizzle(env.DB, { schema }),
    kysely: new Kysely<Database>({
      dialect: new D1Dialect({ database: env.DB }),
    }),
  };
}

/**
 * Type helper for extracting Drizzle instance type
 */
export type DrizzleClient = ReturnType<typeof initDb>['drizzle'];

/**
 * Type helper for extracting Kysely instance type
 */
export type KyselyClient = ReturnType<typeof initDb>['kysely'];

