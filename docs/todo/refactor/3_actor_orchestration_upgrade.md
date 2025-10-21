# Task 3: Upgrade durable objects to the actor orchestration model

## Objective
Implement the actor-based communication pattern across all Durable Objects to simplify state coordination and align with the PROMPT_ACTOR_REFACTOR guidelines.

## Key Actions
- Introduce shared actor message types under `src/domains/actors/` and refactor existing Durable Objects (`JobMonitor`, `SiteCrawler`, `ScrapeSocket`) to implement the standardized `receive` contract.
- Build an orchestrator actor that mediates between HTTP routes and specialized actors, consolidating routing logic previously scattered across `index.ts` and routes.
- Define message handling flows for monitoring, crawling, and WebSocket coordination, including error propagation and retries.
- Update alarm and scheduling hooks to dispatch internal actor messages rather than invoking legacy functions directly.

## Deliverables
- Refactored Durable Object classes using the actor interface and message routing.
- Orchestrator actor implementation with documented message contracts.
- Revised integration tests or harnesses that exercise actor-to-actor communication paths.
