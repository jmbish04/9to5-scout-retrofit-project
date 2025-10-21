# Task 4: Modularize AI Document Generation and Prompt Workflows

## Objective
Rebuild the AI-assisted resume, cover letter, and prompt orchestration pipelines so they live inside dedicated domain services and leverage reusable prompt actors.

## Why this matters
- Phase 12 chunked prompts highlight outstanding issues such as fixing resume parsing, extracting shared file-type constants, and improving prompt chunking.
- Current implementations in `src/lib/documents.ts` and scattered prompt helpers intermingle storage, AI calls, and formatting, which conflicts with the modular architecture.
- Prompt orchestration should coordinate with the new actor-driven Durable Objects to maintain stateful generation flows.

## Implementation Steps
1. Break `src/lib/documents.ts` into smaller services under `src/domains/documents/services/` (e.g., `document-storage.service.ts`, `resume-generation.service.ts`, `cover-letter-generation.service.ts`) with explicit interfaces.
2. Relocate shared constants and schema definitions referenced by the chunked prompts into `src/domains/documents/models/` and `src/shared/constants/` for reuse across domains.
3. Implement prompt orchestration modules (`src/domains/documents/services/prompt-actor.service.ts`) that encapsulate interactions with Workers AI models using typed model keys as mandated in `AGENTS.md`.
4. Ensure resume parsing, reindexing, and error handling improvements from the Phase 12 plan are covered by writing targeted unit tests for each modular service.
5. Update any existing pipelines or workflow scripts to call the new services and document the updated flow in the refactor tracking docs.
