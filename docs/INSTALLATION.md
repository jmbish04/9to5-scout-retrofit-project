# Installation Guide - Health System

## Prerequisites

- Node.js 18+ installed
- pnpm installed (`npm install -g pnpm`)
- Cloudflare account with Workers access
- Wrangler CLI configured (`pnpm dlx wrangler@latest login`)

## Step-by-Step Installation

### 1. Install Dependencies

```bash
pnpm install
```

This will install all required packages including:
- `@asteasolutions/zod-to-openapi` (for OpenAPI generation)
- `kysely` and `kysely-d1` (for database queries)
- `drizzle-orm` (for schema management)
- All other existing dependencies

### 2. Run Database Migrations

The health system requires a new migration (`0007_health_tests.sql`) to create the test tables.

#### For Local Development:
```bash
pnpm migrate:local
```

#### For Production:
```bash
pnpm migrate:remote
```

This creates two tables:
- `test_defs` - Stores test definitions
- `test_results` - Stores test execution results

### 3. Verify Configuration

Check that `wrangler.toml` includes:

- ✅ `ROOM_DO` in durable_objects bindings
- ✅ Migration `v3` with `RoomDO` class
- ✅ Cron trigger `*/15 * * * *` (every 15 minutes)
- ✅ `ASSETS` binding for static files

### 4. Start Development Server

```bash
pnpm dev
```

This will:
- Run local migrations
- Start Wrangler dev server
- Make the worker available at `http://localhost:8787`

### 5. Test the Installation

#### Check Health Dashboard
Open in browser:
```
http://localhost:8787/health.html
```

#### Check OpenAPI Spec
```
http://localhost:8787/openapi.json
```

#### Run Tests Manually
```bash
curl -X POST http://localhost:8787/api/tests/run \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### Check Test Results
```bash
curl http://localhost:8787/api/tests/latest
```

### 6. Verify Database Tables

Check that tables were created:

```bash
pnpm dlx wrangler@latest d1 execute DB --command="SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'test%';" --local
```

You should see:
- `test_defs`
- `test_results`

### 7. Verify Default Tests Are Seeded

The first time you run tests, default test definitions will be automatically seeded. You can verify:

```bash
curl http://localhost:8787/api/tests/defs
```

You should see 6 default tests:
1. Health Endpoint Check
2. OpenAPI JSON Availability
3. OpenAPI YAML Availability
4. WebSocket Handshake
5. Database Connectivity
6. Test Definitions Endpoint

## Troubleshooting

### Issue: Migration Fails

**Error**: `Migration failed: table already exists`

**Solution**: The tables may already exist. Check with:
```bash
pnpm dlx wrangler@latest d1 execute DB --command="SELECT name FROM sqlite_master WHERE type='table';" --local
```

If tables exist, you can skip the migration or drop and recreate:
```bash
pnpm dlx wrangler@latest d1 execute DB --command="DROP TABLE IF EXISTS test_results; DROP TABLE IF EXISTS test_defs;" --local
pnpm migrate:local
```

### Issue: Missing Dependencies

**Error**: `Cannot find module '@asteasolutions/zod-to-openapi'`

**Solution**: 
```bash
pnpm install
```

### Issue: Type Errors

**Error**: TypeScript compilation errors

**Solution**: Generate types first:
```bash
pnpm generate-types
pnpm typecheck
```

### Issue: WebSocket Not Working

**Error**: `ROOM_DO is not defined`

**Solution**: Verify `wrangler.toml` includes:
```toml
[durable_objects]
bindings = [
  # ... other bindings ...
  { name = "ROOM_DO", class_name = "RoomDO" }
]

[[migrations]]
tag = "v3"
new_sqlite_classes = ["RoomDO"]
```

### Issue: Tests Not Running

**Error**: No tests found

**Solution**: Tests are auto-seeded on first run. Manually trigger:
```bash
curl -X POST http://localhost:8787/api/tests/run
```

## Production Deployment

### 1. Build and Deploy

```bash
pnpm deploy
```

This will:
- Generate TypeScript types
- Build the worker
- Run remote migrations
- Deploy to Cloudflare

### 2. Verify Production

After deployment, test the endpoints:

```bash
# Replace with your worker URL
WORKER_URL="https://9to5-scout.hacolby.workers.dev"

# Health dashboard
open "${WORKER_URL}/health.html"

# OpenAPI spec
curl "${WORKER_URL}/openapi.json"

# Run tests
curl -X POST "${WORKER_URL}/api/tests/run"
```

## Quick Start Checklist

- [ ] `pnpm install` - Install dependencies
- [ ] `pnpm migrate:local` - Run migrations
- [ ] `pnpm dev` - Start dev server
- [ ] Visit `/health.html` - Verify dashboard loads
- [ ] Click "Run Health Tests" - Verify tests execute
- [ ] Check `/openapi.json` - Verify spec generates
- [ ] Review test results - Verify AI analysis works

## Next Steps

After installation:

1. **Customize Tests**: Edit `src/tests/defs.ts` to add your own tests
2. **Configure AI Model**: Set `DEFAULT_MODEL_REASONING` in `wrangler.toml` vars
3. **Monitor Results**: Check `/health.html` regularly for system health
4. **Extend RPC**: Add custom methods in `src/rpc.ts`

## Support

If you encounter issues:

1. Check the console logs: `pnpm logs:tail`
2. Review error logs: `pnpm logs:tail:errors`
3. Verify database state: Check D1 dashboard in Cloudflare
4. Check worker logs in Cloudflare dashboard

