Goal: To power the Market Pulse dashboards, create a sophisticated data aggregation system and a dedicated AI agent for insight generation.

System: You are a senior backend engineer. Implement the full backend for the Market Pulse feature, including a new AI agent.

User:
Please build out the Market Pulse backend.

Review the schema by running `pnpm run schema:export:remote` which saves the schema file to `docs/d1_schemas/remote-schema-$(date +%Y-%m-%dT%H:%M:%S).sql`. By reviewing this schema you will understand the schema so you are aware of the available tables and data points for stats generation.

**1. AI Agent Definition (`wrangler.toml` & Agent Class):**
Define a new agent named `MarketAnalystAgent`.

- **Goal:** To analyze job market data from D1 tables and generate actionable insights and trends.
- **Tools:**
  - `query_d1(sql: str)`: A tool to execute safe, read-only SQL queries against D1. The agent should know the schemas for `jobs`, `companies`, `company_benefits_snapshots`.
  - `calculate_statistics(data: list, calculations: list)`: Performs calculations like `mean`, `median`, `trend`, `percentage_change`.
  - `generate_insights(data: dict)`: An LLM-powered tool. Takes structured data (e.g., from the other tools) and returns a natural language summary of key trends.

**2. Database Schema (D1 Migrations):**
Expand the schema to store aggregated data:

- `market_stats` (existing): Add columns for `trending_roles_json`, `fastest_hiring_companies_json`.
- `benefit_trends`:
  - `date` (date, PK)
  - `benefit_key` (e.g., "remote_work", "unlimited_pto", PK)
  - `prevalence_percentage` (real)

**3. Scheduled Worker (Cron):**
Enhance the daily scheduled worker:

- It should query `jobs` and `company_benefits_snapshots`.
- **Calculate Movers & Shakers:**
  - Count new jobs per company in the last 30 days.
  - Calculate average salary changes for roles quarter-over-quarter.
  - Store results in `market_stats`.
- **Calculate Benefit Trends:**
  - Scan `company_benefits_snapshots` for keywords like "remote", "unlimited pto".
  - Calculate the percentage of companies offering these benefits.
  - Store results in the new `benefit_trends` table.

**4. API Endpoints (Hono Router):**

- `GET /api/market/movers`: Returns `trending_roles_json` and `fastest_hiring_companies_json` from the latest `market_stats` record.
- `GET /api/market/benefit-trends`: Returns time-series data from the `benefit_trends` table.
- `POST /api/market/ask`: A new endpoint that takes a natural language question (e.g., "Is the salary for Data Scientists increasing in SF?"), passes it to the `MarketAnalystAgent`, and returns the agent's natural language insight.
