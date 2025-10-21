# Task 1: Scaffold Core and Domain Module Boundaries

## Objective
Lay down the initial Cloudflare-aligned project skeleton described in the optimized modularization plan so that business domains and shared infrastructure have clear, isolated homes.

## Why this matters
- The current `src/lib` and `src/routes` directories mix infrastructure and domain logic, making the worker hard to extend.
- The optimized plan calls for a `core/` layer (auth, database, storage, validation) and `domains/` layer (jobs, sites, scraping, documents, applicants, companies, etc.).
- Without the scaffolding in place, downstream refactors cannot target well-defined module boundaries.

## Implementation Steps
1. Introduce the `src/core/` tree with placeholder files for `auth`, `database`, `storage`, and `validation` according to `docs/todo/updated-modularization-plan.md`.
2. Establish `src/domains/` subfolders for each business area identified in the plan (jobs, sites, scraping, documents, applicants, companies, etc.), including nested `models/`, `services/`, `routes/`, and `durable-objects/` directories where applicable, all with index exports.
3. Create shared configuration stubs (`Env` typing, constants, error helpers) in a `src/shared/` area to centralize cross-domain utilities, aligning with the Phase 12 cleanup guidance.
4. Ensure new directories are wired into the TypeScript project references and lint/test tooling so imports resolve cleanly before moving existing logic.
5. Document the new module map in `docs/` to keep parity with the modularization documentation already committed.
