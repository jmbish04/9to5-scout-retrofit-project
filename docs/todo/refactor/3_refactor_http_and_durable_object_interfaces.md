# Task 3: Refactor HTTP Routes and Durable Objects into Modular Interfaces

## Objective
Align all HTTP handlers and Durable Object entrypoints with the new domain boundaries, separating request routing, validation, and actor messaging concerns.

## Why this matters
- `src/routes/*.ts` files currently mix request parsing, validation, business logic, and persistence in multi-hundred-line modules.
- The modularization plan and Phase 12 prompts call for domain-specific routers, shared validation utilities, and better error handling.
- Durable Objects such as `JobMonitor`, `SiteCrawler`, and `ScrapeSocket` must adopt the actor-oriented interfaces proposed in `docs/todo/PROMPT_ACTOR_REFACTOR.md` to support modular orchestration.

## Implementation Steps
1. Move each existing route file into the appropriate `src/domains/<domain>/routes/` module, breaking large handlers into smaller controller-style functions that invoke domain services.
2. Centralize request validation and OpenAPI schema generation inside `src/core/validation` and `src/core/openapi` helpers so controllers focus on orchestration logic.
3. Refactor Durable Objects to implement a shared `Actor` interface with `receive` handlers, and relocate them under `src/domains/scraping/durable-objects/` (or relevant domain) as outlined in the actor refactor document.
4. Introduce a top-level router composition layer (e.g., `src/api/routes/index.ts`) that wires domain routers together and exports an OpenAPI-aware route map.
5. Update tests and integration scripts to target the new route entrypoints, ensuring parity with existing behavior before removing legacy route aggregators.
