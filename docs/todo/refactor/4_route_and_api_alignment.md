# Task 4: Align routes and APIs with modular domains

## Objective
Rebuild the HTTP routing layer so each domain exposes focused routers that compose into the main worker entry point without duplicating concerns.

## Key Actions
- Split monolithic route files (`src/routes/*.ts`) into domain-specific routers housed under `src/domains/<domain>/routes/`, following the phase12 route modularization plans.
- Update the top-level API aggregator to import domain routers explicitly and register middleware from the new `core/auth` and `core/validation` packages.
- Ensure route handlers delegate business logic to domain services rather than interacting with storage or Durable Objects directly.
- Refresh OpenAPI schema generation to pull definitions from the new modular structure, guaranteeing accurate documentation.

## Deliverables
- Domain-scoped router files with accompanying index exports.
- Simplified worker entry point that only wires routers, middleware, and actors together.
- Updated OpenAPI output demonstrating the reorganized endpoints.
