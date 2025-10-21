# Task 2: Split Storage and Data Access by Domain

## Objective
Extract the monolithic persistence logic from `src/lib/storage.ts` into dedicated data-access services that live within each business domain and leverage the new `core/database` utilities.

## Why this matters
- `storage.ts` currently handles jobs, sites, applicants, search history, and queue state, violating single-responsibility principles highlighted in the modularization plan.
- Domain-specific services unlock clearer ownership, easier testing, and compatibility with the actor-oriented Durable Objects refactor.
- Aligns with Phase 12 chunked prompts (e.g., reindexing, query optimization, site storage restoration) by giving each domain an explicit persistence layer.

## Implementation Steps
1. Audit the functions exported from `src/lib/storage.ts` and group them by the target domain (jobs, documents, applicants, scraping, etc.).
2. Create corresponding `services/*-storage.service.ts` modules under each `src/domains/<domain>/services/` directory and move logic incrementally, replacing direct D1 calls with helpers from `src/core/database`.
3. Introduce domain-specific model/type definitions (`models/*.types.ts`, `models/*.schema.ts`) so the storage services enforce consistent typing.
4. Update imports throughout the worker (routes, Durable Objects, utility layers) to consume the new domain services instead of the legacy storage file.
5. As each section is migrated, add focused unit tests or Vitest suites that cover the domain service contract before deleting the old functions.
