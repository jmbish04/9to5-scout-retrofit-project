# Drizzle + Kysely Hybrid ORM Migration Guide

This document outlines the migration from raw D1 queries to a type-safe hybrid ORM architecture using **Drizzle ORM** and **Kysely**.

## 🎯 Architecture Overview

### Why Hybrid?

- **Drizzle ORM**: Schema definition, type inference, simple CRUD operations
- **Kysely**: Advanced query composition, dynamic filtering, complex joins

This hybrid approach gives us:
- ✅ Type safety from schema definitions
- ✅ Simple, readable CRUD operations
- ✅ Powerful dynamic query building
- ✅ Full compatibility with Cloudflare Workers runtime

## 📁 File Structure

```
src/db/
├── schema.ts          # Drizzle schema definitions (all tables)
├── client.ts          # ORM client initialization
└── types.ts           # Kysely Database type interface

drizzle.config.ts      # Drizzle Kit configuration
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Initialize Database Client

```typescript
import { initDb } from './db/client';

// In your service or route handler
const db = initDb(env);
```

### 3. Use Drizzle for Simple Operations

```typescript
import { eq } from 'drizzle-orm';
import { sites } from './db/schema';

// Select
const allSites = await db.drizzle.select().from(sites).all();

// Insert
await db.drizzle.insert(sites).values({
  id: crypto.randomUUID(),
  name: 'Example Site',
  baseUrl: 'https://example.com',
  discoveryStrategy: 'sitemap',
}).run();

// Update
await db.drizzle
  .update(sites)
  .set({ name: 'Updated Name' })
  .where(eq(sites.id, siteId))
  .run();

// Delete
await db.drizzle.delete(sites).where(eq(sites.id, siteId)).run();
```

### 4. Use Kysely for Complex Queries

```typescript
// Dynamic filtering
const results = await db.kysely
  .selectFrom('jobs')
  .selectAll()
  .where('status', '=', 'open')
  .where('salary_min', '>=', 100000)
  .where((eb) => 
    eb.or([
      eb('location', 'like', '%Remote%'),
      eb('location', 'like', '%San Francisco%'),
    ])
  )
  .orderBy('posted_at', 'desc')
  .limit(50)
  .execute();

// Aggregations
const stats = await db.kysely
  .selectFrom('jobs')
  .select((eb) => [
    eb.fn.count<number>('id').as('total'),
    eb.fn.avg<number>('salary_min').as('avg_salary'),
  ])
  .where('status', '=', 'open')
  .executeTakeFirst();

// Joins
const jobsWithCompanies = await db.kysely
  .selectFrom('jobs')
  .innerJoin('companies', 'companies.id', 'jobs.company_id')
  .select([
    'jobs.id',
    'jobs.title',
    'companies.name as company_name',
  ])
  .execute();
```

## 📝 Migration Pattern

### Before (Raw D1)

```typescript
const result = await env.DB.prepare(
  'SELECT * FROM sites WHERE id = ?1'
)
  .bind(id)
  .first<Site>();
```

### After (Drizzle)

```typescript
import { eq } from 'drizzle-orm';
import { sites } from './db/schema';

const result = await db.drizzle
  .select()
  .from(sites)
  .where(eq(sites.id, id))
  .get();
```

### After (Kysely - for dynamic queries)

```typescript
const result = await db.kysely
  .selectFrom('sites')
  .selectAll()
  .where('id', '=', id)
  .executeTakeFirst();
```

## 🔄 Migration Checklist

For each service file:

- [ ] Replace `env.DB` with `initDb(env)` to get `db` client
- [ ] Convert simple SELECT queries to Drizzle
- [ ] Convert INSERT/UPDATE/DELETE to Drizzle
- [ ] Convert dynamic/complex queries to Kysely
- [ ] Update imports to use schema types
- [ ] Test all endpoints maintain same behavior
- [ ] Verify type safety with `pnpm typecheck`

## 📚 Examples

See `src/domains/sites/services/site-storage.service.orm.example.ts` for a complete refactored example.

## 🛠️ Commands

```bash
# Generate migration from schema changes
pnpm db:generate

# Apply migrations locally
pnpm migrate:local

# Apply migrations remotely
pnpm migrate:remote

# Generate and apply migrations
pnpm db:migrate          # local
pnpm db:migrate:remote   # remote

# Push schema changes directly (dev only)
pnpm db:push

# Open Drizzle Studio (database GUI)
pnpm db:studio
```

## ⚠️ Important Notes

1. **Column Naming**: Drizzle uses camelCase in TypeScript, but SQL uses snake_case. The schema handles this mapping automatically.

2. **Type Safety**: Always use inferred types from schema:
   ```typescript
   import type { Site, NewSite } from './db/schema';
   ```

3. **Transactions**: Use D1's native transaction API when needed:
   ```typescript
   await env.DB.batch([
     env.DB.prepare('INSERT INTO ...'),
     env.DB.prepare('UPDATE ...'),
   ]);
   ```

4. **Migrations**: Always generate migrations for schema changes:
   ```bash
   pnpm db:generate
   ```

## 🐛 Troubleshooting

### Type Errors

If you see type errors, ensure:
- Schema types are imported correctly
- Column names match schema definitions
- Database interface includes all tables

### Migration Issues

If migrations fail:
- Check `drizzle.config.ts` points to correct database
- Verify schema changes are valid SQL
- Review generated migration SQL before applying

### Runtime Errors

If queries fail at runtime:
- Verify D1 database binding is correct
- Check column names match database schema
- Ensure foreign key relationships are correct

## 📖 Further Reading

- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)
- [Kysely Docs](https://kysely.dev/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)

