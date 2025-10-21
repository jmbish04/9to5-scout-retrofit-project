# Implement Document Reindexing Logic

## Priority: HIGH

## Estimated Time: 3-4 hours

## Files Affected: `src/domains/documents/services/document-processing.service.ts`

## Problem

The `applyPatches` function in `document-processing.service.ts` returns a hardcoded `reindexed: false` value, indicating incomplete implementation. This placeholder needs to be replaced with proper reindexing logic.

## Current Issue

```typescript
// Current placeholder - NEEDS IMPLEMENTATION
const reindexed = false; // Placeholder
return { success: true, reindexed };
```

## Required Solution

Implement proper reindexing logic that determines when a document needs to be re-indexed after applying patches.

## Implementation Requirements

### 1. Reindexing Criteria

Determine if reindexing is needed based on:

- **Content changes**: If the patch modifies the document content
- **Metadata changes**: If the patch affects searchable metadata
- **Structural changes**: If the patch changes document structure
- **Vector embeddings**: If content changes affect vector similarity

### 2. Patch Analysis Function

```typescript
function analyzePatchForReindexing(patches: DocumentPatch[]): boolean {
  // Analyze patches to determine if reindexing is needed
  // Return true if any patch affects searchable content
}
```

### 3. Reindexing Triggers

- Content modifications (text changes, additions, deletions)
- Metadata updates (tags, categories, status changes)
- Structural changes (section reordering, format changes)
- Vector embedding updates (when content affects similarity)

### 4. Integration with Vectorize

- Check if document has vector embeddings
- Determine if content changes affect embeddings
- Trigger reindexing in Vectorize if needed

## Implementation Steps

### Step 1: Create Patch Analysis

```typescript
interface PatchAnalysis {
  affectsContent: boolean;
  affectsMetadata: boolean;
  affectsStructure: boolean;
  requiresReindexing: boolean;
}

function analyzePatches(patches: DocumentPatch[]): PatchAnalysis {
  // Analyze each patch type
  // Determine overall reindexing requirements
}
```

### Step 2: Implement Reindexing Logic

```typescript
async function determineReindexingNeeded(
  patches: DocumentPatch[],
  documentId: string,
  env: Env
): Promise<boolean> {
  const analysis = analyzePatches(patches);

  if (!analysis.requiresReindexing) {
    return false;
  }

  // Check if document has vector embeddings
  // Determine if embeddings need updating
  // Return true if reindexing is needed
}
```

### Step 3: Update applyPatches Function

```typescript
async function applyPatches(
  documentId: string,
  patches: DocumentPatch[],
  env: Env
): Promise<{ success: boolean; reindexed: boolean }> {
  // Apply patches
  // Analyze if reindexing is needed
  const reindexed = await determineReindexingNeeded(patches, documentId, env);

  return { success: true, reindexed };
}
```

## Testing Requirements

- Test with different patch types
- Test with content vs metadata changes
- Test with vector embedding scenarios
- Test edge cases (empty patches, invalid patches)

## Success Criteria

- [ ] Reindexing logic properly analyzes patches
- [ ] Returns accurate reindexing status
- [ ] Integrates with Vectorize when needed
- [ ] Handles all patch types correctly
- [ ] Includes comprehensive test coverage

## Files to Modify

- `src/domains/documents/services/document-processing.service.ts`
- Add tests in `tests/domains/documents/`

## Dependencies

- Vectorize integration for embedding checks
- Existing patch processing logic
- Document metadata structure
