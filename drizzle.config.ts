/**
 * @file drizzle.config.ts
 * @description
 * Drizzle Kit configuration for D1 database migrations and schema management.
 */

import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './migrations',
  driver: 'd1',
  dbCredentials: {
    wranglerConfigPath: './wrangler.toml',
    dbName: 'DB',
  },
} satisfies Config;

