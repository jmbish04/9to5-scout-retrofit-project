# Task 2: Migrate oversized libraries into domain modules

## Objective
Break up the current monolithic `src/lib/` utilities into focused domain modules that map to the proposed directory structure.

## Key Actions
- Refactor `documents`, `storage`, `openapi`, and `browser-rendering` libraries into the new `src/domains/*` packages, creating service interfaces per domain (documents, scraping, applicants, companies, monitoring).
- Extract shared DTOs and validation schemas into `src/domains/<domain>/models/` with Zod schemas or equivalent validators.
- Replace legacy cross-cutting imports with explicit domain service dependencies, eliminating barrel exports that obscure module boundaries.
- Update unit tests or add new ones to cover the reorganized services, ensuring parity with prior behavior.

## Deliverables
- Modularized service files grouped by business domain.
- Updated imports throughout the codebase that point to the new domain paths.
- Passing test suite demonstrating functional equivalence after migration.
